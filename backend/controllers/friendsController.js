const { getPool, sql } = require('../config/db');

// POST /api/friends/request
const sendRequest = async (req, res) => {
  const { friend_username } = req.body;
  const user_id = req.user.user_id;

  try {
    const pool = await getPool();

    const friendRes = await pool.request()
      .input('username', sql.VarChar, friend_username)
      .query('SELECT user_id FROM Users WHERE username = @username');

    if (friendRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'User not found.' });

    const friend_id = friendRes.recordset[0].user_id;

    if (friend_id === user_id)
      return res.status(400).json({ success: false, message: 'Cannot add yourself.' });

    // Check if already exists
    const exists = await pool.request()
      .input('uid', sql.Int, user_id)
      .input('fid', sql.Int, friend_id)
      .query(`
        SELECT friendship_id FROM Friendships
        WHERE (user_id=@uid AND friend_id=@fid) OR (user_id=@fid AND friend_id=@uid)
      `);

    if (exists.recordset.length > 0)
      return res.status(409).json({ success: false, message: 'Friendship already exists or pending.' });

    await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('friend_id', sql.Int, friend_id)
      .query("INSERT INTO Friendships (user_id, friend_id, status) VALUES (@user_id, @friend_id, 'pending')");

    res.status(201).json({ success: true, message: 'Friend request sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/friends/:friendship_id/accept
const acceptRequest = async (req, res) => {
  const { friendship_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('fid', sql.Int, friendship_id)
      .input('uid', sql.Int, user_id)
      .query(`
        UPDATE Friendships SET status = 'accepted'
        WHERE friendship_id = @fid AND friend_id = @uid AND status = 'pending'
      `);

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ success: false, message: 'Request not found or not for you.' });

    res.json({ success: true, message: 'Friend request accepted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/friends  - All accepted friends
const getFriends = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT u.user_id, u.username, u.email, u.phone, f.friendship_id, f.created_at
        FROM Friendships f
        JOIN Users u ON u.user_id = CASE WHEN f.user_id=@uid THEN f.friend_id ELSE f.user_id END
        WHERE (f.user_id=@uid OR f.friend_id=@uid) AND f.status='accepted'
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/friends/pending  - Pending incoming requests
const getPendingRequests = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT f.friendship_id, u.username, u.email, f.created_at
        FROM Friendships f
        JOIN Users u ON f.user_id = u.user_id
        WHERE f.friend_id = @uid AND f.status = 'pending'
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/friends/:friendship_id
const removeFriend = async (req, res) => {
  const { friendship_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const pool = await getPool();
    await pool.request()
      .input('fid', sql.Int, friendship_id)
      .input('uid', sql.Int, user_id)
      .query(`
        DELETE FROM Friendships
        WHERE friendship_id = @fid AND (user_id = @uid OR friend_id = @uid)
      `);

    res.json({ success: true, message: 'Friend removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/friends/:friendship_id/block
const blockUser = async (req, res) => {
  const { friendship_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const pool = await getPool();
    await pool.request()
      .input('fid', sql.Int, friendship_id)
      .input('uid', sql.Int, user_id)
      .query(`UPDATE Friendships SET status='blocked' WHERE friendship_id=@fid AND user_id=@uid`);

    res.json({ success: true, message: 'User blocked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendRequest, acceptRequest, getFriends, getPendingRequests, removeFriend, blockUser };
