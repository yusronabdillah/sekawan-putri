const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');

const logAudit = (userId, action, target, details) => {
    return new Promise((resolve, reject) => {
        const id = uuidv4();
        db.run(
            `INSERT INTO audit_logs (id, user_id, action, target, details) VALUES (?, ?, ?, ?, ?)`,
            [id, userId, action, target, details],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

module.exports = { logAudit };
