const { getPool, sql } = require('../config/db');

const WalletModel = {

  findByUserId: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT w.wallet_id, w.balance, w.currency, w.updated_at,
               u.username, u.email
        FROM Wallets w
        JOIN Users u ON u.user_id = w.user_id
        WHERE w.user_id = @user_id
      `);
    return result.recordset[0] || null;
  },

  getBalance: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('SELECT balance FROM Wallets WHERE user_id = @user_id');
    return result.recordset[0]?.balance ?? null;
  },

  createForUser: async (user_id) => {
    const pool = await getPool();
    await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`INSERT INTO Wallets (user_id, balance, currency) VALUES (@user_id, 0.00, 'USD')`);
  },

  deposit: async (user_id, amount) => {
    const pool = await getPool();
    await pool.request()
      .input('user_id', sql.Int,          user_id)
      .input('amount',  sql.Decimal(12,2), amount)
      .query('UPDATE Wallets SET balance = balance + @amount WHERE user_id = @user_id');
  },

  deduct: async (user_id, amount) => {
    const pool = await getPool();
    await pool.request()
      .input('user_id', sql.Int,          user_id)
      .input('amount',  sql.Decimal(12,2), amount)
      .query('UPDATE Wallets SET balance = balance - @amount WHERE user_id = @user_id');
  },

  getTransactions: async (user_id, { type, limit, offset }) => {
    const pool    = await getPool();
    const request = pool.request()
      .input('user_id', sql.Int, user_id)
      .input('limit',   sql.Int, parseInt(limit)  || 20)
      .input('offset',  sql.Int, parseInt(offset) || 0);

    let query = `
      SELECT t.transaction_id, t.type, t.amount, t.status, t.note, t.created_at,
             s.username AS sender, r.username AS receiver
      FROM Transactions t
      JOIN Users s ON t.sender_id   = s.user_id
      JOIN Users r ON t.receiver_id = r.user_id
      WHERE (t.sender_id = @user_id OR t.receiver_id = @user_id)
    `;

    if (type) {
      query += ' AND t.type = @type';
      request.input('type', sql.VarChar, type);
    }

    query += ' ORDER BY t.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    const result = await request.query(query);
    return result.recordset;
  },

  recordTransaction: async ({ sender_id, receiver_id, amount, type, status, note }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('sender_id',   sql.Int,          sender_id)
      .input('receiver_id', sql.Int,          receiver_id)
      .input('amount',      sql.Decimal(12,2), amount)
      .input('type',        sql.VarChar,       type)
      .input('status',      sql.VarChar,       status)
      .input('note',        sql.VarChar,       note || null)
      .query(`
        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        OUTPUT INSERTED.transaction_id
        VALUES (@sender_id, @receiver_id, @amount, @type, @status, @note)
      `);
    return result.recordset[0].transaction_id;
  },

  getSummary: async (user_id) => {
    const pool = await getPool();

    const [wallet, sent, received, expenses, salary] = await Promise.all([
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT balance, currency FROM Wallets WHERE user_id = @uid'),
      pool.request().input('uid', sql.Int, user_id)
        .query(`SELECT COALESCE(SUM(amount),0) AS total FROM Transactions
                WHERE sender_id=@uid AND status='completed'`),
      pool.request().input('uid', sql.Int, user_id)
        .query(`SELECT COALESCE(SUM(amount),0) AS total FROM Transactions
                WHERE receiver_id=@uid AND status='completed'`),
      pool.request().input('uid', sql.Int, user_id)
        .query(`SELECT COALESCE(SUM(amount),0) AS total FROM FixedExpenses
                WHERE user_id=@uid AND is_active=1`),
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT amount, pay_day FROM FixedSalary WHERE user_id=@uid AND is_active=1'),
    ]);

    return {
      wallet:           wallet.recordset[0],
      total_sent:       sent.recordset[0].total,
      total_received:   received.recordset[0].total,
      monthly_expenses: expenses.recordset[0].total,
      salary:           salary.recordset[0] || null,
    };
  },

};

module.exports = WalletModel;
