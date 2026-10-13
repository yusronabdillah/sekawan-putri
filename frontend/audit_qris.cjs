const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  
  let auditLog = "=== HASIL AUDIT JARINGAN & DOM ===\n\n";

  // Tangkap semua network response
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('qrisnafa') || url.includes('logo_toko')) {
      const status = response.status();
      const headers = response.headers();
      const contentType = headers['content-type'];
      auditLog += `[NETWORK] URL: ${url}\n`;
      auditLog += `[NETWORK] Status: ${status}\n`;
      auditLog += `[NETWORK] Content-Type: ${contentType}\n`;
      
      try {
        const text = await response.text();
        auditLog += `[NETWORK] Response Type (Snippet): ${text.substring(0, 50)}\n\n`;
      } catch (e) {
        auditLog += `[NETWORK] Cannot read body (probably binary/image).\n\n`;
      }
    }
  });

  // 1. ONLINE TEST
  auditLog += "--- PENGUJIAN ONLINE ---\n";
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(3000); // Tunggu SW register
  
  // 2. OFFLINE TEST
  auditLog += "--- PENGUJIAN OFFLINE ---\n";
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForTimeout(2000);

  // Cari elemen gambar di DOM
  const domAudit = await page.evaluate(() => {
    const imgs = [...document.images];
    let log = '';
    imgs.forEach(img => {
      if (img.src.includes('qrisnafa') || img.src.includes('logo_toko')) {
        log += `[DOM] Image Found:\n`;
        log += `- src: ${img.src.substring(0, 100)}...\n`;
        log += `- complete: ${img.complete}\n`;
        log += `- naturalWidth: ${img.naturalWidth}\n`;
        log += `- naturalHeight: ${img.naturalHeight}\n\n`;
      }
    });
    return log;
  });

  auditLog += domAudit;
  
  fs.writeFileSync('audit_results.txt', auditLog);
  console.log("Audit selesai. Disimpan di audit_results.txt");
  await browser.close();
})();
