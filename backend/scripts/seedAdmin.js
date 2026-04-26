const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@fintrack.local';
  const phone = process.env.ADMIN_PHONE || null;
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';

  try {
    const pool = await getPool();
    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert by email so the command can be re-run safely.
    const existing = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query('SELECT user_id FROM Users WHERE email = @email');

    let userId;

    if (existing.recordset.length > 0) {
      userId = existing.recordset[0].user_id;

      await pool
        .request()
        .input('user_id', sql.Int, userId)
        .input('username', sql.VarChar, username)
        .input('phone', sql.VarChar, phone)
        .input('password_hash', sql.VarChar, passwordHash)
        .query(`
          UPDATE Users
          SET username = @username,
              phone = @phone,
              password_hash = @password_hash
          WHERE user_id = @user_id
        `);

      console.log('Updated existing admin user.');
    } else {
      const inserted = await pool
        .request()
        .input('username', sql.VarChar, username)
        .input('email', sql.VarChar, email)
        .input('phone', sql.VarChar, phone)
        .input('password_hash', sql.VarChar, passwordHash)
        .query(`
          INSERT INTO Users (username, email, phone, password_hash)
          OUTPUT INSERTED.user_id
          VALUES (@username, @email, @phone, @password_hash)
        `);

      userId = inserted.recordset[0].user_id;
      console.log('Created new admin user.');
    }

    await pool
      .request()
      .input('user_id', sql.Int, userId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Wallets WHERE user_id = @user_id)
        BEGIN
          INSERT INTO Wallets (user_id, balance, currency)
          VALUES (@user_id, 0.00, 'USD')
        END
      `);

    console.log('Admin login credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('Seed complete.');
    process.exit(0);
  } catch (error) {
    console.error('Admin seed failed:', error.message);
    process.exit(1);
  }
}

seedAdmin();
