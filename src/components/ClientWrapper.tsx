"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import Sidebar from "./Sidebar";
import { Loader2, Menu, Zap } from "lucide-react";
import NotificationManager from "./NotificationManager";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const { companyId, initializeListeners, loading, currentUserProfile } = useAppStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Handle Firebase real-time listeners
  useEffect(() => {
    const unsubscribe = initializeListeners(companyId);
    return () => {
      unsubscribe();
    };
  }, [companyId, initializeListeners]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          <p className="text-slate-500 text-xs font-semibold">Syncing with database...</p>
        </div>
      </div>
    );
  }

  const isApproved = currentUserProfile && currentUserProfile.status === "APPROVED";

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-hidden print:bg-white print:text-black">
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#111827] text-white flex items-center justify-between px-4 z-30 border-b border-white/5 shadow-md">
        <div className="flex items-center gap-2">
          <img src="/logos/logo gm.jpg" alt="Logo GM" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white">GROUPE GUERMAT</span>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white focus:outline-none"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Backdrop overlay for mobile */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-in fade-in duration-205"
        />
      )}

      {/* Sidebar Drawer */}
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto relative h-screen p-4 md:p-8 pt-20 md:pt-8 print:p-0 print:h-auto print:overflow-visible">
        {children}
      </main>
      <NotificationManager />
    </div>
  );
}
