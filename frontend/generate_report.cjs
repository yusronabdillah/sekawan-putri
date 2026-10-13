const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Start a local file server for dist
  const express = require('express');
  const app = express();
  app.use(express.static('dist'));
  const server = app.listen(0);
  const port = server.address().port;
  const url = `http://localhost:${port}`;

  console.log(`Testing at ${url}`);

  const networkLogs = [];
  page.on('response', response => {
    if (response.url().includes('logo_toko') || response.url().includes('qrisnafa')) {
      networkLogs.push({ url: response.url(), status: response.status(), mime: response.headers()['content-type'] });
    }
  });

  // Inject user login and transactions so we can open Checkout Modal
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
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
    await db.users.put({ id: 'u1', username: 'owner', role: 'OWNER', name: 'Owner Test', status: 'active' });
    await db.products.put({ id: 'p1', name: 'Nugget Ayam', price: 40000, stock: 10 });
    localStorage.setItem('user', JSON.stringify({ id: 'u1', role: 'OWNER', name: 'Owner Test' }));
  });
  
  await page.reload({ waitUntil: 'networkidle0' });
  
  // ONLINE SCREENSHOT (Dashboard)
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\1b04ea8f-ab47-4bc3-81f5-6b088135bc20\\screenshot_online.png' });
  
  const consoleLogs = [];
  consoleLogs.push({ mode: 'Online', imgs: await page.evaluate(() => {
    return [...document.images].map(i => ({ src: i.src.substring(0,60)+'...', complete: i.complete, w: i.naturalWidth, h: i.naturalHeight }));
  })});

  // OFFLINE
  await page.setOfflineMode(true);
  
  // Navigate to POS to show Checkout Modal
  await page.evaluate(() => {
    window.location.hash = '#/pos';
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    // add item
    document.querySelector('.card')?.click(); // clicks a product to add to cart
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    // click bayar
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Bayar')).click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    // click QRIS
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('QRIS')).click();
  });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\1b04ea8f-ab47-4bc3-81f5-6b088135bc20\\screenshot_offline.png' });

  // REFRESH OFFLINE
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    window.location.hash = '#/'; // Back to dashboard to see logo
  });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\1b04ea8f-ab47-4bc3-81f5-6b088135bc20\\screenshot_offline_refresh.png' });
  
  consoleLogs.push({ mode: 'Offline Refresh', imgs: await page.evaluate(() => {
    return [...document.images].map(i => ({ src: i.src.substring(0,60)+'...', complete: i.complete, w: i.naturalWidth, h: i.naturalHeight }));
  })});

  // PRECACHE AUDIT
  const swCode = fs.readFileSync('dist/sw.js', 'utf8');
  const precacheEntries = swCode.match(/"url":\s*"[^"]+"/g) || [];
  const inPrecache = precacheEntries.filter(e => e.includes('logo_toko') || e.includes('qrisnafa'));

  const results = {
    networkLogs,
    consoleLogs,
    workboxPrecache: inPrecache
  };
  fs.writeFileSync('C:\\Users\\Windows\\.gemini\\antigravity\\brain\\1b04ea8f-ab47-4bc3-81f5-6b088135bc20\\audit_data.json', JSON.stringify(results, null, 2));

  await browser.close();
  server.close();
  process.exit(0);
})();
