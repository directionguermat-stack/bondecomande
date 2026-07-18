"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { messaging, db } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, serverTimestamp, query, collection, where, onSnapshot } from "firebase/firestore";
import { Bell, X, Info, CheckCircle, AlertTriangle } from "lucide-react";

export default function NotificationManager() {
  const { currentRole, currentUserId, companyId } = useAppStore();
  const [toast, setToast] = useState<{ title: string; body: string; url?: string } | null>(null);
  const [tokenRegistered, setTokenRegistered] = useState(false);

  // 1. Request Permission and Register Token
  useEffect(() => {
    if (!messaging || typeof window === "undefined") return;

    const registerFcm = async () => {
      try {
        const fcmMessaging = messaging;
        if (!fcmMessaging) return;

        // Request browser permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("Notification permission denied by user.");
          return;
        }

        // Register the service worker manually to prevent default register issues
        let token = "";
        try {
          const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          token = await getToken(fcmMessaging, {
            vapidKey: "BKe1d86dZ6j0Wf7eL2wP5qR9sN8_vM_tA9B8C7D6E5F4_G3H2I1J0K9L8M7N6O5P4Q3R2S1T0U_V9W8X7Y6Z",
            serviceWorkerRegistration: registration
          });
        } catch (swErr) {
          console.warn("FCM Service Worker manual registration failed, attempting default registration...", swErr);
          // Fallback to default registration if manual registration fails
          token = await getToken(fcmMessaging, {
            vapidKey: "BKe1d86dZ6j0Wf7eL2wP5qR9sN8_vM_tA9B8C7D6E5F4_G3H2I1J0K9L8M7N6O5P4Q3R2S1T0U_V9W8X7Y6Z"
          });
        }

        if (token) {
          console.log("FCM Token obtained successfully:", token);
          
          // Register token to Firestore under `/fcmTokens/{token}`
          const tokenRef = doc(db, `fcmTokens/${token}`);
          await setDoc(tokenRef, {
            token,
            role: currentRole,
            userId: currentUserId || "anonymous",
            companyId,
            updatedAt: serverTimestamp()
          }, { merge: true });

          setTokenRegistered(true);
        } else {
          console.warn("Failed to retrieve FCM web token. Check console.");
        }
      } catch (err) {
        console.warn("FCM Token registration failed gracefully: In-app real-time messages will still function.", err);
      }
    };

    registerFcm();
  }, [currentRole, currentUserId, companyId]);

  // 2. Listen for Foreground Push Notifications (FCM Fallback)
  useEffect(() => {
    const fcmMessaging = messaging;
    if (!fcmMessaging) return;

    const unsubscribe = onMessage(fcmMessaging, (payload) => {
      console.log("Foreground message received:", payload);
      if (payload.notification) {
        setToast({
          title: payload.notification.title || "Notification",
          body: payload.notification.body || "",
          url: payload.data?.url
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Listen for Firestore notifications for robust in-app real-time toasts
  useEffect(() => {
    if (!currentUserId || !currentRole) return;

    const startupTime = Date.now();

    const q = query(
      collection(db, "notifications"),
      where("companyId", "==", companyId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          let createdTime = 0;
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === "function") {
              createdTime = data.createdAt.toDate().getTime();
            } else {
              createdTime = new Date(data.createdAt).getTime();
            }
          }

          // Only notify for items created after this session loaded
          if (createdTime > startupTime) {
            const isRecipient = data.recipientRole === "all" || data.recipientRole === currentRole;
            const readKey = `usr_role_${currentRole}`;
            const alreadyRead = data.readBy && data.readBy.includes(readKey);

            if (isRecipient && !alreadyRead) {
              setToast({
                title: data.title || "Nouvelle Notification",
                body: data.message || "",
                url: data.targetPath
              });

              // Play subtle audio alert if desired, or auto-dismiss
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav");
              audio.volume = 0.2;
              audio.play().catch(() => {});
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentRole, currentUserId, companyId]);

  // Auto close toast after 6 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl p-4 flex gap-3 items-start animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
        <Bell className="h-4.5 w-4.5 animate-bounce" />
      </div>

      <div className="flex-1 space-y-1 text-xs">
        <h4 className="font-extrabold text-slate-900 pr-4">{toast.title}</h4>
        <p className="text-slate-500 font-semibold leading-normal">{toast.body}</p>
        
        {toast.url && (
          <a
            href={toast.url}
            onClick={() => setToast(null)}
            className="inline-flex items-center gap-1 text-[11px] font-black text-sky-600 hover:text-sky-700 pt-1.5"
          >
            <span>Voir les détails</span>
            <ArrowRight className="h-3 w-3" />
          </a>
        )}
      </div>

      <button
        onClick={() => setToast(null)}
        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Simple ArrowRight icon for details link
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
