"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, POItem, POTotals } from "@/lib/store";
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  FileText, 
  AlertTriangle,
  Loader2
} from "lucide-react";

export default function CreatePO() {
  const router = useRouter();
  const { suppliers, products, importers, createPO, submitPO, currentRole } = useAppStore();

  const [selectedImporterId, setSelectedImporterId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [incoterm, setIncoterm] = useState("FOB");
  const [poCurrency, setPoCurrency] = useState("EUR");
  const [items, setItems] = useState<POItem[]>([]);
  const [paymentTerms, setPaymentTerms] = useState("30% advance via bank transfer, 70% letter of credit (L/C) at sight");
  const [shippingCost, setShippingCost] = useState(1200);
  const [bankName, setBankName] = useState("Al Baraka Bank");

  // Line item drafting state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter products by selected company (importer)
  const supplierProducts = selectedImporterId
    ? products.filter(p => p.supplierId === selectedImporterId)
    : [];

  // Get active product details
  const activeProduct = products.find(p => p.id === selectedProductId);

  // Initialize default importer
  useEffect(() => {
    if (importers.length > 0 && !selectedImporterId) {
      setSelectedImporterId(importers[0].id);
    }
  }, [importers]);

  const [itemPrice, setItemPrice] = useState<number | string>("");

  // Sync draft price when product is selected
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        setItemPrice(product.price);
      }
    } else {
      setItemPrice("");
    }
  }, [selectedProductId, products]);

  // Reset items if supplier changes
  useEffect(() => {
    setItems([]);
    setSelectedProductId("");
  }, [selectedSupplierId]);

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const priceNum = parseFloat(String(itemPrice));
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Veuillez saisir un prix unitaire valide.");
      return;
    }

    // Check if qty exceeds available stock
    const existingItem = items.find(item => item.productId === selectedProductId);
    const currentQtyInPO = existingItem ? existingItem.qty : 0;
    const targetQty = currentQtyInPO + quantity;

    if (targetQty > product.availableStock) {
      setErrorMsg(`Cannot add item: requested quantity (${targetQty}) exceeds available stock (${product.availableStock})`);
      return;
    }

    setErrorMsg("");

    if (existingItem) {
      setItems(items.map(item => 
        item.productId === selectedProductId 
          ? { ...item, qty: targetQty, price: priceNum, total: targetQty * priceNum }
          : item
      ));
    } else {
      const newItem: POItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        qty: quantity,
        unit: product.unit || "pièce",
        price: priceNum,
        total: quantity * priceNum
      };
      setItems([...items, newItem]);
    }

    // Reset draft fields
    setQuantity(1);
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal + shippingCost;
  const supplier = suppliers.find(s => s.id === selectedSupplierId);

  const handleSubmit = async () => {
    if (!selectedImporterId) {
      setErrorMsg("Please select an Importer Company profile.");
      return;
    }
    if (!selectedSupplierId) {
      setErrorMsg("Please select a supplier.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Please add at least one product item.");
      return;
    }

    const importer = importers.find(i => i.id === selectedImporterId);
    if (!importer) {
      setErrorMsg("Selected Importer Company profile not found.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      const totals: POTotals = {
        subtotal,
        shipping: shippingCost,
        grandTotal,
        currency: poCurrency
      };

      const importerDetails = {
        name: importer.name,
        nif: importer.nif,
        rc: importer.rc,
        address: importer.address,
        contact: importer.contact,
        logoUrl: importer.logoUrl
      };

      // 1. Create draft PO with full metadata
      const poId = await createPO(
        selectedSupplierId, 
        items, 
        totals, 
        paymentTerms, 
        importerDetails, 
        incoterm, 
        poCurrency,
        bankName
      );

      // 2. Submit PO for approvals
      await submitPO(poId);

      router.push("/purchase-orders");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (currentRole !== "achats") {
    return (
      <div className="flex flex-col items-center justify-center h-96 max-w-xl mx-auto text-center text-slate-800">
        <AlertTriangle className="h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Only users with the <strong className="text-slate-800">Achats</strong> role can draft and submit new purchase orders. Switch roles in the simulator panel to test.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full text-slate-800 p-2">
      
      {/* Header Back Button */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight font-sans">Draft Purchase Order</h1>
          <p className="text-xs text-slate-500 font-medium">Initiate a new procurement cycle and verify inventory items.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Form Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Order Metadata</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Importer Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">1. Entreprise Importatrice (Importer)</label>
                <select
                  value={selectedImporterId}
                  onChange={(e) => setSelectedImporterId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 transition"
                >
                  <option value="">-- Choose Importer profile --</option>
                  {importers.map(imp => (
                    <option key={imp.id} value={imp.id}>{imp.name} (NIF: {imp.nif})</option>
                  ))}
                </select>
              </div>

              {/* Supplier Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">2. Fournisseur (Supplier)</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 transition"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                  ))}
                </select>
              </div>

              {/* Bank Domiciliation Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">3. Banque Domiciliataire</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 transition font-bold"
                >
                  <option value="Al Baraka Bank">Al Baraka Bank Algeria</option>
                  <option value="Société Générale">Société Générale Algérie</option>
                  <option value="Housing Bank">Housing Bank Algeria</option>
                  <option value="Gulf Bank (AGB)">Gulf Bank Algeria - AGB</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Incoterm Choice */}
              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">Incoterm</label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 transition"
                >
                  <option value="FOB">FOB (Free On Board)</option>
                  <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                  <option value="CFR">CFR (Cost & Freight)</option>
                  <option value="EXW">EXW (Ex Works)</option>
                </select>
              </div>

              {/* Currency/Devise Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">Devise (Currency)</label>
                <select
                  value={poCurrency}
                  onChange={(e) => setPoCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 transition"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">Payment Terms (Algerian Customs Compliant)</label>
              <textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 transition font-medium"
              />
            </div>
          </div>

          {/* Line Items Editor */}
          {selectedSupplierId && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Line Items (Stock Validated)</h3>
              
              {/* Product selector helper */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="md:col-span-6">
                  <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1.5">Select Item</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 transition"
                  >
                    <option value="">-- Select Product --</option>
                    {supplierProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (SKU: {p.sku}) — Max stock: {p.availableStock} {p.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1.5">Unit Price ({poCurrency})</label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    disabled={!selectedProductId}
                    placeholder="0.00"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-805 outline-none focus:border-slate-400 transition font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    disabled={!selectedProductId}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-xs text-slate-805 text-center outline-none focus:border-slate-400 transition font-bold"
                  />
                </div>

                <div className="md:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProductId}
                    className="w-full flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white p-2.5 transition active:scale-95 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Show selected product available stock */}
              {activeProduct && (
                <div className="flex items-center gap-1.5 px-0.5 text-[11px] font-medium text-slate-500">
                  <span>Available Stock:</span>
                  <span className={`font-bold ${activeProduct.availableStock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {activeProduct.availableStock} {activeProduct.unit}
                  </span>
                </div>
              )}

              {/* Active Items Table */}
              {items.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-bold bg-slate-50">
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {items.map(item => (
                        <tr key={item.productId} className="hover:bg-slate-50/40">
                          <td className="px-4 py-3">
                            <span className="font-bold block text-slate-900">{item.name}</span>
                            <span className="text-[9px] text-slate-450 font-mono mt-0.5 block">{item.sku}</span>
                          </td>
                          <td className="px-4 py-3">{item.price.toFixed(2)} {poCurrency} {item.unit ? `/ ${item.unit}` : ""}</td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-800">{item.qty} {item.unit || ""}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{item.total.toFixed(2)} {poCurrency}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveItem(item.productId)}
                              className="text-rose-550 hover:text-rose-650 p-1 rounded hover:bg-rose-50 transition"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Summary & submit */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Summary</h3>
            
            <div className="space-y-2 text-xs border-b border-slate-100 pb-3 font-medium">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-bold text-slate-850">{subtotal.toFixed(2)} {poCurrency}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shipping Cost</span>
                <span className="font-bold text-slate-850">{shippingCost.toFixed(2)} {poCurrency}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">Grand Total</span>
              <span className="text-lg font-black text-slate-900">{grandTotal.toFixed(2)} {poCurrency}</span>
            </div>

            {errorMsg && (
              <div className="flex gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[11px]">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <p className="leading-snug">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || items.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white py-3 text-xs font-bold shadow-md transition active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting PO...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Submit Purchase Order</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
