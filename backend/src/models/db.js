const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, '../../sekawan_putri.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initDB();
    }
});

function initDB() {
    db.serialize(() => {
        // Users Table (Added name, phone, status, joined_at)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            pin_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('OWNER', 'CASHIER')),
            name TEXT,
            phone TEXT,
            status TEXT DEFAULT 'ACTIVE',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Customers Table
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            points INTEGER DEFAULT 0,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Suppliers Table
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            pic TEXT,
            supplied_products TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Products Table (Added sku, unit, cost_price, supplier_id, is_active)
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            barcode TEXT UNIQUE,
            sku TEXT UNIQUE,
            name TEXT NOT NULL,
            category TEXT,
            cost_price REAL NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            min_stock INTEGER NOT NULL DEFAULT 5,
            unit TEXT DEFAULT 'Pcs',
            supplier_id TEXT,
            is_active INTEGER DEFAULT 1,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
        )`);

        // Transactions Table (Added customer_id, discount, tax, subtotal)
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            cashier_id TEXT,
            customer_id TEXT,
            subtotal REAL NOT NULL,
            discount REAL DEFAULT 0,
            tax REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'VOID', 'REFUND')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(cashier_id) REFERENCES users(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )`);

        // Transaction Items Table
        db.run(`CREATE TABLE IF NOT EXISTS transaction_items (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            qty INTEGER NOT NULL,
            price REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY(transaction_id) REFERENCES transactions(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )`);

        // Audit Logs Table
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            target TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Stock Movements Table (Penjualan, Pembelian, Adjustment, Rusak, Expired, Retur)
        db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            qty_change INTEGER NOT NULL,
            type TEXT NOT NULL,
            user_id TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Expenses Table
        db.run(`CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            notes TEXT,
            user_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Supplier Purchases (Restock Histori)
        db.run(`CREATE TABLE IF NOT EXISTS supplier_purchases (
            id TEXT PRIMARY KEY,
            supplier_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            qty INTEGER NOT NULL,
            cost_price REAL NOT NULL,
            total_cost REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )`);

        // Notifications
        db.run(`CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Batches Table
        db.run(`CREATE TABLE IF NOT EXISTS batches (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            batch_number TEXT NOT NULL,
            qty INTEGER NOT NULL DEFAULT 0,
            in_date DATETIME,
            exp_date DATETIME,
            status TEXT DEFAULT 'Aktif',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )`);

        // Restock Requests Table
        db.run(`CREATE TABLE IF NOT EXISTS restock_requests (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            qty INTEGER NOT NULL,
            reason TEXT,
            priority TEXT DEFAULT 'Normal',
            status TEXT DEFAULT 'Draft',
            created_by TEXT,
            approved_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(created_by) REFERENCES users(id),
            FOREIGN KEY(approved_by) REFERENCES users(id)
        )`);

        // Approvals Table
        db.run(`CREATE TABLE IF NOT EXISTS approvals (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            reference_id TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            requested_by TEXT,
            approved_by TEXT,
            request_payload TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(requested_by) REFERENCES users(id),
            FOREIGN KEY(approved_by) REFERENCES users(id)
        )`);

        // Stock Adjustments Table
        db.run(`CREATE TABLE IF NOT EXISTS stock_adjustments (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            batch_id TEXT,
            qty INTEGER NOT NULL,
            type TEXT NOT NULL,
            reason TEXT,
            notes TEXT,
            status TEXT DEFAULT 'Pending',
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(batch_id) REFERENCES batches(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )`);

        // Seed Default Owner if no users exist
        db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
            if (!err && row.count === 0) {
                const saltRounds = 10;
                const pinHash = await bcrypt.hash('123456', saltRounds);
                db.run('INSERT INTO users (id, username, pin_hash, role, name, status) VALUES (?, ?, ?, ?, ?, ?)', 
                    ['owner-1', 'owner', pinHash, 'OWNER', 'Bapak Owner', 'ACTIVE']
                );
                console.log('Default Owner created: username=owner, pin=123456');
            }
        });
    });
}

module.exports = db;
