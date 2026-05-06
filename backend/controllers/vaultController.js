const { getPool, sql } = require('../config/db');

// POST /api/vaults  - Create saving vault
const createVault = async (req, res) => {
  const { vault_name, targetAmount, deadline } = req.body;
  const userID = req.user.user_id;
  const username = req.user.username;

  if (!vault_name || !targetAmount || targetAmount <= 0)
    return res.status(400).json({ success: false, message: 'vault_name and valid targetAmount required.' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userID', sql.Int, userID)
      .input('user_Name', sql.NVarChar, vault_name)
      .input('targetAmount', sql.Decimal(19, 4), targetAmount)
      .input('deadline', sql.Date, deadline || null)
      .query(`
        INSERT INTO savingVault (userID, user_Name, targetAmount, deadline)
        OUTPUT INSERTED.id
        VALUES (@userID, @user_Name, @targetAmount, @deadline)
      `);

    res.status(201).json({ success: true, message: 'Vault created.', data: { vault_id: result.recordset[0].id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/vaults  - My vaults
const getMyVaults = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.Int, req.user.user_id)
      .query(`
        SELECT id, user_Name AS vault_name, targetAmount, savedAmount,
               CAST(savedAmount * 100.0 / NULLIF(targetAmount, 0) AS DECIMAL(5,2)) AS progress_percent,
               deadline, isAchieved, createdON
        FROM savingVault
        WHERE userID = @uid
        ORDER BY createdON DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/vaults/:id/deposit  - Add money to vault (deduct from wallet)
const depositToVault = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const user_id = req.user.user_id;

  if (!amount || amount <= 0)
    return res.status(400).json({ success: false, message: 'Valid amount required.' });

  try {
    const pool = await getPool();

    const vaultRes = await pool.request()
      .input('id', sql.Int, id)
      .input('uid', sql.Int, user_id)
      .query('SELECT * FROM savingVault WHERE id=@id AND userID=@uid');

    if (vaultRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Vault not found.' });

    const vault = vaultRes.recordset[0];
    if (vault.isAchieved)
      return res.status(400).json({ success: false, message: 'Vault goal already achieved.' });

    // Check wallet balance
    const balRes = await pool.request()
      .input('uid', sql.Int, user_id)
      .query('SELECT balance FROM Wallets WHERE user_id=@uid');

    if (balRes.recordset[0].balance < amount)
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });

    const newSaved = parseFloat(vault.savedAmount) + parseFloat(amount);
    const isAchieved = newSaved >= vault.targetAmount ? 1 : 0;

    await pool.request()
      .input('uid', sql.Int, user_id)
      .input('amount', sql.Decimal(19, 4), amount)
      .input('id', sql.Int, id)
      .input('newSaved', sql.Decimal(19, 4), newSaved)
      .input('isAchieved', sql.Bit, isAchieved)
      .query(`
        UPDATE Wallets SET balance = balance - @amount WHERE user_id = @uid;
        UPDATE savingVault SET savedAmount = @newSaved, isAchieved = @isAchieved WHERE id = @id;
      `);

    res.json({
      success: true,
      message: isAchieved ? '🎉 Vault goal achieved!' : `Deposited $${amount} to vault.`,
      data: { savedAmount: newSaved, isAchieved },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/vaults/:id/withdraw  - Withdraw from vault back to wallet
const withdrawFromVault = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const user_id = req.user.user_id;

  if (!amount || amount <= 0)
    return res.status(400).json({ success: false, message: 'Valid amount required.' });

  try {
    const pool = await getPool();
    const vaultRes = await pool.request()
      .input('id', sql.Int, id)
      .input('uid', sql.Int, user_id)
      .query('SELECT * FROM savingVault WHERE id=@id AND userID=@uid');

    if (vaultRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Vault not found.' });

    const vault = vaultRes.recordset[0];

    if (amount > vault.savedAmount)
      return res.status(400).json({ success: false, message: `Only $${vault.savedAmount} available in vault.` });

    const newSaved = parseFloat(vault.savedAmount) - parseFloat(amount);

    await pool.request()
      .input('uid', sql.Int, user_id)
      .input('amount', sql.Decimal(19, 4), amount)
      .input('id', sql.Int, id)
      .input('newSaved', sql.Decimal(19, 4), newSaved)
      .query(`
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @uid;
        UPDATE savingVault SET savedAmount = @newSaved, isAchieved = 0 WHERE id = @id;
      `);

    res.json({ success: true, message: `Withdrawn $${amount} from vault.`, data: { savedAmount: newSaved } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/vaults/:id
const deleteVault = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.user_id;
  try {
    const pool = await getPool();

    // Return saved amount to wallet before deleting
    const vaultRes = await pool.request()
      .input('id', sql.Int, id).input('uid', sql.Int, user_id)
      .query('SELECT savedAmount FROM savingVault WHERE id=@id AND userID=@uid');

    if (vaultRes.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Vault not found.' });

    const { savedAmount } = vaultRes.recordset[0];

    await pool.request()
      .input('uid', sql.Int, user_id)
      .input('amount', sql.Decimal(19, 4), savedAmount)
      .input('id', sql.Int, id)
      .query(`
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @uid;
        DELETE FROM savingVault WHERE id = @id;
      `);

    res.json({ success: true, message: `Vault deleted. $${savedAmount} returned to wallet.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createVault, getMyVaults, depositToVault, withdrawFromVault, deleteVault };
