import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function chunkedDelete(docs) {
  const CHUNK_SIZE = 200;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(doc(db, "products", d.id)));
    await batch.commit();
    console.log(`Deleted ${Math.min(i + CHUNK_SIZE, docs.length)} / ${docs.length} old products...`);
  }
}

async function chunkedInsert(products) {
  const CHUNK_SIZE = 200;
  const now = new Date().toISOString();
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunk = products.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      const payload = {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        price: p.price,
        cost_price: p.cost_price || 0,
        stock: p.stock ?? 20,
        unit: p.unit || "Pcs",
        image_url: p.image_url || "",
        discount: 0,
        exp_date: "",
        updated_at: now
      };
      batch.set(doc(db, "products", p.id), payload);
    });
    await batch.commit();
    console.log(`Uploaded ${Math.min(i + CHUNK_SIZE, products.length)} / ${products.length} new products...`);
  }
}

async function run() {
  console.log("=== MIGRASI PRODUK SEKAWAN PUTRI DARI LIST.xlsx ===");
  const jsonPath = path.join(__dirname, "products_list_433.json");
  const products = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Loaded ${products.length} products from products_list_433.json`);

  // 1. Delete all existing products in Firestore
  const existingSnap = await getDocs(collection(db, "products"));
  console.log(`Found ${existingSnap.docs.length} old/dummy products in Firestore. Deleting...`);
  if (existingSnap.docs.length > 0) {
    await chunkedDelete(existingSnap.docs);
  }

  // 2. Upload all 433 products from LIST.xlsx
  await chunkedInsert(products);

  // 3. Verify count in Firestore
  const verifySnap = await getDocs(collection(db, "products"));
  console.log(`=== SELESAI! Total produk aktif di Firestore sekarang: ${verifySnap.docs.length} ===`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
