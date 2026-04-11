const express = require('express');
const router = express.Router();
const { sendRequest, acceptRequest, getFriends, getPendingRequests, removeFriend, blockUser } = require('../controllers/friendsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getFriends);
router.get('/pending', getPendingRequests);
router.post('/request', sendRequest);
router.put('/:friendship_id/accept', acceptRequest);
router.put('/:friendship_id/block', blockUser);
router.delete('/:friendship_id', removeFriend);

module.exports = router;
