const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
    // Start preview server (production)
    const server = spawn('npm', ['run', 'preview'], { cwd: process.cwd(), shell: true });
    
    let resolveServer;
    const serverReady = new Promise(r => resolveServer = r);
    let previewUrl = '';
    
    server.stdout.on('data', (data) => {
        const str = data.toString();
        if (str.includes('Local:')) {
            const match = str.match(/http:\/\/localhost:\d+\//);
            if (match) {
                previewUrl = match[0];
                resolveServer();
            }
        }
    });
    
    await serverReady;
    console.log('Preview server started at', previewUrl);
    
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('logo_toko') || url.includes('qrisnafa')) {
            console.log('\n[NETWORK PROD]', url, response.status());
        }
    });

    console.log('\n[TEST PROD ONLINE]');
    await page.goto(previewUrl, { waitUntil: 'networkidle0' });
    
    let imgs = await page.evaluate(() => {
        return [...document.images].map(img => ({
            src: img.src.substring(0, 50) + '...',
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            display: img.style.display
        }));
    });
    console.log('Online Images:', imgs);

    console.log('\n[TEST PROD OFFLINE]');
    await page.setOfflineMode(true);
    await page.reload({ waitUntil: 'networkidle0' });

    imgs = await page.evaluate(() => {
        return [...document.images].map(img => ({
            src: img.src.substring(0, 50) + '...',
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            display: img.style.display
        }));
    });
    console.log('Offline Images:', imgs);

    await browser.close();
    server.kill();
    process.exit(0);
})();
