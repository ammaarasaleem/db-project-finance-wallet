const express = require('express');
const cors = require('cors');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const friendsRoutes = require('./routes/friendsRoutes');
const loansRoutes = require('./routes/loansRoutes');
const billsRoutes = require('./routes/billsRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const khataRoutes = require('./routes/khataRoutes');
const financeRoutes = require('./routes/financeRoutes');
const app = express();
app.use(express.json()); 
app.use(cors());
app.use('/api', taskRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/vaults', vaultRoutes);
app.use('/api/khata', khataRoutes);
app.use('/api/finance', financeRoutes);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });
  

const PORT = process.env.PORT || 5002;


app.get('/', (req, res) => {
    res.send('Hello from Node.js Backend!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});