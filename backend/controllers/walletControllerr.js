const { getPool, sql } = require('../config/db');

// GET /api/wallet  - Get my wallet
const getMyWallet = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT w.wallet_id, w.balance, w.currency, w.updated_at,
               u.username, u.email
        FROM Wallets w
        JOIN Users u ON u.user_id = w.user_id
        WHERE w.user_id = @user_id
      `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/wallet/deposit  - Add money to wallet
const deposit = async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0)
    return res.status(400).json({ success: false, message: 'Valid amount required.' });

  try {
    const pool = await getPool();
    await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .input('amount', sql.Decimal(12, 2), amount)
      .query('UPDATE Wallets SET balance = balance + @amount WHERE user_id = @user_id');

    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query('SELECT balance, currency FROM Wallets WHERE user_id = @user_id');

    res.json({ success: true, message: `Deposited $${amount} successfully.`, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/wallet/transfer  - Send money to another user
const transfer = async (req, res) => {
  const { receiver_username, amount, note } = req.body;
  const sender_id = req.user.user_id;

  if (!receiver_username || !amount || amount <= 0)
    return res.status(400).json({ success: false, message: 'receiver_username and valid amount required.' });

  try {
    const pool = await getPool();

    // Find receiver
    const receiverResult = await pool.request()
      .input('username', sql.VarChar, receiver_username)
      .query('SELECT user_id FROM Users WHERE username = @username');

    if (receiverResult.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Receiver not found.' });

    const receiver_id = receiverResult.recordset[0].user_id;

    if (receiver_id === sender_id)
      return res.status(400).json({ success: false, message: 'Cannot transfer to yourself.' });

    // Check sender balance
    const balResult = await pool.request()
      .input('user_id', sql.Int, sender_id)
      .query('SELECT balance FROM Wallets WHERE user_id = @user_id');

    if (balResult.recordset[0].balance < amount)
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });

    // Perform transfer
    await pool.request()
      .input('sender_id', sql.Int, sender_id)
      .input('receiver_id', sql.Int, receiver_id)
      .input('amount', sql.Decimal(12, 2), amount)
      .query(`
        UPDATE Wallets SET balance = balance - @amount WHERE user_id = @sender_id;
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @receiver_id;
      `);

    // Record transaction
    await pool.request()
      .input('sender_id', sql.Int, sender_id)
      .input('receiver_id', sql.Int, receiver_id)
      .input('amount', sql.Decimal(12, 2), amount)
      .input('note', sql.VarChar, note || null)
      .query(`
        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        VALUES (@sender_id, @receiver_id, @amount, 'transfer', 'completed', @note)
      `);

    res.json({ success: true, message: `Transferred $${amount} to ${receiver_username} successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/wallet/transactions  - My transaction history
const getTransactions = async (req, res) => {
  const user_id = req.user.user_id;
  const { type, limit = 20, offset = 0 } = req.query;

  try {
    const pool = await getPool();
    let query = `
      SELECT t.transaction_id, t.type, t.amount, t.status, t.note, t.created_at,
             s.username AS sender, r.username AS receiver
      FROM Transactions t
      JOIN Users s ON t.sender_id   = s.user_id
      JOIN Users r ON t.receiver_id = r.user_id
      WHERE (t.sender_id = @user_id OR t.receiver_id = @user_id)
    `;

    const request = pool.request().input('user_id', sql.Int, user_id);

    if (type) {
      query += ' AND t.type = @type';
      request.input('type', sql.VarChar, type);
    }

    query += ' ORDER BY t.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/wallet/summary  - Financial summary
const getSummary = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const pool = await getPool();

    const [balRes, sentRes, receivedRes, expenseRes, salaryRes] = await Promise.all([
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT balance, currency FROM Wallets WHERE user_id = @uid'),
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT COALESCE(SUM(amount),0) AS total FROM Transactions WHERE sender_id=@uid AND status=\'completed\''),
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT COALESCE(SUM(amount),0) AS total FROM Transactions WHERE receiver_id=@uid AND status=\'completed\''),
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT COALESCE(SUM(amount),0) AS total FROM FixedExpenses WHERE user_id=@uid AND is_active=1'),
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT amount, pay_day FROM FixedSalary WHERE user_id=@uid AND is_active=1'),
    ]);

    res.json({
      success: true,
      data: {
        wallet: balRes.recordset[0],
        total_sent: sentRes.recordset[0].total,
        total_received: receivedRes.recordset[0].total,
        monthly_expenses: expenseRes.recordset[0].total,
        salary: salaryRes.recordset[0] || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getMyWallet, deposit, transfer, getTransactions, getSummary };
