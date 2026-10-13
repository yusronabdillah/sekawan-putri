const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, verifyOwner } = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.post('/register-cashier', verifyToken, verifyOwner, authController.registerCashier);
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout); // Just to log audit

module.exports = router;
