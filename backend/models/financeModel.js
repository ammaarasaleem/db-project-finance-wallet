const { getPool, sql } = require('../config/db');

const FinanceModel = {

  // ─── Salary ────────────────────────────────────────────────────────────────

  getSalary: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query('SELECT * FROM FixedSalary WHERE user_id = @uid');
    return result.recordset[0] || null;
  },

  upsertSalary: async ({ user_id, amount, currency, pay_day }) => {
    const pool = await getPool();
    const exists = await pool.request()
      .input('uid', sql.Int, user_id)
      .query('SELECT salary_id FROM FixedSalary WHERE user_id = @uid');

    if (exists.recordset.length > 0) {
      await pool.request()
        .input('uid',      sql.Int,          user_id)
        .input('amount',   sql.Decimal(12,2), amount)
        .input('currency', sql.VarChar,       currency || 'USD')
        .input('pay_day',  sql.TinyInt,       pay_day)
        .query(`
          UPDATE FixedSalary
          SET amount = @amount, currency = @currency,
              pay_day = @pay_day, updated_at = SYSDATETIMEOFFSET()
          WHERE user_id = @uid
        `);
    } else {
      await pool.request()
        .input('uid',      sql.Int,          user_id)
        .input('amount',   sql.Decimal(12,2), amount)
        .input('currency', sql.VarChar,       currency || 'USD')
        .input('pay_day',  sql.TinyInt,       pay_day)
        .query(`
          INSERT INTO FixedSalary (user_id, amount, currency, pay_day)
          VALUES (@uid, @amount, @currency, @pay_day)
        `);
    }
  },

  // ─── Expenses ──────────────────────────────────────────────────────────────

  getExpenses: async (user_id, activeOnly = null) => {
    const pool    = await getPool();
    const request = pool.request().input('uid', sql.Int, user_id);

    let query = 'SELECT * FROM FixedExpenses WHERE user_id = @uid';
    if (activeOnly !== null) {
      query += ' AND is_active = @active';
      request.input('active', sql.Bit, activeOnly ? 1 : 0);
    }
    query += ' ORDER BY due_day';

    const result = await request.query(query);
    return result.recordset;
  },

  createExpense: async ({ user_id, title, amount, category, due_day }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid',      sql.Int,          user_id)
      .input('title',    sql.NVarChar,      title)
      .input('amount',   sql.Decimal(12,2), amount)
      .input('category', sql.NVarChar,      category || 'General')
      .input('due_day',  sql.TinyInt,       due_day)
      .query(`
        INSERT INTO FixedExpenses (user_id, title, amount, category, due_day)
        OUTPUT INSERTED.expense_id
        VALUES (@uid, @title, @amount, @category, @due_day)
      `);
    return result.recordset[0].expense_id;
  },

  updateExpense: async (expense_id, user_id, fields) => {
    const pool = await getPool();
    await pool.request()
      .input('id',        sql.Int,          expense_id)
      .input('uid',       sql.Int,          user_id)
      .input('title',     sql.NVarChar,      fields.title     ?? null)
      .input('amount',    sql.Decimal(12,2), fields.amount    ?? null)
      .input('category',  sql.NVarChar,      fields.category  ?? null)
      .input('due_day',   sql.TinyInt,       fields.due_day   ?? null)
      .input('is_active', sql.Bit,           fields.is_active ?? null)
      .query(`
        UPDATE FixedExpenses
        SET title     = COALESCE(@title,     title),
            amount    = COALESCE(@amount,    amount),
            category  = COALESCE(@category,  category),
            due_day   = COALESCE(@due_day,   due_day),
            is_active = COALESCE(@is_active, is_active)
        WHERE expense_id = @id AND user_id = @uid
      `);
  },

  deleteExpense: async (expense_id, user_id) => {
    const pool = await getPool();
    await pool.request()
      .input('id',  sql.Int, expense_id)
      .input('uid', sql.Int, user_id)
      .query('DELETE FROM FixedExpenses WHERE expense_id = @id AND user_id = @uid');
  },

  // ─── Overview ──────────────────────────────────────────────────────────────

  getOverview: async (user_id) => {
    const pool = await getPool();

    const [salaryRes, expRes] = await Promise.all([
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT amount, pay_day, currency FROM FixedSalary WHERE user_id=@uid AND is_active=1'),
      pool.request().input('uid', sql.Int, user_id)
        .query(`
          SELECT category, SUM(amount) AS total
          FROM FixedExpenses
          WHERE user_id = @uid AND is_active = 1
          GROUP BY category
        `),
    ]);

    const salary          = salaryRes.recordset[0]?.amount || 0;
    const expByCategory   = expRes.recordset;
    const totalExpenses   = expByCategory.reduce((s, e) => s + parseFloat(e.total), 0);
    const disposable      = salary - totalExpenses;

    return {
      salary:               salaryRes.recordset[0] || null,
      expenses_by_category: expByCategory,
      total_expenses:       totalExpenses,
      disposable_income:    disposable,
      savings_rate:         salary > 0
        ? ((disposable / salary) * 100).toFixed(2) + '%'
        : 'N/A',
    };
  },

};

module.exports = FinanceModel;
