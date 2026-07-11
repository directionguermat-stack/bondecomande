const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    projectId: "mazboncomande"
  });
  console.log("Firebase Admin initialized successfully.");
} catch (e) {
  console.error("Initialization error:", e);
}

const db = getFirestore();

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next batch
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function wipeAll() {
  const collections = [
    "purchaseOrders",
    "suppliers",
    "supplierProducts",
    "importers",
    "notifications",
    "auditLogs",
    "fcmTokens",
    "counters",
    "companies"
  ];

  for (const col of collections) {
    console.log(`Wiping collection: ${col}`);
    try {
      await deleteCollection(col);
      console.log(`Wiped ${col} successfully.`);
    } catch (err) {
      console.error(`Error wiping ${col}:`, err.message);
    }
  }

  // Wipe users except anis.zem00@gmail.com
  console.log("Wiping users except anis.zem00@gmail.com...");
  try {
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (data.email?.toLowerCase() !== "anis.zem00@gmail.com") {
        await doc.ref.delete();
        console.log(`Deleted user: ${data.email}`);
      }
    }
  } catch (err) {
    console.error("Error wiping users:", err.message);
  }

  console.log("Database wipe completed!");
}

wipeAll().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
