import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPednaDojIDY9BUChZ7b9pLAXciFzOxhU",
  authDomain: "sekawan-putri-crm-and-pos.firebaseapp.com",
  projectId: "sekawan-putri-crm-and-pos",
  storageBucket: "sekawan-putri-crm-and-pos.firebasestorage.app",
  messagingSenderId: "1091815783351",
  appId: "1:1091815783351:web:c882c22d5644de92bd8632",
  measurementId: "G-E873D7JMZQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteCollection(colName) {
  const snap = await getDocs(collection(db, colName));
  console.log(`Menghapus ${snap.docs.length} dokumen dari koleksi '${colName}' di Firebase...`);
  if (snap.docs.length === 0) return 0;

  const CHUNK_SIZE = 200;
  for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
    const chunk = snap.docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(d => batch.delete(doc(db, colName, d.id)));
    await batch.commit();
    console.log(`  Terhapus: ${Math.min(i + CHUNK_SIZE, snap.docs.length)} / ${snap.docs.length}`);
  }
  return snap.docs.length;
}

async function run() {
  console.log("=== RESET RIWAYAT DATA LAPORAN & TRANSAKSI (FIREBASE) ===");
  
  const collectionsToClear = [
    "transactions",
    "transaction_items",
    "expenses",
    "cash_sessions",
    "stock_movements"
  ];

  for (const col of collectionsToClear) {
    await deleteCollection(col);
  }

  console.log("=== VERIFIKASI HASIL PEMBERSIHAN ===");
  for (const col of collectionsToClear) {
    const snap = await getDocs(collection(db, col));
    console.log(`Koleksi ${col}: ${snap.docs.length} dokumen`);
  }

  console.log("=== SELESAI: Riwayat laporan dan transaksi di Firebase kini bersih (0 dokumen) ===");
  process.exit(0);
}

run().catch(err => {
  console.error("Gagal reset:", err);
  process.exit(1);
});
