const { getPool, sql } = require('../config/db');

const FriendshipModel = {

  findExisting: async (user_id, friend_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .input('fid', sql.Int, friend_id)
      .query(`
        SELECT friendship_id, status
        FROM Friendships
        WHERE (user_id = @uid AND friend_id = @fid)
           OR (user_id = @fid AND friend_id = @uid)
      `);
    return result.recordset[0] || null;
  },

  create: async (user_id, friend_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id',   sql.Int, user_id)
      .input('friend_id', sql.Int, friend_id)
      .query(`
        INSERT INTO Friendships (user_id, friend_id, status)
        OUTPUT INSERTED.friendship_id
        VALUES (@user_id, @friend_id, 'pending')
      `);
    return result.recordset[0].friendship_id;
  },

  updateStatus: async (friendship_id, user_id, status) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('friendship_id', sql.Int,     friendship_id)
      .input('user_id',       sql.Int,     user_id)
      .input('status',        sql.VarChar, status)
      .query(`
        UPDATE Friendships SET status = @status
        WHERE friendship_id = @friendship_id
          AND (user_id = @user_id OR friend_id = @user_id)
      `);
    return result.rowsAffected[0];
  },

  accept: async (friendship_id, friend_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('friendship_id', sql.Int, friendship_id)
      .input('friend_id',     sql.Int, friend_id)
      .query(`
        UPDATE Friendships SET status = 'accepted'
        WHERE friendship_id = @friendship_id
          AND friend_id = @friend_id
          AND status = 'pending'
      `);
    return result.rowsAffected[0];
  },

  delete: async (friendship_id, user_id) => {
    const pool = await getPool();
    await pool.request()
      .input('friendship_id', sql.Int, friendship_id)
      .input('user_id',       sql.Int, user_id)
      .query(`
        DELETE FROM Friendships
        WHERE friendship_id = @friendship_id
          AND (user_id = @user_id OR friend_id = @user_id)
      `);
  },

  getAccepted: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT u.user_id, u.username, u.email, u.phone,
               f.friendship_id, f.created_at
        FROM Friendships f
        JOIN Users u
          ON u.user_id = CASE WHEN f.user_id = @uid THEN f.friend_id ELSE f.user_id END
        WHERE (f.user_id = @uid OR f.friend_id = @uid)
          AND f.status = 'accepted'
      `);
    return result.recordset;
  },

  getPending: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT f.friendship_id, u.username, u.email, f.created_at
        FROM Friendships f
        JOIN Users u ON f.user_id = u.user_id
        WHERE f.friend_id = @uid AND f.status = 'pending'
      `);
    return result.recordset;
  },

};

module.exports = FriendshipModel;
