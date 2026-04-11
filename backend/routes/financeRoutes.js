const express = require('express');
const router = express.Router();
const {
  setSalary, getMySalary,
  addExpense, getMyExpenses, updateExpense, deleteExpense,
  getFinancialOverview
} = require('../controllers/financeController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/overview', getFinancialOverview);
router.get('/salary', getMySalary);
router.post('/salary', setSalary);
router.get('/expenses', getMyExpenses);
router.post('/expenses', addExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

module.exports = router;
