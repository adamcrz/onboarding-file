const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const clientsRoutes   = require('./routes/clients.routes');
const documentsRoutes = require('./routes/documents.routes');
const authRoutes      = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/clients',   clientsRoutes);
app.use('/api/documents', documentsRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});