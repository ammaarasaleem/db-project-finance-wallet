const Task = require('../models/taskModel');

exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.getAllTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.createTask = async (req, res) => {
    try {
      const { title, description} = req.body;
      await Task.createTask(title, description);
      res.status(201).json({ message: 'Task created using stored procedure' });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  

exports.updateTask = async (req, res) => {
  try {
    const { title, description } = req.body;
    await Task.updateTask(req.params.id, title, description);
    res.json({ message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    await Task.deleteTask(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
