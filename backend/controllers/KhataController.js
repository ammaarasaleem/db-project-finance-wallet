const { getPool, sql } = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/khata  — Create a Khata group
// BUG-FIX: Wrap KhataGroups INSERT + KhataMembers INSERT in one DB transaction
//          so a group never exists without its creator already as a member.
// ─────────────────────────────────────────────────────────────────────────────
const createGroup = async (req, res) => {
  const { name, contributionAmount, cycleType, startDate } = req.body;
  const creatorId = req.user.user_id;

  // ── Input validation
  if (!name || !contributionAmount || !startDate) {
    return res.status(400).json({
      success: false,
      message: 'name, contributionAmount and startDate are required.',
    });
  }

  const parsedAmount = parseFloat(contributionAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'contributionAmount must be a positive number.',
    });
  }

  const resolvedCycleType = cycleType || 'Monthly';
  if (!['Monthly', 'Weekly'].includes(resolvedCycleType)) {
    return res.status(400).json({
      success: false,
      message: "cycleType must be 'Monthly' or 'Weekly'.",
    });
  }

  const pool = await getPool();
  const transaction = pool.transaction();

  try {
    await transaction.begin();

    // Insert the group
    const groupRes = await transaction.request()
      .input('CreatorId',          sql.Int,            creatorId)
      .input('Name',               sql.NVarChar,       name)
      .input('ContributionAmount', sql.Decimal(19, 4), parsedAmount)
      .input('CycleType',          sql.NVarChar,       resolvedCycleType)
      .input('StartDate',          sql.Date,           startDate)
      .query(`
        INSERT INTO KhataGroups (CreatorId, Name, ContributionAmount, CycleType, StartDate)
        OUTPUT INSERTED.Id
        VALUES (@CreatorId, @Name, @ContributionAmount, @CycleType, @StartDate)
      `);

    const groupId = groupRes.recordset[0].Id;

    // Auto-add creator as first member (TurnOrder = 1) in the SAME transaction
    await transaction.request()
      .input('GroupId',   sql.Int,      groupId)
      .input('UserId',    sql.Int,      creatorId)
      .input('TurnOrder', sql.SmallInt, 1)
      .query(`
        INSERT INTO KhataMembers (GroupId, UserId, TurnOrder)
        VALUES (@GroupId, @UserId, @TurnOrder)
      `);

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Khata group created.',
      data: { groupId },
    });
  } catch (err) {
    try { await transaction.rollback(); } catch (_) {}
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/khata/:groupId/members  — Add a member to a group
// BUG-FIX: Added required-field validation, duplicate member check,
//          duplicate TurnOrder check — all with user-friendly messages.
// ─────────────────────────────────────────────────────────────────────────────
const addMember = async (req, res) => {
  const { groupId } = req.params;
  const { username, turnOrder } = req.body;

  // ── Required field check
  if (!username || turnOrder === undefined || turnOrder === null || turnOrder === '') {
    return res.status(400).json({
      success: false,
      message: 'username and turnOrder are required.',
    });
  }

  const parsedTurnOrder = parseInt(turnOrder, 10);
  if (isNaN(parsedTurnOrder) || parsedTurnOrder < 1) {
    return res.status(400).json({
      success: false,
      message: 'turnOrder must be a positive integer (1, 2, 3 …).',
    });
  }

  try {
    const pool = await getPool();

    // ── Verify requester is the group creator
    const groupRes = await pool.request()
      .input('gid', sql.Int, groupId)
      .input('uid', sql.Int, req.user.user_id)
      .query(`
        SELECT Id FROM KhataGroups
        WHERE Id=@gid AND CreatorId=@uid AND IsActive=1
      `);

    if (groupRes.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Only the active group creator can add members.',
      });
    }

    // ── Resolve username → user_id
    const userRes = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT user_id FROM Users WHERE username=@username AND is_active=1');

    if (userRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found.`,
      });
    }

    const userId = userRes.recordset[0].user_id;

    // ── Check if user is already a member of this group
    const existingMemberRes = await pool.request()
      .input('gid', sql.Int, groupId)
      .input('uid', sql.Int, userId)
      .query('SELECT 1 FROM KhataMembers WHERE GroupId=@gid AND UserId=@uid');

    if (existingMemberRes.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: `'${username}' is already a member of this group.`,
      });
    }

    // ── Check if TurnOrder is already taken in this group
    const existingOrderRes = await pool.request()
      .input('gid',   sql.Int,      groupId)
      .input('order', sql.SmallInt, parsedTurnOrder)
      .query('SELECT 1 FROM KhataMembers WHERE GroupId=@gid AND TurnOrder=@order');

    if (existingOrderRes.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Turn order #${parsedTurnOrder} is already assigned to another member in this group.`,
      });
    }

    // ── Insert the new member
    await pool.request()
      .input('GroupId',   sql.Int,      groupId)
      .input('UserId',    sql.Int,      userId)
      .input('TurnOrder', sql.SmallInt, parsedTurnOrder)
      .query(`
        INSERT INTO KhataMembers (GroupId, UserId, TurnOrder)
        VALUES (@GroupId, @UserId, @TurnOrder)
      `);

    res.status(201).json({
      success: true,
      message: `'${username}' added to group as turn #${parsedTurnOrder}.`,
    });
  } catch (err) {
    // Catch any remaining DB constraint violations
    if (err.message && (err.message.includes('UNIQUE') || err.message.includes('PRIMARY KEY'))) {
      return res.status(409).json({
        success: false,
        message: 'This member or turn order already exists in the group.',
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/khata/:groupId/contribute  — Pay a contribution
//
// BUG-FIX (CRITICAL): Previously, wallet UPDATE and Contributions INSERT were
// separate queries. If INSERT failed (e.g. duplicate payment race condition),
// the wallet was already deducted and money was permanently lost.
//
// Fix: Both operations now run inside a single DB transaction with rollback.
// Also fixed: cycleNumber parsed as int, parseFloat for balance comparison,
// Transactions table record added for audit trail.
// ─────────────────────────────────────────────────────────────────────────────
const contribute = async (req, res) => {
  const { groupId } = req.params;
  const user_id = req.user.user_id;

  // ── Parse and validate cycleNumber
  const cycleNumber = parseInt(req.body.cycleNumber, 10);
  if (!req.body.cycleNumber || isNaN(cycleNumber) || cycleNumber < 1) {
    return res.status(400).json({
      success: false,
      message: 'cycleNumber is required and must be a positive integer (≥ 1).',
    });
  }

  try {
    const pool = await getPool();

    // ── Fetch group details (read-only — outside transaction)
    const groupRes = await pool.request()
      .input('gid', sql.Int, groupId)
      .query('SELECT * FROM KhataGroups WHERE Id=@gid AND IsActive=1');

    if (groupRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active Khata group not found.',
      });
    }

    const group = groupRes.recordset[0];

    // ── Verify membership
    const memberRes = await pool.request()
      .input('gid', sql.Int, groupId)
      .input('uid', sql.Int, user_id)
      .query('SELECT 1 FROM KhataMembers WHERE GroupId=@gid AND UserId=@uid');

    if (memberRes.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group.',
      });
    }

    // ── Check if already paid this cycle (pre-check before transaction)
    const dupRes = await pool.request()
      .input('gid',   sql.Int,      groupId)
      .input('uid',   sql.Int,      user_id)
      .input('cycle', sql.SmallInt, cycleNumber)
      .query(`
        SELECT Id FROM Contributions
        WHERE GroupId=@gid AND UserId=@uid AND CycleNumber=@cycle
      `);

    if (dupRes.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: `You have already paid your contribution for cycle ${cycleNumber}.`,
      });
    }

    // ── Check wallet balance (parseFloat for safe numeric comparison)
    const balRes = await pool.request()
      .input('uid', sql.Int, user_id)
      .query('SELECT balance FROM Wallets WHERE user_id=@uid');

    if (!balRes.recordset[0]) {
      return res.status(404).json({ success: false, message: 'Wallet not found.' });
    }

    const currentBalance  = parseFloat(balRes.recordset[0].balance);
    const requiredAmount  = parseFloat(group.ContributionAmount);

    if (currentBalance < requiredAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You need $${requiredAmount.toFixed(2)} but have $${currentBalance.toFixed(2)}. Please deposit funds first.`,
      });
    }

    // ── BEGIN TRANSACTION — all three writes are atomic
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Deduct from wallet
      await transaction.request()
        .input('uid',    sql.Int,            user_id)
        .input('amount', sql.Decimal(12, 2), requiredAmount)
        .query(`
          UPDATE Wallets
          SET balance = balance - @amount
          WHERE user_id = @uid
        `);

      // 2. Insert contribution record
      await transaction.request()
        .input('gid',    sql.Int,            groupId)
        .input('uid',    sql.Int,            user_id)
        .input('cycle',  sql.SmallInt,       cycleNumber)
        .input('amount', sql.Decimal(19, 4), requiredAmount)
        .query(`
          INSERT INTO Contributions (GroupId, UserId, CycleNumber, AmountPaid)
          VALUES (@gid, @uid, @cycle, @amount)
        `);

      // 3. Record in Transactions table for audit trail
      await transaction.request()
        .input('sender_id',   sql.Int,            user_id)
        .input('receiver_id', sql.Int,            user_id)
        .input('amount',      sql.Decimal(12, 2), requiredAmount)
        .input('note',        sql.VarChar,
          `Khata contribution — Group ${groupId}, Cycle ${cycleNumber}`)
        .query(`
          INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
          VALUES (@sender_id, @receiver_id, @amount, 'transfer', 'completed', @note)
        `);

      await transaction.commit();

      res.json({
        success: true,
        message: `Contribution of $${requiredAmount.toFixed(2)} recorded for cycle ${cycleNumber}.`,
        data: {
          cycleNumber,
          amountPaid:  requiredAmount,
          newBalance:  parseFloat((currentBalance - requiredAmount).toFixed(2)),
        },
      });

    } catch (txErr) {
      try { await transaction.rollback(); } catch (_) {}
      // Friendly message for duplicate constraint race condition
      if (txErr.message && txErr.message.includes('NoDuplicate')) {
        return res.status(409).json({
          success: false,
          message: `You have already paid your contribution for cycle ${cycleNumber}.`,
        });
      }
      throw txErr;
    }

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/khata  — All groups where current user is a member
// ─────────────────────────────────────────────────────────────────────────────
const getMyGroups = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT kg.Id, kg.Name, kg.ContributionAmount, kg.CycleType,
               kg.StartDate, kg.IsActive, kg.CreatedOn,
               u.username AS creator,
               (SELECT COUNT(*) FROM KhataMembers  WHERE GroupId=kg.Id)                   AS member_count,
               (SELECT COALESCE(SUM(AmountPaid),0) FROM Contributions WHERE GroupId=kg.Id) AS total_collected
        FROM KhataGroups kg
        JOIN KhataMembers km ON kg.Id = km.GroupId
        JOIN Users u          ON kg.CreatorId = u.user_id
        WHERE km.UserId = @uid
        ORDER BY kg.CreatedOn DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/khata/:groupId/members  — Members with optional cycle payment status
// BUG-FIX: cycleNumber from req.query is a string. Must parseInt() before
//          passing to sql.SmallInt — raw string causes mssql type error.
// ─────────────────────────────────────────────────────────────────────────────
const getGroupMembers = async (req, res) => {
  const { groupId } = req.params;
  const rawCycle    = req.query.cycleNumber;

  try {
    const pool = await getPool();

    const membersRes = await pool.request()
      .input('gid', sql.Int, groupId)
      .query(`
        SELECT u.username, u.email, km.TurnOrder, km.JoinedOn
        FROM KhataMembers km
        JOIN Users u ON km.UserId = u.user_id
        WHERE km.GroupId = @gid
        ORDER BY km.TurnOrder
      `);

    if (rawCycle !== undefined) {
      // BUG-FIX: parse query string to integer
      const cycleNumber = parseInt(rawCycle, 10);
      if (isNaN(cycleNumber) || cycleNumber < 1) {
        return res.status(400).json({
          success: false,
          message: 'cycleNumber query param must be a positive integer.',
        });
      }

      const unpaidRes = await pool.request()
        .input('gid',   sql.Int,      groupId)
        .input('cycle', sql.SmallInt, cycleNumber)
        .query(`
          SELECT u.username
          FROM KhataMembers km
          JOIN Users u ON km.UserId = u.user_id
          WHERE km.GroupId = @gid
            AND km.UserId NOT IN (
              SELECT UserId FROM Contributions
              WHERE GroupId=@gid AND CycleNumber=@cycle
            )
        `);

      return res.json({
        success: true,
        data: {
          members:      membersRes.recordset,
          unpaid_cycle: unpaidRes.recordset,
        },
      });
    }

    res.json({ success: true, data: membersRes.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/khata/:groupId/contributions  — Full contribution history
// ─────────────────────────────────────────────────────────────────────────────
const getContributions = async (req, res) => {
  const { groupId } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('gid', sql.Int, groupId)
      .query(`
        SELECT u.username, c.CycleNumber, c.AmountPaid, c.PaidOn
        FROM Contributions c
        JOIN Users u ON c.UserId = u.user_id
        WHERE c.GroupId = @gid
        ORDER BY c.CycleNumber ASC, c.PaidOn ASC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/khata/:groupId/next-turn-order  — Returns next available TurnOrder
//   Useful for the frontend "Add Member" form to auto-suggest the turn number.
// ─────────────────────────────────────────────────────────────────────────────
const getNextTurnOrder = async (req, res) => {
  const { groupId } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('gid', sql.Int, groupId)
      .query(`
        SELECT COALESCE(MAX(TurnOrder), 0) + 1 AS nextTurnOrder
        FROM KhataMembers
        WHERE GroupId = @gid
      `);

    res.json({
      success: true,
      data: { nextTurnOrder: result.recordset[0].nextTurnOrder },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createGroup,
  addMember,
  contribute,
  getMyGroups,
  getGroupMembers,
  getContributions,
  getNextTurnOrder,
};
