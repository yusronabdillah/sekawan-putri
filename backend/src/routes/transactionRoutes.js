const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken, verifyOwner } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, transactionController.getTransactions);

// Both Cashier and Owner can create transactions
router.post('/', verifyToken, transactionController.createTransaction);

// Only Owner can void transactions
router.post('/:id/void', verifyToken, verifyOwner, transactionController.voidTransaction);

// Reset all reports and transactions
router.delete('/reset-reports', transactionController.resetReports);

module.exports = router;
