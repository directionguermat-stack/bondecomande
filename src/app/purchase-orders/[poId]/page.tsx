"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore, POApproval, formatDateSafe, formatDateTimeSafe } from "@/lib/store";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare,
  AlertTriangle,
  FileCheck,
  Printer
} from "lucide-react";
import PrintablePO from "@/components/PrintablePO";

export default function PODetail() {
  const params = useParams();
  const router = useRouter();
  const poId = params.poId as string;

  const { 
    purchaseOrders, 
    suppliers, 
    currentRole, 
    approvePO, 
    rejectPO,
    products
  } = useAppStore();

  const [approvalsHistory, setApprovalsHistory] = useState<POApproval[]>([]);
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [printMode, setPrintMode] = useState<"internal" | "supplier">("internal");

  const handlePrint = (mode: "internal" | "supplier") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const po = purchaseOrders.find(p => p.id === poId);
  const supplier = suppliers.find(s => s && po && s.id === po.supplierId);

  // Subscribe to approvals subcollection
  useEffect(() => {
    if (poId) {
      const q = query(
        collection(db, `purchaseOrders/${poId}/approvals`),
        orderBy("timestamp", "asc")
      );
      const unsub = onSnapshot(q, (snap) => {
        const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as POApproval));
        setApprovalsHistory(history);
      });
      return () => unsub();
    }
  }, [poId]);

  if (!po) {
    return (
      <div className="text-center py-20 text-slate-500 max-w-xl mx-auto">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Purchase Order Not Found</h2>
        <p className="text-xs mt-1 text-slate-400">Verify that the PO reference exists.</p>
      </div>
    );
  }

  // Check if current user is the required reviewer
  const isRequiredReviewer = 
    (po.status === "PENDING_COMMERCIAL" && currentRole === "commercial") ||
    (po.status === "PENDING_JURIDIQUE" && currentRole === "juridique") ||
    (po.status === "PENDING_COMPTABILITE" && currentRole === "comptabilite") ||
    (po.status === "PENDING_FINANCE" && currentRole === "finance") ||
    (po.status === "PENDING_DG" && currentRole === "dg");

  const handleApprove = async () => {
    setActionError("");
    setLoadingAction(true);
    try {
      await approvePO(poId, comment || "Approved");
      setComment("");
    } catch (e: any) {
      console.error(e);
      setActionError(e.message || "Failed to submit approval.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      setActionError("A detailed comment is required to reject a Purchase Order.");
      return;
    }
    setActionError("");
    setLoadingAction(true);
    try {
      await rejectPO(poId, comment);
      setComment("");
    } catch (e: any) {
      console.error(e);
      setActionError(e.message || "Failed to submit rejection.");
    } finally {
      setLoadingAction(false);
    }
  };

  const steps = [
    { step: 1, name: "Commercial Review", role: "commercial" },
    { step: 2, name: "Legal Compliance", role: "juridique" },
    { step: 3, name: "Cost Audit", role: "comptabilite" },
    { step: 4, name: "Finance Release", role: "finance" },
    { step: 5, name: "Executive Sign-Off", role: "dg" }
  ];

  return (
    <>
      {/* Printable A4 PDF Template */}
      <PrintablePO po={po} supplier={supplier} approvalsHistory={approvalsHistory} printMode={printMode} />

      {/* Main UI layout (Hidden when printing) */}
      <div className="space-y-6 max-w-5xl mx-auto w-full text-slate-800 p-2 print:hidden">
      
      {/* Header back button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/purchase-orders")}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {po.poNumber || "Temp Draft Receipt"}
              </h1>
              {po.status === "APPROVED" && (
                <span className="rounded-full bg-emerald-50 border border-emerald-250 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                  Approved
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Ref ID: <span className="font-mono">{po.id.slice(0, 10)}...</span></p>
          </div>
        </div>

        {po.status === "APPROVED" && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handlePrint("internal")}
              className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-sm"
            >
              <Printer className="h-4 w-4 text-slate-400" />
              <span>Version Interne (Visas)</span>
            </button>
            <button
              onClick={() => handlePrint("supplier")}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-semibold transition active:scale-95 shadow-sm"
            >
              <Printer className="h-4 w-4 text-slate-300" />
              <span>Version Fournisseur</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (PO Info and Stepper history) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata Card */}
          <div className="glass-card p-5 bg-white border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">
              General Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Importateur</span>
                <span className="font-bold text-slate-800 block">{po.importerDetails?.name || "groupe guermat"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Supplier</span>
                <span className="font-bold text-slate-800 block">{supplier?.name || "Loading..."}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Banque Domiciliataire</span>
                <span className="font-bold text-slate-800 block uppercase">{po.bankName || "BNA"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Créé par (Auteur)</span>
                <span className="font-bold text-slate-800 block">{po.createdByName || "Responsable Achats"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Payment Terms</span>
                <span className="font-semibold text-slate-800 leading-relaxed block">{po.paymentTerms}</span>
              </div>
            </div>
                {/* Line items Table / Responsive Cards */}
          <div className="glass-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Order Line Items
            </h2>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3 w-1/2">Name</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-850">
                  {po.items.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId || p.sku === item.sku);
                    const unit = item.unit || product?.unit || "";
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-500">{item.sku}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{item.name}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">{item.qty} {unit}</td>
                        <td className="py-3 px-3 font-medium">{item.price.toFixed(2)} {po.totals.currency} {unit ? `/ ${unit}` : ""}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          {item.total.toFixed(2)} {po.totals.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Hidden on desktop) */}
            <div className="block sm:hidden space-y-3">
              {po.items.map((item, idx) => {
                const product = products.find(p => p.id === item.productId || p.sku === item.sku);
                const unit = item.unit || product?.unit || "";
                return (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[9px] text-slate-400 font-semibold tracking-wider block">{item.sku}</span>
                        <strong className="text-slate-855 font-extrabold text-[12px]">{item.name}</strong>
                      </div>
                      <span className="bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded text-[10px] font-black">
                        {item.qty} {unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-200/50">
                      <span className="text-slate-505 font-medium">Prix Unitaire: <strong className="text-slate-700">{item.price.toFixed(2)} {po.totals.currency} {unit ? `/ ${unit}` : ""}</strong></span>
                      <span className="text-slate-900 font-black text-right">Total: {item.total.toFixed(2)} {po.totals.currency}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-slate-100 mt-5 pt-3.5 space-y-2 text-right text-xs">
              <div className="flex justify-between max-w-xs ml-auto text-slate-500">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold text-slate-850">
                  {po.totals.subtotal.toFixed(2)} {po.totals.currency}
                </span>
              </div>
              <div className="flex justify-between max-w-xs ml-auto text-slate-500">
                <span className="font-medium">Shipping Cost</span>
                <span className="font-bold text-slate-850">
                  {po.totals.shipping.toFixed(2)} {po.totals.currency}
                </span>
              </div>
              <div className="flex justify-between max-w-xs ml-auto text-xs pt-2 border-t border-slate-200 text-slate-800 font-bold">
                <span>Grand Total</span>
                <span className="text-slate-950 font-extrabold text-base">
                  {po.totals.grandTotal.toFixed(2)} {po.totals.currency}
                </span>
              </div>
            </div>
          </div>      </div>

          {/* Stepper Timeline */}
          <div className="glass-card p-6 bg-white border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-5 border-b border-slate-100 pb-2">
              Corporate Approval Flow
            </h2>

            <div className="space-y-5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              
              {/* Creator Draft step */}
              <div className="flex items-start gap-4 relative">
                <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-slate-900">Order Submitted</span>
                    <span className="text-slate-400">
                      {formatDateSafe(po.createdAt) || "Just Now"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">PO drafted and stock items reserved successfully.</p>
                </div>
              </div>

              {/* Sequential Steps */}
              {steps.map((st) => {
                const approval = approvalsHistory.find(h => h.step === st.step && h.status === "approved");
                const isCompleted = approval !== undefined;
                const isCurrent = po.currentApprovalStep === st.step && po.status !== "APPROVED" && po.status !== "REJECTED";
                const isRejected = po.status === "REJECTED" && approvalsHistory.some(h => h.step === st.step && h.status === "rejected");

                let badgeColor = "bg-slate-100 text-slate-400";
                let icon = <Clock className="h-3.5 w-3.5" />;
                if (isCompleted) {
                  badgeColor = "bg-emerald-50 text-emerald-600 border border-emerald-200";
                  icon = <CheckCircle className="h-3.5 w-3.5" />;
                } else if (isCurrent) {
                  badgeColor = "bg-sky-50 text-sky-600 border border-sky-200 animate-pulse";
                  icon = <Clock className="h-3.5 w-3.5" />;
                } else if (isRejected) {
                  badgeColor = "bg-rose-50 text-rose-600 border border-rose-200";
                  icon = <XCircle className="h-3.5 w-3.5" />;
                }

                return (
                  <div key={st.step} className="flex items-start gap-4 relative">
                    <div className={`z-10 flex h-6 w-6 items-center justify-center rounded-full ${badgeColor}`}>
                      {icon}
                    </div>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{st.name}</span>
                          <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[8px] font-bold text-slate-505 uppercase tracking-widest">
                            {st.role.toUpperCase()}
                          </span>
                        </div>
                        {isCompleted && (
                          <span className="text-[10px] text-slate-400">
                            Approved by <strong className="text-slate-600">{approval.approvedByName || "Agent"}</strong> on {formatDateTimeSafe(approval.timestamp)}
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[10px] text-rose-500">
                            Rejected by <strong className="text-rose-650">{approvalsHistory.find(h => h.step === st.step && h.status === "rejected")?.approvedByName || "Agent"}</strong> on {formatDateTimeSafe(approvalsHistory.find(h => h.step === st.step && h.status === "rejected")?.timestamp)}
                          </span>
                        )}
                      </div>
                      
                      {approval?.comment && (
                        <div className="mt-1 flex items-start gap-1 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 max-w-md">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                          <span>"{approval.comment}"</span>
                        </div>
                      )}

                      {isRejected && (
                        <div className="mt-1 flex items-start gap-1 text-[10px] text-rose-600 bg-rose-50 border border-rose-105 rounded-lg p-2 max-w-md">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>
                            Rejected: "{approvalsHistory.find(h => h.step === st.step && h.status === "rejected")?.comment}"
                          </span>
                        </div>
                      )}

                      {!isCompleted && !isCurrent && !isRejected && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Awaiting previous reviewer sign-off.</p>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

        </div>

        {/* Right Column: Review Action panel */}
        <div className="space-y-6">
          
          {/* Action Form Panel */}
          {isRequiredReviewer && (
            <div className="glass-card p-5 bg-white border-slate-200 shadow-md space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="h-4.5 w-4.5 text-slate-600" />
                <span>Signature Action Required</span>
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                As <strong className="text-slate-800 capitalize">{currentRole}</strong>, you must sign off or reject this file.
              </p>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1.5">Review Comment / Rejection Note</label>
                <textarea
                  placeholder="Enter details..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 outline-none focus:border-slate-400 transition"
                />
              </div>

              {actionError && (
                <div className="flex gap-1.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[10px]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p className="leading-snug">{actionError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={handleReject}
                  disabled={loadingAction}
                  className="rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs py-2.5 transition active:scale-95 disabled:opacity-40"
                >
                  Reject File
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loadingAction}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 transition active:scale-95 disabled:opacity-40"
                >
                  Approve Step
                </button>
              </div>
            </div>
          )}

          {/* Read Only Status card */}
          {!isRequiredReviewer && (
            <div className="glass-card p-5 bg-white border-slate-200 text-center space-y-2.5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">PO File Status</span>
              {po.status === "APPROVED" ? (
                <div className="text-emerald-600 flex flex-col items-center">
                  <CheckCircle className="h-7 w-7 mb-1.5" />
                  <span className="text-xs font-bold block">Document Finalized</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Approved & signed by DG. Read-only.</span>
                </div>
              ) : po.status === "REJECTED" ? (
                <div className="text-rose-600 flex flex-col items-center">
                  <XCircle className="h-7 w-7 mb-1.5" />
                  <span className="text-xs font-bold block">File Rejected</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Returned to Achats queue.</span>
                </div>
              ) : (
                <div className="text-amber-600 flex flex-col items-center">
                  <Clock className="h-7 w-7 mb-1.5 animate-pulse" />
                  <span className="text-xs font-bold block">Pending Review</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Awaiting: {po.status.replace("PENDING_", "")}</span>
                </div>
              )}
            </div>
          )}
          
        </div>

      </div>
    </div>
  </>
  );
}
