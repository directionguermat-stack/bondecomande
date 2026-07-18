"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAppStore, formatDateSafe } from "@/lib/store";
import { 
  Plus, 
  Search, 
  ArrowRight,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Download
} from "lucide-react";

export default function POList() {
  const { purchaseOrders, suppliers, currentRole } = useAppStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredPOs = purchaseOrders.filter((po) => {
    const supplierName = suppliers.find(s => s.id === po.supplierId)?.name || "";
    const searchString = `${po.poNumber || ""} ${supplierName} ${po.id}`.toLowerCase();
    if (search && !searchString.includes(search.toLowerCase())) return false;
    if (statusFilter !== "ALL" && po.status !== statusFilter) return false;
    return true;
  });

  const handleExportCSV = () => {
    if (filteredPOs.length === 0) return;
    const headers = ["PO Number", "Supplier", "Importer", "Status", "Items Count", "Grand Total", "Currency", "Created At"];
    const rows = filteredPOs.map((po) => {
      const supplierName = suppliers.find(s => s.id === po.supplierId)?.name || "Unknown Supplier";
      const importerName = po.importerDetails?.name || "Unknown Importer";
      const dateStr = formatDateSafe(po.createdAt);
      return [
        po.poNumber || "DRAFT",
        `"${supplierName.replace(/"/g, '""')}"`,
        `"${importerName.replace(/"/g, '""')}"`,
        po.status,
        po.items.length,
        po.totals.grandTotal.toFixed(2),
        po.totals.currency,
        dateStr
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PO_Archive_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-[10px] font-bold text-neutral-600">
            <FileText className="h-3 w-3" />
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
            <Clock className="h-3 w-3 animate-pulse" />
            {status.replace("PENDING_", "")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full text-neutral-850 p-2">
      
      {/* Header Section */}
      <div className="flex justify-between items-center border-b border-neutral-105 border-neutral-100 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Purchase Orders Archive</h1>
          <p className="text-xs text-neutral-500 mt-1.5 font-semibold">Manage and track procurement files at all review steps.</p>
        </div>

        {currentRole === "achats" && (
          <Link
            href="/purchase-orders/create"
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4.5 py-2.5 text-xs font-bold text-white shadow-md transition-premium active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create PO</span>
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white border border-neutral-100 p-4.5 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by PO number, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-4 py-2.5 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all w-full sm:w-48 font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Drafts</option>
            <option value="PENDING_COMMERCIAL">Pending Commercial</option>
            <option value="PENDING_JURIDIQUE">Pending Legal</option>
            <option value="PENDING_COMPTABILITE">Pending Accounting</option>
            <option value="PENDING_FINANCE">Pending Finance</option>
            <option value="PENDING_DG">Pending DG</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredPOs.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white px-4 py-2.5 text-xs font-bold text-slate-750 transition active:scale-95 shadow-sm w-full sm:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4 text-emerald-600" />
          <span>Export Excel/CSV</span>
        </button>
      </div>

      {/* Table List Container */}
      <div className="premium-card overflow-hidden">
        {filteredPOs.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <FileSpreadsheet className="h-12 w-12 text-neutral-200 mx-auto mb-3" />
            <p className="text-xs font-bold">No purchase orders found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest bg-neutral-50/40">
                  <th className="px-6 py-4.5">PO Number</th>
                  <th className="px-6 py-4.5">Supplier</th>
                  <th className="px-6 py-4.5 hidden sm:table-cell">Created By</th>
                  <th className="px-6 py-4.5 hidden md:table-cell">Date Created</th>
                  <th className="px-6 py-4.5">Grand Total</th>
                  <th className="px-6 py-4.5">Status</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-700">
                {filteredPOs.map((po) => {
                  const supplier = suppliers.find(s => s.id === po.supplierId);
                  return (
                    <tr key={po.id} className="hover:bg-neutral-50/20 transition-premium">
                      <td className="px-6 py-5 font-black text-neutral-900">
                        {po.poNumber || `Draft-#${po.id.slice(0, 6)}`}
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-extrabold text-neutral-850 block">{supplier?.name || "Loading..."}</span>
                        <span className="text-[9px] text-neutral-450 font-bold block mt-0.5">{supplier?.country}</span>
                      </td>
                      <td className="px-6 py-5 hidden sm:table-cell">
                        <span className="font-extrabold text-neutral-850 block">{po.createdByName || "Responsable Achats"}</span>
                        <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">{po.createdByEmail || "achats@importalger.dz"}</span>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell text-neutral-400 font-bold">
                        {formatDateSafe(po.createdAt)}
                      </td>
                      <td className="px-6 py-5 font-black text-neutral-900">
                        {po.totals.grandTotal.toFixed(2)} {po.totals.currency}
                      </td>
                      <td className="px-6 py-5">{getStatusBadge(po.status)}</td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/purchase-orders/${po.id}`}
                          className="inline-flex items-center gap-1 text-neutral-950 font-black hover:text-indigo-600 transition-colors"
                        >
                          <span>Review File</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
