const puppeteer = require('puppeteer');
const fs = require('fs');
const express = require('express');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const app = express();
  app.use(express.static('dist'));
  const server = app.listen(0);
  const port = server.address().port;
  const url = `http://localhost:${port}`;

  await page.goto(url, { waitUntil: 'networkidle0' });
  
  // Wait for React to render
  await new Promise(r => setTimeout(r, 2000));
  
  // ONLINE SCREENSHOT (Dashboard)
  await page.screenshot({ path: 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\1b04ea8f-ab47-4bc3-81f5-6b088135bc20\\screenshot_online.png' });
  
  const consoleLogs = [];
  consoleLogs.push({ mode: 'Online', imgs: await page.evaluate(() => {
    return [...document.images].map(i => ({ src: i.src.substring(0,60)+'...', complete: i.complete, w: i.naturalWidth, h: i.naturalHeight }));
  })});

  // OFFLINE
  await page.setOfflineMode(true);
  
  // We can't open Checkout Modal easily without state, so we will inject the QRIS image artificially into the DOM just to test the offline load
  await page.evaluate(() => {
    const qris = document.createElement('img');
    qris.src = './qrisnafa.jpeg';
    qris.id = 'injected-qris';
    qris.style.width = '300px';
    qris.style.position = 'fixed';
    qris.style.bottom = '10px';
    qris.style.right = '10px';
    qris.style.zIndex = '9999';
    document.body.appendChild(qris);
  });
  
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\1b04ea8f-ab47-4bc3-81f5-6b088135bc20\\screenshot_offline.png' });

  // REFRESH OFFLINE
  await page.reload({ waitUntil: 'networkidle0' });
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
    consoleLogs,
    workboxPrecache: inPrecache
  };
  fs.writeFileSync('C:\\Users\\Windows\\.gemini\\antigravity\\brain\\1b04ea8f-ab47-4bc3-81f5-6b088135bc20\\audit_data.json', JSON.stringify(results, null, 2));

  await browser.close();
  server.close();
  process.exit(0);
})();
