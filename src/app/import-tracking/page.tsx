"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { 
  Search, 
  Ship, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Download,
  FileSpreadsheet,
  Printer,
  ChevronDown
} from "lucide-react";

export default function ImportTrackingList() {
  const { importTrackings, purchaseOrders } = useAppStore();
  const [search, setSearch] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const trackings = Object.values(importTrackings);

  const filteredTrackings = trackings.filter(t => {
    const searchString = `${t.poNumber} ${t.poId}`.toLowerCase();
    if (search && !searchString.includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-250 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-250 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-700">
            <Clock className="h-3 w-3 animate-pulse" />
            On Track
          </span>
        );
    }
  };

  const getDaysRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      return <span className="text-rose-600 font-bold">Overdue by {Math.abs(days)} days</span>;
    }
    return <span className="text-slate-700 font-bold">{days} days remaining</span>;
  };

  // Helper function to calculate days at bank
  const getDaysAtBank = (status: string, arrivalDate: string) => {
    if (status !== "Arrivé" || !arrivalDate) return null;
    const tArrival = new Date(arrivalDate).getTime();
    const tNow = new Date();
    tNow.setHours(0, 0, 0, 0);
    const nowTime = tNow.getTime();
    const diff = Math.max(0, Math.ceil((nowTime - tArrival) / (1000 * 60 * 60 * 24)));
    return diff;
  };

  // --- XLS EXPORT FUNCTION (FULLY STYLED ENTERPRISE EXCEL SHEET) ---
  const exportToXLSX = (list: any[], filename = "imports_pipeline_report.xls") => {
    const headers = [
      "PO Number",
      "Société (Importer)",
      "Fournisseur (Supplier)",
      "Banque Domiciliataire",
      "Overall Status",
      "Current Active Stage",
      "Milestone Deadline",
      "Proforma Invoice #",
      "Proforma Date",
      "Proforma Amount (EUR)",
      "Booking Reference #",
      "Pré-dom Number (ALGEX)",
      "ALGEX Date",
      "Bank Domiciliation #",
      "Bank Domiciliation Date",
      "BL Number (Shipping)",
      "Port of Entry",
      "Shipping Depart (ETD)",
      "Expected Arrival (ETA)",
      "N° DHL",
      "État DHL / Banque",
      "Date Envoi DHL",
      "Date Arrivée Banque",
      "Jours au Banque"
    ];

    const rowsHTML = list.map(t => {
      const po = purchaseOrders.find(p => p.id === t.poId);
      const s1 = t.stages?.STAGE1_BOOKING_PROFORMA?.meta || {};
      const s2 = t.stages?.STAGE2_PRE_DOMICILIATION?.meta || {};
      const s3 = t.stages?.STAGE3_DOMICILIATION_BANCAIRE?.meta || {};
      const s4 = t.stages?.STAGE4_SHIPMENT?.meta || {};

      let statusStyle = "background-color: #e0f2fe; color: #075985;";
      if (t.overallStatus === "completed") {
        statusStyle = "background-color: #d1fae5; color: #065f46;";
      } else if (t.overallStatus === "overdue") {
        statusStyle = "background-color: #fee2e2; color: #991b1b;";
      }

      // Calculate days at bank if arrived
      let daysAtBankStr = "N/A";
      if (s4.bankFileStatus === "Arrivé" && s4.bankArrivalDate) {
        const days = getDaysAtBank(s4.bankFileStatus, s4.bankArrivalDate);
        daysAtBankStr = days !== null ? `${days} jours` : "N/A";
      }

      return `
        <tr>
          <td style="font-weight: bold; color: #0f172a; border: 1px solid #cbd5e1; padding: 8px;">${t.poNumber || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${po?.importerDetails?.name || "groupe guermat"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${po?.supplierDetails?.name || "N/A"}</td>
          <td style="font-weight: bold; color: #0284c7; text-transform: uppercase; border: 1px solid #cbd5e1; padding: 8px;">${po?.bankName || "BNA"}</td>
          <td style="${statusStyle} font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${t.overallStatus.toUpperCase()}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${t.currentStage === "COMPLETED" ? "Completed" : (t.stages[t.currentStage]?.name || t.currentStage)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${t.stages[t.currentStage]?.deadline ? new Date(t.stages[t.currentStage].deadline).toLocaleDateString() : "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s1.proformaNum || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s1.proformaDate || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s1.proformaAmount || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s1.bookingNum || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s2.domiciliationNumber || s2.predomiciliationNum || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s2.algexDate || s2.algexName || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s3.domNum || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s3.domDate || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s4.blNum || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s4.port || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s4.departureDate || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s4.expectedArrivalDate || "N/A"}</td>
          <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; color: #475569;">${s4.dhlNum || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 500;">${s4.bankFileStatus || "En chemin"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s4.dhlSendDate || "N/A"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${s4.bankArrivalDate || "N/A"}</td>
          <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; color: #1e3a8a; text-align: center;">${daysAtBankStr}</td>
        </tr>
      `;
    }).join("");

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            th { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 11px; text-transform: uppercase; border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            td { font-size: 11px; border: 1px solid #cbd5e1; padding: 8px; color: #334155; }
            .title-row { font-size: 18px; font-weight: 800; color: #0f172a; padding: 15px 0; border: none; }
            .sub-title { font-size: 11px; color: #64748b; font-weight: 500; border: none; padding-bottom: 10px; }
          </style>
        </head>
        <body>
          <table>
            <tr>
              <td colspan="24" class="title-row">SARL IMPORT ENTERPRISE REGISTRY</td>
            </tr>
            <tr>
              <td colspan="24" class="sub-title">Exported on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | Active Import Pipeline Tracking</td>
            </tr>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PDF PIPELINE REPORT GENERATOR (PRINT WINDOW STYLED) ---
  const exportPDFReport = (list: any[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHTML = list.map(t => {
      const po = purchaseOrders.find(p => p.id === t.poId);
      const s1 = t.stages?.STAGE1_BOOKING_PROFORMA?.meta || {};
      const s2 = t.stages?.STAGE2_PRE_DOMICILIATION?.meta || {};
      const s3 = t.stages?.STAGE3_DOMICILIATION_BANCAIRE?.meta || {};
      const s4 = t.stages?.STAGE4_SHIPMENT?.meta || {};

      let daysAtBankStr = "N/A";
      if (s4.bankFileStatus === "Arrivé" && s4.bankArrivalDate) {
        const days = getDaysAtBank(s4.bankFileStatus, s4.bankArrivalDate);
        daysAtBankStr = days !== null ? `${days} jours` : "N/A";
      }

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${t.poNumber || "N/A"}</td>
          <td style="padding: 10px; color: #475569;">${po?.importerDetails?.name || "groupe guermat"}</td>
          <td style="padding: 10px; font-weight: bold; color: #0284c7; text-transform: uppercase;">${po?.bankName || "BNA"}</td>
          <td style="padding: 10px;">
            <span style="padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${t.overallStatus === "completed" ? "#d1fae5; color: #065f46" : (t.overallStatus === "overdue" ? "#fee2e2; color: #991b1b" : "#e0f2fe; color: #075985")};">
              ${t.overallStatus}
            </span>
          </td>
          <td style="padding: 10px; font-weight: 600; color: #475569;">${t.currentStage === "COMPLETED" ? "Completed" : (t.stages[t.currentStage]?.name || t.currentStage)}</td>
          <td style="padding: 10px; color: #64748b;">${s1.proformaNum || "N/A"}</td>
          <td style="padding: 10px; color: #64748b;">${s2.domiciliationNumber || s2.predomiciliationNum || "N/A"}</td>
          <td style="padding: 10px; color: #64748b;">${s3.domNum || "N/A"}</td>
          <td style="padding: 10px; color: #64748b;">${s4.blNum || "N/A"}</td>
          <td style="padding: 10px; color: #0f172a; font-weight: bold;">${s4.port || "N/A"}</td>
          <td style="padding: 10px; color: #64748b;">${s4.dhlNum || "N/A"}</td>
          <td style="padding: 10px; font-weight: 600; color: #475569;">${s4.bankFileStatus || "En chemin"}</td>
          <td style="padding: 10px; font-weight: bold; color: #1e3a8a; text-align: center;">${daysAtBankStr}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Import Pipeline Status Report</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #334155; background: #fff; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .report-title { font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .report-meta { font-size: 10px; text-align: right; color: #64748b; line-height: 1.5; }
            .stats-container { display: flex; gap: 15px; margin-bottom: 30px; }
            .stat-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; background: #f8fafc; }
            .stat-value { font-size: 20px; font-weight: 800; color: #0f172a; }
            .stat-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.5px; }
            .main-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; margin-top: 10px; }
            .main-table th { background: #0f172a; color: white; padding: 12px 10px; font-size: 9px; text-transform: uppercase; font-weight: 700; text-align: left; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="report-title">Import Pipeline Status Report</div>
                <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 500;">SARL IMPORT ENTERPRISE REGISTRY</div>
              </td>
              <td class="report-meta">
                <div>Date of Export: <strong>${new Date().toLocaleDateString()}</strong></div>
                <div>Time: <strong>${new Date().toLocaleTimeString()}</strong></div>
                <div>Status: <strong style="color: #0284c7;">Active Pipeline</strong></div>
              </td>
            </tr>
          </table>

          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-value">${list.length}</div>
              <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-box">
              <div class="stat-value" style="color: #be123c;">${list.filter(t => t.overallStatus === "overdue").length}</div>
              <div class="stat-label">SLA Overdue</div>
            </div>
            <div class="stat-box">
              <div class="stat-value" style="color: #15803d;">${list.filter(t => t.overallStatus === "completed").length}</div>
              <div class="stat-label">Completed Files</div>
            </div>
            <div class="stat-box">
              <div class="stat-value" style="color: #0369a1;">${list.filter(t => t.overallStatus === "on_track" || t.overallStatus === "pending").length}</div>
              <div class="stat-label">On Track</div>
            </div>
          </div>

          <table class="main-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Société</th>
                <th>Banque</th>
                <th>Overall Status</th>
                <th>Current Active Stage</th>
                <th>Proforma N°</th>
                <th>Pré-dom (ALGEX)</th>
                <th>Dom. Bancaire</th>
                <th>BL Number</th>
                <th>Port of Discharge</th>
                <th>N° DHL</th>
                <th>État Courier</th>
                <th>Jours au Banque</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 8px; color: #94a3b8; text-align: center; font-weight: 600; letter-spacing: 0.5px;">
            CONFIDENTIAL - FOR INTERNAL USE ONLY - GENERATED AUTOMATICALLY BY SARL IMPORT COMPLIANCE SYSTEM
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- SINGLE DOCUMENT PDF SUMMARY REPORT ---
  const exportSinglePDFReport = (t: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const po = purchaseOrders.find(p => p.id === t.poId);
    const s1 = t.stages?.STAGE1_BOOKING_PROFORMA?.meta || {};
    const s2 = t.stages?.STAGE2_PRE_DOMICILIATION?.meta || {};
    const s3 = t.stages?.STAGE3_DOMICILIATION_BANCAIRE?.meta || {};
    const s4 = t.stages?.STAGE4_SHIPMENT?.meta || {};

    const daysAtBankVal = getDaysAtBank(s4.bankFileStatus, s4.bankArrivalDate);

    printWindow.document.write(`
      <html>
        <head>
          <title>Import File Summary: ${t.poNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #334155; background: #fff; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; border-bottom: 2px solid #0f172a; padding-bottom: 15px; }
            .report-title { font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .report-meta { font-size: 10px; text-align: right; color: #64748b; line-height: 1.6; }
            .stage-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 18px; background: #f8fafc; }
            .stage-header { font-size: 11px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px; }
            .data-grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 12px 20px; font-size: 11px; }
            .data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
            .data-label { color: #64748b; font-weight: 600; }
            .data-value { color: #0f172a; font-weight: 700; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="report-title">Import Document Lifecycle Status</div>
                <div style="font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600;">File reference: <strong style="color: #0f172a;">${t.poNumber}</strong></div>
              </td>
              <td class="report-meta">
                <div>Date of Export: <strong>${new Date().toLocaleDateString()}</strong></div>
                <div style="margin-top: 5px;">File Status: <span style="padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${t.overallStatus === "completed" ? "#d1fae5; color: #065f46" : (t.overallStatus === "overdue" ? "#fee2e2; color: #991b1b" : "#e0f2fe; color: #075985")};">${t.overallStatus.toUpperCase()}</span></div>
              </td>
            </tr>
          </table>

          <!-- GENERAL METADATA -->
          <div class="stage-card" style="background: #f1f5f9; border-color: #cbd5e1;">
            <div class="stage-header" style="color: #0f172a; border-color: #cbd5e1;">General Order Details</div>
            <div class="data-grid">
              <div class="data-row"><span class="data-label">Société Importatrice:</span> <span class="data-value">${po?.importerDetails?.name || "groupe guermat"}</span></div>
              <div class="data-row"><span class="data-label">Fournisseur:</span> <span class="data-value">${po?.supplierDetails?.name || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Banque Domiciliataire:</span> <span class="data-value" style="text-transform: uppercase;">${po?.bankName || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Montant Total PO:</span> <span class="data-value">${po?.totals?.grandTotal ? po.totals.grandTotal.toFixed(2) + " " + (po.currency || "EUR") : "N/A"}</span></div>
            </div>
          </div>

          <!-- STAGE 1 -->
          <div class="stage-card">
            <div class="stage-header">Stage 1: Booking & Proforma Invoice</div>
            <div class="data-grid">
              <div class="data-row"><span class="data-label">N° Facture Proforma:</span> <span class="data-value">${s1.proformaNum || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Date Facture:</span> <span class="data-value">${s1.proformaDate || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Montant Facture:</span> <span class="data-value">${s1.proformaAmount ? s1.proformaAmount + " EUR" : "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Booking Reference:</span> <span class="data-value">${s1.bookingNum || "N/A"}</span></div>
            </div>
          </div>

          <!-- STAGE 2 -->
          <div class="stage-card">
            <div class="stage-header">Stage 2: Pré-domiciliation (ALGEX)</div>
            <div class="data-grid">
              <div class="data-row"><span class="data-label">Date ALGEX:</span> <span class="data-value">${s2.algexDate || s2.algexName || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">N° Pré-dom:</span> <span class="data-value">${s2.domiciliationNumber || s2.predomiciliationNum || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Etat ALGEX:</span> <span class="data-value">${s2.predomStatus || "N/A"}</span></div>
            </div>
          </div>

          <!-- STAGE 3 -->
          <div class="stage-card">
            <div class="stage-header">Stage 3: Bank Domiciliation</div>
            <div class="data-grid">
              <div class="data-row"><span class="data-label">N° Domiciliation:</span> <span class="data-value">${s3.domNum || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Date Domiciliation:</span> <span class="data-value">${s3.domDate || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Etat du Dépôt:</span> <span class="data-value">${s3.domStatus || "N/A"}</span></div>
            </div>
          </div>

          <!-- STAGE 4 -->
          <div class="stage-card">
            <div class="stage-header">Stage 4: Custom Clearance & BL</div>
            <div class="data-grid">
              <div class="data-row"><span class="data-label">N° BL (Bill of Lading):</span> <span class="data-value">${s4.blNum || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Malo / Port:</span> <span class="data-value">${s4.port || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">ETD (Depart):</span> <span class="data-value">${s4.departureDate || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">ETA (Arrivée):</span> <span class="data-value">${s4.expectedArrivalDate || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">N° Suivi DHL:</span> <span class="data-value">${s4.dhlNum || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">État Courrier:</span> <span class="data-value">${s4.bankFileStatus || "En chemin"}</span></div>
              <div class="data-row"><span class="data-label">Date d'Envoi DHL:</span> <span class="data-value">${s4.dhlSendDate || "N/A"}</span></div>
              <div class="data-row"><span class="data-label">Reçu à la Banque:</span> <span class="data-value">${s4.bankArrivalDate || "N/A"}</span></div>
              <div class="data-row" style="grid-column: span 2; background: #e0f2fe; padding: 6px 12px; border-radius: 6px; margin-top: 5px;">
                <span class="data-label" style="color: #0369a1;">🏦 Jours en Banque (Days at Bank):</span>
                <span class="data-value" style="color: #0369a1;">
                  ${daysAtBankVal !== null ? daysAtBankVal + " jours" : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 8px; color: #94a3b8; text-align: center; font-weight: 600; letter-spacing: 0.5px;">
            CONFIDENTIAL - FOR INTERNAL USE ONLY - GENERATED AUTOMATICALLY BY SARL IMPORT COMPLIANCE SYSTEM
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-800 p-2">
      
      {/* Header and Export controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Import Tracking Pipeline</h1>
          <p className="text-xs text-slate-500 font-medium">Track downstream Algerian customs documents, pre-domiciliations, and shipping files.</p>
        </div>

        {/* Global Export Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Export Pipeline Data</span>
            <ChevronDown className="h-3.5 w-3.5 mt-0.5" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-25 text-xs font-semibold text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  exportToXLSX(filteredTrackings, "imports_pipeline_filtered.xls");
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50 hover:text-slate-950 transition"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Export Filtered List (Excel)</span>
              </button>
              
              <button
                onClick={() => {
                  exportToXLSX(trackings, "imports_pipeline_all.xls");
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50 hover:text-slate-950 transition"
              >
                <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                <span>Export All Records (Excel)</span>
              </button>

              <div className="h-px bg-slate-100 my-1"></div>

              <button
                onClick={() => {
                  exportPDFReport(filteredTrackings);
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50 hover:text-slate-950 transition"
              >
                <Printer className="h-4 w-4 text-sky-600" />
                <span>Print Filtered Status Report (PDF)</span>
              </button>

              <button
                onClick={() => {
                  exportPDFReport(trackings);
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50 hover:text-slate-950 transition"
              >
                <Printer className="h-4 w-4 text-slate-900" />
                <span>Print Full Registry Report (PDF)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-md w-full bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search imports by PO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 transition font-medium"
          />
        </div>
      </div>

      {/* Listing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTrackings.length === 0 ? (
          <div className="md:col-span-2 text-center py-14 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Ship className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold">No active imports registered. Approve a PO to initiate tracking.</p>
          </div>
        ) : (
          filteredTrackings.map((t) => {
            const currentStageData = t.stages[t.currentStage as keyof typeof t.stages];
            return (
              <div key={t.id} className="glass-card p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Import Operations File</span>
                    <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{t.poNumber}</h2>
                  </div>
                  {getStatusBadge(t.overallStatus)}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-150 text-xs space-y-2 font-medium">
                  <div className="flex justify-between text-slate-500">
                    <span>Active Stage:</span>
                    <span className="font-bold text-slate-700">
                      {t.currentStage === "COMPLETED" ? "Operations Completed" : currentStageData?.name}
                    </span>
                  </div>

                  {t.currentStage !== "COMPLETED" && currentStageData?.deadline && (
                    <div className="flex justify-between text-slate-500">
                      <span>Milestone Status:</span>
                      <span>{getDaysRemaining(currentStageData.deadline)}</span>
                    </div>
                  )}
                </div>

                {/* Card footer actions */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-100 mt-2">
                  
                  {/* Single File Export Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => exportToXLSX([t], `import_file_${t.poNumber}.xls`)}
                      title="Export single file details to Excel"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-700 bg-white hover:bg-slate-50 transition active:scale-95"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => exportSinglePDFReport(t)}
                      title="Print single PDF summary report"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 transition active:scale-95"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>

                  <Link
                    href={`/import-tracking/${t.poId}`}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                  >
                    <span>Manage Shipments</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
