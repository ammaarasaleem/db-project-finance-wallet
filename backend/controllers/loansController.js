const { getPool, sql } = require('../config/db');

// POST /api/loans/request  - Request a loan from a friend
const requestLoan = async (req, res) => {
  const { lender_username, amount, due_date, note } = req.body;
  const borrower_id = req.user.user_id;

  if (!lender_username || !amount || amount <= 0)
    return res.status(400).json({ success: false, message: 'lender_username and valid amount required.' });

  try {
    const pool = await getPool();

    const lenderRes = await pool.request()
      .input('username', sql.VarChar, lender_username)
      .query('SELECT user_id FROM Users WHERE username = @username');

    if (lenderRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Lender not found.' });

    const lender_id = lenderRes.recordset[0].user_id;

    if (lender_id === borrower_id)
      return res.status(400).json({ success: false, message: 'Cannot loan to yourself.' });

    const result = await pool.request()
      .input('lender_id', sql.Int, lender_id)
      .input('borrower_id', sql.Int, borrower_id)
      .input('amount', sql.Decimal(12, 2), amount)
      .input('due_date', sql.Date, due_date || null)
      .input('note', sql.VarChar, note || null)
      .query(`
        INSERT INTO Loans (lender_id, borrower_id, amount, due_date, status, note)
        OUTPUT INSERTED.loan_id
        VALUES (@lender_id, @borrower_id, @amount, @due_date, 'requested', @note)
      `);

    res.status(201).json({ success: true, message: 'Loan request sent.', data: { loan_id: result.recordset[0].loan_id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/loans/:loan_id/approve  - Lender approves and sends money
const approveLoan = async (req, res) => {
  const { loan_id } = req.params;
  const lender_id = req.user.user_id;

  try {
    const pool = await getPool();

    const loanRes = await pool.request()
      .input('loan_id', sql.Int, loan_id)
      .input('lender_id', sql.Int, lender_id)
      .query(`SELECT * FROM Loans WHERE loan_id=@loan_id AND lender_id=@lender_id AND status='requested'`);

    if (loanRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Loan not found or not yours to approve.' });

    const loan = loanRes.recordset[0];

    // Check lender balance
    const balRes = await pool.request()
      .input('uid', sql.Int, lender_id)
      .query('SELECT balance FROM Wallets WHERE user_id=@uid');

    if (balRes.recordset[0].balance < loan.amount)
      return res.status(400).json({ success: false, message: 'Insufficient balance to approve loan.' });

    // Transfer money and update loan status
    await pool.request()
      .input('lender_id', sql.Int, lender_id)
      .input('borrower_id', sql.Int, loan.borrower_id)
      .input('amount', sql.Decimal(12, 2), loan.amount)
      .input('loan_id', sql.Int, loan_id)
      .query(`
        BEGIN TRAN;
        UPDATE Wallets SET balance = balance - @amount WHERE user_id = @lender_id;
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @borrower_id;
        UPDATE Loans SET status = 'active' WHERE loan_id = @loan_id;
        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        VALUES (@lender_id, @borrower_id, @amount, 'loan', 'completed', 'Loan approved');
        COMMIT TRAN;
      `);

    res.json({ success: true, message: 'Loan approved and funds transferred.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/loans/:loan_id/repay
const repayLoan = async (req, res) => {
  const { loan_id } = req.params;
  const { amount } = req.body;
  const borrower_id = req.user.user_id;

  if (!amount || amount <= 0)
    return res.status(400).json({ success: false, message: 'Valid repayment amount required.' });

  try {
    const pool = await getPool();

    const loanRes = await pool.request()
      .input('loan_id', sql.Int, loan_id)
      .input('borrower_id', sql.Int, borrower_id)
      .query(`SELECT * FROM Loans WHERE loan_id=@loan_id AND borrower_id=@borrower_id AND status='active'`);

    if (loanRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Active loan not found.' });

    const loan = loanRes.recordset[0];
    const remaining = loan.amount - loan.amount_repaid;

    if (amount > remaining)
      return res.status(400).json({ success: false, message: `Max repayable is $${remaining}.` });

    // Check borrower balance
    const balRes = await pool.request()
      .input('uid', sql.Int, borrower_id)
      .query('SELECT balance FROM Wallets WHERE user_id=@uid');

    if (balRes.recordset[0].balance < amount)
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });

    const newRepaid = parseFloat(loan.amount_repaid) + parseFloat(amount);
    const newStatus = newRepaid >= loan.amount ? 'repaid' : 'active';

    await pool.request()
      .input('borrower_id', sql.Int, borrower_id)
      .input('lender_id', sql.Int, loan.lender_id)
      .input('amount', sql.Decimal(12, 2), amount)
      .input('loan_id', sql.Int, loan_id)
      .input('new_repaid', sql.Decimal(12, 2), newRepaid)
      .input('new_status', sql.VarChar, newStatus)
      .query(`
        BEGIN TRAN;
        UPDATE Wallets SET balance = balance - @amount WHERE user_id = @borrower_id;
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @lender_id;
        UPDATE Loans SET amount_repaid = @new_repaid, status = @new_status WHERE loan_id = @loan_id;
        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        VALUES (@borrower_id, @lender_id, @amount, 'loan_repayment', 'completed', 'Loan repayment');
        COMMIT TRAN;
      `);

    res.json({ success: true, message: `Repaid $${amount}. Status: ${newStatus}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/loans  - All my loans
const getMyLoans = async (req, res) => {
  const user_id = req.user.user_id;
  const { status } = req.query;

  try {
    const pool = await getPool();
    let query = `
      SELECT l.loan_id, l.amount, l.amount_repaid,
             (l.amount - l.amount_repaid) AS remaining,
             l.due_date, l.status, l.note, l.created_at,
             lender.username AS lender, borrower.username AS borrower
      FROM Loans l
      JOIN Users lender   ON l.lender_id   = lender.user_id
      JOIN Users borrower ON l.borrower_id = borrower.user_id
      WHERE (l.lender_id=@uid OR l.borrower_id=@uid)
    `;

    const request = pool.request().input('uid', sql.Int, user_id);
    if (status) {
      query += ' AND l.status = @status';
      request.input('status', sql.VarChar, status);
    }
    query += ' ORDER BY l.created_at DESC';

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/loans/:loan_id/reject
const rejectLoan = async (req, res) => {
  const { loan_id } = req.params;
  try {
    const pool = await getPool();
    await pool.request()
      .input('loan_id', sql.Int, loan_id)
      .input('lender_id', sql.Int, req.user.user_id)
      .query(`UPDATE Loans SET status='rejected' WHERE loan_id=@loan_id AND lender_id=@lender_id AND status='requested'`);

    res.json({ success: true, message: 'Loan request rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { requestLoan, approveLoan, repayLoan, getMyLoans, rejectLoan };
