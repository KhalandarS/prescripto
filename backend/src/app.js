const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prescriptionRoutes = require('./routes/prescriptions');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/prescriptions', prescriptionRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
