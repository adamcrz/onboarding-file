const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
require('dotenv').config();

const clientsRoutes   = require('./routes/clients.routes');
const documentsRoutes = require('./routes/documents.routes');
const authRoutes      = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/clients',   clientsRoutes);
app.use('/api/documents', documentsRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error('ERROR:', err.stack);
  res.status(500).json({ error: err.message });
});

// ─── Database ─────────────────────────────────────────────────────────────────
async function connectDB() {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    // No MONGO_URI — spin up an in-process MongoDB (no install needed)
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mms = await MongoMemoryServer.create();
      uri = mms.getUri();
      console.log('\n📦  MONGO_URI not set — using in-memory MongoDB');
      console.log('    (data resets on restart — set MONGO_URI in .env for persistence)\n');
    } catch (e) {
      console.error('❌  No MONGO_URI and mongodb-memory-server unavailable:', e.message);
      process.exit(1);
    }
  }

  await mongoose.connect(uri);
  console.log('✅  MongoDB connected');
}

// ─── Auto-seed demo users (runs once when DB is empty) ────────────────────────
async function autoSeed() {
  const User = require('./models/User');
  const count = await User.countDocuments();
  if (count > 0) return;

  const demos = [
    { name: 'Compliance Team', email: 'compliance@demo.com', password: 'Demo1234!', role: 'compliance' },
    { name: 'Sarah Mitchell',  email: 'rm@demo.com',         password: 'Demo1234!', role: 'rm'         },
    { name: 'John Smith',      email: 'client@demo.com',     password: 'Demo1234!', role: 'client'     },
  ];

  for (const u of demos) {
    await new User({ ...u, isEmailVerified: true }).save();
  }

  console.log('🌱  Demo users seeded:');
  console.log('    compliance@demo.com / Demo1234!  (Compliance Officer)');
  console.log('    rm@demo.com         / Demo1234!  (Relationship Manager)');
  console.log('    client@demo.com     / Demo1234!  (Client)\n');
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(autoSeed)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀  Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
