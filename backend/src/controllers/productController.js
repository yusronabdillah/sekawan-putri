const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { logAudit } = require('../utils/auditLogger');

exports.getProducts = (req, res) => {
    db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
};

exports.createProduct = (req, res) => {
    const { name, barcode, category, price, stock, min_stock, image_url } = req.body;
    
    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Name and price are required' });
    }

    const id = uuidv4();
    const finalStock = stock || 0;
    const finalMinStock = min_stock || 5;

    db.run(
        `INSERT INTO products (id, barcode, name, category, price, stock, min_stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, barcode, name, category, price, finalStock, finalMinStock, image_url],
        async function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Barcode already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }

            // Log stock movement if initial stock > 0
            if (finalStock > 0) {
                const smId = uuidv4();
                db.run(
                    `INSERT INTO stock_movements (id, product_id, qty_change, type, user_id, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                    [smId, id, finalStock, 'RESTOCK', req.user.id, 'Initial stock']
                );
            }

            await logAudit(req.user.id, 'CREATE_PRODUCT', `Product ID: ${id}`, `Created product: ${name}`);

            res.status(201).json({ message: 'Product created successfully', id });
        }
    );
};

exports.updateProduct = (req, res) => {
    const { id } = req.params;
    const { name, barcode, category, price, min_stock, image_url } = req.body;
    
    // Notice: We don't update stock directly here to maintain audit trail. 
    // Stock is updated via adjustments.

    db.run(
        `UPDATE products SET name = ?, barcode = ?, category = ?, price = ?, min_stock = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, barcode, category, price, min_stock, image_url, id],
        async function (err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            await logAudit(req.user.id, 'UPDATE_PRODUCT', `Product ID: ${id}`, `Updated product details`);

            res.json({ message: 'Product updated successfully' });
        }
    );
};

exports.adjustStock = (req, res) => {
    const { id } = req.params;
    const { qty_change, notes } = req.body; // positive for restock, negative for reduction (broken/expired)
    
    if (qty_change === undefined) {
        return res.status(400).json({ error: 'Qty change is required' });
    }

    db.get(`SELECT stock, name FROM products WHERE id = ?`, [id], (err, product) => {
        if (err || !product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const newStock = product.stock + qty_change;
        if (newStock < 0) {
            return res.status(400).json({ error: 'Stock cannot be negative' });
        }

        db.serialize(() => {
            db.run(`UPDATE products SET stock = ? WHERE id = ?`, [newStock, id]);
            
            const smId = uuidv4();
            const type = qty_change > 0 ? 'RESTOCK' : 'ADJUSTMENT';
            db.run(
                `INSERT INTO stock_movements (id, product_id, qty_change, type, user_id, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                [smId, id, qty_change, type, req.user.id, notes || 'Manual adjustment']
            );
        });

        logAudit(req.user.id, 'ADJUST_STOCK', `Product ID: ${id}`, `Adjusted stock by ${qty_change} for ${product.name}`);

        res.json({ message: 'Stock adjusted successfully', newStock });
    });
};
