export const sendTelegramNotification = async (transaction) => {
    try {
        const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
        const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
        
        if (!token || !chatId) {
            console.warn('Telegram credentials not found in environment');
            return false;
        }

        const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transaction.total_amount || 0);
        
        // Format Date & Time
        let dateStr = '-';
        if (transaction.created_at) {
            const dateObj = new Date(transaction.created_at);
            dateStr = dateObj.toLocaleString('id-ID', { 
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }
        
        let msg = `🛒 <b>Transaksi Baru Masuk!</b>\n\n`;
        msg += `<b>ID:</b> <code>${(transaction.id || '').substring(0, 8).toUpperCase()}</code>\n`;
        msg += `<b>Waktu:</b> ${dateStr}\n`;
        msg += `<b>Kasir:</b> ${transaction.cashier_name || 'Kasir'}\n`;
        msg += `<b>Total:</b> ${formattedTotal}\n`;
        msg += `<b>Metode:</b> ${transaction.payment_method || '-'}\n\n`;
        
        if (transaction.items && Array.isArray(transaction.items)) {
            msg += `<b>Detail Item:</b>\n`;
            transaction.items.forEach((item, index) => {
                const name = item.product_name || item.name || `Barang ${index + 1}`;
                msg += `- ${name} (x${item.qty})\n`;
            });
        } else {
             msg += `<b>Status:</b> Berhasil disinkronisasi ke Cloud\n`;
        }

        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: msg,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();
        if (!data.ok) {
            throw new Error(data.description || 'Failed to send telegram message');
        }
        return true;
    } catch (error) {
        console.error('Error sending telegram notification from frontend:', error);
        return false; // Don't throw, we don't want to break the sync flow
    }
};
