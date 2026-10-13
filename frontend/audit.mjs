import puppeteer from 'puppeteer';
import fs from 'fs';

async function runAudit() {
  console.log('Starting audit...');
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
    network.push({
      url: response.url(),
      status: response.status(),
      mime: response.headers()['content-type']
    });
  });
  
  // Go to dev server
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch(e) {
    errors.push(`Goto failed: ${e.message}`);
  }
  
  const result = {
    logs,
    network: network.filter(n => n.status >= 400 || n.url.includes('.svg') || n.url.includes('.jpeg') || n.url.includes('logo')),
    errors
  };
  
  fs.writeFileSync('audit_results.json', JSON.stringify(result, null, 2));
  await browser.close();
  console.log('Audit completed.');
}

runAudit();
