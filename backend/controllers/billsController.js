const { getPool, sql } = require('../config/db');

// POST /api/bills  - Create a bill split
const createBillSplit = async (req, res) => {
  const { total_amount, description, participants } = req.body;
  // participants: [{ username, amount_owed }]  — these are the OTHER participants (friends)
  const created_by = req.user.user_id;

  if (!total_amount || !participants || participants.length === 0)
    return res.status(400).json({ success: false, message: 'total_amount and at least one participant required.' });

  try {
    const pool = await getPool();

    const splitRes = await pool.request()
      .input('created_by', sql.Int, created_by)
      .input('total_amount', sql.Decimal(12, 2), total_amount)
      .input('description', sql.VarChar, description || null)
      .query(`
        INSERT INTO BillSplits (created_by, total_amount, description)
        OUTPUT INSERTED.split_id
        VALUES (@created_by, @total_amount, @description)
      `);

    const split_id = splitRes.recordset[0].split_id;

    // Calculate creator's share = total / (participants + creator)
    const creatorShare = parseFloat(total_amount) / (participants.length + 1);

    // ── Always insert the creator as a participant with is_paid = 1
    //    (they "fronted" the money for the group)
    await pool.request()
      .input('split_id', sql.Int, split_id)
      .input('user_id', sql.Int, created_by)
      .input('amount_owed', sql.Decimal(12, 2), creatorShare)
      .input('is_paid', sql.Bit, 1)
      .query(`INSERT INTO BillSplitParticipants (split_id, user_id, amount_owed, is_paid) VALUES (@split_id, @user_id, @amount_owed, @is_paid)`);

    // ── Insert all other participants
    for (const p of participants) {
      const userRes = await pool.request()
        .input('username', sql.VarChar, p.username)
        .query('SELECT user_id FROM Users WHERE username = @username');

      if (userRes.recordset.length === 0) continue;

      const user_id = userRes.recordset[0].user_id;

      // Skip if username resolves to the creator (already inserted above)
      if (user_id === created_by) continue;

      await pool.request()
        .input('split_id', sql.Int, split_id)
        .input('user_id', sql.Int, user_id)
        .input('amount_owed', sql.Decimal(12, 2), p.amount_owed)
        .input('is_paid', sql.Bit, 0)
        .query(`INSERT INTO BillSplitParticipants (split_id, user_id, amount_owed, is_paid) VALUES (@split_id, @user_id, @amount_owed, @is_paid)`);
    }

    res.status(201).json({ success: true, message: 'Bill split created.', data: { split_id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/bills/:split_id/pay  - Pay my share
const payMyShare = async (req, res) => {
  const { split_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const pool = await getPool();

    const partRes = await pool.request()
      .input('split_id', sql.Int, split_id)
      .input('user_id', sql.Int, user_id)
      .query(`SELECT * FROM BillSplitParticipants WHERE split_id=@split_id AND user_id=@user_id`);

    if (partRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'You are not part of this bill split.' });

    const part = partRes.recordset[0];
    if (part.is_paid)
      return res.status(400).json({ success: false, message: 'Already paid.' });

    // Check balance
    const balRes = await pool.request()
      .input('uid', sql.Int, user_id)
      .query('SELECT balance FROM Wallets WHERE user_id=@uid');

    if (balRes.recordset[0].balance < part.amount_owed)
      return res.status(400).json({ success: false, message: 'Insufficient balance. Please deposit funds first.' });

    // Get bill creator
    const billRes = await pool.request()
      .input('split_id', sql.Int, split_id)
      .query('SELECT created_by FROM BillSplits WHERE split_id=@split_id');

    const creator_id = billRes.recordset[0].created_by;

    // Transfer + record transaction
    const txRes = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('creator_id', sql.Int, creator_id)
      .input('amount', sql.Decimal(12, 2), part.amount_owed)
      .query(`
        UPDATE Wallets SET balance = balance - @amount WHERE user_id = @user_id;
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @creator_id;
        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        OUTPUT INSERTED.transaction_id
        VALUES (@user_id, @creator_id, @amount, 'bill_split', 'completed', 'Bill split payment');
      `);

    const transaction_id = txRes.recordset[0].transaction_id;

    await pool.request()
      .input('split_id', sql.Int, split_id)
      .input('user_id', sql.Int, user_id)
      .input('tx_id', sql.Int, transaction_id)
      .query(`UPDATE BillSplitParticipants SET is_paid=1, transaction_id=@tx_id WHERE split_id=@split_id AND user_id=@user_id`);

    res.json({ success: true, message: `Paid $${part.amount_owed} for your share.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bills  - My bills (as creator OR as participant)
const getMyBills = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT DISTINCT
               bs.split_id, bs.description, bs.total_amount, bs.created_at,
               u.username  AS created_by,
               bsp.amount_owed, bsp.is_paid, bsp.participant_id
        FROM BillSplits bs
        LEFT JOIN BillSplitParticipants bsp ON bs.split_id = bsp.split_id AND bsp.user_id = @uid
        JOIN Users u ON bs.created_by = u.user_id
        WHERE bs.created_by = @uid
           OR bsp.user_id   = @uid
        ORDER BY bs.created_at DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bills/:split_id  - Bill details with participants
const getBillDetails = async (req, res) => {
  const { split_id } = req.params;
  try {
    const pool = await getPool();

    const [billRes, partRes] = await Promise.all([
      pool.request().input('sid', sql.Int, split_id)
        .query(`SELECT bs.*, u.username AS created_by_name FROM BillSplits bs JOIN Users u ON bs.created_by=u.user_id WHERE bs.split_id=@sid`),
      pool.request().input('sid', sql.Int, split_id)
        .query(`SELECT bsp.*, u.username FROM BillSplitParticipants bsp JOIN Users u ON bsp.user_id=u.user_id WHERE bsp.split_id=@sid`),
    ]);

    res.json({ success: true, data: { bill: billRes.recordset[0], participants: partRes.recordset } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createBillSplit, payMyShare, getMyBills, getBillDetails };
