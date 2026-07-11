"use client";

import { PurchaseOrder, POApproval, Supplier, formatDateSafe, formatDateTimeSafe, useAppStore } from "@/lib/store";

interface PrintablePOProps {
  po: PurchaseOrder;
  supplier: Supplier | undefined;
  approvalsHistory: POApproval[];
  printMode: "internal" | "supplier";
}

export default function PrintablePO({ po, supplier, approvalsHistory, printMode }: PrintablePOProps) {
  const { products } = useAppStore();
  const getApproval = (step: number) => approvalsHistory.find(h => h.step === step && h.status === "approved");

  const achatsApproval = approvalsHistory.find(h => h.role === "achats") || {
    approvedBy: po.createdBy,
    approvedByName: po.createdByName || "",
    timestamp: po.createdAt
  };
  const commercialApproval = getApproval(1);
  const juridiqueApproval = getApproval(2);
  const comptabiliteApproval = getApproval(3);
  const financeApproval = getApproval(4);
  const dgApproval = getApproval(5);

  const formatApprovalDate = (timestampVal: any) => {
    return formatDateTimeSafe(timestampVal);
  };

  return (
    <div className="hidden print:block w-[210mm] min-h-[297mm] bg-white text-black p-[15mm] text-xs font-sans leading-normal">
      
      {/* 1. Header Box */}
      <div className="border border-slate-400 flex mb-5 h-[35mm]">
        {/* Left Side: Logo */}
        <div className="w-1/2 flex flex-col justify-center items-center border-r border-slate-400 p-4 text-center">
          <img src={po.importerDetails?.logoUrl || "/logos/logo gm.jpg"} alt="Company Logo" className="max-h-[30mm] max-w-full object-contain" />
        </div>
        {/* Right Side: Header Info */}
        <div className="w-1/2 bg-[#1e2e3d] text-white p-4 flex flex-col justify-between">
          <h1 className="text-sm font-bold tracking-tight uppercase leading-snug">
            PURCHASE ORDER
          </h1>
          <div className="text-right text-[10px] space-y-0.5 mt-2">
            <div>PO No: <span className="font-bold">{po.poNumber || "PO-2026-XXX"}</span></div>
            <div>Date: <span className="font-medium">{formatDateSafe(po.createdAt)}</span></div>
            <div>Currency: <span className="font-medium">{po.currency || po.totals.currency}</span></div>
            <div>Incoterm: <span className="font-medium">{po.incoterm || "FOB / CIF"}</span></div>
            <div>Bank: <span className="font-bold uppercase text-amber-400">{po.bankName || "BNA"}</span></div>
          </div>
        </div>
      </div>

      {/* 2. Importer & Supplier Information Box */}
      <div className="grid grid-cols-2 border border-slate-400 divide-x divide-slate-400 mb-5">
        {/* Importer Section */}
        <div className="p-4 space-y-1">
          <h2 className="font-bold text-[10px] text-[#1e2e3d] uppercase tracking-wider mb-2">1. IMPORTER (BUYER)</h2>
          <div><strong>Company Name:</strong> {po.importerDetails?.name || "groupe guermat"}</div>
          <div><strong>NIF:</strong> {po.importerDetails?.nif || "002016099023456"}</div>
          <div><strong>RC No:</strong> {po.importerDetails?.rc || "16/00-0987654B20"}</div>
          <div><strong>Address:</strong> {po.importerDetails?.address || "Alger, Algérie"}</div>
          <div><strong>Contact:</strong> {po.importerDetails?.contact || "contact@guermat.dz"}</div>
        </div>
        {/* Supplier Section */}
        <div className="p-4 space-y-1">
          <h2 className="font-bold text-[10px] text-[#1e2e3d] uppercase tracking-wider mb-2">2. SUPPLIER</h2>
          <div><strong>Company Name:</strong> {po.supplierDetails?.name || supplier?.name || "ValvoSpares SRL"}</div>
          <div><strong>Address:</strong> {po.supplierDetails?.address || supplier?.bankDetails?.bankName || "Industrial Zone Area, Milan"}</div>
          <div><strong>Country of Origin:</strong> {po.supplierDetails?.country || supplier?.country || "Italy"}</div>
          <div><strong>Email:</strong> {po.supplierDetails?.email || supplier?.contactEmail || "export@valvospares.it"}</div>
          <div><strong>Tel / Fax:</strong> {po.supplierDetails?.phone || "+39 02 123 4567"}</div>
        </div>
      </div>

      {/* 3. Items Table */}
      <table className="w-full border-collapse border border-slate-400 mb-5">
        <thead>
          <tr className="bg-[#2a4356] text-white text-[10px] font-bold uppercase tracking-wider">
            <th className="border border-slate-400 px-3 py-2 text-left">Item Code</th>
            <th className="border border-slate-400 px-3 py-2 text-left w-1/2">Description of Goods</th>
            <th className="border border-slate-400 px-3 py-2 text-center">Quantity</th>
            <th className="border border-slate-400 px-3 py-2 text-right">Unit Price</th>
            <th className="border border-slate-400 px-3 py-2 text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-400 text-[10px]">
          {po.items.map((item, index) => {
            const product = products.find(p => p.id === item.productId || p.sku === item.sku);
            const unit = item.unit || product?.unit || "";
            return (
              <tr key={index}>
                <td className="border border-slate-400 px-3 py-2 font-mono">{item.sku}</td>
                <td className="border border-slate-400 px-3 py-2">{item.name}</td>
                <td className="border border-slate-400 px-3 py-2 text-center font-semibold">{item.qty} {unit}</td>
                <td className="border border-slate-400 px-3 py-2 text-right">{item.price.toFixed(2)} {unit ? `/ ${unit}` : ""}</td>
                <td className="border border-slate-400 px-3 py-2 text-right font-bold">{item.total.toFixed(2)}</td>
              </tr>
            );
          })}
          {/* Fill empty rows to match screenshot height (optional, 2-3 empty rows look neat) */}
          <tr>
            <td className="border border-slate-400 px-3 py-3"></td>
            <td className="border border-slate-400 px-3 py-3"></td>
            <td className="border border-slate-400 px-3 py-3"></td>
            <td className="border border-slate-400 px-3 py-3"></td>
            <td className="border border-slate-400 px-3 py-3"></td>
          </tr>
          {/* Subtotal row */}
          <tr className="bg-slate-50 font-bold">
            <td colSpan={3} className="border border-slate-400 text-right px-3 py-2 uppercase tracking-wide">TOTAL Excl. Tax:</td>
            <td colSpan={2} className="border border-slate-400 text-right px-3 py-2 text-xs font-black">{po.totals.subtotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Grand total right summary */}
      <div className="text-right text-xs font-extrabold mb-6">
        <span>GRAND TOTAL : </span>
        <span className="text-sm font-black border-b border-slate-800 pb-0.5">{po.totals.grandTotal.toFixed(2)} {po.totals.currency}</span>
      </div>

      {/* 4. Payment Terms Section */}
      <div className="space-y-1 mb-6">
        <h3 className="font-bold text-[10px] text-[#1e2e3d] uppercase tracking-wider mb-2">3. GENERAL TERMS OF DELIVERY & PAYMENT</h3>
        <ul className="list-disc list-inside text-[10px] text-slate-650 space-y-0.5 italic">
          <li><strong>Payment Terms:</strong> {po.paymentTerms}</li>
          <li><strong>Delivery Terms:</strong> FCL sea shipment. Required loading port as indicated on customs documents.</li>
          <li><strong>Required documents for clearance:</strong> Commercial invoice, Certificate of origin, Bill of Lading (B/L), Packing list.</li>
        </ul>
      </div>

      {/* 5. Approvals Signatures Grid (Circuits des Visas) */}
      {printMode === "internal" && (
        <div className="space-y-3">
          <h3 className="font-bold text-[10px] text-[#1e2e3d] uppercase tracking-wider">
            4. APPROVAL & VISA WORKFLOW (AUTHORIZED SIGNATURES)
          </h3>
          
          <div className="grid grid-cols-3 border border-slate-400 divide-x divide-slate-400">
            
            {/* Block 1: Service Achats (Creator) */}
            <div className="p-2.5 space-y-0.5 min-h-[22mm] border-b border-slate-400">
              <div className="font-bold text-[9px] text-[#1e2e3d] mb-1">■ 1. Procurement Department</div>
              <div>Name: <span className="font-semibold">{achatsApproval?.approvedByName || po.createdByName || (achatsApproval?.approvedBy ? "Ahmed Benali" : "")}</span></div>
              <div>Title: <span className="font-semibold">Procurement Officer</span></div>
              <div>Date: <span className="font-semibold">{formatApprovalDate(achatsApproval?.timestamp)}</span></div>
              <div>Signature: <span className="text-[9px] font-bold text-emerald-600 uppercase">{achatsApproval?.approvedBy ? "✓ Signed" : ""}</span></div>
            </div>

            {/* Block 2: Commercial */}
            <div className="p-2.5 space-y-0.5 min-h-[22mm] border-b border-slate-400">
              <div className="font-bold text-[9px] text-[#1e2e3d] mb-1">■ 2. Commercial Department</div>
              <div>Name: <span className="font-semibold">{commercialApproval?.approvedByName || (commercialApproval ? "Malik Mansouri" : "")}</span></div>
              <div>Title: <span className="font-semibold">{commercialApproval ? "Commercial Director" : ""}</span></div>
              <div>Date: <span className="font-semibold">{formatApprovalDate(commercialApproval?.timestamp)}</span></div>
              <div>Signature: <span className="text-[9px] font-bold text-emerald-600 uppercase">{commercialApproval ? "✓ Approved" : ""}</span></div>
            </div>

            {/* Block 3: Juridique */}
            <div className="p-2.5 space-y-0.5 min-h-[22mm] border-b border-slate-400">
              <div className="font-bold text-[9px] text-[#1e2e3d] mb-1">■ 3. Legal Department</div>
              <div>Name: <span className="font-semibold">{juridiqueApproval?.approvedByName || (juridiqueApproval ? "Sonia Haddad" : "")}</span></div>
              <div>Title: <span className="font-semibold">{juridiqueApproval ? "Legal Advisor" : ""}</span></div>
              <div>Date: <span className="font-semibold">{formatApprovalDate(juridiqueApproval?.timestamp)}</span></div>
              <div>Signature: <span className="text-[9px] font-bold text-emerald-600 uppercase">{juridiqueApproval ? "✓ Cleared" : ""}</span></div>
            </div>

            {/* Block 4: Comptabilité */}
            <div className="p-2.5 space-y-0.5 min-h-[22mm]">
              <div className="font-bold text-[9px] text-[#1e2e3d] mb-1">■ 4. Accounting Department</div>
              <div>Name: <span className="font-semibold">{comptabiliteApproval?.approvedByName || (comptabiliteApproval ? "Reda Lounes" : "")}</span></div>
              <div>Title: <span className="font-semibold">{comptabiliteApproval ? "Chief Accountant" : ""}</span></div>
              <div>Date: <span className="font-semibold">{formatApprovalDate(comptabiliteApproval?.timestamp)}</span></div>
              <div>Signature: <span className="text-[9px] font-bold text-emerald-600 uppercase">{comptabiliteApproval ? "✓ Audited" : ""}</span></div>
            </div>

            {/* Block 5: Finance */}
            <div className="p-2.5 space-y-0.5 min-h-[22mm]">
              <div className="font-bold text-[9px] text-[#1e2e3d] mb-1">■ 5. Finance Department</div>
              <div>Name: <span className="font-semibold">{financeApproval?.approvedByName || (financeApproval ? "Yacine Belkacem" : "")}</span></div>
              <div>Title: <span className="font-semibold">{financeApproval ? "Treasury Manager" : ""}</span></div>
              <div>Date: <span className="font-semibold">{formatApprovalDate(financeApproval?.timestamp)}</span></div>
              <div>Signature: <span className="text-[9px] font-bold text-emerald-600 uppercase">{financeApproval ? "✓ Released" : ""}</span></div>
            </div>

            {/* Block 6: Direction Générale */}
            <div className="p-2.5 space-y-0.5 min-h-[22mm]">
              <div className="font-bold text-[9px] text-[#1e2e3d] mb-1">■ 6. General Management</div>
              <div>Name: <span className="font-semibold">{dgApproval?.approvedByName || (dgApproval ? "Karim Ould-Abbas" : "")}</span></div>
              <div>Title: <span className="font-semibold">{dgApproval ? "General Manager" : ""}</span></div>
              <div>Date: <span className="font-semibold">{formatApprovalDate(dgApproval?.timestamp)}</span></div>
              <div>Signature: <span className="text-[9px] font-bold text-emerald-600 uppercase">{dgApproval ? "✓ Executed" : ""}</span></div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
