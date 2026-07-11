"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText,
  Lock,
  Loader2,
  Save,
  Edit,
  X
} from "lucide-react";

export default function ImportDetail() {
  const params = useParams();
  const router = useRouter();
  const poId = params.poId as string;

  const { 
    importTrackings, 
    purchaseOrders,
    currentRole, 
    saveImportStage,
    updateImportStageMeta,
    currentUserProfile
  } = useAppStore();

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [editingStage, setEditingStage] = useState<string | null>(null);

  // Stage 1 states
  const [proformaNum, setProformaNum] = useState("");
  const [proformaDate, setProformaDate] = useState("");
  const [proformaAmount, setProformaAmount] = useState("");
  const [proformaStatus, setProformaStatus] = useState("Provisoire");
  const [bookingNum, setBookingNum] = useState("");
  const [bookingStatus, setBookingStatus] = useState("Confirmé");

  // Stage 2 states
  const [algexDate, setAlgexDate] = useState("");
  const [predomiciliationNum, setPredomiciliationNum] = useState("");
  const [predomStatus, setPredomStatus] = useState("Validé");

  // Stage 3 states
  const [domNum, setDomNum] = useState("");
  const [domDate, setDomDate] = useState("");
  const [domStatus, setDomStatus] = useState("Déposé");

  // Stage 4 states
  const [blNum, setBlNum] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [expectedArrivalDate, setExpectedArrivalDate] = useState("");
  const [blStatus, setBlStatus] = useState("En transit");
  const [port, setPort] = useState("");

  // Stage 4 additions
  const [dhlNum, setDhlNum] = useState("");
  const [bankFileStatus, setBankFileStatus] = useState("En chemin"); // "En chemin" | "Arrivé"
  const [dhlSendDate, setDhlSendDate] = useState("");
  const [bankArrivalDate, setBankArrivalDate] = useState("");

  const tracking = importTrackings[poId];

  // Helper function to calculate transit duration and remaining days
  const getDaysCounter = (etd: string, eta: string) => {
    if (!etd || !eta) return null;
    const tEtd = new Date(etd).getTime();
    const tEta = new Date(eta).getTime();
    
    // Normalize today to midnight local time
    const tNow = new Date();
    tNow.setHours(0, 0, 0, 0);
    const nowTime = tNow.getTime();

    const totalTransit = Math.ceil((tEta - tEtd) / (1000 * 60 * 60 * 24));
    const daysToArrival = Math.ceil((tEta - nowTime) / (1000 * 60 * 60 * 24));

    return {
      totalTransit: totalTransit > 0 ? totalTransit : 0,
      daysToArrival: daysToArrival
    };
  };

  const getDaysAtBank = (status: string, arrivalDate: string) => {
    if (status !== "Arrivé" || !arrivalDate) return null;
    const tArrival = new Date(arrivalDate).getTime();
    const tNow = new Date();
    tNow.setHours(0, 0, 0, 0);
    const nowTime = tNow.getTime();
    const diff = Math.max(0, Math.ceil((nowTime - tArrival) / (1000 * 60 * 60 * 24)));
    return diff;
  };

  // Load existing metadata on mount
  useEffect(() => {
    if (tracking) {
      const s1 = tracking.stages.STAGE1_BOOKING_PROFORMA?.meta || {};
      if (s1.proformaNum) setProformaNum(s1.proformaNum);
      if (s1.proformaDate) setProformaDate(s1.proformaDate);
      if (s1.proformaAmount) setProformaAmount(s1.proformaAmount);
      if (s1.proformaStatus) setProformaStatus(s1.proformaStatus);
      if (s1.bookingNum) setBookingNum(s1.bookingNum);
      if (s1.bookingStatus) setBookingStatus(s1.bookingStatus);

      const s2 = tracking.stages.STAGE2_PRE_DOMICILIATION?.meta || {};
      if (s2.algexDate) setAlgexDate(s2.algexDate);
      else if (s2.algexName) setAlgexDate(s2.algexName);
      if (s2.predomiciliationNum) setPredomiciliationNum(s2.predomiciliationNum);
      else if (s2.domiciliationNumber) setPredomiciliationNum(s2.domiciliationNumber);
      if (s2.predomStatus) setPredomStatus(s2.predomStatus);

      const s3 = tracking.stages.STAGE3_DOMICILIATION_BANCAIRE?.meta || {};
      if (s3.domNum) setDomNum(s3.domNum);
      if (s3.domDate) setDomDate(s3.domDate);
      if (s3.domStatus) setDomStatus(s3.domStatus);

      const s4 = tracking.stages.STAGE4_SHIPMENT?.meta || {};
      if (s4.blNum) setBlNum(s4.blNum);
      if (s4.departureDate) setDepartureDate(s4.departureDate);
      if (s4.expectedArrivalDate) setExpectedArrivalDate(s4.expectedArrivalDate);
      if (s4.blStatus) setBlStatus(s4.blStatus);
      if (s4.port) setPort(s4.port);
      if (s4.dhlNum) setDhlNum(s4.dhlNum);
      if (s4.bankFileStatus) setBankFileStatus(s4.bankFileStatus);
      if (s4.dhlSendDate) setDhlSendDate(s4.dhlSendDate);
      if (s4.bankArrivalDate) setBankArrivalDate(s4.bankArrivalDate);
    }
  }, [tracking]);

  if (!tracking) {
    return (
      <div className="text-center py-20 text-slate-500 max-w-xl mx-auto">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-2 animate-bounce" />
        <h2 className="text-lg font-bold text-slate-900">Import Record Not Found</h2>
        <p className="text-xs text-slate-400 mt-1">Check back once the DG approves the purchase order.</p>
      </div>
    );
  }

  const po = purchaseOrders.find(p => p.id === poId);
  const isPOOwner = po && currentUserProfile && (po.createdBy === currentUserProfile.uid || po.createdBy === "usr_role_achats");
  const isAuthorized = currentRole === "admin" || (currentRole === "achats" && isPOOwner);

  const startEditing = (stageKey: string, stageMeta: any) => {
    setErrorMsg("");
    if (stageKey === "STAGE1_BOOKING_PROFORMA") {
      setProformaNum(stageMeta.proformaNum || "");
      setProformaDate(stageMeta.proformaDate || "");
      setProformaAmount(stageMeta.proformaAmount || "");
      setProformaStatus(stageMeta.proformaStatus || "Provisoire");
      setBookingNum(stageMeta.bookingNum || "");
      setBookingStatus(stageMeta.bookingStatus || "Confirmé");
    } else if (stageKey === "STAGE2_PRE_DOMICILIATION") {
      setAlgexDate(stageMeta.algexDate || stageMeta.algexName || "");
      setPredomiciliationNum(stageMeta.domiciliationNumber || stageMeta.predomiciliationNum || "");
      setPredomStatus(stageMeta.predomStatus || "Validé");
    } else if (stageKey === "STAGE3_DOMICILIATION_BANCAIRE") {
      setDomNum(stageMeta.domNum || "");
      setDomDate(stageMeta.domDate || "");
      setDomStatus(stageMeta.domStatus || "Déposé");
      setBlNum(stageMeta.blNum || "");
      setDepartureDate(stageMeta.departureDate || "");
      setExpectedArrivalDate(stageMeta.expectedArrivalDate || "");
      setBlStatus(stageMeta.blStatus || "En transit");
      setPort(stageMeta.port || "");
      setDhlNum(stageMeta.dhlNum || "");
      setBankFileStatus(stageMeta.bankFileStatus || "En chemin");
      setDhlSendDate(stageMeta.dhlSendDate || "");
      setBankArrivalDate(stageMeta.bankArrivalDate || "");
    }
    setEditingStage(stageKey);
  };

  const handleSaveStage = async (stageKey: string) => {
    if (!isAuthorized) {
      setErrorMsg(`Access Denied: Only Achats and Admin roles can update import details.`);
      return;
    }

    setErrorMsg("");
    setSaving(true);

    let meta: Record<string, any> = {};

    // Validate and collect metadata based on the stageKey being saved
    if (stageKey === "STAGE1_BOOKING_PROFORMA") {
      if (!proformaNum.trim() || !proformaDate || !proformaAmount || !bookingNum.trim()) {
        setErrorMsg("Veuillez remplir le numéro, date et montant de la facture proforma ainsi que le numéro du booking.");
        setSaving(false);
        return;
      }
      meta = { proformaNum, proformaDate, proformaAmount, proformaStatus, bookingNum, bookingStatus };
    } else if (stageKey === "STAGE2_PRE_DOMICILIATION") {
      if (!algexDate || !predomiciliationNum.trim()) {
        setErrorMsg("Veuillez remplir la date ALGEX et le numéro de pré-domiciliation.");
        setSaving(false);
        return;
      }
      meta = { algexDate, domiciliationNumber: predomiciliationNum, predomStatus };
    } else if (stageKey === "STAGE3_DOMICILIATION_BANCAIRE") {
      if (!domNum.trim() || !domDate) {
        setErrorMsg("Veuillez remplir le numéro et la date de domiciliation.");
        setSaving(false);
        return;
      }
      meta = { domNum, domDate, domStatus };
      if (!blNum.trim() || !departureDate || !expectedArrivalDate || !port.trim()) {
        setErrorMsg("Veuillez remplir le numéro BL, la date de départ, d'arrivée estimée et le port.");
        setSaving(false);
        return;
      }
      meta = { 
        blNum, 
        departureDate, 
        expectedArrivalDate, 
        blStatus, 
        port,
        dhlNum,
        bankFileStatus,
        dhlSendDate,
        bankArrivalDate
      };
    }

    try {
      if (editingStage === stageKey) {
        // Edit mode: only update metadata, don't advance the stage
        await updateImportStageMeta(poId, stageKey, meta);
        setEditingStage(null);
      } else {
        // Create mode: save metadata and advance the stage
        await saveImportStage(poId, stageKey, meta);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to save stage metadata.");
    } finally {
      setSaving(false);
    }
  };

  const stagesDef = [
    {
      key: "STAGE1_BOOKING_PROFORMA",
      name: "Stage 1: Booking & Proforma Invoice",
      owner: "achats"
    },
    {
      key: "STAGE2_PRE_DOMICILIATION",
      name: "Stage 2: Pré-domiciliation",
      owner: "achats"
    },
    {
      key: "STAGE3_DOMICILIATION_BANCAIRE",
      name: "Stage 3: Bank Domiciliation (Facture Domiciliée)",
      owner: "achats"
    },
    {
      key: "STAGE4_SHIPMENT",
      name: "Stage 4: Custom Clearance & BL",
      owner: "achats"
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full text-slate-800 p-2">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
        <button
          onClick={() => router.push("/import-tracking")}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Import Lifecycle Operations: {tracking.poNumber}
          </h1>
          <p className="text-xs text-slate-500 font-medium">Review status, fill in regulatory details, and fulfill SLA milestones.</p>
        </div>
      </div>

      {currentRole === "achats" && !isPOOwner && (
        <div className="flex gap-2.5 p-4.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shadow-[0_1px_2px_rgba(245,158,11,0.05)]">
          <Lock className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-extrabold text-[12px]">Dossier en lecture seule (Lecture seule)</p>
            <p className="text-[11px] text-amber-600/90 font-semibold mt-1">
              Ce dossier d'importation appartient à un autre agent du département achats. Vous n'êtes pas autorisé à modifier les étapes de ce dossier.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex gap-1.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <p className="leading-snug">{errorMsg}</p>
        </div>
      )}

      {/* Interactive Timeline Stepper */}
      <div className="space-y-5">
        {stagesDef.map((stage) => {
          const isCompleted = tracking.stages[stage.key as keyof typeof tracking.stages]?.status === "completed";
          const isActive = tracking.currentStage === stage.key;
          const isOverdue = tracking.stages[stage.key as keyof typeof tracking.stages]?.status === "overdue";
          const isEditing = editingStage === stage.key;

          const stageMeta = tracking.stages[stage.key as keyof typeof tracking.stages]?.meta || {};

          let stageCardBorder = "border-slate-200";
          let badgeText = "Awaiting Release";
          let badgeColor = "bg-slate-100 text-slate-400";

          if (isCompleted) {
            stageCardBorder = "border-emerald-250 bg-emerald-50/20";
            badgeText = "Completed";
            badgeColor = "bg-emerald-50 text-emerald-600 border border-emerald-200";
          } else if (isActive) {
            stageCardBorder = isOverdue ? "border-rose-300 bg-rose-50/20" : "border-sky-200 bg-sky-50/20";
            badgeText = isOverdue ? "SLA Overdue" : "Action Required";
            badgeColor = isOverdue ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse" : "bg-sky-50 text-sky-600 border border-sky-200";
          }

          const deadlineStr = tracking.stages[stage.key as keyof typeof tracking.stages]?.deadline;

          return (
            <div key={stage.key} className={`rounded-xl border ${stageCardBorder} bg-white p-5 space-y-4 shadow-sm`}>
              
              {/* Stage Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{stage.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Required Role:</span>
                    <span className="text-[9px] text-slate-800 font-bold capitalize">{stage.owner}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {deadlineStr && !isCompleted && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Deadline: <strong className="text-slate-600">{new Date(deadlineStr).toLocaleDateString()}</strong>
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>
              </div>

              {/* Stage Inputs & Forms */}
              <div className="space-y-4">
                
                {/* 1. If Stage is ACTIVE OR in EDIT mode: Show Form Inputs */}
                {(isActive || isEditing) && (
                  <div className="space-y-4">
                    {!isAuthorized && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium italic p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <Lock className="h-3.5 w-3.5 text-slate-355" />
                        Requires Achats or Admin role to edit. Switch roles in the sidebar.
                      </span>
                    )}

                    {/* STAGE 1 (Booking & Proforma Invoice) Inputs */}
                    {stage.key === "STAGE1_BOOKING_PROFORMA" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                        {/* Proforma Inputs */}
                        <div className="space-y-3.5">
                          <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider">Proforma Invoice details</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-550 mb-1">N° Facture</label>
                              <input
                                type="text"
                                disabled={!isAuthorized}
                                placeholder="e.g. PI-4502"
                                value={proformaNum}
                                onChange={(e) => setProformaNum(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-550 mb-1">Date Facture</label>
                              <input
                                type="date"
                                disabled={!isAuthorized}
                                value={proformaDate}
                                onChange={(e) => setProformaDate(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-550 mb-1">Montant Facture</label>
                              <input
                                type="number"
                                disabled={!isAuthorized}
                                placeholder="e.g. 36500"
                                value={proformaAmount}
                                onChange={(e) => setProformaAmount(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-550 mb-1">Statut/État</label>
                              <select
                                disabled={!isAuthorized}
                                value={proformaStatus}
                                onChange={(e) => setProformaStatus(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                              >
                                <option value="Provisoire">Provisoire</option>
                                <option value="Définitif">Définitif</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Booking Inputs */}
                        <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-200 pt-4.5 md:pt-0 md:pl-4.5">
                          <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider">Booking Confirmation details</span>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">N° Booking (Référence)</label>
                            <input
                              type="text"
                              disabled={!isAuthorized}
                              placeholder="e.g. BKG-9087-CMA"
                              value={bookingNum}
                              onChange={(e) => setBookingNum(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">État du Booking</label>
                            <select
                              disabled={!isAuthorized}
                              value={bookingStatus}
                              onChange={(e) => setBookingStatus(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            >
                              <option value="Confirmé">Confirmé</option>
                              <option value="En attente">En attente</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STAGE 2 (Pré-domiciliation ALGEX) Inputs */}
                    {stage.key === "STAGE2_PRE_DOMICILIATION" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs max-w-2xl">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">Date ALGEX</label>
                            <input
                              type="date"
                              disabled={!isAuthorized}
                              value={algexDate}
                              onChange={(e) => setAlgexDate(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">N° Pré-domiciliation</label>
                            <input
                              type="text"
                              disabled={!isAuthorized}
                              placeholder="e.g. PR-009854"
                              value={predomiciliationNum}
                              onChange={(e) => setPredomiciliationNum(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">État ALGEX</label>
                            <select
                              disabled={!isAuthorized}
                              value={predomStatus}
                              onChange={(e) => setPredomStatus(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            >
                              <option value="Validé">Validé</option>
                              <option value="En cours d'étude">En cours d'étude</option>
                            </select>
                          </div>
                        </div>
                        {predomStatus === "En cours d'étude" && !isEditing && (
                          <div className="flex gap-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10.5px] font-semibold max-w-2xl leading-normal">
                            <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-650" />
                            <p>Le statut est 'En cours d'étude'. Vous pouvez enregistrer les données saisies temporairement, mais la transition vers Stage 3 ne sera déclenchée que lorsque vous passerez le statut sur 'Validé'.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STAGE 3 (Bank Domiciliation) Inputs */}
                    {stage.key === "STAGE3_DOMICILIATION_BANCAIRE" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs max-w-2xl">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-550 mb-1">N° Domiciliation Bancaire</label>
                          <input
                            type="text"
                            disabled={!isAuthorized}
                            placeholder="e.g. DOM-4521/2026"
                            value={domNum}
                            onChange={(e) => setDomNum(e.target.value)}
                            className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-550 mb-1">Date Domiciliation</label>
                          <input
                            type="date"
                            disabled={!isAuthorized}
                            value={domDate}
                            onChange={(e) => setDomDate(e.target.value)}
                            className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-550 mb-1">État du Dépôt</label>
                          <select
                            disabled={!isAuthorized}
                            value={domStatus}
                            onChange={(e) => setDomStatus(e.target.value)}
                            className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-850 outline-none focus:border-slate-450"
                          >
                            <option value="Déposé">Déposé</option>
                            <option value="Signé / Validé">Signé / Validé</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* STAGE 4 (BL & Shipping) Inputs */}
                    {stage.key === "STAGE4_SHIPMENT" && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">N° BL (Bill of Lading)</label>
                            <input
                              type="text"
                              disabled={!isAuthorized}
                              placeholder="e.g. COSU6124508"
                              value={blNum}
                              onChange={(e) => setBlNum(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">Date d'Embarquement (ETD)</label>
                            <input
                              type="date"
                              disabled={!isAuthorized}
                              value={departureDate}
                              onChange={(e) => setDepartureDate(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">Arrivée Prévue (ETA)</label>
                            <input
                              type="date"
                              disabled={!isAuthorized}
                              value={expectedArrivalDate}
                              onChange={(e) => setExpectedArrivalDate(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200/60 pt-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">Malo / Port de débarquement</label>
                            <input
                              type="text"
                              disabled={!isAuthorized}
                              placeholder="e.g. Port d'Alger / Port d'Oran"
                              value={port}
                              onChange={(e) => setPort(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">État Transit</label>
                            <select
                              disabled={!isAuthorized}
                              value={blStatus}
                              onChange={(e) => setBlStatus(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-855 outline-none focus:border-slate-450 font-bold"
                            >
                              <option value="En transit">En transit</option>
                              <option value="Arrivé au port">Arrivé au port</option>
                              <option value="Dédouané">Dédouané</option>
                            </select>
                          </div>
                        </div>

                        {/* DHL and Bank Courier inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200/60 pt-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">N° Suivi DHL</label>
                            <input
                              type="text"
                              disabled={!isAuthorized}
                              placeholder="e.g. DHL837482910"
                              value={dhlNum}
                              onChange={(e) => setDhlNum(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">Statut du dossier bancaire (Courier Status)</label>
                            <select
                              disabled={!isAuthorized}
                              value={bankFileStatus}
                              onChange={(e) => setBankFileStatus(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-855 outline-none focus:border-slate-450 font-bold"
                            >
                              <option value="En chemin">En chemin vers la banque</option>
                              <option value="Arrivé">Arrivé à la banque</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">Date d'envoi DHL (DHL Send Date)</label>
                            <input
                              type="date"
                              disabled={!isAuthorized}
                              value={dhlSendDate}
                              onChange={(e) => setDhlSendDate(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 mb-1">Date d'arrivée Banque (Bank Arrival Date)</label>
                            <input
                              type="date"
                              disabled={!isAuthorized}
                              value={bankArrivalDate}
                              onChange={(e) => setBankArrivalDate(e.target.value)}
                              className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-450"
                            />
                          </div>
                        </div>

                        {/* Courier Days Counter Preview */}
                        {bankFileStatus === "Arrivé" && bankArrivalDate && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] font-bold">
                            <span className="bg-sky-100 text-sky-850 px-2 py-1 rounded">
                              🏦 Jours en Banque (Days at Bank) : {getDaysAtBank(bankFileStatus, bankArrivalDate)} jours
                            </span>
                          </div>
                        )}

                        {/* Days Counter Preview */}
                        {departureDate && expectedArrivalDate && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] font-bold">
                            {(() => {
                              const counters = getDaysCounter(departureDate, expectedArrivalDate);
                              if (!counters) return null;
                              return (
                                <>
                                  <span className="bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded">
                                    ⚓ Durée de transit estimée : {counters.totalTransit} jours
                                  </span>
                                  {counters.daysToArrival > 0 ? (
                                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                      ⏰ Temps restant avant l'arrivée : {counters.daysToArrival} jours
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                      ✓ Arrivé au port depuis : {Math.abs(counters.daysToArrival)} jours
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submit / Edit Action Buttons */}
                    {isAuthorized && (
                      <div className="flex justify-end gap-2 pt-1">
                        {isEditing && (
                          <button
                            onClick={() => setEditingStage(null)}
                            className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold transition active:scale-95"
                          >
                            <X className="h-4 w-4" />
                            <span>Annuler</span>
                          </button>
                        )}
                        
                        <button
                          disabled={saving}
                          onClick={() => handleSaveStage(stage.key)}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-4.5 py-2.5 text-xs font-bold transition active:scale-95 shadow-sm"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Enregistrement...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              <span>
                                  {isEditing 
                                    ? "Enregistrer les modifications" 
                                    : (stage.key === "STAGE2_PRE_DOMICILIATION" && predomStatus === "En cours d'étude" 
                                        ? "Enregistrer le brouillon" 
                                        : "Enregistrer & Confirmer l'étape"
                                      )
                                  }
                                </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. If Stage is COMPLETED and NOT in Edit mode: Show Static Summary & Edit trigger */}
                {isCompleted && !isEditing && (
                  <div className="border border-slate-200/80 rounded-xl bg-slate-50/50 p-4 text-xs font-medium space-y-3">
                    <div className="flex justify-between items-center text-slate-800 font-bold">
                      <div className="flex items-center gap-2 uppercase tracking-wider text-[10px]">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>Saved Regulatory Data</span>
                      </div>
                      
                      {isAuthorized && (
                        <button
                          onClick={() => startEditing(stage.key, stageMeta)}
                          className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-950 font-bold border border-slate-200 rounded-lg px-2.5 py-1 bg-white hover:bg-slate-50 transition active:scale-95"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Modifier</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-650">
                      {stage.key === "STAGE1_BOOKING_PROFORMA" && (
                        <>
                          <div>N° Facture: <strong className="text-slate-800">{stageMeta.proformaNum}</strong></div>
                          <div>Date Facture: <strong className="text-slate-800">{stageMeta.proformaDate}</strong></div>
                          <div>Montant Facture: <strong className="text-slate-800">{stageMeta.proformaAmount} EUR</strong></div>
                          <div>État Facture: <strong className="text-slate-800 capitalize">{stageMeta.proformaStatus}</strong></div>
                          <div className="col-span-2 border-t border-slate-200 pt-2 mt-2">N° Booking: <strong className="text-slate-800">{stageMeta.bookingNum}</strong></div>
                          <div className="col-span-2 border-t border-slate-200 pt-2 mt-2">État Booking: <strong className="text-slate-800 capitalize">{stageMeta.bookingStatus}</strong></div>
                        </>
                      )}
                      {stage.key === "STAGE2_PRE_DOMICILIATION" && (
                        <>
                           <div>Date ALGEX: <strong className="text-slate-800">{stageMeta.algexDate || stageMeta.algexName}</strong></div>
                          <div className="col-span-2">N° Pré-dom: <strong className="text-slate-800">{stageMeta.domiciliationNumber}</strong></div>
                          <div>État: <strong className="text-slate-800 capitalize">{stageMeta.predomStatus}</strong></div>
                        </>
                      )}
                      {stage.key === "STAGE3_DOMICILIATION_BANCAIRE" && (
                        <>
                          <div className="col-span-2">N° Domiciliation: <strong className="text-slate-800">{stageMeta.domNum}</strong></div>
                          <div>Date Domiciliation: <strong className="text-slate-800">{stageMeta.domDate}</strong></div>
                          <div>État: <strong className="text-slate-800 capitalize">{stageMeta.domStatus}</strong></div>
                        </>
                      )}
                      {stage.key === "STAGE4_SHIPMENT" && (
                        <>
                          <div>N° BL: <strong className="text-slate-800">{stageMeta.blNum}</strong></div>
                          <div>Malo / Port: <strong className="text-slate-800">{stageMeta.port || "N/A"}</strong></div>
                          <div>ETD (Depart): <strong className="text-slate-800">{stageMeta.departureDate}</strong></div>
                          <div>ETA (Arrivée): <strong className="text-slate-800">{stageMeta.expectedArrivalDate}</strong></div>
                          <div>N° DHL: <strong className="text-slate-800">{stageMeta.dhlNum || "N/A"}</strong></div>
                          <div>Expédié le: <strong className="text-slate-800">{stageMeta.dhlSendDate || "N/A"}</strong></div>
                          <div>Reçu à la Banque: <strong className="text-slate-800">{stageMeta.bankArrivalDate || "N/A"}</strong></div>
                          <div>État Courier: <strong className="text-slate-800">{stageMeta.bankFileStatus || "En chemin"}</strong></div>
                          
                          {/* Days Counter completed view */}
                          {stageMeta.departureDate && stageMeta.expectedArrivalDate && (
                            <div className="col-span-2 flex flex-wrap gap-2 text-[10px] font-bold border-t border-slate-200/60 pt-2 mt-2">
                              {(() => {
                                const counters = getDaysCounter(stageMeta.departureDate, stageMeta.expectedArrivalDate);
                                if (!counters) return null;
                                return (
                                  <>
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                      ⚓ Durée transit: {counters.totalTransit} jours
                                    </span>
                                    {counters.daysToArrival > 0 ? (
                                      <span className="bg-amber-55 text-amber-800 px-2 py-0.5 rounded">
                                        ⏰ Restant: {counters.daysToArrival} jours
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-55 text-emerald-800 px-2 py-0.5 rounded">
                                        ✓ Au port depuis: {Math.abs(counters.daysToArrival)} jours
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Bank Courier Days completed view */}
                          {stageMeta.bankFileStatus === "Arrivé" && stageMeta.bankArrivalDate && (
                            <div className="col-span-2 flex flex-wrap gap-2 text-[10px] font-bold border-t border-slate-200/60 pt-2 mt-2">
                              <span className="bg-sky-100 text-sky-850 px-2 py-0.5 rounded">
                                🏦 Jours en Banque : {getDaysAtBank(stageMeta.bankFileStatus, stageMeta.bankArrivalDate)} jours
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. If Stage is AWAITING (not completed & not active): Show Lock Message */}
                {!isActive && !isCompleted && (
                  <p className="text-[10.5px] text-slate-400 italic font-semibold px-2 py-1">
                    Awaiting previous regulatory milestones completion.
                  </p>
                )}

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
