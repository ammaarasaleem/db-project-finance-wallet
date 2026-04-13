const { getPool, sql } = require('../config/db');

const KhataModel = {

  createGroup: async ({ CreatorId, Name, ContributionAmount, CycleType, StartDate }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('CreatorId',          sql.Int,          CreatorId)
      .input('Name',               sql.NVarChar,      Name)
      .input('ContributionAmount', sql.Decimal(19,4), ContributionAmount)
      .input('CycleType',          sql.NVarChar,      CycleType || 'Monthly')
      .input('StartDate',          sql.Date,          StartDate)
      .query(`
        INSERT INTO KhataGroups (CreatorId, Name, ContributionAmount, CycleType, StartDate)
        OUTPUT INSERTED.Id
        VALUES (@CreatorId, @Name, @ContributionAmount, @CycleType, @StartDate)
      `);
    return result.recordset[0].Id;
  },

  findGroupById: async (groupId) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('gid', sql.Int, groupId)
      .query('SELECT * FROM KhataGroups WHERE Id = @gid');
    return result.recordset[0] || null;
  },

  addMember: async (GroupId, UserId, TurnOrder) => {
    const pool = await getPool();
    await pool.request()
      .input('GroupId',   sql.Int,      GroupId)
      .input('UserId',    sql.Int,      UserId)
      .input('TurnOrder', sql.SmallInt, TurnOrder)
      .query(`
        INSERT INTO KhataMembers (GroupId, UserId, TurnOrder)
        VALUES (@GroupId, @UserId, @TurnOrder)
      `);
  },

  isMember: async (groupId, user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('gid', sql.Int, groupId)
      .input('uid', sql.Int, user_id)
      .query('SELECT 1 AS found FROM KhataMembers WHERE GroupId = @gid AND UserId = @uid');
    return result.recordset.length > 0;
  },

  isCreator: async (groupId, user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('gid', sql.Int, groupId)
      .input('uid', sql.Int, user_id)
      .query('SELECT 1 AS found FROM KhataGroups WHERE Id = @gid AND CreatorId = @uid');
    return result.recordset.length > 0;
  },

  alreadyPaidCycle: async (groupId, userId, cycleNumber) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('gid',   sql.Int,      groupId)
      .input('uid',   sql.Int,      userId)
      .input('cycle', sql.SmallInt, cycleNumber)
      .query(`
        SELECT 1 AS found FROM Contributions
        WHERE GroupId = @gid AND UserId = @uid AND CycleNumber = @cycle
      `);
    return result.recordset.length > 0;
  },

  recordContribution: async ({ GroupId, UserId, CycleNumber, AmountPaid }) => {
    const pool = await getPool();
    await pool.request()
      .input('GroupId',     sql.Int,          GroupId)
      .input('UserId',      sql.Int,          UserId)
      .input('CycleNumber', sql.SmallInt,     CycleNumber)
      .input('AmountPaid',  sql.Decimal(19,4), AmountPaid)
      .query(`
        INSERT INTO Contributions (GroupId, UserId, CycleNumber, AmountPaid)
        VALUES (@GroupId, @UserId, @CycleNumber, @AmountPaid)
      `);
  },

  getGroupsByUser: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT kg.Id, kg.Name, kg.ContributionAmount, kg.CycleType,
               kg.StartDate, kg.IsActive, u.username AS creator,
               (SELECT COUNT(*) FROM KhataMembers WHERE GroupId = kg.Id)          AS member_count,
               (SELECT COALESCE(SUM(AmountPaid),0) FROM Contributions WHERE GroupId = kg.Id) AS total_collected
        FROM KhataGroups kg
        JOIN KhataMembers km ON kg.Id      = km.GroupId
        JOIN Users u         ON kg.CreatorId = u.user_id
        WHERE km.UserId = @uid
        ORDER BY kg.CreatedOn DESC
      `);
    return result.recordset;
  },

  getMembers: async (groupId) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('gid', sql.Int, groupId)
      .query(`
        SELECT u.user_id, u.username, u.email, km.TurnOrder, km.JoinedOn
        FROM KhataMembers km
        JOIN Users u ON km.UserId = u.user_id
        WHERE km.GroupId = @gid
        ORDER BY km.TurnOrder
      `);
    return result.recordset;
  },

  getUnpaidMembers: async (groupId, cycleNumber) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('gid',   sql.Int,      groupId)
      .input('cycle', sql.SmallInt, cycleNumber)
      .query(`
        SELECT u.username
        FROM KhataMembers km
        JOIN Users u ON km.UserId = u.user_id
        WHERE km.GroupId = @gid
          AND km.UserId NOT IN (
            SELECT UserId FROM Contributions
            WHERE GroupId = @gid AND CycleNumber = @cycle
          )
      `);
    return result.recordset;
  },

  getContributions: async (groupId) => {
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
    return result.recordset;
  },

};

module.exports = KhataModel;
