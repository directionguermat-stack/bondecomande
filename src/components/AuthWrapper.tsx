"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useAppStore } from "@/lib/store";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { Lock, Mail, User, ShieldAlert, LogOut, CheckCircle, Loader2, KeyRound, Clock } from "lucide-react";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { currentUserProfile, setCurrentUserProfile, setRole, authLoading, setAuthLoading } = useAppStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [requestedRole, setRequestedRole] = useState("achats");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Subscribe to Firebase Auth State changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCurrentUserProfile(null);
        setAuthLoading(false);
        return;
      }

      // Listen to Firestore profile updates for real-time approvals/role updates
      const userRef = doc(db, `users/${user.uid}`);
      const unsubProfile = onSnapshot(userRef, async (snap) => {
        if (snap.exists()) {
          const profile = snap.data();
          
          // Auto-promote root admin if needed
          if (user.email?.toLowerCase() === "anis.zem00@gmail.com" && (profile.status !== "APPROVED" || profile.role !== "admin")) {
            await setDoc(userRef, { status: "APPROVED", role: "admin" }, { merge: true });
            return; // onSnapshot will fire again with updated doc
          }

          setCurrentUserProfile({ uid: user.uid, ...profile });
          // If approved, update active role in the store
          if (profile.status === "APPROVED" && profile.role) {
            setRole(profile.role);
          }
        } else {
          // Profile doc doesn't exist yet (e.g. during auth creation delay), set empty profile
          const isRootAdmin = user.email?.toLowerCase() === "anis.zem00@gmail.com";
          if (isRootAdmin) {
            await setDoc(userRef, {
              uid: user.uid,
              fullName: "Administrateur Anis",
              email: user.email,
              role: "admin",
              status: "APPROVED",
              companyId: "comp_alg_001",
              createdAt: serverTimestamp()
            });
            return;
          }
          
          setCurrentUserProfile({
            uid: user.uid,
            email: user.email || "",
            status: "PENDING"
          });
        }
        setAuthLoading(false);
      }, (err) => {
        console.error("Profile sync failed:", err);
        setAuthLoading(false);
      });

      return () => unsubProfile();
    });

    return () => unsubscribeAuth();
  }, [setCurrentUserProfile, setRole, setAuthLoading]);

  // Handle Login Action
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register Action
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Create profile document in Firestore
      const isRootAdmin = email.toLowerCase() === "anis.zem00@gmail.com";
      await setDoc(doc(db, `users/${uid}`), {
        uid,
        fullName: isRootAdmin ? "Administrateur Anis" : fullName,
        email,
        role: isRootAdmin ? "admin" : requestedRole,
        status: isRootAdmin ? "APPROVED" : "PENDING",
        companyId: "comp_alg_001",
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Out Action
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUserProfile(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
          <p className="text-xs text-neutral-400 font-bold">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  // A. IF USER PROFILE IS NOT LOGGED IN -> SHOW LOGIN / REGISTER FORM
  if (!currentUserProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4 text-neutral-800 font-sans">
        <div className="max-w-md w-full bg-white border border-neutral-100 rounded-3xl p-8 shadow-[0_1px_2px_rgba(0,0,0,0.01),0_8px_32px_rgba(0,0,0,0.02)] space-y-6">
          
          {/* Header info */}
          <div className="text-center space-y-2">
            <img src="/logos/logo gm.jpg" alt="Logo GM" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-md mb-2" />
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
              {isRegistering ? "Créer un compte" : "Accès au Portail"}
            </h2>
            <p className="text-xs text-neutral-400 font-bold">
              {isRegistering ? "GROUPE GUERMAT BON DE COMANDE" : "Entrez vos coordonnées pour accéder au système"}
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {error && (
              <div className="flex gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 font-bold">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {isRegistering && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nom Complet</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ahmed Benali"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  placeholder="name@guermat.dz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold"
                />
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Rôle Demandé</label>
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  className="w-full bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-3.5 py-3 text-xs text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all font-bold cursor-pointer"
                >
                  <option value="achats">Achats (Dossiers de PO)</option>
                  <option value="commercial">Commercial (Signature Step 1)</option>
                  <option value="juridique">Juridique (Signature Step 2)</option>
                  <option value="comptabilite">Comptabilité (Signature Step 3)</option>
                  <option value="finance">Financier / Banque (Signature Step 4)</option>
                  <option value="dg">Direction Générale (Validation Finale)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4.5 py-3.5 text-xs font-bold text-white shadow-md transition-premium active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <span>{isRegistering ? "Créer un compte" : "Se Connecter"}</span>
              )}
            </button>
          </form>

          {/* Form Switcher */}
          <div className="text-center pt-2">
            <button
              onClick={() => {
                setError("");
                setIsRegistering(!isRegistering);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
            >
              {isRegistering ? "Vous avez déjà un compte ? Se connecter" : "Nouveau ? Créer un compte pour approbation"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // B. IF LOGGED IN BUT WAITING FOR APPROVAL -> SHOW PENDING SCREEN
  if (currentUserProfile.status === "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4 text-neutral-800 font-sans">
        <div className="max-w-md w-full bg-white border border-neutral-100 rounded-3xl p-8 shadow-[0_1px_2px_rgba(0,0,0,0.01),0_8px_32px_rgba(0,0,0,0.02)] text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 animate-pulse">
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Compte en attente d'approbation</h2>
            <p className="text-xs text-neutral-500 font-medium leading-relaxed">
              Votre compte avec l'adresse <strong>{currentUserProfile.email}</strong> a été créé avec succès.<br/>
              Un <strong>Administrateur</strong> ou le <strong>DG</strong> doit approuver votre accès et confirmer votre rôle avant de pouvoir continuer.
            </p>
          </div>
          <div className="h-px bg-neutral-100 my-2"></div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 px-4 py-3 text-xs font-bold text-neutral-700 transition-premium"
          >
            <LogOut className="h-4 w-4" />
            <span>Se Déconnecter</span>
          </button>
        </div>
      </div>
    );
  }

  // C. IF LOGGED IN BUT REJECTED -> SHOW BLOCKED ACCESS SCREEN
  if (currentUserProfile.status === "REJECTED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4 text-neutral-800 font-sans">
        <div className="max-w-md w-full bg-white border border-neutral-100 rounded-3xl p-8 shadow-[0_1px_2px_rgba(0,0,0,0.01),0_8px_32px_rgba(0,0,0,0.02)] text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-rose-950 tracking-tight">Accès Refusé</h2>
            <p className="text-xs text-neutral-500 font-medium leading-relaxed">
              Votre demande d'accès pour <strong>{currentUserProfile.email}</strong> a été refusée par la direction. Veuillez contacter un administrateur système.
            </p>
          </div>
          <div className="h-px bg-neutral-100 my-2"></div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 px-4 py-3 text-xs font-bold text-neutral-700 transition-premium"
          >
            <LogOut className="h-4 w-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>
    );
  }

  // D. IF APPROVED AND READY -> INJECT LOGOUT HELPER AND RENDER FULL SYSTEM
  return (
    <>
      {children}
      {/* Tiny floating Sign Out button on the screen for comfort testing */}
      <button
        onClick={handleSignOut}
        title="Sign Out of portal"
        className="fixed bottom-4 left-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 hover:bg-rose-600 text-white shadow-lg transition-premium print:hidden"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </>
  );
}
