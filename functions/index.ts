import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * 1. PO Document Trigger: Handles transitions on DG final approval
 */
export const onPOApproved = functions.firestore
  .document("purchaseOrders/{poId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const poId = context.params.poId;

    // Check if the status transitioned from PENDING_DG to APPROVED
    if (before.status !== "APPROVED" && after.status === "APPROVED") {
      const companyId = after.companyId;

      await db.runTransaction(async (transaction) => {
        // A. Generate PO Number (PO-YYYY-NNN)
        const counterRef = db.doc(`counters/${companyId}`);
        const counterDoc = await transaction.get(counterRef);
        const currentYear = new Date().getFullYear();

        let lastSeq = 0;
        let counterYear = currentYear;

        if (counterDoc.exists) {
          const counterData = counterDoc.data();
          if (counterData?.purchaseOrders?.currentYear === currentYear) {
            lastSeq = counterData.purchaseOrders.lastSequenceNumber || 0;
          }
        }

        const nextSeq = lastSeq + 1;
        const formattedSeq = String(nextSeq).padStart(3, "0");
        const poNumber = `PO-${currentYear}-${formattedSeq}`;

        // Update Counter
        transaction.set(counterRef, {
          purchaseOrders: {
            currentYear: currentYear,
            lastSequenceNumber: nextSeq
          }
        }, { merge: true });

        // B. Permanently Deduct Stock from reserved inventory
        for (const item of after.items) {
          const productRef = db.doc(`supplierProducts/${item.productId}`);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists) {
            throw new Error(`Product ${item.productId} not found`);
          }
          const productData = productSnap.data()!;
          const currentReserved = productData.reservedStock || 0;
          
          transaction.update(productRef, {
            reservedStock: Math.max(0, currentReserved - item.qty)
          });
        }

        // C. Update PO with official metadata
        transaction.update(change.after.ref, {
          poNumber: poNumber,
          approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // D. Create downstream Import Tracking entry
        const trackingRef = db.doc(`purchaseOrders/${poId}/importTracking/main`);
        const now = new Date();
        const stage1Deadline = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days

        transaction.set(trackingRef, {
          poId: poId,
          poNumber: poNumber,
          companyId: companyId,
          currentStage: "STAGE1_BOOKING_PROFORMA",
          overallStatus: "on_track",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          stages: {
            STAGE1_BOOKING_PROFORMA: {
              name: "Booking + Proforma Invoice",
              status: "pending",
              deadline: stage1Deadline.toISOString(),
              completedAt: null,
              documents: { proformaUrl: null, bookingConfirmationUrl: null }
            },
            STAGE2_PRE_DOMICILIATION: {
              name: "Pré-domiciliation (ALGEX/Regulatory)",
              status: "waiting",
              deadline: null,
              completedAt: null,
              documents: { algexCertificateUrl: null }
            },
            STAGE3_DOMICILIATION_BANCAIRE: {
              name: "Domiciliation Bancaire",
              status: "waiting",
              deadline: null,
              completedAt: null,
              documents: { domiciliationCertificateUrl: null },
              meta: { bankName: "", domiciliationNumber: null }
            },
            STAGE4_SHIPMENT: {
              name: "Shipment & Bill of Lading",
              status: "waiting",
              deadline: null,
              completedAt: null,
              documents: { billOfLadingUrl: null }
            }
          }
        });
      });

      // E. Send Notification to Logistics role
      await db.collection("notifications").add({
        companyId,
        recipientRole: "logistique",
        title: "Import Lifecycle Initiated",
        message: `Import process started for ${after.poNumber || "New PO"}. Please process Stage 1 Proforma booking.`,
        readBy: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

/**
 * 2. Daily Deadline Checker Engine (Scheduled Function running daily)
 */
export const checkDeadlines = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone("Africa/Algiers")
  .onRun(async (context) => {
    const now = new Date().toISOString();
    
    // Scan all active importTrackings with pending phases
    const trackingQuery = await db.collectionGroup("importTracking")
      .where("overallStatus", "==", "on_track")
      .get();

    const batch = db.batch();

    for (const doc of trackingQuery.docs) {
      const data = doc.data();
      const currentStageName = data.currentStage;
      const currentStageData = data.stages[currentStageName];

      if (currentStageData && currentStageData.deadline && currentStageData.deadline < now) {
        // Mark current stage and overall flow as overdue
        const stageUpdateKey = `stages.${currentStageName}.status`;
        
        batch.update(doc.ref, {
          [stageUpdateKey]: "overdue",
          overallStatus: "overdue",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Determine responsible team to target notifications
        let targetRole = "logistique";
        if (currentStageName === "STAGE2_PRE_DOMICILIATION" || currentStageName === "STAGE3_DOMICILIATION_BANCAIRE") {
          targetRole = "finance";
        }

        // Write alert notification
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, {
          companyId: data.companyId,
          recipientRole: targetRole,
          title: `CRITICAL DEADLINE EXCEEDED: ${data.poNumber}`,
          message: `The import stage '${currentStageData.name}' has exceeded its deadline. Urgent resolution required.`,
          targetPath: `/import-tracking/${data.poId}`,
          readBy: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    await db.runTransaction(() => batch.commit());
  });
