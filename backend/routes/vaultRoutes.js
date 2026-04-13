const express = require('express');
const router = express.Router();
const { createVault, getMyVaults, depositToVault, withdrawFromVault, deleteVault } = require('../controllers/vaultController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getMyVaults);
router.post('/', createVault);
router.post('/:id/deposit', depositToVault);
router.post('/:id/withdraw', withdrawFromVault);
router.delete('/:id', deleteVault);

module.exports = router;
