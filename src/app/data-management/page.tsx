"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import { 
  Building2, 
  Users2, 
  Package, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  FileText,
  BadgeAlert,
  ShieldAlert,
  Loader2,
  Sparkles
} from "lucide-react";

type Tab = "importers" | "suppliers" | "products";

export default function DataManagement() {
  const { 
    currentRole, 
    importers, 
    suppliers, 
    products, 
    createImporter, 
    updateImporter,
    createSupplier, 
    createProduct,
    wipeAndFormatDatabase,
    seedDemoData
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<Tab>("importers");
  const [formatLoading, setFormatLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleFormatClick = async () => {
    const firstCheck = window.confirm(
      "⚠️ AVERTISSEMENT EXTRÊME :\n\nCela supprimera DEFINITIVEMENT :\n- Tous les bons de commande (POs)\n- Tous les suivis d'importation\n- Tous les fournisseurs et produits\n- Tous les utilisateurs enregistrés (SAUF votre compte administrateur).\n\nCette action est irréversible. Voulez-vous continuer ?"
    );
    if (!firstCheck) return;

    const validationWord = window.prompt(
      "Pour confirmer la suppression totale de la base de données, veuillez écrire 'FORMATER' ci-dessous :"
    );
    if (validationWord !== "FORMATER") {
      alert("Validation incorrecte. Opération annulée.");
      return;
    }

    setFormatLoading(true);
    try {
      await wipeAndFormatDatabase();
      alert("La base de données a été réinitialisée avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la réinitialisation de la base de données.");
    } finally {
      setFormatLoading(false);
    }
  };

  const handleSeedClick = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      alert("Données de démonstration chargées avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors du chargement des données.");
    } finally {
      setSeeding(false);
    }
  };
  
  // Importer Form State
  const [impName, setImpName] = useState("");
  const [impNif, setImpNif] = useState("");
  const [impRc, setImpRc] = useState("");
  const [impAddress, setImpAddress] = useState("");
  const [impContact, setImpContact] = useState("");
  const [impLogoUrl, setImpLogoUrl] = useState("");
  const [impPhone, setImpPhone] = useState("");
  const [editingImporterId, setEditingImporterId] = useState<string | null>(null);

  // Supplier Form State
  const [supName, setSupName] = useState("");
  const [supCountry, setSupCountry] = useState("Italy");
  const [supCurrency, setSupCurrency] = useState("EUR");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [supBankName, setSupBankName] = useState("");
  const [supIban, setIban] = useState("");
  const [supSwift, setSwift] = useState("");
  const [supPhone, setSupPhone] = useState("");

  // Product Form State
  const [prodSupplierId, setProdSupplierId] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodPrice, setProdPrice] = useState(15.5);
  const [prodUnit, setProdUnit] = useState("pièce");
  const [prodStock, setProdStock] = useState(1000);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Authorization Check
  const isAuthorized = currentRole === "achats" || currentRole === "admin";

  const clearForm = () => {
    setErrorMsg("");
    setEditingImporterId(null);
    setImpName("");
    setImpNif("");
    setImpRc("");
    setImpAddress("");
    setImpContact("");
    setImpLogoUrl("");
    setImpPhone("");

    setSupName("");
    setSupEmail("");
    setSupAddress("");
    setSupBankName("");
    setIban("");
    setSwift("");
    setSupPhone("");

    setProdSupplierId("");
    setProdName("");
    setProdSku("");
    setProdPrice(15.5);
    setProdStock(1000);
    setProdUnit("pièce");
  };

  const handleCreateOrUpdateImporter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impName || !impNif || !impRc || !impAddress || !impContact) {
      setErrorMsg("Please fill in all importer fields.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      if (editingImporterId) {
        await updateImporter(editingImporterId, {
          name: impName,
          nif: impNif,
          rc: impRc,
          address: impAddress,
          contact: impContact,
          logoUrl: impLogoUrl || undefined,
          phone: impPhone || undefined
        });
        setSuccessMsg("Importer Company profile updated successfully!");
      } else {
        await createImporter({
          name: impName,
          nif: impNif,
          rc: impRc,
          address: impAddress,
          contact: impContact,
          logoUrl: impLogoUrl || undefined,
          phone: impPhone || undefined
        });
        setSuccessMsg("Importer Company profile created successfully!");
      }
      clearForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save importer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supEmail || !supAddress || !supBankName || !supIban || !supSwift) {
      setErrorMsg("Please fill in all supplier fields.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      await createSupplier({
        name: supName,
        country: supCountry,
        currency: supCurrency,
        contactEmail: supEmail,
        phone: supPhone || undefined,
        bankDetails: {
          iban: supIban,
          swift: supSwift,
          bankName: supBankName
        }
      });
      setSuccessMsg("Supplier profile created successfully!");
      clearForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodSupplierId) {
      setErrorMsg("Veuillez sélectionner une entreprise (Fournisseur).");
      return;
    }
    if (!prodName || !prodSku || prodPrice <= 0) {
      setErrorMsg("Please enter a valid product name, SKU, and unit price.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      await createProduct({
        supplierId: prodSupplierId, // Associated with specific supplier
        sku: prodSku,
        name: prodName,
        price: prodPrice,
        currency: "EUR",
        availableStock: prodStock,
        unit: prodUnit
      });
      setSuccessMsg("Product item registered successfully under PPI quota!");
      clearForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create product.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] max-w-xl mx-auto text-center text-slate-800 p-4">
        <BadgeAlert className="h-12 w-12 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Only users with the <strong className="text-slate-800">Achats</strong> (Procurement) or <strong className="text-slate-800">Admin</strong> roles are authorized to create new Companies, Suppliers, and Products. Switch your role in the simulator sidebar to proceed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-800 p-2">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">Database Registry</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Input and manage companies, suppliers, and items catalog.</p>
        </div>

        {currentRole === "admin" && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSeedClick}
              disabled={seeding}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-premium active:scale-95 cursor-pointer disabled:opacity-55"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>Load Demo Data</span>
            </button>

            <button
              onClick={handleFormatClick}
              disabled={formatLoading}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-premium active:scale-95 cursor-pointer disabled:opacity-55"
            >
              {formatLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              <span>Format Website (Wipe Data)</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2.5 border-b border-slate-200 pb-px">
        <button
          onClick={() => { setActiveTab("importers"); clearForm(); }}
          className={`flex items-center gap-1.5 px-4.5 py-3 text-xs font-bold border-b-2 transition ${activeTab === "importers" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"}`}
        >
          <Building2 className="h-4 w-4" />
          <span>Companies (Importer)</span>
        </button>

        <button
          onClick={() => { setActiveTab("suppliers"); clearForm(); }}
          className={`flex items-center gap-1.5 px-4.5 py-3 text-xs font-bold border-b-2 transition ${activeTab === "suppliers" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"}`}
        >
          <Users2 className="h-4 w-4" />
          <span>Suppliers</span>
        </button>

        <button
          onClick={() => { setActiveTab("products"); clearForm(); }}
          className={`flex items-center gap-1.5 px-4.5 py-3 text-xs font-bold border-b-2 transition ${activeTab === "products" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"}`}
        >
          <Package className="h-4 w-4" />
          <span>Products (PPI Program)</span>
        </button>
      </div>

      {/* Main Grid: Form Left, List Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Create New Entry
            </h3>

            {errorMsg && (
              <div className="flex gap-1.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[10px]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p className="leading-snug">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="flex gap-1.5 p-3 rounded-lg bg-emerald-50 border border-emerald-250 text-emerald-700 text-[10px]">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p className="leading-snug">{successMsg}</p>
              </div>
            )}

            {/* Importers Tab Form */}
            {activeTab === "importers" && (
              <form onSubmit={handleCreateOrUpdateImporter} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. groupe guermat"
                    value={impName}
                    onChange={(e) => setImpName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">NIF (Fiscal ID)</label>
                  <input
                    type="text"
                    placeholder="15-digit number"
                    value={impNif}
                    onChange={(e) => setImpNif(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">RC Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 16/00-0987654B20"
                    value={impRc}
                    onChange={(e) => setImpRc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Address</label>
                  <input
                    type="text"
                    placeholder="12 Rue des Frères, Alger"
                    value={impAddress}
                    onChange={(e) => setImpAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Details</label>
                  <input
                    type="text"
                    placeholder="Tel / Email"
                    value={impContact}
                    onChange={(e) => setImpContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number (Téléphone)</label>
                  <input
                    type="text"
                    placeholder="e.g. +213 21 00 00 00"
                    value={impPhone}
                    onChange={(e) => setImpPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Logo (Optionnel)</label>
                  <select
                    value={impLogoUrl}
                    onChange={(e) => setImpLogoUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="">-- Sans Logo --</option>
                    <option value="/logos/LOGO-ASSILMATEC.jpg">ASSILMATEC</option>
                    <option value="/logos/logo gm.jpg">Groupe GM</option>
                    <option value="/logos/logo melila food.jfif">Melila Food</option>
                    <option value="/logos/logo-gsr.png">GSR</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  {editingImporterId && (
                    <button
                      type="button"
                      onClick={() => clearForm()}
                      className="w-1/3 flex items-center justify-center gap-1 rounded-lg bg-slate-200 hover:bg-slate-305 text-slate-750 py-2 text-xs font-bold transition"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg ${editingImporterId ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-900 hover:bg-slate-800"} text-white py-2 text-xs font-bold transition shadow-sm`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{editingImporterId ? "Modifier" : "Register Importer"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Suppliers Tab Form */}
            {activeTab === "suppliers" && (
              <form onSubmit={handleCreateSupplier} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier Raison Sociale</label>
                  <input
                    type="text"
                    placeholder="ValvoSpares SRL"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="Italy"
                      value={supCountry}
                      onChange={(e) => setSupCountry(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Currency</label>
                    <select
                      value={supCurrency}
                      onChange={(e) => setSupCurrency(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="sales@supplier.com"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number (Téléphone)</label>
                  <input
                    type="text"
                    placeholder="e.g. +39 02 123 4567"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Factory Address</label>
                  <input
                    type="text"
                    placeholder="Industrial Zone, Milan, Italy"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
                <div className="border-t border-slate-100 pt-2 space-y-3">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Forex Bank Details</span>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      placeholder="Intesa Sanpaolo"
                      value={supBankName}
                      onChange={(e) => setSupBankName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-0.5">IBAN</label>
                      <input
                        type="text"
                        placeholder="IT60X..."
                        value={supIban}
                        onChange={(e) => setIban(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-0.5">SWIFT/BIC</label>
                      <input
                        type="text"
                        placeholder="BCIT..."
                        value={supSwift}
                        onChange={(e) => setSwift(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register Supplier</span>
                </button>
              </form>
            )}

            {/* Products Tab Form */}
            {activeTab === "products" && (
              <form onSubmit={handleCreateProduct} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entreprise</label>
                  <select
                    value={prodSupplierId}
                    onChange={(e) => setProdSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 font-semibold mb-3"
                  >
                    <option value="">-- Sélectionnez une Entreprise --</option>
                    {importers.map(imp => (
                      <option key={imp.id} value={imp.id}>{imp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Désignation (Nom de l'Article)</label>
                  <input
                    type="text"
                    placeholder="e.g. Valve DN50 PN16"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Référence SKU (Code Article)</label>
                  <input
                    type="text"
                    placeholder="e.g. VALVE-DN50"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prix Unitaire Estimé (EUR)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unité</label>
                    <select
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-805 outline-none focus:border-slate-400"
                    >
                      <option value="pièce">Pièce</option>
                      <option value="kg">Kg</option>
                      <option value="tonne">Tonne</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Quantité dans le programme prévisionnel (PPI)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={prodStock}
                    onChange={(e) => setProdStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 font-bold text-sky-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Enregistrer l'Article PPI</span>
                </button>
              </form>
            )}

          </div>
        </div>

        {/* List Column (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm h-full">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Registered Entries
            </h3>

            {/* Importers Listing */}
            {activeTab === "importers" && (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
                {importers.map((imp) => (
                  <div key={imp.id} className="p-4 hover:bg-slate-50/50 transition text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-extrabold text-slate-900">{imp.name}</span>
                        <button
                          onClick={() => {
                            setEditingImporterId(imp.id);
                            setImpName(imp.name);
                            setImpNif(imp.nif);
                            setImpRc(imp.rc);
                            setImpAddress(imp.address);
                            setImpContact(imp.contact);
                            setImpLogoUrl(imp.logoUrl || "");
                            setImpPhone(imp.phone || "");
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          className="ml-3 text-[10px] text-amber-600 hover:text-amber-700 font-bold hover:underline"
                        >
                          Modifier
                        </button>
                      </div>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 font-bold">NIF: {imp.nif}</span>
                    </div>
                    <div className="text-slate-500 space-y-0.5 text-[11px] font-medium mt-1.5">
                      <div>RC: <span className="text-slate-800 font-bold">{imp.rc}</span></div>
                      <div>Adresse: <span className="text-slate-800">{imp.address}</span></div>
                      <div>Contact: <span className="text-slate-850 font-semibold">{imp.contact}</span></div>
                      {imp.phone && <div>Téléphone: <span className="text-slate-850 font-semibold">{imp.phone}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Suppliers Listing */}
            {activeTab === "suppliers" && (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
                {suppliers.map((s) => (
                  <div key={s.id} className="p-4 hover:bg-slate-50/50 transition text-xs">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-extrabold text-slate-900">{s.name}</span>
                      <span className="rounded bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[9px] text-sky-700 font-bold uppercase tracking-wider">{s.country}</span>
                    </div>
                    <div className="text-slate-500 space-y-1 text-[11px] font-medium">
                      <div>Contact Email: <span className="text-slate-800 font-semibold">{s.contactEmail}</span></div>
                      {s.phone && <div>Téléphone: <span className="text-slate-800 font-semibold">{s.phone}</span></div>}
                      <div>Bank: <span className="text-slate-800 font-bold">{s.bankDetails?.bankName}</span> | IBAN: <span className="font-mono text-slate-700">{s.bankDetails?.iban}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products Listing */}
            {activeTab === "products" && (
              <div className="space-y-4">
                {importers.length === 0 && <div className="p-4 text-center text-slate-500 text-xs">Aucune entreprise trouvée. Veuillez en ajouter une d'abord.</div>}
                {importers.map(imp => {
                  const companyProducts = products.filter(p => p.supplierId === imp.id);
                  if (companyProducts.length === 0) return null;
                  return (
                    <div key={imp.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-800 text-xs uppercase flex justify-between items-center">
                        <span>{imp.name}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{companyProducts.length} Articles</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {companyProducts.map((p) => (
                          <div key={p.id} className="p-4 hover:bg-slate-50/50 transition text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <span className="font-extrabold text-slate-900">{p.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono ml-2">SKU: {p.sku}</span>
                              </div>
                              <span className="font-bold text-slate-900 text-sm">{p.price.toFixed(2)} {p.currency}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-medium">
                              <span>Unité: <strong className="text-slate-700 capitalize">{p.unit}</strong></span>
                              <span>Quantité ppi: <strong className="text-sky-700 font-bold">{p.availableStock} {p.unit}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
