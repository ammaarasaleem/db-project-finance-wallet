const { getPool, sql } = require('../config/db');

const LoanModel = {

  findById: async (loan_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('loan_id', sql.Int, loan_id)
      .query('SELECT * FROM Loans WHERE loan_id = @loan_id');
    return result.recordset[0] || null;
  },

  create: async ({ lender_id, borrower_id, amount, due_date, note }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('lender_id',   sql.Int,          lender_id)
      .input('borrower_id', sql.Int,          borrower_id)
      .input('amount',      sql.Decimal(12,2), amount)
      .input('due_date',    sql.Date,          due_date || null)
      .input('note',        sql.VarChar,       note || null)
      .query(`
        INSERT INTO Loans (lender_id, borrower_id, amount, due_date, status, note)
        OUTPUT INSERTED.loan_id
        VALUES (@lender_id, @borrower_id, @amount, @due_date, 'requested', @note)
      `);
    return result.recordset[0].loan_id;
  },

  updateStatus: async (loan_id, status) => {
    const pool = await getPool();
    await pool.request()
      .input('loan_id', sql.Int,     loan_id)
      .input('status',  sql.VarChar, status)
      .query('UPDATE Loans SET status = @status WHERE loan_id = @loan_id');
  },

  addRepayment: async (loan_id, amount) => {
    const pool = await getPool();
    await pool.request()
      .input('loan_id', sql.Int,          loan_id)
      .input('amount',  sql.Decimal(12,2), amount)
      .query('UPDATE Loans SET amount_repaid = amount_repaid + @amount WHERE loan_id = @loan_id');
    // trg_Loans_AutoRepaid trigger handles 'repaid' status automatically
  },

  getByUser: async (user_id, status = null) => {
    const pool    = await getPool();
    const request = pool.request().input('uid', sql.Int, user_id);

    let query = `
      SELECT l.loan_id, l.amount, l.amount_repaid,
             (l.amount - l.amount_repaid) AS remaining,
             l.due_date, l.status, l.note, l.created_at,
             lender.username   AS lender,
             borrower.username AS borrower
      FROM Loans l
      JOIN Users lender   ON l.lender_id   = lender.user_id
      JOIN Users borrower ON l.borrower_id = borrower.user_id
      WHERE (l.lender_id = @uid OR l.borrower_id = @uid)
    `;

    if (status) {
      query += ' AND l.status = @status';
      request.input('status', sql.VarChar, status);
    }

    query += ' ORDER BY l.created_at DESC';
    const result = await request.query(query);
    return result.recordset;
  },

};

module.exports = LoanModel;
