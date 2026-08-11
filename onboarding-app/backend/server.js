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

const app = express();

app.use(cors());
app.use(express.json());

// ─── Serve frontend static files ──────────────────────────────────────────────
const FRONTEND_DIR = path.join(__dirname, '../frontend');
app.use(express.static(FRONTEND_DIR));                    // serves at /
app.use('/frontend', express.static(FRONTEND_DIR));       // keeps email links working

// ─── API Routes ───────────────────────────────────────────────────────────────
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

// ─── Auto-seed the Required Documents catalog (runs once when empty) ──────────
// The client-facing document checklist per legal form (individual/company/
// foundation/trust) — sourced from the firm's Onboarding Checklist. Used to be
// hardcoded in the frontend; now lives here so it's a real editable catalog.
async function autoSeedDocumentRequirements() {
  const DocumentRequirement = require('./models/DocumentRequirement');
  const count = await DocumentRequirement.countDocuments();
  if (count > 0) return;

  const rows = [
    // individual
    { clientType: 'individual', type: 'Identification',    name: 'Copy of Official Identification Document (Passport / ID / Driving Licence)' },
    { clientType: 'individual', type: 'Identification',    name: 'Proof of Residential Address (max. 3 months old)' },
    { clientType: 'individual', type: 'Legal',              name: 'Form A — Declaration of Beneficial Ownership' },
    { clientType: 'individual', type: 'Financial',          name: 'Asset Management / Investment Advisory Agreement incl. Risk Profile & Investment Strategy' },
    { clientType: 'individual', type: 'Compliance',         name: 'Confirmation of Tax Compliance Status' },
    // domiciliary company (Formular A — same beneficial-owner identification as a
    // natural person; not the same legal form as an operating company or foundation)
    { clientType: 'domiciliary', type: 'Legal',             name: 'Commercial Register Extract (Zefix, < 12 months)' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Memorandum & Articles of Association (Statutes/Bylaws)' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Certificate of Incorporation' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Certificate of Good Standing' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Certificate of Incumbency' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Form A — Declaration of Beneficial Ownership' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Board Resolution Confirming Signing Authority' },
    { clientType: 'domiciliary', type: 'Identification',    name: 'Copy of ID — Authorized Signatories' },
    { clientType: 'domiciliary', type: 'Compliance',        name: 'Confirmation of Tax Compliance Status' },
    // company
    { clientType: 'company', type: 'Legal',                 name: 'Commercial Register Extract (Zefix, < 12 months)' },
    { clientType: 'company', type: 'Legal',                 name: 'Memorandum & Articles of Association (Statutes/Bylaws)' },
    { clientType: 'company', type: 'Legal',                 name: 'Certificate of Incorporation' },
    { clientType: 'company', type: 'Legal',                 name: 'Certificate of Good Standing' },
    { clientType: 'company', type: 'Legal',                 name: 'Certificate of Incumbency' },
    { clientType: 'company', type: 'Legal',                 name: 'List of Beneficial Owners / UBO Register Extract' },
    { clientType: 'company', type: 'Legal',                 name: 'Board Resolution Confirming Signing Authority' },
    { clientType: 'company', type: 'Identification',        name: 'Copy of ID — Authorized Signatories' },
    { clientType: 'company', type: 'Compliance',            name: 'Confirmation of Tax Compliance Status' },
    // foundation
    { clientType: 'foundation', type: 'Legal',              name: 'Certificate of Incorporation / Declaration of Foundation' },
    { clientType: 'foundation', type: 'Legal',              name: 'Foundation Act / Foundation Agreement (Statutes/Bylaws)' },
    { clientType: 'foundation', type: 'Legal',              name: 'Commercial Register Extract (if applicable)' },
    { clientType: 'foundation', type: 'Legal',              name: 'List of Authorised Signatures / Board Resolution' },
    { clientType: 'foundation', type: 'Identification',     name: 'Copy of ID — Authorized Signatories' },
    { clientType: 'foundation', type: 'Identification',     name: 'Copy of ID — Beneficial Owner(s)' },
    { clientType: 'foundation', type: 'Compliance',         name: 'Confirmation of Tax Compliance Status' },
    // trust
    { clientType: 'trust', type: 'Legal',                   name: 'Trust Deed / Declaration of Trust' },
    { clientType: 'trust', type: 'Legal',                   name: 'Letter of Wishes (if available)' },
    { clientType: 'trust', type: 'Legal',                   name: 'Deed of Retirement and Appointment of Trustee (DORA) — existing mandates' },
    { clientType: 'trust', type: 'Legal',                   name: 'Form A/K — Settlor Identification' },
    { clientType: 'trust', type: 'Legal',                   name: 'Form A/K — Trustee Identification' },
    { clientType: 'trust', type: 'Legal',                   name: 'Form A/K — Protector Identification (if appointed)' },
    { clientType: 'trust', type: 'Identification',          name: 'Copy of ID — Settlor' },
    { clientType: 'trust', type: 'Identification',          name: 'Copy of ID — Trustee' },
    { clientType: 'trust', type: 'Identification',          name: 'Copy of ID — Protector (if appointed)' },
    { clientType: 'trust', type: 'Financial',                name: 'Investment Manager Appointment Letter (if delegated)' },
    { clientType: 'trust', type: 'Compliance',              name: 'FATCA/CRS Classification Report' },
    { clientType: 'trust', type: 'Compliance',              name: 'Confirmation of Tax Compliance Status' },
  ].map((r, i) => ({ ...r, required: true, order: i }));

  await DocumentRequirement.insertMany(rows);
  console.log(`🌱  Document requirement catalog seeded (${rows.length} entries)\n`);
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(autoSeed)
  .then(autoSeedDocumentRequirements)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀  Server running — open http://localhost:${PORT} in your browser`);
    });
  })
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
