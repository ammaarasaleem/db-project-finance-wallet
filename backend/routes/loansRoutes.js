const express = require('express');
const router = express.Router();
const { requestLoan, approveLoan, repayLoan, getMyLoans, rejectLoan } = require('../controllers/loansController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getMyLoans);
router.post('/request', requestLoan);
router.put('/:loan_id/approve', approveLoan);
router.put('/:loan_id/reject', rejectLoan);
router.post('/:loan_id/repay', repayLoan);

module.exports = router;
