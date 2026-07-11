import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDXxaLhpiNsIWl3n9JwQeB6JGZxjtJgWts",
  authDomain: "mazboncomande.firebaseapp.com",
  projectId: "mazboncomande",
  storageBucket: "mazboncomande.firebasestorage.app",
  messagingSenderId: "277926026463",
  appId: "1:277926026463:web:84cf636333371e33075d6a"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Safe export for SSR and environment support check
const messaging = typeof window !== "undefined" && typeof window.navigator !== "undefined"
  ? getMessaging(app)
  : null;

export { app, db, auth, storage, messaging };
