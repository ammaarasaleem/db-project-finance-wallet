require('dotenv').config();
const sql = require('mssql');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  // port: 1433, 
  options: {
    encrypt: process.env.DB_SERVER?.includes("windows.net") ? true : false, // Set to true if using Azure
    enableArithAbort: true,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => console.log('Database Connection Failed!', err));


module.exports = { sql, poolPromise };
