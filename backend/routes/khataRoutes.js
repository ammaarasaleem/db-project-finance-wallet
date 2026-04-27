const express = require('express');
const router = express.Router();
const {
  createGroup,
  addMember,
  contribute,
  getMyGroups,
  getGroupMembers,
  getContributions,
  getNextTurnOrder,
} = require('../controllers/KhataController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',                          getMyGroups);
router.post('/',                         createGroup);
router.post('/:groupId/members',         addMember);
router.get('/:groupId/members',          getGroupMembers);
router.get('/:groupId/contributions',    getContributions);
router.post('/:groupId/contribute',      contribute);
router.get('/:groupId/next-turn-order',  getNextTurnOrder);

module.exports = router;
