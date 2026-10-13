const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log("Navigating...");
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  
  console.log("Injecting DB and Reloading...");
  await page.evaluate(async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', role: 'OWNER', name: 'Owner Test' }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const laporanLink = links.find(el => el.textContent.includes('Laporan'));
    if (laporanLink) laporanLink.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const rekapBtn = buttons.find(el => el.textContent.includes('Rekap Kas'));
    if (rekapBtn) rekapBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'rekap_kas.png' });
  
  console.log("Done taking screenshot.");
  await browser.close();
})();
