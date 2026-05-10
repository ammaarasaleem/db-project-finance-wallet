const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

// POST /api/auth/register
const register = async (req, res) => {
  const { username, email, phone, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ success: false, message: 'username, email and password are required.' });

  try {
    const pool = await getPool();

    // Check if user already exists
    const existing = await pool.request()
      .input('email', sql.VarChar, email)
      .input('username', sql.VarChar, username)
      .query('SELECT user_id FROM Users WHERE email = @email OR username = @username');

    if (existing.recordset.length > 0)
      return res.status(409).json({ success: false, message: 'Username or email already taken.' });

    const password_hash = await bcrypt.hash(password, 10);

    // Insert user and create wallet in one transaction
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .input('phone', sql.VarChar, phone || null)
      .input('password_hash', sql.VarChar, password_hash)
      .query(`
        INSERT INTO Users (username, email, phone, password_hash)
        OUTPUT INSERTED.user_id
        VALUES (@username, @email, @phone, @password_hash)
      `);

    const user_id = result.recordset[0].user_id;

    // Auto-create wallet for new user
    await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`INSERT INTO Wallets (user_id, balance, currency) VALUES (@user_id, 0.00, 'USD')`);

    const token = jwt.sign(
      { user_id, username, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user_id, username, email, token },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required.' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');

    if (result.recordset.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        token,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT u.user_id, u.username, u.email, u.phone, u.created_at,
               w.balance, w.currency
        FROM Users u
        LEFT JOIN Wallets w ON u.user_id = w.user_id
        WHERE u.user_id = @user_id
      `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  const { username, email, phone } = req.body;

  if (username === undefined && email === undefined && phone === undefined) {
    return res.status(400).json({ success: false, message: 'At least one profile field is required.' });
  }

  try {
    const pool = await getPool();
    const current = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query('SELECT user_id, username, email, phone FROM Users WHERE user_id = @user_id');

    if (current.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const existingUser = current.recordset[0];
    const nextUsername = username !== undefined ? username.trim() : existingUser.username;
    const nextEmail = email !== undefined ? email.trim() : existingUser.email;
    const nextPhone = phone !== undefined ? (phone ? phone.trim() : null) : existingUser.phone;

    if (!nextUsername || !nextEmail) {
      return res.status(400).json({ success: false, message: 'Username and email cannot be empty.' });
    }

    const conflict = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .input('username', sql.VarChar, nextUsername)
      .input('email', sql.VarChar, nextEmail)
      .query(`
        SELECT user_id
        FROM Users
        WHERE (username = @username OR email = @email)
          AND user_id <> @user_id
      `);

    if (conflict.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Username or email already taken.' });
    }

    await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .input('username', sql.VarChar, nextUsername)
      .input('email', sql.VarChar, nextEmail)
      .input('phone', sql.VarChar, nextPhone)
      .query(`
        UPDATE Users
        SET username = @username,
            email = @email,
            phone = @phone
        WHERE user_id = @user_id
      `);

    const updated = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT u.user_id, u.username, u.email, u.phone, u.created_at,
               w.balance, w.currency
        FROM Users u
        LEFT JOIN Wallets w ON u.user_id = w.user_id
        WHERE u.user_id = @user_id
      `);

    res.json({ success: true, message: 'Profile updated successfully.', data: updated.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password)
    return res.status(400).json({ success: false, message: 'Both current and new password are required.' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query('SELECT password_hash FROM Users WHERE user_id = @user_id');

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(current_password, user.password_hash);

    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const new_hash = await bcrypt.hash(new_password, 10);
    await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .input('hash', sql.VarChar, new_hash)
      .query('UPDATE Users SET password_hash = @hash WHERE user_id = @user_id');

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
