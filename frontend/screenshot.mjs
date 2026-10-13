import puppeteer from 'puppeteer';
import fs from 'fs';

async function runScreenshot() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800 }); 
  
  try {
    // Port 4173 is the default for Vite preview
    await page.goto('http://localhost:4173/#/pos', { waitUntil: 'networkidle0' });
    
    // Add item to cart
    await page.waitForSelector('.card', { timeout: 5000 });
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.card');
      if(cards.length > 0) cards[0].click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Open CartBottomSheet by clicking the floating cart banner
    await page.evaluate(() => {
      // Find the sticky bottom bar that contains Rp
      const divs = document.querySelectorAll('div');
      for(let div of divs) {
        if(div.innerText && div.innerText.includes('Lihat Keranjang')) {
          div.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Click Checkout button inside CartBottomSheet
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.btn-primary, button');
      for(let btn of btns) {
        if(btn.innerText && btn.innerText.toLowerCase().includes('checkout')) {
          btn.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Select QRIS
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for(let btn of btns) {
        if(btn.innerText && btn.innerText.trim() === 'QRIS') {
          btn.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Take screenshot
    const screenshotPath = 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\f3a432cd-2a1b-4c51-bad8-49cbb662be18\\qris_screenshot.png';
    await page.screenshot({ path: screenshotPath });
    
    // Get DOM HTML
    const domHtml = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      let found = [];
      for (let img of imgs) {
        found.push(img.alt + ": " + img.src);
        if (img.alt && img.alt.includes('QRIS')) {
          return img.outerHTML;
        }
      }
      return "QRIS IMAGE NOT FOUND IN DOM. Found images: " + found.join(', ');
    });
    
    fs.writeFileSync('C:\\Users\\Windows\\.gemini\\antigravity\\brain\\f3a432cd-2a1b-4c51-bad8-49cbb662be18\\qris_dom.txt', domHtml);
    
  } catch(e) {
    fs.writeFileSync('C:\\Users\\Windows\\.gemini\\antigravity\\brain\\f3a432cd-2a1b-4c51-bad8-49cbb662be18\\qris_dom.txt', 'ERROR: ' + e.message);
  }
  
  await browser.close();
}
runScreenshot();
