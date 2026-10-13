const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { logAudit } = require('../utils/auditLogger');
const { sendMessage } = require('../utils/telegramNotifier');

exports.createTransaction = (req, res) => {
    const { total_amount, payment_method, items } = req.body;
    
    if (!total_amount || !payment_method || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing transaction details' });
    }

    const txId = uuidv4();
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(
            `INSERT INTO transactions (id, cashier_id, total_amount, payment_method) VALUES (?, ?, ?, ?)`,
            [txId, req.user.id, total_amount, payment_method],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to create transaction' });
                }
            }
        );

        items.forEach(item => {
            const itemId = uuidv4();
            db.run(
                `INSERT INTO transaction_items (id, transaction_id, product_id, qty, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
                [itemId, txId, item.product_id, item.qty, item.price, item.subtotal]
            );

            // Deduct stock
            db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.qty, item.product_id]);
            
            // Log stock movement
            const smId = uuidv4();
            db.run(
                `INSERT INTO stock_movements (id, product_id, qty_change, type, user_id, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                [smId, item.product_id, -item.qty, 'SALE', req.user.id, `Sale TX: ${txId}`]
            );
        });

        db.run('COMMIT', async (err) => {
            if (err) {
                return res.status(500).json({ error: 'Transaction commit failed' });
            }

            await logAudit(req.user.id, 'SALE', `Transaction ID: ${txId}`, `Completed sale of ${total_amount} via ${payment_method}`);
            
            // Format message for Telegram
            const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(total_amount);
            let msg = `🛒 <b>Transaksi Baru Masuk!</b>\n\n`;
            msg += `<b>ID:</b> <code>${txId.substring(0, 8).toUpperCase()}</code>\n`;
            msg += `<b>Kasir:</b> ${req.user.username || req.user.name || 'Kasir'}\n`;
            msg += `<b>Total:</b> ${formattedTotal}\n`;
            msg += `<b>Metode:</b> ${payment_method}\n\n`;
            msg += `<b>Detail Item:</b>\n`;
            
            // Fetch product names for details (if items contain names)
            // If the frontend doesn't send names, we'll format what we have
            items.forEach((item, index) => {
                const name = item.product_name || `Barang ${index + 1}`;
                msg += `- ${name} (x${item.qty})\n`;
            });

            sendMessage(msg);

            res.status(201).json({ message: 'Transaction successful', id: txId });
        });
    });
};

exports.voidTransaction = (req, res) => {
    const { id } = req.params;
    
    // Check if the transaction exists and is not already void
    db.get(`SELECT * FROM transactions WHERE id = ?`, [id], (err, tx) => {
        if (err || !tx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        if (tx.status === 'VOID') {
            return res.status(400).json({ error: 'Transaction is already voided' });
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(`UPDATE transactions SET status = 'VOID' WHERE id = ?`, [id]);

            // Restore stock
            db.all(`SELECT * FROM transaction_items WHERE transaction_id = ?`, [id], (err, items) => {
                items.forEach(item => {
                    db.run(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.qty, item.product_id]);
                    
                    const smId = uuidv4();
                    db.run(
                        `INSERT INTO stock_movements (id, product_id, qty_change, type, user_id, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                        [smId, item.product_id, item.qty, 'VOID', req.user.id, `Void TX: ${id}`]
                    );
                });

                db.run('COMMIT', async (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Void commit failed' });
                    }
                    await logAudit(req.user.id, 'VOID_TRANSACTION', `Transaction ID: ${id}`, `Owner voided transaction`);
                    res.json({ message: 'Transaction voided successfully' });
                });
            });
        });
    });
};

exports.getTransactions = (req, res) => {
    // Basic implementation for fetching transactions. We will join cashier username.
    db.all(`
        SELECT t.*, u.username as cashier_name 
        FROM transactions t 
        LEFT JOIN users u ON t.cashier_id = u.id 
        ORDER BY t.created_at DESC
        LIMIT 100
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
};
