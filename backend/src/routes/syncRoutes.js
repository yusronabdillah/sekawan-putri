const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const authMiddleware = require('../middleware/authMiddleware');

// Pull all data (for offline-first frontend caching)
router.get('/pull', authMiddleware, syncController.pullAllData);

module.exports = router;
