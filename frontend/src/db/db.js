import Dexie from 'dexie';

export const db = new Dexie('SekawanPutriDB');

db.version(4).stores({
  users: 'id, username, role, name, phone, status',
  products: 'id, barcode, sku, name, category, stock, cost_price, price, unit',
  transactions: 'id, cashier_id, customer_id, status, created_at',
  transaction_items: 'id, transaction_id, product_id',
  customers: 'id, name, phone',
  expenses: 'id, category, user_id, created_at',
  stock_movements: 'id, product_id, type, created_at',
  suppliers: 'id, name',
  supplier_purchases: 'id, supplier_id, product_id, created_at',
  cash_sessions: 'id, cashier_id, opened_at, closed_at',
  sync_queue: 'id, type, action, payload, status, created_at'
});

db.version(5).stores({
  users: 'id, username, role, name, phone, status',
  products: 'id, barcode, sku, name, category, stock, cost_price, price, unit',
  transactions: 'id, cashier_id, customer_id, status, created_at',
  transaction_items: 'id, transaction_id, product_id',
  customers: 'id, name, phone',
  expenses: 'id, category, user_id, created_at',
  stock_movements: 'id, product_id, type, created_at',
  suppliers: 'id, name',
  supplier_purchases: 'id, supplier_id, product_id, created_at',
  cash_sessions: 'id, cashier_id, opened_at, closed_at',
  sync_queue: 'id, type, action, payload, status, created_at'
});

db.version(6).stores({
  users: 'id, username, role, name, phone, status',
  products: 'id, barcode, sku, name, category, stock, cost_price, price, unit',
  transactions: 'id, cashier_id, customer_id, status, created_at',
  transaction_items: 'id, transaction_id, product_id',
  customers: 'id, name, phone',
  expenses: 'id, category, user_id, created_at',
  stock_movements: 'id, product_id, type, created_at',
  suppliers: 'id, name',
  supplier_purchases: 'id, supplier_id, product_id, created_at',
  cash_sessions: 'id, cashier_id, opened_at, closed_at',
  sync_queue: 'id, type, action, payload, status, created_at',
  batches: 'id, product_id, batch_number, status, exp_date',
  restock_requests: 'id, product_id, status, priority, created_at',
  approvals: 'id, type, reference_id, status, created_at',
  audit_logs: 'id, action, user_id, product_id, batch_id, created_at',
  stock_adjustments: 'id, product_id, batch_id, status, created_at'
}).upgrade(async (tx) => {
  // Migration logic: create default batch for existing products with stock > 0
  const products = await tx.products.toArray();
  const batches = [];
  const now = new Date().toISOString();
  
  for (const product of products) {
    if (product.stock > 0) {
      batches.push({
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        product_id: product.id,
        batch_number: 'BATCH-MIGRATION',
        qty: product.stock,
        in_date: now,
        exp_date: null,
        status: 'Aktif',
        created_at: now
      });
    }
  }
  
  if (batches.length > 0) {
    await tx.batches.bulkAdd(batches);
  }
});

db.version(7).stores({
  users: 'id, username, role, name, phone, status',
  products: 'id, barcode, sku, name, category, stock, cost_price, price, unit',
  transactions: 'id, cashier_id, customer_id, status, created_at',
  transaction_items: 'id, transaction_id, product_id',
  customers: 'id, name, phone',
  expenses: 'id, category, user_id, created_at',
  stock_movements: 'id, product_id, type, created_at',
  suppliers: 'id, name',
  supplier_purchases: 'id, supplier_id, product_id, created_at',
  cash_sessions: 'id, cashier_id, opened_at, closed_at',
  sync_queue: 'id, type, action, payload, status, created_at',
  batches: 'id, product_id, batch_number, status, exp_date',
  restock_requests: 'id, product_id, status, priority, created_at',
  approvals: 'id, type, reference_id, status, created_at',
  audit_logs: 'id, action, user_id, product_id, batch_id, created_at',
  stock_adjustments: 'id, product_id, batch_id, status, created_at',
  notifications: 'id, user_id, title, message, type, reference_id, is_read, created_at'
});

db.version(8).stores({
  users: 'id, username, role, name, phone, status',
  products: 'id, barcode, sku, name, category, stock, cost_price, price, unit',
  transactions: 'id, cashier_id, customer_id, status, created_at',
  transaction_items: 'id, transaction_id, product_id',
  customers: 'id, name, phone',
  expenses: 'id, category, user_id, created_at',
  stock_movements: 'id, product_id, type, created_at',
  suppliers: 'id, name',
  supplier_purchases: 'id, supplier_id, product_id, created_at',
  cash_sessions: 'id, cashier_id, opened_at, closed_at',
  sync_queue: 'id, idempotency_key, entity, action, status, next_retry_at', // Updated schema for Offline-First sync queue
  batches: 'id, product_id, batch_number, status, exp_date',
  restock_requests: 'id, product_id, status, priority, created_at',
  approvals: 'id, type, reference_id, status, created_at',
  audit_logs: 'id, action, user_id, product_id, batch_id, created_at',
  stock_adjustments: 'id, product_id, batch_id, status, created_at',
  notifications: 'id, user_id, title, message, type, reference_id, is_read, created_at'
}).upgrade(async (tx) => {
  // Clear old sync_queue since we are changing schema drastically
  await tx.sync_queue.clear();
});

// Seed some initial offline products if empty (optional, mostly for dev)
db.on('populate', async () => {
    // We will sync products from backend normally
});

// Diagnostik tambahan untuk memastikan database ter-inisialisasi
db.on('ready', async () => {
  console.log("=========================================");
  console.log("🔄 [DEXIE DIAGNOSTIK] Inisialisasi Database Sukses");
  console.log(`▶ Versi Database Saat Ini: ${db.verno}`);
  console.log("▶ Daftar Object Store yang aktif:");
  
  db.tables.forEach(table => {
    console.log(`  - ✅ ${table.name}`);
  });
  console.log("=========================================");
});

// Pastikan kita menangkap error saat open()
db.open().catch(err => {
  console.error("❌ [DEXIE DIAGNOSTIK] GAGAL MEMBUKA DATABASE:", err.stack || err);
});

window.db = db;
