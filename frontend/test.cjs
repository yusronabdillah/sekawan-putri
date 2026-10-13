const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

(async () => {
    // Start dev server
    const server = spawn('npm', ['run', 'dev'], { cwd: process.cwd(), shell: true });
    
    let resolveServer;
    const serverReady = new Promise(r => resolveServer = r);
    let devUrl = '';
    
    server.stdout.on('data', (data) => {
        const str = data.toString();
        if (str.includes('Local:')) {
            const match = str.match(/http:\/\/localhost:\d+\//);
            if (match) {
                devUrl = match[0];
                resolveServer();
            }
        }
    });
    
    await serverReady;
    console.log('Dev server started at', devUrl);
    
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Audit Network
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('logo_toko.jpeg') || url.includes('qrisnafa.jpeg') || response.request().resourceType() === 'image') {
            console.log('\n[NETWORK AUDIT]');
            console.log('URL:', url);
            console.log('Status:', response.status());
            const headers = response.headers();
            console.log('Content-Type:', headers['content-type'] || headers['Content-Type']);
        }
    });

    await page.goto(devUrl, { waitUntil: 'networkidle0' });
    
    console.log('\n[RENDER AUDIT ONLINE]');
    // Check DOM for logoToko and qrisImg
    const imgsOnline = await page.evaluate(() => {
        const imgs = [...document.images];
        return imgs.map(img => ({
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
        }));
    });
    console.log(imgsOnline);

    console.log('\n[TEST OFFLINE]');
    await page.setOfflineMode(true);
    await page.reload({ waitUntil: 'networkidle0' }).catch(e => console.log('Reload offline failed (expected if no SW)', e.message));

    const imgsOffline = await page.evaluate(() => {
        const imgs = [...document.images];
        return imgs.map(img => ({
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
        }));
    }).catch(() => []);
    console.log(imgsOffline);

    await browser.close();
    server.kill();
    process.exit(0);
})();
