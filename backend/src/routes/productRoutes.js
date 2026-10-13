const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, verifyOwner } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, productController.getProducts);

// Only Owner can create and update products in general, but wait, Cashier might need to add stock? 
// PRD says Owner has full access, Cashier CANNOT Delete stock, Delete products. 
// Let's restrict product creation and update to OWNER.
router.post('/', verifyToken, verifyOwner, productController.createProduct);
router.put('/:id', verifyToken, verifyOwner, productController.updateProduct);

// Adjust stock (Restock or manual reduction). PRD: Cashier cannot change profit, etc. 
// Can cashier adjust stock? "Stock adjustment" is in audit log. Usually, cashiers might do stock opname. 
// But to be safe, let's keep it restricted or allow it with audit log. We'll allow owner only for manual adjustment, cashier changes stock via POS sales.
router.post('/:id/adjust', verifyToken, verifyOwner, productController.adjustStock);

module.exports = router;
