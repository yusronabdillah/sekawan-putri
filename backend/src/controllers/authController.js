const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const { logAudit } = require('../utils/auditLogger');

exports.login = (req, res) => {
    const { username, pin } = req.body;

    if (!username || !pin) {
        return res.status(400).json({ error: 'Username and PIN are required' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or PIN' });
        }

        const match = await bcrypt.compare(pin, user.pin_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid username or PIN' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
            expiresIn: '24h'
        });

        // Audit Log
        await logAudit(user.id, 'LOGIN', 'System', 'User logged in successfully');

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    });
};

exports.registerCashier = async (req, res) => {
    const { username, pin } = req.body;

    if (!username || !pin || pin.length !== 6) {
        return res.status(400).json({ error: 'Username and 6-digit PIN are required' });
    }

    const saltRounds = 10;
    const pinHash = await bcrypt.hash(pin, saltRounds);
    const id = uuidv4();

    db.run(
        `INSERT INTO users (id, username, pin_hash, role) VALUES (?, ?, ?, ?)`,
        [id, username, pinHash, 'CASHIER'],
        async function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }

            // Audit Log
            await logAudit(req.user.id, 'CREATE_USER', `User ID: ${id}`, `Owner created a new cashier: ${username}`);

            res.status(201).json({ message: 'Cashier registered successfully' });
        }
    );
};

exports.getMe = (req, res) => {
    res.json({ user: req.user });
};

exports.logout = async (req, res) => {
    await logAudit(req.user.id, 'LOGOUT', 'System', 'User logged out');
    res.json({ message: 'Logged out successfully' });
};
