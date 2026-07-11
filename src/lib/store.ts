import { create } from "zustand";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  runTransaction,
  serverTimestamp,
  FieldValue
} from "firebase/firestore";
import { db } from "./firebase";
import { Supplier, SupplierProduct, ImporterCompany, formatDatabase, seedDatabase } from "./seeds";
export type { Supplier, SupplierProduct, ImporterCompany };

export const formatDateSafe = (dateVal: any): string => {
  if (!dateVal) return "";
  
  if (dateVal && typeof dateVal.toDate === "function") {
    try {
      return dateVal.toDate().toLocaleDateString("fr-FR");
    } catch (e) {}
  }

  if (dateVal && typeof dateVal.seconds === "number") {
    try {
      return new Date(dateVal.seconds * 1000).toLocaleDateString("fr-FR");
    } catch (e) {}
  }

  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-FR");
    }
  } catch (e) {}

  return "";
};

export const formatDateTimeSafe = (dateVal: any): string => {
  if (!dateVal) return "";
  
  let dateObj: Date | null = null;
  
  if (dateVal && typeof dateVal.toDate === "function") {
    try {
      dateObj = dateVal.toDate();
    } catch (e) {}
  } else if (dateVal && typeof dateVal.seconds === "number") {
    try {
      dateObj = new Date(dateVal.seconds * 1000);
    } catch (e) {}
  } else {
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        dateObj = d;
      }
    } catch (e) {}
  }

  if (dateObj) {
    const dateStr = dateObj.toLocaleDateString("fr-FR");
    const timeStr = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `${dateStr} ${timeStr}`;
  }

  return "";
};

export interface POItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unit?: string;
  price: number;
  total: number;
}

export interface POTotals {
  subtotal: number;
  shipping: number;
  grandTotal: number;
  currency: string;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  poNumber: string | null;
  supplierId: string;
  status: 'DRAFT' | 'PENDING_COMMERCIAL' | 'PENDING_JURIDIQUE' | 'PENDING_COMPTABILITE' | 'PENDING_FINANCE' | 'PENDING_DG' | 'APPROVED' | 'REJECTED';
  items: POItem[];
  totals: POTotals;
  paymentTerms: string;
  currentApprovalStep: number;
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt: any;
  approvedAt?: any;
  pdfUrl?: string | null;
  rejectionComment?: string;
  importerDetails?: {
    name: string;
    nif: string;
    rc: string;
    address: string;
    contact: string;
    logoUrl?: string;
  };
  supplierDetails?: {
    name: string;
    address: string;
    country: string;
    email: string;
    phone: string;
  };
  incoterm?: string;
  currency?: string;
  bankName?: string;
}

export interface POApproval {
  id: string;
  step: number;
  role: string;
  status: 'approved' | 'rejected';
  approvedBy: string;
  approvedByName?: string;
  timestamp: any;
  comment: string;
}

export interface ImportStage {
  name: string;
  status: 'waiting' | 'pending' | 'completed' | 'overdue';
  deadline: string | null;
  completedAt: string | null;
  documents: Record<string, string | null>;
  meta?: Record<string, any>;
}

export interface ImportTracking {
  id: string; // matches poId
  poId: string;
  poNumber: string;
  companyId: string;
  currentStage: 'STAGE1_BOOKING_PROFORMA' | 'STAGE2_PRE_DOMICILIATION' | 'STAGE3_DOMICILIATION_BANCAIRE' | 'STAGE4_SHIPMENT' | 'COMPLETED';
  stages: {
    STAGE1_BOOKING_PROFORMA: ImportStage;
    STAGE2_PRE_DOMICILIATION: ImportStage;
    STAGE3_DOMICILIATION_BANCAIRE: ImportStage;
    STAGE4_SHIPMENT: ImportStage;
  };
  overallStatus: 'on_track' | 'overdue' | 'completed';
  updatedAt: any;
}

export interface Notification {
  id: string;
  companyId: string;
  recipientRole: string;
  title: string;
  message: string;
  targetPath: string;
  readBy: string[];
  createdAt: any;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userEmail: string;
  action: string;
  details: Record<string, any>;
  timestamp: any;
}

const createAndSendNotification = async (
  companyId: string,
  recipientRole: string,
  title: string,
  message: string,
  targetPath: string
) => {
  try {
    // 1. Write notification document to Firestore
    await addDoc(collection(db, "notifications"), {
      companyId,
      recipientRole,
      title,
      message,
      targetPath,
      readBy: [],
      createdAt: serverTimestamp()
    });

    // 2. Fetch browser FCM push tokens registered for this role
    const q = query(collection(db, "fcmTokens"), where("role", "==", recipientRole));
    const snap = await getDocs(q);
    const tokens = snap.docs.map(doc => doc.data().token).filter(Boolean);

    if (tokens.length > 0) {
      await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokens,
          title,
          body: message,
          url: targetPath
        })
      });
    } else {
      console.log(`No active FCM tokens registered for role: ${recipientRole}. Skipping push.`);
    }
  } catch (error) {
    console.error("createAndSendNotification failed:", error);
  }
};

interface AppStore {
  companyId: string;
  currentRole: string;
  currentUserId: string;
  userEmail: string;
  
  suppliers: Supplier[];
  products: SupplierProduct[];
  importers: ImporterCompany[];
  purchaseOrders: PurchaseOrder[];
  importTrackings: Record<string, ImportTracking>; // keyed by poId
  notifications: Notification[];
  auditLogs: AuditLog[];
  
  loading: boolean;
  
  // Auth state
  currentUserProfile: { uid: string; fullName: string; email: string; role: string; status: string; companyId: string } | null;
  authLoading: boolean;
  userApprovalList: any[];
  
  setRole: (role: string) => void;
  initializeListeners: (companyId: string) => () => void;
  setCurrentUserProfile: (profile: any) => void;
  setAuthLoading: (loading: boolean) => void;
  setUserApprovalList: (list: any[]) => void;
  updateUserStatus: (uid: string, status: "APPROVED" | "REJECTED", role: string) => Promise<void>;
  
  createPO: (
    supplierId: string, 
    items: POItem[], 
    totals: POTotals, 
    paymentTerms: string,
    importerDetails: { name: string, nif: string, rc: string, address: string, contact: string, logoUrl?: string },
    incoterm: string,
    currency: string,
    bankName: string
  ) => Promise<string>;
  submitPO: (poId: string) => Promise<void>;
  approvePO: (poId: string, comment: string) => Promise<void>;
  rejectPO: (poId: string, comment: string) => Promise<void>;
  saveImportStage: (poId: string, stageKey: string, meta: Record<string, any>) => Promise<void>;
  updateImportStageMeta: (poId: string, stageKey: string, meta: Record<string, any>) => Promise<void>;
  simulateDailyCron: () => Promise<void>;
  createImporter: (importer: Omit<ImporterCompany, "id" | "companyId" | "createdAt">) => Promise<void>;
  updateImporter: (id: string, importer: Partial<Omit<ImporterCompany, "id" | "companyId" | "createdAt">>) => Promise<void>;
  createSupplier: (supplier: Omit<Supplier, "id" | "companyId" | "createdAt">) => Promise<void>;
  createProduct: (product: Omit<SupplierProduct, "id" | "companyId" | "updatedAt" | "reservedStock">) => Promise<void>;
  wipeAndFormatDatabase: () => Promise<void>;
  seedDemoData: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  companyId: "comp_alg_001", // Standard testing tenant
  currentRole: "achats",
  currentUserId: "usr_role_achats",
  userEmail: "achats@importalger.dz",
  
  suppliers: [],
  products: [],
  importers: [],
  purchaseOrders: [],
  importTrackings: {},
  notifications: [],
  auditLogs: [],
  loading: true,
  
  // Auth initial state
  currentUserProfile: null,
  authLoading: true,
  userApprovalList: [],

  setRole: (role) => {
    const { currentUserProfile } = get();
    set({ 
      currentRole: role,
      currentUserId: currentUserProfile ? currentUserProfile.uid : `usr_role_${role}`,
      userEmail: currentUserProfile ? currentUserProfile.email : `${role}@importalger.dz`
    });
  },

  setCurrentUserProfile: (profile) => {
    if (profile) {
      set({
        currentUserProfile: profile,
        currentUserId: profile.uid,
        userEmail: profile.email,
        currentRole: profile.role || get().currentRole
      });
    } else {
      set({
        currentUserProfile: null,
        currentRole: "achats",
        currentUserId: "usr_role_achats",
        userEmail: "achats@importalger.dz"
      });
    }
  },
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setUserApprovalList: (list) => set({ userApprovalList: list }),
  
  updateUserStatus: async (uid, status, role) => {
    const userRef = doc(db, `users/${uid}`);
    await updateDoc(userRef, { status, role });
  },

  wipeAndFormatDatabase: async () => {
    const { companyId } = get();
    set({ loading: true });
    try {
      await formatDatabase(companyId);
      // Hard refresh to reload layout setup and seeding check
      window.location.reload();
    } catch (e) {
      console.error("Format database failed:", e);
      set({ loading: false });
      throw e;
    }
  },

  seedDemoData: async () => {
    const { companyId } = get();
    set({ loading: true });
    try {
      await seedDatabase(companyId);
      window.location.reload();
    } catch (e) {
      console.error("Seed database failed:", e);
      set({ loading: false });
      throw e;
    }
  },

  initializeListeners: (companyId) => {
    set({ loading: true });
    
    // Subscribe to Suppliers
    const unsubSuppliers = onSnapshot(
      query(collection(db, "suppliers"), where("companyId", "==", companyId)),
      (snap) => {
        const suppliers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
        set({ suppliers });
      }
    );

    // Subscribe to Products
    const unsubProducts = onSnapshot(
      query(collection(db, "supplierProducts"), where("companyId", "==", companyId)),
      (snap) => {
        const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierProduct));
        set({ products });
      }
    );

    // Subscribe to Importers (Self-healing database if empty)
    const unsubImporters = onSnapshot(
      query(collection(db, "importers"), where("companyId", "==", companyId)),
      async (snap) => {
        if (snap.empty) {
          const defaultRef = doc(collection(db, "importers"));
          await setDoc(defaultRef, {
            companyId,
            name: "SARL IMPORT ALGIERS",
            nif: "001216099023456",
            rc: "16/00-0987654B20",
            address: "12 Rue des Frères Bouadou, Bir Mourad Raïs, Alger",
            contact: "contact@importalger.dz | +213 21 00 00 00",
            createdAt: new Date().toISOString()
          });
          return;
        }
        const importers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImporterCompany));
        set({ importers });
      }
    );

    // Helper to get milliseconds safely from Firestore Timestamp or string
    const getMs = (val: any) => {
      if (!val) return 0;
      if (typeof val.toDate === "function") return val.toDate().getTime();
      if (val.seconds) return val.seconds * 1000;
      return new Date(val).getTime() || 0;
    };

    // Subscribe to POs
    const unsubPOs = onSnapshot(
      query(collection(db, "purchaseOrders"), where("companyId", "==", companyId)),
      (snap) => {
        const purchaseOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
        purchaseOrders.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
        set({ purchaseOrders });
      }
    );

    // Subscribe to Notifications
    const unsubNotifs = onSnapshot(
      query(collection(db, "notifications"), where("companyId", "==", companyId)),
      (snap) => {
        const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        notifications.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
        set({ notifications });
      }
    );

    // Subscribe to Audit Logs
    const unsubAudit = onSnapshot(
      query(collection(db, "auditLogs"), where("companyId", "==", companyId)),
      (snap) => {
        const auditLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        auditLogs.sort((a, b) => getMs(b.timestamp) - getMs(a.timestamp));
        set({ auditLogs });
        set({ loading: false });
      }
    );

    // Subscribe to Import Trackings (collection group or subcollection list)
    // For ease of retrieval in client, we retrieve them as a subcollection query of POs.
    // In our simplified layout we subscribe to all active import tracking main docs.
    const unsubImportTracking = onSnapshot(
      query(collection(db, "purchaseOrders")), // We can trigger listener updates on PO subcollection changes manually or via document query
      async (snap) => {
        const trackingMap: Record<string, ImportTracking> = {};
        for (const poDoc of snap.docs) {
          const mainRef = doc(db, `purchaseOrders/${poDoc.id}/importTracking/main`);
          const mainSnap = await getDoc(mainRef);
          if (mainSnap.exists()) {
            trackingMap[poDoc.id] = { id: mainSnap.id, ...mainSnap.data() } as ImportTracking;
          }
        }
        set({ importTrackings: trackingMap });
      }
    );

    // Subscribe to Users approvals list (real-time updates)
    const unsubUsers = onSnapshot(
      query(collection(db, "users")),
      (snap) => {
        const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        set({ userApprovalList: list });
      }
    );

    return () => {
      unsubSuppliers();
      unsubProducts();
      unsubImporters();
      unsubPOs();
      unsubNotifs();
      unsubAudit();
      unsubImportTracking();
      unsubUsers();
    };
  },

  createPO: async (supplierId, items, totals, paymentTerms, importerDetails, incoterm, currency, bankName) => {
    const { companyId, currentUserId, userEmail, suppliers, currentUserProfile } = get();
    const poRef = doc(collection(db, "purchaseOrders"));

    const supplier = suppliers.find(s => s.id === supplierId);
    const supplierDetails = {
      name: supplier?.name || "Unknown Supplier",
      address: supplier?.bankDetails?.bankName || "Unknown Address",
      country: supplier?.country || "Unknown Country",
      email: supplier?.contactEmail || "Unknown Email",
      phone: "+39 02 123 4567"
    };

    const newPO = {
      companyId,
      poNumber: null,
      supplierId,
      status: "DRAFT" as const,
      items,
      totals: {
        ...totals,
        currency
      },
      paymentTerms,
      currentApprovalStep: 0,
      createdBy: currentUserProfile?.uid || currentUserId,
      createdByName: currentUserProfile?.fullName || "Responsable Achats",
      createdByEmail: currentUserProfile?.email || userEmail,
      createdAt: serverTimestamp(),
      importerDetails,
      supplierDetails,
      incoterm,
      currency,
      bankName
    };

    await setDoc(poRef, newPO);

    // Log Action
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "PO_DRAFT_CREATED",
      details: { poId: poRef.id, supplierId },
      timestamp: serverTimestamp()
    });

    return poRef.id;
  },

  submitPO: async (poId) => {
    const { companyId, currentUserId, userEmail, purchaseOrders } = get();
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) throw new Error("Purchase Order not found");

    // Perform transaction to reserve stock atomically
    await runTransaction(db, async (transaction) => {
      // A. Perform all reads first
      const productSnaps: { productRef: any, product: SupplierProduct, item: POItem }[] = [];
      for (const item of po.items) {
        const productRef = doc(db, `supplierProducts/${item.productId}`);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) {
          throw new Error(`Product ${item.productId} not found`);
        }
        const product = productSnap.data() as SupplierProduct;
        if (product.availableStock < item.qty) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.availableStock}, Requested: ${item.qty}`);
        }
        productSnaps.push({ productRef, product, item });
      }

      // B. Perform all writes second
      for (const entry of productSnaps) {
        transaction.update(entry.productRef, {
          availableStock: entry.product.availableStock - entry.item.qty,
          reservedStock: (entry.product.reservedStock || 0) + entry.item.qty
        });
      }

      // Update PO status to PENDING_COMMERCIAL
      transaction.update(doc(db, `purchaseOrders/${poId}`), {
        status: "PENDING_COMMERCIAL",
        currentApprovalStep: 1,
        updatedAt: serverTimestamp()
      });
    });

    // Write Audit Log
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "PO_SUBMITTED_FOR_APPROVAL",
      details: { poId },
      timestamp: serverTimestamp()
    });

    // Create Notification for Commercial Role
    await createAndSendNotification(
      companyId,
      "commercial",
      "New PO Submitted",
      `PO for supplier ValvoSpares requires commercial approval.`,
      `/purchase-orders/${poId}`
    );
  },

  approvePO: async (poId, comment) => {
    const { companyId, currentUserId, currentRole, userEmail, purchaseOrders } = get();
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) throw new Error("Purchase Order not found");

    const currentStep = po.currentApprovalStep;
    let nextStatus: PurchaseOrder["status"] = "PENDING_COMMERCIAL";
    let nextStep = currentStep;
    let nextRole = "";

    switch(currentStep) {
      case 1: // Commercial Approved
        nextStatus = "PENDING_JURIDIQUE";
        nextStep = 2;
        nextRole = "juridique";
        break;
      case 2: // Juridique Approved
        nextStatus = "PENDING_COMPTABILITE";
        nextStep = 3;
        nextRole = "comptabilite";
        break;
      case 3: // Comptabilité Approved
        nextStatus = "PENDING_FINANCE";
        nextStep = 4;
        nextRole = "finance";
        break;
      case 4: // Finance Approved
        nextStatus = "PENDING_DG";
        nextStep = 5;
        nextRole = "dg";
        break;
      case 5: // DG Final Approved!
        nextStatus = "APPROVED";
        nextStep = 6;
        break;
    }

    // Update PO document and approvals log
    await runTransaction(db, async (transaction) => {
      const poRef = doc(db, `purchaseOrders/${poId}`);
      const approvalRef = doc(collection(db, `purchaseOrders/${poId}/approvals`), String(currentStep));

      let nextSeq = 0;
      let currentYear = new Date().getFullYear();
      let productSnaps: { productRef: any, product: SupplierProduct, item: POItem }[] = [];
      const counterRef = doc(db, `counters/${companyId}`);

      // 1. PERFORM ALL READS FIRST
      if (nextStatus === "APPROVED") {
        const counterSnap = await transaction.get(counterRef);
        let lastSeq = 0;

        if (counterSnap.exists()) {
          const counterData = counterSnap.data();
          if (counterData?.purchaseOrders?.currentYear === currentYear) {
            lastSeq = counterData.purchaseOrders.lastSequenceNumber || 0;
          }
        }
        nextSeq = lastSeq + 1;

        // Permanently deduct stock
        for (const item of po.items) {
          const productRef = doc(db, `supplierProducts/${item.productId}`);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            productSnaps.push({
              productRef,
              product: productSnap.data() as SupplierProduct,
              item
            });
          }
        }
      }

      // 2. PERFORM ALL WRITES SECOND
      transaction.set(approvalRef, {
        step: currentStep,
        role: currentRole,
        status: "approved",
        approvedBy: currentUserId,
        timestamp: new Date().toISOString(),
        comment
      });

      if (nextStatus === "APPROVED") {
        const poNumber = `PO-${currentYear}-${String(nextSeq).padStart(3, "0")}`;

        transaction.set(counterRef, {
          purchaseOrders: {
            currentYear,
            lastSequenceNumber: nextSeq
          }
        }, { merge: true });

        for (const entry of productSnaps) {
          transaction.update(entry.productRef, {
            reservedStock: Math.max(0, (entry.product.reservedStock || 0) - entry.item.qty)
          });
        }

        transaction.update(poRef, {
          status: "APPROVED",
          poNumber: poNumber,
          approvedAt: serverTimestamp()
        });

        // Initialize Downstream Import Tracking document
        const trackingRef = doc(db, `purchaseOrders/${poId}/importTracking/main`);
        const stage1Deadline = new Date();
        stage1Deadline.setDate(stage1Deadline.getDate() + 10); // 10 days

        transaction.set(trackingRef, {
          poId,
          poNumber,
          companyId,
          currentStage: "STAGE1_BOOKING_PROFORMA",
          overallStatus: "on_track",
          updatedAt: serverTimestamp(),
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
      } else {
        transaction.update(poRef, {
          status: nextStatus,
          currentApprovalStep: nextStep,
          updatedAt: serverTimestamp()
        });
      }
    });

    // Write audit log
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: nextStatus === "APPROVED" ? "PO_FINAL_APPROVED" : "PO_APPROVED_STEP",
      details: { poId, step: currentStep, comment },
      timestamp: serverTimestamp()
    });

    // Create system notification for the next reviewer
    if (nextRole) {
      await createAndSendNotification(
        companyId,
        nextRole,
        "Awaiting Your Approval",
        `PO requires your review for Step ${nextStep} (${nextRole.toUpperCase()}).`,
        `/purchase-orders/${poId}`
      );
    } else {
      // Notify Achats that Import Tracking has started
      await createAndSendNotification(
        companyId,
        "achats",
        "Import Pipeline Initiated",
        `Import tracking for PO has started. Complete Stage 1 Booking.`,
        `/import-tracking/${poId}`
      );
    }
  },

  rejectPO: async (poId, comment) => {
    const { companyId, currentUserId, currentRole, userEmail, purchaseOrders } = get();
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) throw new Error("Purchase Order not found");

    const currentStep = po.currentApprovalStep;

    await runTransaction(db, async (transaction) => {
      // A. Perform all reads first
      const productSnaps: { productRef: any, product: SupplierProduct, item: POItem }[] = [];
      for (const item of po.items) {
        const productRef = doc(db, `supplierProducts/${item.productId}`);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists()) {
          productSnaps.push({
            productRef,
            product: productSnap.data() as SupplierProduct,
            item
          });
        }
      }

      // B. Perform all writes second
      for (const entry of productSnaps) {
        transaction.update(entry.productRef, {
          availableStock: entry.product.availableStock + entry.item.qty,
          reservedStock: Math.max(0, (entry.product.reservedStock || 0) - entry.item.qty)
        });
      }

      // Set PO status to REJECTED
      const poRef = doc(db, `purchaseOrders/${poId}`);
      transaction.update(poRef, {
        status: "REJECTED",
        currentApprovalStep: 0,
        rejectionComment: comment,
        updatedAt: serverTimestamp()
      });

      // Log approval history
      const approvalRef = doc(collection(db, `purchaseOrders/${poId}/approvals`), `${currentStep}_rejected`);
      transaction.set(approvalRef, {
        step: currentStep,
        role: currentRole,
        status: "rejected",
        approvedBy: currentUserId,
        timestamp: new Date().toISOString(),
        comment
      });
    });

    // Write audit log
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "PO_REJECTED",
      details: { poId, step: currentStep, comment },
      timestamp: serverTimestamp()
    });

    // Notify original author (Achats)
    await createAndSendNotification(
      companyId,
      "achats",
      "PO Rejected",
      `Your PO has been rejected by ${currentRole.toUpperCase()}. Reason: "${comment}"`,
      `/purchase-orders/${poId}`
    );
  },

  saveImportStage: async (poId, stageKey, meta) => {
    const { companyId, currentUserId, userEmail, importTrackings } = get();
    const trackingRef = doc(db, `purchaseOrders/${poId}/importTracking/main`);
    const trackingSnap = await getDoc(trackingRef);
    if (!trackingSnap.exists()) throw new Error("Import Tracking document not found");

    const trackingData = trackingSnap.data() as ImportTracking;
    const stage = trackingData.stages[stageKey as keyof ImportTracking["stages"]];
    if (!stage) throw new Error("Invalid stage specified");

    let nextStage: ImportTracking["currentStage"] | "COMPLETED" = trackingData.currentStage;
    const stagesUpdate: Record<string, any> = {
      [`stages.${stageKey}.meta`]: meta
    };

    let markCompleted = true;

    // Transition to next stage
    if (stageKey === "STAGE1_BOOKING_PROFORMA") {
      nextStage = "STAGE2_PRE_DOMICILIATION";
      const d = new Date();
      d.setDate(d.getDate() + 15); // Stage 2 = +15 days
      stagesUpdate[`stages.STAGE2_PRE_DOMICILIATION.status`] = "pending";
      stagesUpdate[`stages.STAGE2_PRE_DOMICILIATION.deadline`] = d.toISOString();
    } else if (stageKey === "STAGE2_PRE_DOMICILIATION") {
      if (meta.predomStatus === "Validé") {
        nextStage = "STAGE3_DOMICILIATION_BANCAIRE";
        const d = new Date();
        d.setDate(d.getDate() + 15); // Stage 3 = +15 days
        stagesUpdate[`stages.STAGE3_DOMICILIATION_BANCAIRE.status`] = "pending";
        stagesUpdate[`stages.STAGE3_DOMICILIATION_BANCAIRE.deadline`] = d.toISOString();
      } else {
        markCompleted = false;
        nextStage = "STAGE2_PRE_DOMICILIATION";
      }
    } else if (stageKey === "STAGE3_DOMICILIATION_BANCAIRE") {
      nextStage = "STAGE4_SHIPMENT";
      const d = new Date();
      d.setDate(d.getDate() + 20); // Stage 4 = +20 days
      stagesUpdate[`stages.STAGE4_SHIPMENT.status`] = "pending";
      stagesUpdate[`stages.STAGE4_SHIPMENT.deadline`] = d.toISOString();
    } else if (stageKey === "STAGE4_SHIPMENT") {
      nextStage = "COMPLETED";
      stagesUpdate["overallStatus"] = "completed";
    }

    if (markCompleted) {
      stagesUpdate[`stages.${stageKey}.status`] = "completed";
      stagesUpdate[`stages.${stageKey}.completedAt`] = new Date().toISOString();
    }

    stagesUpdate["currentStage"] = nextStage;
    stagesUpdate["updatedAt"] = serverTimestamp();

    await updateDoc(trackingRef, stagesUpdate);

    // Trigger parent PO listener update
    const poRef = doc(db, `purchaseOrders/${poId}`);
    await updateDoc(poRef, {
      importTrackingUpdated: new Date().toISOString()
    });

    // Audit Log
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "IMPORT_STAGE_COMPLETED",
      details: { poId, stageKey, nextStage },
      timestamp: serverTimestamp()
    });

    // Notify role responsible for next step (now always Achats)
    if (nextStage !== trackingData.currentStage) {
      const nextRole = "achats";
      await createAndSendNotification(
        companyId,
        nextStage === "COMPLETED" ? "achats" : nextRole,
        nextStage === "COMPLETED" ? "Import Operations Finished" : "New Import Stage Active",
        nextStage === "COMPLETED" 
          ? `All import milestones completed successfully for PO.`
          : `Stage '${nextStage}' is now active. Action required.`,
        `/import-tracking/${poId}`
      );
    }
  },

  updateImportStageMeta: async (poId, stageKey, meta) => {
    const { companyId, currentUserId, userEmail } = get();
    const trackingRef = doc(db, `purchaseOrders/${poId}/importTracking/main`);
    
    await updateDoc(trackingRef, {
      [`stages.${stageKey}.meta`]: meta,
      updatedAt: serverTimestamp()
    });

    // Trigger parent PO listener update
    const poRef = doc(db, `purchaseOrders/${poId}`);
    await updateDoc(poRef, {
      importTrackingUpdated: new Date().toISOString()
    });

    // Audit Log
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "IMPORT_STAGE_META_UPDATED",
      details: { poId, stageKey },
      timestamp: serverTimestamp()
    });
  },

  simulateDailyCron: async () => {
    // Allows the user to trigger a manual scan of overdue deadlines for testing
    const { companyId, currentUserId, userEmail } = get();
    const now = new Date().toISOString();
    const trackingQuery = await getDocs(query(collection(db, `purchaseOrders`)));

    for (const poDoc of trackingQuery.docs) {
      const mainRef = doc(db, `purchaseOrders/${poDoc.id}/importTracking/main`);
      const mainSnap = await getDoc(mainRef);
      if (mainSnap.exists()) {
        const data = mainSnap.data() as ImportTracking;
        if (data.overallStatus === "on_track") {
          const currentStage = data.stages[data.currentStage as keyof ImportTracking["stages"]];
          if (currentStage && currentStage.deadline && currentStage.deadline < now) {
            await updateDoc(mainRef, {
              [`stages.${data.currentStage}.status`]: "overdue",
              overallStatus: "overdue",
              updatedAt: serverTimestamp()
            });

            // Create system notification (Targeting Achats)
            const nextRole = "achats";
            await addDoc(collection(db, "notifications"), {
              companyId,
              recipientRole: nextRole,
              title: `DEADLINE EXCEEDED: ${data.poNumber}`,
              message: `The import stage '${currentStage.name}' has exceeded its SLA.`,
              targetPath: `/import-tracking/${data.poId}`,
              readBy: [],
              createdAt: serverTimestamp()
            });
          }
        }
      }
    }

    // Write audit log
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "MANUAL_DEADLINE_CRON_SIMULATED",
      details: {},
      timestamp: serverTimestamp()
    });
  },

  createImporter: async (importer) => {
    const { companyId, currentUserId, userEmail } = get();
    const ref = doc(collection(db, "importers"));
    await setDoc(ref, {
      ...importer,
      id: ref.id,
      companyId,
      createdAt: new Date().toISOString()
    });
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "IMPORTER_COMPANY_CREATED",
      details: { importerId: ref.id, name: importer.name },
      timestamp: serverTimestamp()
    });
  },

  updateImporter: async (id, importer) => {
    const { companyId, currentUserId, userEmail } = get();
    const ref = doc(db, "importers", id);
    await updateDoc(ref, {
      ...importer,
      updatedAt: new Date().toISOString()
    });
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "IMPORTER_COMPANY_UPDATED",
      details: { importerId: id, name: importer.name },
      timestamp: serverTimestamp()
    });
  },

  createSupplier: async (supplier) => {
    const { companyId, currentUserId, userEmail } = get();
    const ref = doc(collection(db, "suppliers"));
    await setDoc(ref, {
      ...supplier,
      id: ref.id,
      companyId,
      createdAt: new Date().toISOString()
    });
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "SUPPLIER_CREATED",
      details: { supplierId: ref.id, name: supplier.name },
      timestamp: serverTimestamp()
    });
  },

  createProduct: async (product) => {
    const { companyId, currentUserId, userEmail } = get();
    const ref = doc(collection(db, "supplierProducts"));
    await setDoc(ref, {
      ...product,
      id: ref.id,
      companyId,
      reservedStock: 0,
      updatedAt: new Date().toISOString()
    });
    await addDoc(collection(db, "auditLogs"), {
      companyId,
      userId: currentUserId,
      userEmail,
      action: "PRODUCT_CREATED",
      details: { productId: ref.id, sku: product.sku, name: product.name },
      timestamp: serverTimestamp()
    });
  }
}));
