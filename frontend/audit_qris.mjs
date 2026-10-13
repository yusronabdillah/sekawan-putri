import puppeteer from 'puppeteer';
import fs from 'fs';

async function runAudit() {
  console.log('Starting QRIS audit...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  const network = [];
  const errors = [];
  
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  page.on('response', response => {
    const url = response.url();
    // Capture image requests or failing requests
    if (url.includes('png') || url.includes('jpeg') || url.includes('jpg') || url.includes('svg') || response.status() >= 400) {
      network.push({
        url: url,
        status: response.status(),
        mime: response.headers()['content-type']
      });
    }
  });
  
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await page.goto('http://localhost:5173/#/pos', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.card', { timeout: 5000 });
    
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.card');
      if(cards.length > 0) cards[0].click();
    });
    
    await page.waitForSelector('.btn-primary', { timeout: 5000 });
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.btn-primary');
      for(let btn of btns) {
        if(btn.innerText.toLowerCase().includes('bayar') || btn.innerText.toLowerCase().includes('checkout')) {
          btn.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
      const labels = document.querySelectorAll('label');
      for(let label of labels) {
        if(label.innerText.includes('QRIS')) {
          label.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const qrisSrc = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      let src = null;
      let rawSrc = null;
      for (let img of imgs) {
        if (img.alt && img.alt.toLowerCase().includes('qris')) {
          src = img.src; 
          rawSrc = img.getAttribute('src');
          return { absolute: src, raw: rawSrc };
        }
      }
      return null;
    });
    
    const result = {
      qrisImgInDOM: qrisSrc,
      consoleLogs: logs.filter(l => l.includes('[BUKTI AUDIT]')),
      networkLogs: network.filter(n => n.url.includes('qris') || n.status === 404)
    };
    
    fs.writeFileSync('qris_audit_results.json', JSON.stringify(result, null, 2));
    
  } catch(e) {
    fs.writeFileSync('qris_audit_results.json', JSON.stringify({ error: e.message, logs, network }, null, 2));
  }
  
  await browser.close();
  console.log('Audit completed.');
}

runAudit();
