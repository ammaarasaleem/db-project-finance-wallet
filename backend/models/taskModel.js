const { sql, poolPromise } = require('../config/db');

const Task = {
  async getAllTasks() {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Tasks');
    return result.recordset;
  },

  async getTaskById(id) {
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id)
      .query('SELECT * FROM Tasks WHERE id = @id');
    return result.recordset[0];
  },

  //const result = await pool.request().query(`SELECT * FROM Tasks WHERE id = ${id}`);

//   async createTask(title, description) {
//     const pool = await poolPromise;
//     await pool.request()
//       .input('title', sql.VarChar, title)
//       .input('description', sql.VarChar, description)
//       .query('INSERT INTO Tasks (title, description) VALUES (@title, @description)');
//   },
  async createTask(title, description) {
    try{
    const pool = await poolPromise;
    await pool.request()
      .input('title', sql.VarChar, title)
      .input('description', sql.Text, description)
      .execute('CreateTask');  // Calls the stored procedure
    }
    catch{
      console.log("Error executing stored procedure:");
    }
},

  async updateTask(id, title, description) {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .input('title', sql.VarChar, title)
      .input('description', sql.Text, description)
      .query('UPDATE Tasks SET title = @title, description = @description WHERE id = @id');
  },

  async deleteTask(id) {
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Tasks WHERE id = @id');
  }
};

module.exports = Task;
