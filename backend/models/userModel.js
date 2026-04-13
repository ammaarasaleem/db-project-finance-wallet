const { getPool, sql } = require('../config/db');

const UserModel = {

  findByEmail: async (email) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');
    return result.recordset[0] || null;
  },

  findByUsername: async (username) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');
    return result.recordset[0] || null;
  },

  findById: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT u.user_id, u.username, u.email, u.phone, u.avatar_url, u.created_at,
               w.balance, w.currency
        FROM Users u
        LEFT JOIN Wallets w ON u.user_id = w.user_id
        WHERE u.user_id = @user_id AND u.is_active = 1
      `);
    return result.recordset[0] || null;
  },

  emailOrUsernameExists: async (email, username) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('email',    sql.VarChar, email)
      .input('username', sql.VarChar, username)
      .query('SELECT user_id FROM Users WHERE email = @email OR username = @username');
    return result.recordset.length > 0;
  },

  create: async ({ username, email, phone, password_hash }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('username',      sql.VarChar, username)
      .input('email',         sql.VarChar, email)
      .input('phone',         sql.VarChar, phone || null)
      .input('password_hash', sql.VarChar, password_hash)
      .query(`
        INSERT INTO Users (username, email, phone, password_hash)
        OUTPUT INSERTED.user_id
        VALUES (@username, @email, @phone, @password_hash)
      `);
    return result.recordset[0].user_id;
  },

  updatePassword: async (user_id, password_hash) => {
    const pool = await getPool();
    await pool.request()
      .input('user_id',       sql.Int,     user_id)
      .input('password_hash', sql.VarChar, password_hash)
      .query('UPDATE Users SET password_hash = @password_hash WHERE user_id = @user_id');
  },

  updateAvatar: async (user_id, avatar_url) => {
    const pool = await getPool();
    await pool.request()
      .input('user_id',    sql.Int,     user_id)
      .input('avatar_url', sql.VarChar, avatar_url)
      .query('UPDATE Users SET avatar_url = @avatar_url WHERE user_id = @user_id');
  },

};

module.exports = UserModel;
