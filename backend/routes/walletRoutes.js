const express = require('express');
const router = express.Router();
const { getMyWallet, deposit, transfer, getTransactions, getSummary } = require('../controllers/walletControllerr');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getMyWallet);
router.get('/summary', getSummary);
router.get('/transactions', getTransactions);
router.post('/deposit', deposit);
router.post('/transfer', transfer);

module.exports = router;
