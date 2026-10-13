const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  console.log("Navigating...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  console.log("Injecting DB...");
  await page.evaluate(async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', role: 'OWNER', name: 'Owner Test' }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  
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
  
  const text = await page.evaluate(() => {
    return document.body.innerText;
  });
  
  console.log("DOM TEXT:");
  console.log(text.substring(0, 2000));
  
  await browser.close();
  console.log("Done");
})();
