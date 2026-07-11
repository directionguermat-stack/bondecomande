"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import { 
  UserCheck, 
  UserX, 
  Check, 
  X, 
  ShieldAlert, 
  Users,
  Search,
  UserCog,
  Loader2
} from "lucide-react";

export default function UserApprovals() {
  const { currentRole, userApprovalList, updateUserStatus, wipeAndFormatDatabase } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [formatLoading, setFormatLoading] = useState(false);

  // Authorization check
  if (currentRole !== "admin" && currentRole !== "dg") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 rounded-2xl bg-rose-50 text-rose-500">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Accès Non Autorisé</h2>
          <p className="text-xs text-neutral-400 font-semibold max-w-sm mt-1">
            Seuls les rôles DG (Direction Générale) et Admin peuvent gérer et valider les accès utilisateurs.
          </p>
        </div>
      </div>
    );
  }

  // Filtered Users
  const filteredUsers = userApprovalList.filter(u => {
    const searchString = `${u.fullName || ""} ${u.email || ""}`.toLowerCase();
    if (search && !searchString.includes(search.toLowerCase())) return false;
    if (filterStatus !== "ALL" && u.status !== filterStatus) return false;
    return true;
  });

  const handleAction = async (uid: string, status: "APPROVED" | "REJECTED", role: string) => {
    setUpdatingId(uid);
    try {
      await updateUserStatus(uid, status, role);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour de l'utilisateur.");
    } finally {
      setUpdatingId(null);
    }
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
            <Check className="h-3 w-3" />
            Approuvé
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
            <X className="h-3 w-3" />
            Rejeté
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 animate-pulse">
            En attente
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full text-neutral-850 p-2">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <Users className="h-6.5 w-6.5 text-neutral-800" />
            <span>Gestion des Utilisateurs & Accès</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1.5 font-semibold">
            Validez les inscriptions des employés et attribuez-leur des rôles métiers sécurisés.
          </p>
        </div>

        {currentRole === "admin" && (
          <button
            onClick={handleFormatClick}
            disabled={formatLoading}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4.5 py-2.5 text-xs font-bold text-white shadow-md transition-premium active:scale-95 cursor-pointer disabled:opacity-55"
          >
            {formatLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Formatage...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4" />
                <span>Format Website (Wipe Data)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white border border-neutral-100 p-4.5 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-4 py-2.5 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all w-full sm:w-48 font-bold cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente (Pending)</option>
            <option value="APPROVED">Approuvé (Approved)</option>
            <option value="REJECTED">Rejeté (Rejected)</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="premium-card overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <Users className="h-12 w-12 text-neutral-200 mx-auto mb-3" />
            <p className="text-xs font-bold">Aucune inscription d'utilisateur trouvée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest bg-neutral-50/40">
                  <th className="px-6 py-4.5">Utilisateur</th>
                  <th className="px-6 py-4.5">Email</th>
                  <th className="px-6 py-4.5">Rôle Système</th>
                  <th className="px-6 py-4.5">Statut</th>
                  <th className="px-6 py-4.5 text-right">Actions de Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-700">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-neutral-50/20 transition-premium">
                    <td className="px-6 py-5 font-black text-neutral-900">
                      {user.fullName || "Utilisateur Anonyme"}
                    </td>
                    <td className="px-6 py-5 text-neutral-500 font-bold">
                      {user.email}
                    </td>
                    <td className="px-6 py-5 font-bold">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-neutral-400" />
                        <select
                          disabled={updatingId === user.uid}
                          value={user.role || "achats"}
                          onChange={(e) => handleAction(user.uid, user.status || "PENDING", e.target.value)}
                          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 font-bold text-neutral-800 outline-none focus:border-neutral-400 cursor-pointer text-[11px]"
                        >
                          <option value="achats">Achats</option>
                          <option value="commercial">Commercial</option>
                          <option value="juridique">Juridique</option>
                          <option value="comptabilite">Comptabilité</option>
                          <option value="finance">Financier / Banque</option>
                          <option value="dg">Direction Générale</option>
                          <option value="admin">Administrateur</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {getStatusBadge(user.status || "PENDING")}
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      {user.status !== "APPROVED" && (
                        <button
                          disabled={updatingId === user.uid}
                          onClick={() => handleAction(user.uid, "APPROVED", user.role || "achats")}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-sm transition active:scale-95 disabled:opacity-55 cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Approuver</span>
                        </button>
                      )}
                      {user.status !== "REJECTED" && (
                        <button
                          disabled={updatingId === user.uid}
                          onClick={() => handleAction(user.uid, "REJECTED", user.role || "achats")}
                          className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-sm transition active:scale-95 disabled:opacity-55 cursor-pointer"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Rejeter</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
