const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sekawan_putri_super_secret_key_2026';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(403).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = decoded; // { id, username, role }
        next();
    });
};

const verifyOwner = (req, res, next) => {
    if (req.user && req.user.role === 'OWNER') {
        next();
    } else {
        res.status(403).json({ error: 'Requires Owner Role' });
    }
};

module.exports = { verifyToken, verifyOwner, JWT_SECRET };
