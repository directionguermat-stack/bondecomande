import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, getDocs, query, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXxaLhpiNsIWl3n9JwQeB6JGZxjtJgWts",
  authDomain: "mazboncomande.firebaseapp.com",
  projectId: "mazboncomande",
  storageBucket: "mazboncomande.firebasestorage.app",
  messagingSenderId: "277926026463",
  appId: "1:277926026463:web:84cf636333371e33075d6a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipeDatabase() {
  console.log("Starting database wipe...");

  // 1. Wipe purchaseOrders and their subcollections
  const posSnap = await getDocs(query(collection(db, "purchaseOrders")));
  for (const poDoc of posSnap.docs) {
    // approvals subcollection
    const appSnap = await getDocs(collection(db, `purchaseOrders/${poDoc.id}/approvals`));
    for (const appDoc of appSnap.docs) {
      await deleteDoc(doc(db, `purchaseOrders/${poDoc.id}/approvals/${appDoc.id}`));
      console.log(`Deleted approval ${appDoc.id} for PO ${poDoc.id}`);
    }
    // importTracking subcollection
    try {
      await deleteDoc(doc(db, `purchaseOrders/${poDoc.id}/importTracking/main`));
      console.log(`Deleted importTracking for PO ${poDoc.id}`);
    } catch (e) {}

    // parent doc
    await deleteDoc(doc(db, "purchaseOrders", poDoc.id));
    console.log(`Deleted PO ${poDoc.id}`);
  }

  // 2. Wipe other tenant collections
  const collectionsToWipe = [
    "suppliers",
    "supplierProducts",
    "importers",
    "notifications",
    "auditLogs",
    "fcmTokens",
    "counters"
  ];

  for (const colName of collectionsToWipe) {
    const q = query(collection(db, colName));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, colName, docSnap.id));
      console.log(`Deleted doc ${docSnap.id} in ${colName}`);
    }
  }

  // 3. Wipe users except the root administrator
  const usersQ = query(collection(db, "users"));
  const usersSnap = await getDocs(usersQ);
  for (const userSnap of usersSnap.docs) {
    const data = userSnap.data();
    if (data.email?.toLowerCase() !== "anis.zem00@gmail.com") {
      await deleteDoc(doc(db, "users", userSnap.id));
      console.log(`Deleted user ${userSnap.id} (${data.email})`);
    }
  }

  console.log("Database wiped successfully!");
}

wipeDatabase().catch(console.error);
