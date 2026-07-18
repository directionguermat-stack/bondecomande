import { doc, writeBatch, collection, getDocs, query, limit, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  country: string;
  currency: string;
  bankDetails: {
    iban: string;
    swift: string;
    bankName: string;
  };
  contactEmail: string;
  phone?: string;
  createdAt: string;
}

export interface SupplierProduct {
  id: string;
  companyId: string;
  supplierId: string;
  sku: string;
  name: string;
  price: number;
  currency: string;
  availableStock: number;
  reservedStock: number;
  unit: string;
  updatedAt: string;
}

export const initialSuppliers: Omit<Supplier, "companyId">[] = [];

export const initialProducts: Omit<SupplierProduct, "companyId">[] = [];

export async function isDatabaseSeeded(companyId: string): Promise<boolean> {
  try {
    const q = query(collection(db, "suppliers"), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.error("Error checking database seeds:", error);
    return false;
  }
}

export interface ImporterCompany {
  id: string;
  companyId: string;
  name: string;
  nif: string;
  rc: string;
  address: string;
  contact: string;
  logoUrl?: string;
  phone?: string;
  createdAt: string;
}

export async function seedDatabase(companyId: string) {
  const batch = writeBatch(db);

  // 1. Seed Company
  const companyRef = doc(db, "companies", companyId);
  batch.set(companyRef, {
    id: companyId,
    name: "groupe guermat",
    nif: "002016099023456",
    rc: "16/00-0987654B20",
    address: "Alger, Algérie",
    createdAt: new Date().toISOString(),
    status: "active"
  });

  // Seed default Importer Company
  const importerRef = doc(db, "importers", "imp_default");
  batch.set(importerRef, {
    id: "imp_default",
    companyId,
    name: "groupe guermat",
    nif: "002016099023456",
    rc: "16/00-0987654B20",
    address: "Alger, Algérie",
    contact: "contact@guermat.dz",
    createdAt: new Date().toISOString()
  });

  // 2. Seed Users for each testing role
  const roles = ["achats", "commercial", "juridique", "comptabilite", "finance", "dg", "logistique", "admin"];
  roles.forEach(role => {
    const userRef = doc(db, "users", `usr_role_${role}`);
    batch.set(userRef, {
      uid: `usr_role_${role}`,
      companyId: companyId,
      email: `${role}@importalger.dz`,
      displayName: `Ahmed (${role.toUpperCase()})`,
      role: role,
      permissions: ["create_po", "approve_po", "edit_draft_po"],
      active: true,
      createdAt: new Date().toISOString()
    });
  });

  // 3. Seed Suppliers
  initialSuppliers.forEach(sup => {
    const supRef = doc(db, "suppliers", sup.id);
    batch.set(supRef, {
      ...sup,
      companyId
    });
  });

  // 4. Seed Products
  initialProducts.forEach(prod => {
    const prodRef = doc(db, "supplierProducts", prod.id);
    batch.set(prodRef, {
      ...prod,
      companyId
    });
  });

  // 5. Seed Counter
  const counterRef = doc(db, "counters", companyId);
  batch.set(counterRef, {
    purchaseOrders: {
      currentYear: new Date().getFullYear(),
      lastSequenceNumber: 0
    }
  });

  await batch.commit();
  console.log("Database successfully seeded!");
}

export async function formatDatabase(companyId: string) {
  // 1. Wipe purchaseOrders and their subcollections
  const posSnap = await getDocs(query(collection(db, "purchaseOrders")));
  for (const poDoc of posSnap.docs) {
    // approvals subcollection
    const appSnap = await getDocs(collection(db, `purchaseOrders/${poDoc.id}/approvals`));
    for (const appDoc of appSnap.docs) {
      await deleteDoc(doc(db, `purchaseOrders/${poDoc.id}/approvals/${appDoc.id}`));
    }
    // importTracking subcollection
    await deleteDoc(doc(db, `purchaseOrders/${poDoc.id}/importTracking/main`));

    // parent doc
    await deleteDoc(doc(db, "purchaseOrders", poDoc.id));
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
    }
  }

  // 3. Wipe users except the root administrator
  const usersQ = query(collection(db, "users"));
  const usersSnap = await getDocs(usersQ);
  for (const userSnap of usersSnap.docs) {
    const data = userSnap.data();
    if (data.email?.toLowerCase() !== "anis.zem00@gmail.com") {
      await deleteDoc(doc(db, "users", userSnap.id));
    }
  }

  console.log("Database formatted successfully!");
}
