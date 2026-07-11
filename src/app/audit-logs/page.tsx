"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { 
  Activity, 
  User, 
  Clock, 
  ShieldAlert
} from "lucide-react";

export default function AuditLogsList() {
  const { auditLogs, currentRole } = useAppStore();

  if (currentRole !== "admin" && currentRole !== "dg" && currentRole !== "comptabilite") {
    return (
      <div className="flex flex-col items-center justify-center h-96 max-w-xl mx-auto text-center text-slate-800">
        <ShieldAlert className="h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Audit logs are restricted to <strong className="text-slate-800">Admin</strong>, <strong className="text-slate-800">Comptabilité</strong>, and <strong className="text-slate-800">DG</strong> profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full text-slate-800">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">System Audit Logs</h1>
        <p className="text-xs text-slate-500 font-medium">Immutable chronological history of workflow transactions and security logs.</p>
      </div>

      {/* Logs Table / List */}
      <div className="glass-card p-6 bg-white border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3.5 mb-5">
          <Activity className="h-4.5 w-4.5 text-slate-650" />
          <h2 className="text-sm font-bold text-slate-900">Immutable Log Trail</h2>
        </div>

        {auditLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="text-xs font-semibold">No entries recorded yet. Perform PO changes to populate logs.</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {auditLogs.map((log) => {
              const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
              
              let actionTitle = log.action;
              let detailText = "";
              if (log.action === "PO_DRAFT_CREATED") {
                actionTitle = "PO Draft Created";
                detailText = `Draft PO created (ID: ${log.details.poId?.slice(0, 8)})`;
              } else if (log.action === "PO_SUBMITTED_FOR_APPROVAL") {
                actionTitle = "PO Submitted for Approval";
                detailText = `Stock reserved and workflow step 1 (Commercial) initiated (ID: ${log.details.poId?.slice(0, 8)})`;
              } else if (log.action === "PO_APPROVED_STEP") {
                actionTitle = "PO Step Approved";
                detailText = `Reviewer approved Step ${log.details.step}. Comment: "${log.details.comment}"`;
              } else if (log.action === "PO_FINAL_APPROVED") {
                actionTitle = "PO Final Approved";
                detailText = `DG signed off PO. Official PO Number generated and stock permanently deducted.`;
              } else if (log.action === "PO_REJECTED") {
                actionTitle = "PO Rejected";
                detailText = `Reviewer rejected PO at Step ${log.details.step}. Reason: "${log.details.comment}"`;
              } else if (log.action === "IMPORT_DOCUMENT_UPLOADED") {
                actionTitle = "Import Document Uploaded";
                detailText = `Uploaded document '${log.details.docKey}' for stage '${log.details.stageKey.replace("STAGE", "Step")}'.`;
              } else if (log.action === "MANUAL_DEADLINE_CRON_SIMULATED") {
                actionTitle = "SLA Deadline Scanner Simulated";
                detailText = `Manual scan of import tracking deadlines triggered.`;
              }

              return (
                <div key={log.id} className="flex items-start gap-4 relative">
                  <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <User className="h-3 w-3" />
                  </div>
                  <div className="flex-1 bg-slate-50/50 border border-slate-150 rounded-xl p-4 text-xs space-y-1.5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                      <span className="font-bold text-slate-900 text-[13px]">{actionTitle}</span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{date.toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-slate-650 leading-relaxed text-[11px]">{detailText}</p>

                    <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-400 font-semibold border-t border-slate-150">
                      <span>USER: <strong className="text-slate-600">{log.userEmail}</strong></span>
                      <span>IP: <strong className="text-slate-600">197.200.15.42</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
