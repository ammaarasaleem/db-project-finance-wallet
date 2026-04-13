const { getPool, sql } = require('../config/db');

// POST /api/khata  - Create khata group
const createGroup = async (req, res) => {
  const { name, contributionAmount, cycleType, startDate } = req.body;
  const creatorId = req.user.user_id;

  if (!name || !contributionAmount || !startDate)
    return res.status(400).json({ success: false, message: 'name, contributionAmount and startDate required.' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('CreatorId', sql.Int, creatorId)
      .input('Name', sql.NVarChar, name)
      .input('ContributionAmount', sql.Decimal(19, 4), contributionAmount)
      .input('CycleType', sql.NVarChar, cycleType || 'Monthly')
      .input('StartDate', sql.Date, startDate)
      .query(`
        INSERT INTO KhataGroups (CreatorId, Name, ContributionAmount, CycleType, StartDate)
        OUTPUT INSERTED.Id
        VALUES (@CreatorId, @Name, @ContributionAmount, @CycleType, @StartDate)
      `);

    const groupId = result.recordset[0].Id;

    // Auto-add creator as first member
    await pool.request()
      .input('GroupId', sql.Int, groupId)
      .input('UserId', sql.Int, creatorId)
      .input('TurnOrder', sql.SmallInt, 1)
      .query('INSERT INTO KhataMembers (GroupId, UserId, TurnOrder) VALUES (@GroupId, @UserId, @TurnOrder)');

    res.status(201).json({ success: true, message: 'Khata group created.', data: { groupId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/khata/:groupId/members  - Add member
const addMember = async (req, res) => {
  const { groupId } = req.params;
  const { username, turnOrder } = req.body;

  try {
    const pool = await getPool();

    // Verify requester is group creator
    const groupRes = await pool.request()
      .input('gid', sql.Int, groupId)
      .input('uid', sql.Int, req.user.user_id)
      .query('SELECT Id FROM KhataGroups WHERE Id=@gid AND CreatorId=@uid');

    if (groupRes.recordset.length === 0)
      return res.status(403).json({ success: false, message: 'Only the group creator can add members.' });

    const userRes = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT user_id FROM Users WHERE username=@username');

    if (userRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'User not found.' });

    const userId = userRes.recordset[0].user_id;

    await pool.request()
      .input('GroupId', sql.Int, groupId)
      .input('UserId', sql.Int, userId)
      .input('TurnOrder', sql.SmallInt, turnOrder)
      .query('INSERT INTO KhataMembers (GroupId, UserId, TurnOrder) VALUES (@GroupId, @UserId, @TurnOrder)');

    res.status(201).json({ success: true, message: `${username} added to group.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/khata/:groupId/contribute  - Pay contribution
const contribute = async (req, res) => {
  const { groupId } = req.params;
  const { cycleNumber } = req.body;
  const user_id = req.user.user_id;

  if (!cycleNumber)
    return res.status(400).json({ success: false, message: 'cycleNumber required.' });

  try {
    const pool = await getPool();

    // Get group details
    const groupRes = await pool.request()
      .input('gid', sql.Int, groupId)
      .query('SELECT * FROM KhataGroups WHERE Id=@gid AND IsActive=1');

    if (groupRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Active group not found.' });

    const group = groupRes.recordset[0];

    // Check membership
    const memberRes = await pool.request()
      .input('gid', sql.Int, groupId).input('uid', sql.Int, user_id)
      .query('SELECT * FROM KhataMembers WHERE GroupId=@gid AND UserId=@uid');

    if (memberRes.recordset.length === 0)
      return res.status(403).json({ success: false, message: 'You are not a member of this group.' });

    // Check if already paid this cycle
    const dupRes = await pool.request()
      .input('gid', sql.Int, groupId).input('uid', sql.Int, user_id).input('cycle', sql.SmallInt, cycleNumber)
      .query('SELECT Id FROM Contributions WHERE GroupId=@gid AND UserId=@uid AND CycleNumber=@cycle');

    if (dupRes.recordset.length > 0)
      return res.status(409).json({ success: false, message: 'Already paid for this cycle.' });

    // Check wallet balance
    const balRes = await pool.request()
      .input('uid', sql.Int, user_id)
      .query('SELECT balance FROM Wallets WHERE user_id=@uid');

    if (balRes.recordset[0].balance < group.ContributionAmount)
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });

    // Deduct from wallet and record contribution
    await pool.request()
      .input('uid', sql.Int, user_id)
      .input('amount', sql.Decimal(19, 4), group.ContributionAmount)
      .query('UPDATE Wallets SET balance = balance - @amount WHERE user_id = @uid');

    await pool.request()
      .input('gid', sql.Int, groupId).input('uid', sql.Int, user_id)
      .input('cycle', sql.SmallInt, cycleNumber).input('amount', sql.Decimal(19, 4), group.ContributionAmount)
      .query('INSERT INTO Contributions (GroupId, UserId, CycleNumber, AmountPaid) VALUES (@gid, @uid, @cycle, @amount)');

    res.json({ success: true, message: `Contribution of $${group.ContributionAmount} recorded for cycle ${cycleNumber}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/khata  - My groups
const getMyGroups = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT kg.Id, kg.Name, kg.ContributionAmount, kg.CycleType, kg.StartDate, kg.IsActive,
               u.username AS creator,
               (SELECT COUNT(*) FROM KhataMembers WHERE GroupId=kg.Id) AS member_count,
               (SELECT COALESCE(SUM(AmountPaid),0) FROM Contributions WHERE GroupId=kg.Id) AS total_collected
        FROM KhataGroups kg
        JOIN KhataMembers km ON kg.Id = km.GroupId
        JOIN Users u ON kg.CreatorId = u.user_id
        WHERE km.UserId = @uid
        ORDER BY kg.CreatedOn DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/khata/:groupId/members  - Group members and who paid
const getGroupMembers = async (req, res) => {
  const { groupId } = req.params;
  const { cycleNumber } = req.query;

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

    if (cycleNumber) {
      const unpaidRes = await pool.request()
        .input('gid', sql.Int, groupId).input('cycle', sql.SmallInt, cycleNumber)
        .query(`
          SELECT u.username
          FROM KhataMembers km
          JOIN Users u ON km.UserId = u.user_id
          WHERE km.GroupId = @gid
          AND km.UserId NOT IN (SELECT UserId FROM Contributions WHERE GroupId=@gid AND CycleNumber=@cycle)
        `);

      return res.json({ success: true, data: { members: membersRes.recordset, unpaid_cycle: unpaidRes.recordset } });
    }

    res.json({ success: true, data: membersRes.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/khata/:groupId/contributions
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
        ORDER BY c.CycleNumber, c.PaidOn
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createGroup, addMember, contribute, getMyGroups, getGroupMembers, getContributions };
