"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Ship, 
  Activity, 
  UserCheck,
  Zap,
  Database,
  LogOut,
  User,
  X
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { currentRole, notifications } = useAppStore();

  const unreadCount = notifications.filter(n => !n.readBy.includes(`usr_role_${currentRole}`) && (n.recipientRole === currentRole || n.recipientRole === "all")).length;

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Purchase Orders", href: "/purchase-orders", icon: FileSpreadsheet },
    { name: "Import Tracking", href: "/import-tracking", icon: Ship },
    { name: "Registry Data", href: "/data-management", icon: Database },
    { name: "Audit Logs", href: "/audit-logs", icon: Activity },
    { name: "Mon Profil", href: "/profile", icon: User }
  ];

  if (currentRole === "admin" || currentRole === "dg") {
    navigation.push({ name: "User Approvals", href: "/user-approvals", icon: UserCheck });
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <aside className={`w-64 bg-[#111827] text-gray-300 p-6 flex flex-col justify-between h-screen print:hidden shadow-[4px_0_24px_rgba(0,0,0,0.15)] fixed md:static top-0 bottom-0 left-0 z-40 transform md:transform-none transition-transform duration-200 ease-in-out ${
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    }`}>
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1.5">
          <div className="flex items-center gap-3">
            <img src="/logos/logo gm.jpg" alt="Logo GM" className="h-9 w-9 rounded-xl object-cover shadow-md transition-transform hover:scale-105 duration-200" />
            <div>
              <h1 className="text-xs font-black tracking-tight text-white leading-none">BON DE COMMANDE</h1>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mt-1.5">GROUPE GUERMAT</span>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-premium ${
                  isActive
                    ? "bg-white/10 text-white border-l-2 border-indigo-500 shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-white" : "text-gray-500"}`} />
                <span>{item.name}</span>
                {item.name === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sign Out Control */}
      <div className="pt-4 border-t border-white/5">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-rose-600/10 transition-premium cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 text-gray-500" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}
