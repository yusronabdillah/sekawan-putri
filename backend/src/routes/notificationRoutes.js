const express = require('express');
const router = express.Router();
const { sendMessage } = require('../utils/telegramNotifier');

router.post('/telegram', (req, res) => {
    const { id, cashier_name, total_amount, payment_method, items } = req.body;

    try {
        const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(total_amount || 0);
        
        let msg = `🛒 <b>Transaksi Baru Masuk!</b>\n\n`;
        msg += `<b>ID:</b> <code>${(id || '').substring(0, 8).toUpperCase()}</code>\n`;
        msg += `<b>Kasir:</b> ${cashier_name || 'Kasir'}\n`;
        msg += `<b>Total:</b> ${formattedTotal}\n`;
        msg += `<b>Metode:</b> ${payment_method || '-'}\n\n`;
        msg += `<b>Detail Item:</b>\n`;
        
        if (items && Array.isArray(items)) {
            items.forEach((item, index) => {
                const name = item.product_name || item.name || `Barang ${index + 1}`;
                msg += `- ${name} (x${item.qty})\n`;
            });
        }

        sendMessage(msg);
        res.status(200).json({ success: true, message: 'Notification sent' });
    } catch (error) {
        console.error('Error sending telegram notification:', error);
        res.status(500).json({ success: false, error: 'Failed to send notification' });
    }
});

module.exports = router;
