const { getPool, sql } = require('../config/db');

const VaultModel = {

  // CHANGED: removed user_Name input and column from INSERT query
  create: async ({ userID, targetAmount, deadline }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('userID',       sql.Int,          userID)
      .input('targetAmount', sql.Decimal(19,4), targetAmount)
      .input('deadline',     sql.Date,          deadline || null)
      .query(`
        INSERT INTO savingVault (userID, targetAmount, deadline)
        OUTPUT INSERTED.id
        VALUES (@userID, @targetAmount, @deadline)
      `);
    return result.recordset[0].id;
  },

  findById: async (id, user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, id)
      .input('uid', sql.Int, user_id)
      .query('SELECT * FROM savingVault WHERE id = @id AND userID = @uid');
    return result.recordset[0] || null;
  },

  // CHANGED: removed user_Name column, added JOIN with Users to get username as vault_name
  getByUser: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT sv.id, u.username AS vault_name, sv.targetAmount, sv.savedAmount,
               CAST(sv.savedAmount * 100.0 / sv.targetAmount AS DECIMAL(5,2)) AS progress_percent,
               sv.deadline, sv.isAchieved, sv.createdON
        FROM savingVault sv
        JOIN Users u ON sv.userID = u.user_id
        WHERE sv.userID = @uid
        ORDER BY sv.createdON DESC
      `);
    return result.recordset;
  },

  addSavings: async (id, amount) => {
    const pool = await getPool();
    await pool.request()
      .input('id',     sql.Int,          id)
      .input('amount', sql.Decimal(19,4), amount)
      .query('UPDATE savingVault SET savedAmount = savedAmount + @amount WHERE id = @id');
    // trg_SavingVault_CheckAchieved trigger auto-marks isAchieved
  },

  deductSavings: async (id, amount) => {
    const pool = await getPool();
    await pool.request()
      .input('id',     sql.Int,          id)
      .input('amount', sql.Decimal(19,4), amount)
      .query(`
        UPDATE savingVault
        SET savedAmount = savedAmount - @amount, isAchieved = 0
        WHERE id = @id
      `);
  },

  delete: async (id, user_id) => {
    const pool = await getPool();
    await pool.request()
      .input('id',  sql.Int, id)
      .input('uid', sql.Int, user_id)
      .query('DELETE FROM savingVault WHERE id = @id AND userID = @uid');
  },

};

module.exports = VaultModel;