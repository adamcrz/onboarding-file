const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const clientsRoutes    = require('./routes/clients.routes');
const documentsRoutes  = require('./routes/documents.routes');
const authRoutes       = require('./routes/auth.routes');
const contractsRoutes  = require('./routes/contracts.routes');
const kycRoutes        = require('./routes/kyc.routes');
const kycTasksRoutes   = require('./routes/kycTasks.routes');
const mandatesRoutes   = require('./routes/mandates.routes');
const correctionsRoutes = require('./routes/corrections.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const documentRequirementsRoutes = require('./routes/documentRequirements.routes');
const mandateRiskSchemaRoutes = require('./routes/mandateRiskSchema.routes');

const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const {
  assertSecretsPresent, corsOptions, helmetOptions, apiLimiter,
} = require('./config/security');

// Checked before anything is wired up, so a misconfigured production deploy
// stops here rather than serving requests with a known-guessable signing key.
assertSecretsPresent();

const app = express();

// Behind App Service / Render / any reverse proxy, the client's real address
// and the fact the request arrived over HTTPS are in X-Forwarded-* headers.
// Without this, rate limiting sees one shared proxy IP and secure cookies
// are never set.
app.set('trust proxy', 1);

app.use(helmet(helmetOptions()));
app.use(cors(corsOptions()));
app.use(express.json());
app.use(cookieParser());

// ─── Serve frontend static files ──────────────────────────────────────────────
const FRONTEND_DIR = path.join(__dirname, '../frontend');
app.use(express.static(FRONTEND_DIR));                    // serves at /
app.use('/frontend', express.static(FRONTEND_DIR));       // keeps email links working

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/auth',      authRoutes);
app.use('/api/clients',   clientsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/kyc',       kycRoutes);
app.use('/api/kyc-tasks', kycTasksRoutes);
app.use('/api/mandates',  mandatesRoutes);
app.use('/api/corrections', correctionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/document-requirements', documentRequirementsRoutes);
app.use('/api/mandate-risk-schema', mandateRiskSchemaRoutes);
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

// ─── Auto-seed demo users + the Required Documents catalog (runs once when
// each collection is empty; shared with scripts/resetDatabase.js's --seed) ──
const { seedDemoUsers, seedDocumentRequirements } = require('./services/demoSeed.service');

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const { refreshMandateRiskSchema } = require('./services/mandateRiskSchema.service');

connectDB()
  .then(seedDemoUsers)
  .then(seedDocumentRequirements)
  .then(refreshMandateRiskSchema)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀  Server running — open http://localhost:${PORT} in your browser`);
    });
  })
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
