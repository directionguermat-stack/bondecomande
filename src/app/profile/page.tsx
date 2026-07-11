"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import { auth, db } from "@/lib/firebase";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { 
  User, 
  Lock, 
  CheckCircle, 
  ShieldAlert, 
  Loader2, 
  Building,
  KeyRound
} from "lucide-react";

export default function ProfilePage() {
  const { currentUserProfile, setCurrentUserProfile } = useAppStore();
  
  // Profile form states
  const [fullName, setFullName] = useState(currentUserProfile?.fullName || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState("");

  if (!currentUserProfile) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-xs text-neutral-400 font-bold">Session expirée. Veuillez vous reconnecter.</p>
      </div>
    );
  }

  // Handle Profile Update (Full Name)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    setProfileLoading(true);

    try {
      const userRef = doc(db, `users/${currentUserProfile.uid}`);
      await updateDoc(userRef, { fullName });
      
      // Update local store state
      setCurrentUserProfile({
        ...currentUserProfile,
        fullName
      });
      setProfileSuccess(true);
    } catch (err: any) {
      console.error(err);
      setProfileError("Erreur lors de la mise à jour des informations.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess(false);

    if (newPassword.length < 6) {
      setPassError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("Les mots de passe ne correspondent pas.");
      return;
    }

    setPassLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        setPassSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        throw new Error("Aucun utilisateur connecté.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        setPassError("Pour des raisons de sécurité, veuillez vous déconnecter et vous reconnecter pour modifier votre mot de passe.");
      } else {
        setPassError(err.message || "Erreur lors de la mise à jour du mot de passe.");
      }
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full text-neutral-850 p-2">
      
      {/* Page Header */}
      <div className="border-b border-neutral-100 pb-6">
        <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Mon Profil</h1>
        <p className="text-xs text-neutral-500 mt-1.5 font-semibold">
          Gérez vos informations personnelles et mettez à jour votre mot de passe.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Info panel */}
        <div className="md:col-span-1 space-y-6">
          <div className="premium-card p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-neutral-900 leading-snug">{currentUserProfile.fullName || "Utilisateur"}</h3>
              <p className="text-[10px] text-neutral-400 font-bold block mt-1">{currentUserProfile.email}</p>
            </div>

            <div className="h-px bg-neutral-100"></div>

            <div className="space-y-3 pt-1 text-left text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-neutral-400">Rôle Actif:</span>
                <span className="text-neutral-800 font-bold capitalize">{currentUserProfile.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Statut:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700">
                  Actif
                </span>
              </div>
            </div>
          </div>

          {/* Company details box */}
          <div className="premium-card p-6 space-y-3.5">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>Entreprise</span>
            </h4>
            <p className="text-[11px] font-bold text-neutral-800 leading-relaxed">
              groupe guermat
            </p>
            <p className="text-[10px] text-neutral-400 font-semibold leading-normal">
              Organisme d'importation réglementé - Alger, Algérie.
            </p>
          </div>
        </div>

        {/* Forms area */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Form 1: Profile details */}
          <div className="premium-card p-6">
            <h3 className="text-xs font-extrabold text-neutral-900 border-b border-neutral-100 pb-3 mb-5 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-neutral-500" />
              <span>Informations Personnelles</span>
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 font-bold animate-in fade-in duration-200">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div className="flex gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 font-bold animate-in fade-in duration-200">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Informations enregistrées avec succès !</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nom Complet</label>
                <input
                  type="text"
                  required
                  placeholder="Nom Complet"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Adresse Email (Lecture seule)</label>
                <input
                  type="email"
                  disabled
                  value={currentUserProfile.email}
                  className="w-full bg-neutral-100 border border-neutral-200/80 rounded-xl px-3.5 py-2.5 text-xs text-neutral-400 outline-none font-bold cursor-not-allowed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#111827] hover:bg-neutral-850 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-premium active:scale-95 disabled:opacity-55"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Enregistrer les modifications</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Password reset */}
          <div className="premium-card p-6">
            <h3 className="text-xs font-extrabold text-neutral-900 border-b border-neutral-100 pb-3 mb-5 uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-neutral-500" />
              <span>Changer le Mot de passe</span>
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 font-bold animate-in fade-in duration-200">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}
              {passSuccess && (
                <div className="flex gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 font-bold animate-in fade-in duration-200">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Mot de passe mis à jour avec succès !</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#111827] hover:bg-neutral-850 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-premium active:scale-95 disabled:opacity-55"
                >
                  {passLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mise à jour...</span>
                    </>
                  ) : (
                    <span>Mettre à jour le mot de passe</span>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
