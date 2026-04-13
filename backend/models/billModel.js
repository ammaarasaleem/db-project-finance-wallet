const { getPool, sql } = require('../config/db');

const BillModel = {

  create: async ({ created_by, total_amount, description }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('created_by',   sql.Int,          created_by)
      .input('total_amount', sql.Decimal(12,2), total_amount)
      .input('description',  sql.VarChar,       description || null)
      .query(`
        INSERT INTO BillSplits (created_by, total_amount, description)
        OUTPUT INSERTED.split_id
        VALUES (@created_by, @total_amount, @description)
      `);
    return result.recordset[0].split_id;
  },

  findById: async (split_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('split_id', sql.Int, split_id)
      .query(`
        SELECT bs.*, u.username AS created_by_name
        FROM BillSplits bs
        JOIN Users u ON bs.created_by = u.user_id
        WHERE bs.split_id = @split_id
      `);
    return result.recordset[0] || null;
  },

  addParticipant: async ({ split_id, user_id, amount_owed, is_paid = 0 }) => {
    const pool = await getPool();
    await pool.request()
      .input('split_id',    sql.Int,          split_id)
      .input('user_id',     sql.Int,          user_id)
      .input('amount_owed', sql.Decimal(12,2), amount_owed)
      .input('is_paid',     sql.Bit,           is_paid)
      .query(`
        INSERT INTO BillSplitParticipants (split_id, user_id, amount_owed, is_paid)
        VALUES (@split_id, @user_id, @amount_owed, @is_paid)
      `);
  },

  findParticipant: async (split_id, user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('split_id', sql.Int, split_id)
      .input('user_id',  sql.Int, user_id)
      .query(`
        SELECT bsp.*, bs.created_by
        FROM BillSplitParticipants bsp
        JOIN BillSplits bs ON bs.split_id = bsp.split_id
        WHERE bsp.split_id = @split_id AND bsp.user_id = @user_id
      `);
    return result.recordset[0] || null;
  },

  markPaid: async (split_id, user_id, transaction_id) => {
    const pool = await getPool();
    await pool.request()
      .input('split_id',       sql.Int, split_id)
      .input('user_id',        sql.Int, user_id)
      .input('transaction_id', sql.Int, transaction_id)
      .query(`
        UPDATE BillSplitParticipants
        SET is_paid = 1, transaction_id = @transaction_id
        WHERE split_id = @split_id AND user_id = @user_id
      `);
  },

  getParticipants: async (split_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('split_id', sql.Int, split_id)
      .query(`
        SELECT bsp.*, u.username, u.email
        FROM BillSplitParticipants bsp
        JOIN Users u ON bsp.user_id = u.user_id
        WHERE bsp.split_id = @split_id
      `);
    return result.recordset;
  },

  getByUser: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT bs.split_id, bs.description, bs.total_amount, bs.created_at,
               u.username  AS created_by,
               bsp.amount_owed, bsp.is_paid, bsp.participant_id
        FROM BillSplits bs
        JOIN BillSplitParticipants bsp ON bs.split_id  = bsp.split_id
        JOIN Users u                   ON bs.created_by = u.user_id
        WHERE bsp.user_id = @uid
        ORDER BY bs.created_at DESC
      `);
    return result.recordset;
  },

};

module.exports = BillModel;
