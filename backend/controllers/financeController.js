const { getPool, sql } = require('../config/db');

// ─── SALARY ─────────────────────────────────────────────────────────────────

// POST /api/finance/salary  - Set salary
const setSalary = async (req, res) => {
  const { amount, currency, pay_day } = req.body;
  const user_id = req.user.user_id;

  if (!amount || amount <= 0 || !pay_day)
    return res.status(400).json({ success: false, message: 'amount and pay_day (1-31) required.' });

  try {
    const pool = await getPool();

    // Upsert salary
    const exists = await pool.request()
      .input('uid', sql.Int, user_id)
      .query('SELECT salary_id FROM FixedSalary WHERE user_id=@uid');

    if (exists.recordset.length > 0) {
      await pool.request()
        .input('uid', sql.Int, user_id)
        .input('amount', sql.Decimal(12, 2), amount)
        .input('currency', sql.VarChar, currency || 'USD')
        .input('pay_day', sql.TinyInt, pay_day)
        .query(`UPDATE FixedSalary SET amount=@amount, currency=@currency, pay_day=@pay_day, updated_at=SYSDATETIMEOFFSET() WHERE user_id=@uid`);
    } else {
      await pool.request()
        .input('uid', sql.Int, user_id)
        .input('amount', sql.Decimal(12, 2), amount)
        .input('currency', sql.VarChar, currency || 'USD')
        .input('pay_day', sql.TinyInt, pay_day)
        .query(`INSERT INTO FixedSalary (user_id, amount, currency, pay_day) VALUES (@uid, @amount, @currency, @pay_day)`);
    }

    res.json({ success: true, message: 'Salary updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/finance/salary
const getMySalary = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, req.user.user_id)
      .query('SELECT * FROM FixedSalary WHERE user_id=@uid');

    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'No salary record found.' });

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── EXPENSES ────────────────────────────────────────────────────────────────

// POST /api/finance/expenses  - Add fixed expense
const addExpense = async (req, res) => {
  const { title, amount, category, due_day } = req.body;
  const user_id = req.user.user_id;

  if (!title || !amount || amount <= 0 || !due_day)
    return res.status(400).json({ success: false, message: 'title, amount, and due_day required.' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .input('title', sql.NVarChar, title)
      .input('amount', sql.Decimal(12, 2), amount)
      .input('category', sql.NVarChar, category || 'General')
      .input('due_day', sql.TinyInt, due_day)
      .query(`
        INSERT INTO FixedExpenses (user_id, title, amount, category, due_day)
        OUTPUT INSERTED.expense_id
        VALUES (@uid, @title, @amount, @category, @due_day)
      `);

    res.status(201).json({ success: true, message: 'Expense added.', data: { expense_id: result.recordset[0].expense_id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/finance/expenses  - My fixed expenses
const getMyExpenses = async (req, res) => {
  const { active } = req.query;
  try {
    const pool = await getPool();
    let query = 'SELECT * FROM FixedExpenses WHERE user_id=@uid';
    const request = pool.request().input('uid', sql.Int, req.user.user_id);

    if (active !== undefined) {
      query += ' AND is_active=@active';
      request.input('active', sql.Bit, active === 'true' ? 1 : 0);
    }
    query += ' ORDER BY due_day';

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/finance/expenses/:id  - Update expense
const updateExpense = async (req, res) => {
  const { id } = req.params;
  const { title, amount, category, due_day, is_active } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id).input('uid', sql.Int, req.user.user_id)
      .input('title', sql.NVarChar, title).input('amount', sql.Decimal(12, 2), amount)
      .input('category', sql.NVarChar, category).input('due_day', sql.TinyInt, due_day)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE FixedExpenses
        SET title=COALESCE(@title,title), amount=COALESCE(@amount,amount),
            category=COALESCE(@category,category), due_day=COALESCE(@due_day,due_day),
            is_active=COALESCE(@is_active,is_active)
        WHERE expense_id=@id AND user_id=@uid
      `);

    res.json({ success: true, message: 'Expense updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/finance/expenses/:id
const deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id).input('uid', sql.Int, req.user.user_id)
      .query('DELETE FROM FixedExpenses WHERE expense_id=@id AND user_id=@uid');

    res.json({ success: true, message: 'Expense deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/finance/overview  - Budget overview: salary vs expenses
const getFinancialOverview = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const pool = await getPool();

    const [salaryRes, expRes] = await Promise.all([
      pool.request().input('uid', sql.Int, user_id)
        .query('SELECT amount, pay_day, currency FROM FixedSalary WHERE user_id=@uid AND is_active=1'),
      pool.request().input('uid', sql.Int, user_id)
        .query(`
          SELECT category, SUM(amount) AS total
          FROM FixedExpenses
          WHERE user_id=@uid AND is_active=1
          GROUP BY category
        `),
    ]);

    const salary = salaryRes.recordset[0]?.amount || 0;
    const expenseByCategory = expRes.recordset;
    const totalExpenses = expenseByCategory.reduce((s, e) => s + parseFloat(e.total), 0);
    const disposableIncome = salary - totalExpenses;

    res.json({
      success: true,
      data: {
        salary: salaryRes.recordset[0] || null,
        expenses_by_category: expenseByCategory,
        total_expenses: totalExpenses,
        disposable_income: disposableIncome,
        savings_rate: salary > 0 ? ((disposableIncome / salary) * 100).toFixed(2) + '%' : 'N/A',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { setSalary, getMySalary, addExpense, getMyExpenses, updateExpense, deleteExpense, getFinancialOverview };
