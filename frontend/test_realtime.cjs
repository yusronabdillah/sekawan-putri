const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const uuid = require('uuid');

(async () => {
    // Start preview server
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
    
    // Page A: Mobile Dashboard
    console.log('\n--- Buka Mobile Dashboard ---');
    const pageA = await browser.newPage();
    pageA.on('console', msg => {
        if (msg.text().includes('[REALTIME]') || msg.text().includes('Realtime') || msg.text().includes('Starting Realtime Sync')) {
            console.log('[Mobile Dashboard Log]:', msg.text());
        }
    });
    await pageA.goto(previewUrl + '#/login', { waitUntil: 'networkidle0' });
    
    // Inject auth to bypass login
    await pageA.evaluate(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
            state: { isAuthenticated: true, user: { id: 'test-admin', name: 'Test Admin', role: 'OWNER' } },
            version: 0
        }));
    });
    await pageA.goto(previewUrl + '#/', { waitUntil: 'networkidle0' });
    
    // Wait a bit for onSnapshot to initialize
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n--- Simulasi Desktop Melakukan Transaksi (Push ke Firebase) ---');
    const pageB = await browser.newPage();
    await pageB.goto(previewUrl + '#/', { waitUntil: 'networkidle0' });
    
    await pageB.evaluate(async () => {
        const txId = 'TX-' + Date.now();
        const tx = {
            id: txId,
            total_amount: 50000,
            status: 'COMPLETED',
            created_at: new Date().toISOString()
        };
        // Use apiClient to push directly to firebase, simulating Desktop transaction
        await window.apiClient.syncOperation({
            entity: 'transactions',
            action: 'CREATE',
            payload: tx
        });
        console.log('[Desktop]: Transaksi berhasil di-push ke Firebase:', txId);
    });
    
    // Wait for Mobile Dashboard to receive onSnapshot and update
    console.log('\n--- Menunggu Mobile Dashboard Menerima Update Realtime ---');
    await new Promise(r => setTimeout(r, 5000));
    
    await browser.close();
    server.kill();
    process.exit(0);
})();
