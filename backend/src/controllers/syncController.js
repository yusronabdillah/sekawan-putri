const db = require('../models/db');

exports.pullAllData = async (req, res) => {
    try {
        const tables = [
            'users', 'customers', 'suppliers', 'products', 
            'transactions', 'transaction_items', 'audit_logs', 
            'stock_movements', 'expenses', 'supplier_purchases', 'notifications',
            'batches', 'restock_requests', 'approvals', 'stock_adjustments'
        ];

        const data = {};

        const fetchTable = (tableName) => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        };

        for (const table of tables) {
            data[table] = await fetchTable(table);
        }

        res.json({
            success: true,
            message: 'All data pulled successfully',
            data
        });
    } catch (err) {
        console.error('Error pulling data:', err);
        res.status(500).json({ error: 'Server error pulling data' });
    }
};
