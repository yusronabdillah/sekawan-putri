const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log("Navigating to App...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Inject test data directly to IndexedDB via evaluate
  console.log("Injecting test data...");
  await page.evaluate(async () => {
    // We assume the app is using Dexie on window.db, or we can open it directly
    const db = new window.Dexie('SekawanPutriDB');
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
      sync_queue: 'id, idempotency_key, entity, action, status, next_retry_at',
      batches: 'id, product_id, batch_number, status, exp_date',
      restock_requests: 'id, product_id, status, priority, created_at',
      approvals: 'id, type, reference_id, status, created_at',
      audit_logs: 'id, action, user_id, product_id, batch_id, created_at',
      stock_adjustments: 'id, product_id, batch_id, status, created_at',
      notifications: 'id, user_id, title, message, type, reference_id, is_read, created_at'
    });
    
    const now = new Date().toISOString();
    
    // Add users if missing
    await db.users.put({ id: 'u1', username: 'owner', role: 'OWNER', name: 'Owner Test', status: 'active' });
    
    // Add products
    await db.products.put({ id: 'p1', name: 'Nugget Ayam', category: 'Frozen Food', price: 40000, cost_price: 30000, stock: 10 });
    await db.products.put({ id: 'p2', name: 'Bayam', category: 'Sayur', price: 20000, cost_price: 15000, stock: 10 });
    await db.products.put({ id: 'p3', name: 'Es Krim', category: '', price: 10000, cost_price: 5000, stock: 10 });
    
    // Add transactions
    const txId = 'tx-' + Date.now();
    await db.transactions.put({ 
      id: txId, cashier_id: 'u1', customer_id: null, status: 'COMPLETED', 
      created_at: now, total_amount: 110000, subtotal: 110000, payment_method: 'CASH'
    });
    
    await db.transaction_items.put({ id: 'ti1', transaction_id: txId, product_id: 'p1', qty: 2, price: 40000 });
    await db.transaction_items.put({ id: 'ti2', transaction_id: txId, product_id: 'p2', qty: 1, price: 20000 });
    await db.transaction_items.put({ id: 'ti3', transaction_id: txId, product_id: 'p3', qty: 1, price: 10000 });
    
    // Login as OWNER
    localStorage.setItem('user', JSON.stringify({ id: 'u1', role: 'OWNER', name: 'Owner Test' }));
  });

  console.log("Reloading page to apply login and data...");
  await page.reload({ waitUntil: 'networkidle0' });
  
  console.log("Navigating to Laporan...");
  await page.evaluate(() => {
    // Attempt to click Laporan menu
    const links = Array.from(document.querySelectorAll('a'));
    const laporanLink = links.find(el => el.textContent.includes('Laporan'));
    if (laporanLink) laporanLink.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Taking screenshot of Summary...");
  await page.screenshot({ path: 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\f3a432cd-2a1b-4c51-bad8-49cbb662be18\\reports_summary.png' });
  
  console.log("Navigating to Tutup Kas...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const recapBtn = buttons.find(el => el.textContent.includes('Tutup Kas'));
    if (recapBtn) recapBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Taking screenshot of Tutup Kas...");
  await page.screenshot({ path: 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\f3a432cd-2a1b-4c51-bad8-49cbb662be18\\reports_tutup_kas.png' });

  await browser.close();
  console.log("Done");
})();
