const express = require('express');
const router = express.Router();
const { createBillSplit, payMyShare, getMyBills, getBillDetails } = require('../controllers/billsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getMyBills);
router.post('/', createBillSplit);
router.get('/:split_id', getBillDetails);
router.post('/:split_id/pay', payMyShare);

module.exports = router;
