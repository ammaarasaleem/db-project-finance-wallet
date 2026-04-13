const { getPool, sql } = require('../config/db');

const VaultModel = {

  create: async ({ userID, vault_name, targetAmount, deadline }) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('userID',       sql.Int,          userID)
      .input('user_Name',    sql.NVarChar,      vault_name)
      .input('targetAmount', sql.Decimal(19,4), targetAmount)
      .input('deadline',     sql.Date,          deadline || null)
      .query(`
        INSERT INTO savingVault (userID, user_Name, targetAmount, deadline)
        OUTPUT INSERTED.id
        VALUES (@userID, @user_Name, @targetAmount, @deadline)
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

  getByUser: async (user_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, user_id)
      .query(`
        SELECT id, user_Name AS vault_name, targetAmount, savedAmount,
               CAST(savedAmount * 100.0 / targetAmount AS DECIMAL(5,2)) AS progress_percent,
               deadline, isAchieved, createdON
        FROM savingVault
        WHERE userID = @uid
        ORDER BY createdON DESC
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
