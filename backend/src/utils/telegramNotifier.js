const https = require('https');

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const sendMessage = (message) => {
    if (!botToken || !chatId) {
        console.warn('Telegram Bot Token or Chat ID is not configured. Skipping notification.');
        return;
    }

    const payload = JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('Telegram notification sent successfully.');
            } else {
                console.error(`Telegram API error (${res.statusCode}):`, data);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Failed to send Telegram notification:', e.message);
    });

    req.write(payload);
    req.end();
};

module.exports = {
    sendMessage
};
