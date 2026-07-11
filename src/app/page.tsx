"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { 
  FileCheck2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle,
  Bell
} from "lucide-react";

export default function Dashboard() {
  const { 
    currentRole, 
    purchaseOrders, 
    importTrackings, 
    notifications, 
    simulateDailyCron 
  } = useAppStore();

  const [cronRunning, setCronRunning] = useState(false);

  // Calculate KPIs
  const totalApproved = purchaseOrders.filter(p => p.status === "APPROVED").length;
  
  const pendingForRole = purchaseOrders.filter(p => {
    if (currentRole === "commercial" && p.status === "PENDING_COMMERCIAL") return true;
    if (currentRole === "juridique" && p.status === "PENDING_JURIDIQUE") return true;
    if (currentRole === "comptabilite" && p.status === "PENDING_COMPTABILITE") return true;
    if (currentRole === "finance" && p.status === "PENDING_FINANCE") return true;
    if (currentRole === "dg" && p.status === "PENDING_DG") return true;
    return false;
  });

  const overdueCount = Object.values(importTrackings).filter(t => t.overallStatus === "overdue").length;
  const activeImports = Object.values(importTrackings).filter(t => t.overallStatus === "on_track").length;
  const actionRequiredPOs = pendingForRole;
  const myNotifications = notifications
    .filter(n => n.recipientRole === currentRole || n.recipientRole === "all")
    .slice(0, 5);

  const handleRunCron = async () => {
    setCronRunning(true);
    try {
      await simulateDailyCron();
    } catch (e) {
      console.error(e);
    } finally {
      setCronRunning(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full text-neutral-800 p-2">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Control Dashboard
          </h1>
          <p className="text-neutral-500 text-xs mt-1.5 font-medium">
            Monitor and sign procurement files and downstream import operations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCron}
            disabled={cronRunning}
            className="flex items-center gap-2 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200/80 px-4.5 py-2.5 text-xs font-bold text-neutral-600 shadow-sm transition-premium active:scale-95 disabled:opacity-50"
          >
            <Clock className="h-4 w-4 text-neutral-400" />
            <span>{cronRunning ? "Scanning..." : "SLA Scan check"}</span>
          </button>

          {currentRole === "achats" && (
            <Link
              href="/purchase-orders/create"
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4.5 py-2.5 text-xs font-bold text-white shadow-md transition-premium active:scale-95"
            >
              <Zap className="h-4 w-4 fill-current" />
              <span>Create Order</span>
            </Link>
          )}
        </div>
      </div>

      {/* Premium KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Waiting Approval */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Action Queue</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <span className="text-3xl font-black block text-neutral-950 tracking-tight">{actionRequiredPOs.length}</span>
          <span className="text-[10px] text-neutral-400 font-bold mt-2.5 block">Awaiting your approval step</span>
        </div>

        {/* KPI 2: Active Imports */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Active Imports</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-650">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <span className="text-3xl font-black block text-neutral-950 tracking-tight">{activeImports}</span>
          <span className="text-[10px] text-neutral-400 font-bold mt-2.5 block">Shipments currently on track</span>
        </div>

        {/* KPI 3: Overdue Alerts */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">SLA Overdue</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <span className="text-3xl font-black block text-neutral-950 tracking-tight">{overdueCount}</span>
          <span className="text-[10px] text-neutral-400 font-bold mt-2.5 block">Stages exceeding SLA deadline</span>
        </div>

        {/* KPI 4: Approved POs */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Signed POs</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <span className="text-3xl font-black block text-neutral-950 tracking-tight">{totalApproved}</span>
          <span className="text-[10px] text-neutral-400 font-bold mt-2.5 block">Fully signed purchase orders</span>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Action Queue & Overdue steps */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Action Queue */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
              <h2 className="text-xs font-extrabold text-neutral-900 flex items-center gap-2 uppercase tracking-wider">
                <CheckCircle className="h-4.5 w-4.5 text-neutral-500" />
                <span>Pending Approvals</span>
              </h2>
              <span className="rounded-full bg-neutral-55 bg-neutral-100 px-3 py-1 text-[10px] font-black text-neutral-600">
                {actionRequiredPOs.length} Pending
              </span>
            </div>

            {actionRequiredPOs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/20">
                <p className="text-xs text-neutral-400 font-bold">All clear! No orders currently require your signature.</p>
              </div>
            ) : (
              <div className="border border-neutral-100 rounded-2xl divide-y divide-neutral-100 overflow-hidden bg-white shadow-sm">
                {actionRequiredPOs.map((po) => (
                  <div key={po.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4.5 hover:bg-neutral-50/40 transition-premium">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-neutral-900">
                          {po.poNumber || `TempRef-#${po.id.slice(0, 6)}`}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[9px] font-black text-amber-700 border border-amber-200">
                          Step {po.currentApprovalStep}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-bold">
                        Company: <span className="text-neutral-700">{po.importerDetails?.name || "SARL IMPORT"}</span> | Grand Total: <span className="text-neutral-900 font-black">{po.totals.grandTotal.toFixed(2)} {po.totals.currency}</span>
                      </p>
                    </div>
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="mt-3 sm:mt-0 flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition-premium shadow-sm active:scale-95"
                    >
                      <span>Review & Sign</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Overdue Import steps */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
              <h2 className="text-xs font-extrabold text-neutral-900 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                <span>Overdue Import Steps</span>
              </h2>
            </div>

            {overdueCount === 0 ? (
              <div className="text-center py-12 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/20">
                <p className="text-xs text-neutral-400 font-bold">All active imports are running on track.</p>
              </div>
            ) : (
              <div className="border border-neutral-150 rounded-2xl divide-y divide-rose-100/50 overflow-hidden bg-white shadow-sm">
                {Object.values(importTrackings)
                  .filter(t => t.overallStatus === "overdue")
                  .map((t) => {
                    const currentStageData = t.stages[t.currentStage as keyof typeof t.stages];
                    return (
                      <div key={t.id} className="flex justify-between items-center p-4.5 bg-rose-50/5 hover:bg-rose-50/10 transition-premium text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-black text-neutral-900">{t.poNumber}</span>
                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[9px] font-black text-rose-700 border border-rose-150">
                              {currentStageData?.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400 font-bold">
                            Deadline exceeded: <span className="font-black text-rose-600">{new Date(currentStageData?.deadline || "").toLocaleDateString()}</span>
                          </p>
                        </div>
                        <Link
                          href={`/import-tracking/${t.id}`}
                          className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white transition-premium shadow-sm active:scale-95"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Notifications & guide info */}
        <div className="space-y-8">
          {/* Notifications */}
          <div className="premium-card p-6">
            <h2 className="text-xs font-extrabold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-4 mb-4 uppercase tracking-wider">
              <Bell className="h-4.5 w-4.5 text-neutral-500" />
              <span>System Notifications</span>
            </h2>

            {myNotifications.length === 0 ? (
              <p className="text-xs text-neutral-400 py-8 text-center font-bold">No recent notifications.</p>
            ) : (
              <div className="border border-neutral-100 rounded-2xl divide-y divide-neutral-100 overflow-hidden bg-white shadow-sm">
                {myNotifications.map((n) => (
                  <div key={n.id} className="p-4 hover:bg-neutral-50/30 transition-premium text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-neutral-850">{n.title}</span>
                      <span className="text-[9px] text-neutral-400 font-bold">
                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString() : "Just Now"}
                      </span>
                    </div>
                    <p className="text-neutral-500 leading-relaxed text-[11px] font-semibold">{n.message}</p>
                    <div className="pt-2">
                      <Link
                        href={n.targetPath}
                        className="inline-flex items-center gap-1 text-neutral-950 font-black hover:text-indigo-600 transition-colors text-[10px]"
                      >
                        <span>Action Link</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guidebox */}
          <div className="premium-card p-6 space-y-3.5 text-xs">
            <div className="flex items-center gap-2 text-neutral-900 font-extrabold uppercase tracking-wider border-b border-neutral-100 pb-2">
              <ShieldCheck className="h-4.5 w-4.5 text-neutral-500" />
              <span>Simulating Workflow</span>
            </div>
            <p className="text-neutral-500 leading-relaxed font-semibold">
              This system uses real-time sync with your Firestore collection. Switch simulator roles in the bottom sidebar:
            </p>
            <ul className="list-disc list-inside text-neutral-500 space-y-2 mt-2 font-bold">
              <li><strong className="text-neutral-700">Achats</strong> to draft and submit a PO.</li>
              <li><strong className="text-neutral-700">Commercial / Finance / DG</strong> roles to approve or reject POs.</li>
              <li><strong className="text-neutral-700">Logistics</strong> & <strong className="text-neutral-700">Finance</strong> to upload import documents.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
