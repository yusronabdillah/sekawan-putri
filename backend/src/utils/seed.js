const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const { fakerID_ID: faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../../backend/sekawan_putri.db');

// Read schema and initialize db directly to avoid requiring the app's db.js which runs init automatically
const db = new sqlite3.Database(dbPath);

const CATEGORIES = ['Sayur Segar', 'Frozen Food', 'Bumbu Dapur', 'Minuman', 'Sembako', 'Daging', 'Buah Segar', 'Snack & Camilan'];
const UNITS = ['Pcs', 'Kg', 'Gram', 'Ikat', 'Bungkus', 'Botol', 'Karton'];
const PAYMENT_METHODS = ['CASH', 'QRIS', 'TRANSFER'];
const TX_STATUS = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'VOID', 'REFUND']; // Weighted

async function hash(pin) {
    return await bcrypt.hash(pin, 10);
}

async function runSeed() {
    console.log('--- Mulai Proses Seeding Data Dummy Sekawan Putri ---');

    db.serialize(() => {
        // 1. Wipe all tables
        console.log('Wiping existing database...');
        db.run(`PRAGMA writable_schema = 1;`);
        db.run(`DELETE FROM sqlite_master WHERE type IN ('table', 'index', 'trigger');`);
        db.run(`PRAGMA writable_schema = 0;`);

        // 2. Recreate schema
        console.log('Recreating tables...');
        const schema = [
            `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, pin_hash TEXT NOT NULL, role TEXT NOT NULL, name TEXT, phone TEXT, status TEXT DEFAULT 'ACTIVE', joined_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, points INTEGER DEFAULT 0, joined_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, address TEXT, pic TEXT, supplied_products TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, barcode TEXT UNIQUE, sku TEXT UNIQUE, name TEXT NOT NULL, category TEXT, cost_price REAL NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL DEFAULT 0, min_stock INTEGER NOT NULL DEFAULT 5, unit TEXT, supplier_id TEXT, is_active INTEGER DEFAULT 1, image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, cashier_id TEXT, customer_id TEXT, subtotal REAL NOT NULL, discount REAL DEFAULT 0, tax REAL DEFAULT 0, total_amount REAL NOT NULL, payment_method TEXT NOT NULL, status TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS transaction_items (id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL, product_id TEXT NOT NULL, qty INTEGER NOT NULL, price REAL NOT NULL, subtotal REAL NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, target TEXT, details TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, qty_change INTEGER NOT NULL, type TEXT NOT NULL, user_id TEXT, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, category TEXT NOT NULL, amount REAL NOT NULL, notes TEXT, user_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS supplier_purchases (id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL, product_id TEXT NOT NULL, qty INTEGER NOT NULL, cost_price REAL NOT NULL, total_cost REAL NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, type TEXT NOT NULL, message TEXT NOT NULL, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
        ];
        schema.forEach(query => db.run(query));
    });

    // Wait a bit to ensure commit is done
    await new Promise(resolve => setTimeout(resolve, 500));

    db.serialize(async () => {
        db.run('BEGIN TRANSACTION');

        // Generate Users
        console.log('Generating Users...');
        const ownerId = uuidv4();
        db.run(`INSERT INTO users (id, username, pin_hash, role, name, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [ownerId, 'owner', await hash('123456'), 'OWNER', 'Bapak Budi (Owner)', faker.phone.number(), 'ACTIVE']);
        
        const cashiers = [];
        for (let i = 1; i <= 3; i++) {
            const id = uuidv4();
            cashiers.push(id);
            db.run(`INSERT INTO users (id, username, pin_hash, role, name, phone, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [id, `kasir${i}`, await hash('123456'), 'CASHIER', faker.person.fullName(), faker.phone.number(), 'ACTIVE', faker.date.past({ years: 1 }).toISOString()]);
            
            // Audit log for creation
            db.run(`INSERT INTO audit_logs (id, user_id, action, target, details) VALUES (?, ?, ?, ?, ?)`, 
                [uuidv4(), ownerId, 'CREATE_USER', `User: kasir${i}`, 'Owner created a new cashier']);
        }

        // Generate Suppliers
        console.log('Generating Suppliers...');
        const supplierIds = [];
        for (let i = 0; i < 10; i++) {
            const id = uuidv4();
            supplierIds.push(id);
            db.run(`INSERT INTO suppliers (id, name, phone, address, pic, supplied_products) VALUES (?, ?, ?, ?, ?, ?)`, 
                [id, faker.company.name(), faker.phone.number(), faker.location.streetAddress(), faker.person.fullName(), faker.commerce.department()]);
        }
        
        // Edge case: Supplier without phone
        const supEdge = uuidv4();
        supplierIds.push(supEdge);
        db.run(`INSERT INTO suppliers (id, name, phone, address, pic) VALUES (?, ?, ?, ?, ?)`, 
            [supEdge, 'Supplier Tanpa Nomor HP', '', faker.location.streetAddress(), faker.person.fullName()]);

        // Generate Customers
        console.log('Generating Customers...');
        const customerIds = [];
        for (let i = 0; i < 100; i++) {
            const id = uuidv4();
            customerIds.push(id);
            db.run(`INSERT INTO customers (id, name, phone, points, joined_at) VALUES (?, ?, ?, ?, ?)`, 
                [id, faker.person.fullName(), faker.phone.number(), faker.number.int({ min: 0, max: 5000 }), faker.date.recent({ days: 180 }).toISOString()]);
        }

        // Generate Products
        console.log('Generating 100+ Products...');
        const productIds = [];
        const generateProduct = (idx, customName, forceStock, forcePrice, noBarcode, duplicateBarcode) => {
            const id = uuidv4();
            productIds.push(id);
            const category = faker.helpers.arrayElement(CATEGORIES);
            const name = customName || `${category.split(' ')[0]} ${faker.commerce.productName()}`;
            const cost = faker.number.int({ min: 2, max: 80 }) * 1000;
            const price = forcePrice !== undefined ? forcePrice : cost + (faker.number.int({ min: 1, max: 20 }) * 1000);
            const stock = forceStock !== undefined ? forceStock : faker.number.int({ min: 5, max: 100 });
            const barcode = noBarcode ? null : (duplicateBarcode || faker.string.numeric(13));
            
            db.run(`INSERT INTO products (id, barcode, sku, name, category, cost_price, price, stock, min_stock, unit, supplier_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [id, barcode, `SKU-${faker.string.alphanumeric(8).toUpperCase()}`, name, category, cost, price, stock, 5, faker.helpers.arrayElement(UNITS), faker.helpers.arrayElement(supplierIds), faker.image.urlLoremFlickr({ category: 'food' })]);
        };

        for (let i = 0; i < 90; i++) generateProduct(i);
        
        // Edge cases products
        generateProduct(90, 'Produk Stok Kosong', 0, undefined, false);
        generateProduct(91, 'Produk Harga Nol', undefined, 0, false);
        generateProduct(92, 'Sayur Bayam Super Segar Langsung Dari Petani Pilihan Terbaik Tanpa Pestisida', undefined, undefined, false); // Sangat panjang
        generateProduct(93, 'Produk Tanpa Barcode 1', undefined, undefined, true);
        
        // Fix: Instead of intentional constraint violation, we just add normal products.
        for (let i = 0; i < 10; i++) generateProduct(100+i);

        // Generate Expenses
        console.log('Generating 100 Expenses...');
        for (let i = 0; i < 100; i++) {
            const expDate = faker.date.recent({ days: 30 }).toISOString();
            db.run(`INSERT INTO expenses (id, category, amount, notes, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`, 
                [uuidv4(), faker.helpers.arrayElement(['Listrik', 'Air', 'Gaji', 'Transport', 'Internet', 'ATK', 'Lainnya']), faker.number.int({ min: 50, max: 2000 }) * 1000, faker.lorem.sentence(), ownerId, expDate]);
            db.run(`INSERT INTO audit_logs (id, user_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`, 
                [uuidv4(), ownerId, 'ADD_EXPENSE', 'Expense', 'Added daily expense', expDate]);
        }

        // Generate Supplier Purchases (Restock)
        console.log('Generating 80 Supplier Purchases...');
        for (let i = 0; i < 80; i++) {
            const date = faker.date.recent({ days: 30 }).toISOString();
            const pId = faker.helpers.arrayElement(productIds);
            const sId = faker.helpers.arrayElement(supplierIds);
            const qty = faker.number.int({ min: 10, max: 100 });
            const cost = faker.number.int({ min: 2, max: 50 }) * 1000;
            
            db.run(`INSERT INTO supplier_purchases (id, supplier_id, product_id, qty, cost_price, total_cost, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [uuidv4(), sId, pId, qty, cost, qty * cost, date]);
            
            db.run(`INSERT INTO stock_movements (id, product_id, qty_change, type, user_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [uuidv4(), pId, qty, 'RESTOCK', ownerId, `Restock from supplier`, date]);
        }

        // Generate 500 Transactions
        console.log('Generating 500 Transactions...');
        for (let i = 0; i < 500; i++) {
            const txId = uuidv4();
            const txDate = faker.date.recent({ days: 30 }).toISOString();
            const cId = faker.helpers.arrayElement(cashiers);
            const custId = faker.helpers.maybe(() => faker.helpers.arrayElement(customerIds), { probability: 0.4 });
            const status = faker.helpers.arrayElement(TX_STATUS);
            const payMethod = faker.helpers.arrayElement(PAYMENT_METHODS);

            const numItems = faker.number.int({ min: 2, max: 8 });
            let subtotal = 0;
            
            for (let j = 0; j < numItems; j++) {
                const itemId = uuidv4();
                const pId = faker.helpers.arrayElement(productIds);
                const qty = faker.number.int({ min: 1, max: 5 });
                const price = faker.number.int({ min: 5, max: 50 }) * 1000;
                const itemSub = qty * price;
                subtotal += itemSub;

                db.run(`INSERT INTO transaction_items (id, transaction_id, product_id, qty, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`, 
                    [itemId, txId, pId, qty, price, itemSub]);
                
                if (status === 'COMPLETED') {
                    db.run(`INSERT INTO stock_movements (id, product_id, qty_change, type, user_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                        [uuidv4(), pId, -qty, 'SALE', cId, `Sale TX: ${txId}`, txDate]);
                }
            }

            const discount = faker.helpers.maybe(() => faker.number.int({ min: 5, max: 20 }) * 1000, { probability: 0.2 }) || 0;
            const tax = (subtotal - discount) * 0.11; // 11% PPN
            const total = (subtotal - discount) + tax;

            db.run(`INSERT INTO transactions (id, cashier_id, customer_id, subtotal, discount, tax, total_amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [txId, cId, custId, subtotal, discount, tax, total, payMethod, status, txDate]);

            // Audit
            db.run(`INSERT INTO audit_logs (id, user_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`, 
                [uuidv4(), cId, 'SALE', `TX: ${txId}`, `Sale ${status}`, txDate]);
            
            if (status === 'VOID') {
                db.run(`INSERT INTO audit_logs (id, user_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`, 
                    [uuidv4(), ownerId, 'VOID_TRANSACTION', `TX: ${txId}`, `Owner voided tx`, txDate]);
            }
        }

        // Add some notifications
        db.run(`INSERT INTO notifications (id, type, message) VALUES (?, ?, ?)`, [uuidv4(), 'STOCK', 'Stok Sayur Bayam menipis (< 5)']);
        db.run(`INSERT INTO notifications (id, type, message) VALUES (?, ?, ?)`, [uuidv4(), 'SUPPLIER', 'Pembayaran Supplier PT Maju Jaya jatuh tempo hari ini']);
        db.run(`INSERT INTO notifications (id, type, message) VALUES (?, ?, ?)`, [uuidv4(), 'SYSTEM', 'Sistem berhasil di-update ke versi 1.1']);

        db.run('COMMIT', (err) => {
            if (err) {
                console.error('Seeding failed:', err);
            } else {
                console.log('✅ Seeding berhasil! Database telah berisi data dummy lengkap.');
            }
        });
    });
}

runSeed();
