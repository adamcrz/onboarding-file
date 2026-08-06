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

// ─── Auto-seed demo client cases (runs once when the collection is empty) ─────
// Mirrors the frontend's original mock State.clients dataset, so the same demo
// cases (Acme, Chen Wei, Thornton, etc.) that Mandates/Corrections/Documents
// reference by id (C001..C005) actually exist as real Client documents once
// the app is reading everything from the database.
async function autoSeedClients() {
  const Client = require('./models/Client');
  const count = await Client.countDocuments();
  if (count > 0) return;

  const demos = [
    { clientId: 'C001', email: 'contact@acmecorp.co.uk', name: 'Acme Corporation', type: 'Corporate', risk: 'Medium',
      status: 'under-review', rm: 'Sarah Mitchell', progress: 65, country: 'United Kingdom', industry: 'Manufacturing',
      documents: [
        { docId: 'D001', name: 'Power of Attorney (Vollmacht)', type: 'Bank Document', status: 'approved', uploadedBy: 'Compliance', templateAvailable: true, signedVersion: true, date: '2026-03-12', size: '2.1 MB', required: true },
        { docId: 'D002', name: 'Client Categorisation (FIDLEG)', type: 'Template', status: 'approved', uploadedBy: 'Client', templateAvailable: true, signedVersion: true, date: '2026-03-13', size: '1.8 MB', required: true },
        { docId: 'D003', name: 'KYC Form', type: 'Template', status: 'pending', uploadedBy: 'Client', templateAvailable: true, signedVersion: false, date: '2026-03-15', size: '0.9 MB', required: true },
        { docId: 'D004', name: 'Form A/T/K/S — Ownership Structure', type: 'Template', status: 'pending', uploadedBy: '-', templateAvailable: true, signedVersion: false, date: '-', size: '-', required: true },
        { docId: 'DAML', name: 'Investment Profile', type: 'Template', status: 'approved', uploadedBy: 'Client', templateAvailable: true, signedVersion: true, date: '2026-03-14', size: '1.2 MB', required: true },
        { docId: 'D005', name: 'Advisory / Asset Management Agreement', type: 'Template', status: 'info-requested', uploadedBy: 'Client', templateAvailable: true, signedVersion: false, date: '2026-03-16', size: '0.4 MB', required: true, missingNote: 'Signature missing on page 3 — see Appendix B' },
        { docId: 'D006', name: 'Mandate Risk Profile', type: 'Template', status: 'draft', uploadedBy: '-', templateAvailable: true, signedVersion: false, date: '-', size: '-', required: true },
        { docId: 'D007i', name: 'Director Passport — John Smith', type: 'ID Document', status: 'approved', uploadedBy: 'Client', templateAvailable: false, signedVersion: false, date: '2026-03-14', size: '1.2 MB', required: true },
      ],
      auditTrail: [
        { action: 'Case created', user: 'Sarah Mitchell (RM)', time: '2026-03-12 09:14', type: 'created' },
        { action: 'KYC form submitted by client', user: 'John Smith (Client)', time: '2026-03-13 14:32', type: 'submitted' },
        { action: 'Documents uploaded (3 files)', user: 'Sarah Mitchell (RM)', time: '2026-03-14 11:05', type: 'uploaded' },
        { action: 'Additional information requested: UBO Declaration needs revision', user: 'Compliance Team', time: '2026-03-16 10:20', type: 'requested' },
        { action: 'Director passport approved', user: 'Compliance Officer', time: '2026-03-17 09:45', type: 'approved' },
      ],
      kyc: {
        legalName: 'Acme Corporation Ltd', tradingName: 'Acme Corp',
        registrationNumber: 'UK12345678', registrationDate: '2015-06-01',
        registrationCountry: 'United Kingdom', jurisdiction: 'England & Wales',
        businessType: 'Private Limited Company', industry: 'Manufacturing',
        annualTurnover: '£2M - £10M', netAssets: '£1M - £5M',
        employees: '50-200', website: 'www.acmecorp.co.uk',
        purpose: 'Trade finance and working capital management',
        address: '123 Business Park, London, EC1A 1BB, United Kingdom',
        directors: [{ name: 'John Smith', nationality: 'British', dob: '1975-04-12', passport: 'GB123456' }],
        ubos: [{ name: 'John Smith', ownership: '55%', nationality: 'British' }],
        pep: 'No', sanctions: 'No', adverse: 'No',
      } },
    { clientId: 'C002', email: 'chen.wei@example.com', name: 'Chen Wei', type: 'Individual', risk: 'Low',
      status: 'pending', rm: 'Michael Torres', progress: 30, country: 'Singapore', industry: 'Technology',
      documents: [
        { docId: 'D007', name: 'Passport', type: 'ID Document', status: 'approved', uploadedBy: 'Client', date: '2026-03-28', size: '1.1 MB', required: true },
        { docId: 'D008', name: 'Proof of Address', type: 'Address Doc', status: 'pending', uploadedBy: 'Client', date: '2026-03-29', size: '0.8 MB', required: true },
        { docId: 'D009', name: 'Source of Wealth Declaration', type: 'AML Doc', status: 'draft', uploadedBy: '-', date: '-', size: '-', required: true },
      ],
      auditTrail: [
        { action: 'Case created', user: 'Michael Torres (RM)', time: '2026-03-28 10:00', type: 'created' },
        { action: 'Passport uploaded and verified', user: 'Chen Wei (Client)', time: '2026-03-28 14:15', type: 'approved' },
        { action: 'Proof of address submitted (under review)', user: 'Chen Wei (Client)', time: '2026-03-29 09:30', type: 'submitted' },
      ],
      kyc: {
        title: 'Mr', firstName: 'Chen', lastName: 'Wei',
        dob: '1985-09-23', nationality: 'Singaporean',
        residency: 'Singapore', taxResidency: 'Singapore',
        taxId: 'SG98765432', passportNumber: 'SG1234567', passportExpiry: '2027-03-15',
        address: '88 Marina Bay Road, Singapore, 018981',
        employmentStatus: 'Self-Employed / Director',
        occupation: 'Technology Entrepreneur',
        annualIncome: 'SGD 500K - 1M',
        sourceOfWealth: 'Business income and investments',
        pep: 'No', sanctions: 'No', adverse: 'No',
      } },
    { clientId: 'C003', email: 'trustees@thorntonfamilytrust.com', name: 'Thornton Family Trust', type: 'Trust', risk: 'High',
      status: 'approved', rm: 'Emily Clarke', progress: 100, country: 'Cayman Islands', industry: 'Private Wealth',
      documents: [
        { docId: 'D010', name: 'Trust Deed', type: 'Trust Doc', status: 'approved', uploadedBy: 'RM', date: '2026-02-01', size: '3.2 MB', required: true },
        { docId: 'D011', name: 'Trustee Passport - Robert Thornton', type: 'ID Document', status: 'approved', uploadedBy: 'Client', date: '2026-02-03', size: '1.1 MB', required: true },
        { docId: 'D012', name: 'Beneficiary Details', type: 'Trust Doc', status: 'approved', uploadedBy: 'RM', date: '2026-02-04', size: '0.7 MB', required: true },
        { docId: 'D013', name: 'Source of Wealth - Enhanced DD', type: 'AML Doc', status: 'approved', uploadedBy: 'Compliance', date: '2026-02-10', size: '1.9 MB', required: true },
      ],
      auditTrail: [
        { action: 'Case created', user: 'Emily Clarke (RM)', time: '2026-02-01 09:00', type: 'created' },
        { action: 'Trust deed and documents submitted', user: 'Emily Clarke (RM)', time: '2026-02-04 11:20', type: 'submitted' },
        { action: 'Enhanced due diligence initiated (High Risk)', user: 'Compliance Team', time: '2026-02-05 10:00', type: 'requested' },
        { action: 'EDD completed and reviewed', user: 'Senior Compliance', time: '2026-02-10 15:30', type: 'approved' },
        { action: 'Case approved by Compliance Director', user: 'Compliance Director', time: '2026-02-14 09:00', type: 'approved' },
        { action: 'Account opened notification sent', user: 'System', time: '2026-02-14 09:05', type: 'created' },
      ],
      kyc: {} },
    { clientId: 'C004', email: 'admin@globalventuresfoundation.org', name: 'Global Ventures Foundation', type: 'Foundation', risk: 'High',
      status: 'rejected', rm: 'James Okafor', progress: 80, country: 'Netherlands', industry: 'Charity / NGO',
      documents: [
        { docId: 'D014', name: 'Foundation Charter', type: 'Corporate Doc', status: 'rejected', uploadedBy: 'RM', date: '2026-01-15', size: '2.4 MB', required: true },
        { docId: 'D015', name: 'Regulatory Registration', type: 'Corporate Doc', status: 'approved', uploadedBy: 'RM', date: '2026-01-15', size: '1.0 MB', required: true },
        { docId: 'D016', name: 'Beneficiary Purpose Statement', type: 'Other', status: 'rejected', uploadedBy: 'Client', date: '2026-01-18', size: '0.5 MB', required: true },
      ],
      auditTrail: [
        { action: 'Case created', user: 'James Okafor (RM)', time: '2026-01-15 10:00', type: 'created' },
        { action: 'Documents submitted for review', user: 'James Okafor (RM)', time: '2026-01-18 14:00', type: 'submitted' },
        { action: 'Sanctions screening — adverse media found', user: 'Compliance System', time: '2026-01-20 09:30', type: 'requested' },
        { action: 'Case escalated to Senior Compliance', user: 'Compliance Officer', time: '2026-01-21 11:00', type: 'submitted' },
        { action: 'Case rejected: Adverse media and sanctions concerns', user: 'Compliance Director', time: '2026-01-25 16:00', type: 'rejected' },
      ],
      kyc: {} },
    { clientId: 'C005', email: 'info@meridianholdingsllc.com', name: 'Meridian Holdings LLC', type: 'Corporate', risk: 'Low',
      status: 'draft', rm: 'Sarah Mitchell', progress: 10, country: 'United States', industry: 'Real Estate',
      documents: [],
      auditTrail: [
        { action: 'Case created — awaiting client KYC form', user: 'Sarah Mitchell (RM)', time: '2026-04-10 13:45', type: 'created' },
      ],
      kyc: {} },
  ];

  await Client.insertMany(demos);
  console.log('🌱  Demo client cases seeded (5)\n');
}

// ─── Auto-seed demo notifications (runs once when the collection is empty) ────
async function autoSeedNotifications() {
  const Notification = require('./models/Notification');
  const count = await Notification.countDocuments();
  if (count > 0) return;

  await Notification.insertMany([
    { text: 'New KYC submission from Acme Corp requires review', read: false, type: 'info' },
    { text: 'Document expiry alert: Chen Wei passport expires in 14 days', read: false, type: 'warning' },
    { text: 'Client "Thornton Family Trust" approved by compliance', read: true, type: 'success' },
  ]);
  console.log('🌱  Demo notifications seeded (3)\n');
}

// ─── Auto-seed demo KYC corrections (runs once when the collection is empty) ──
async function autoSeedKycCorrections() {
  const KycCorrection = require('./models/KycCorrection');
  const count = await KycCorrection.countDocuments();
  if (count > 0) return;

  await KycCorrection.insertMany([
    { mandateId: 'mandate-co-a', clientId: 'C001', issue: 'Passport copy unclear - re-submit high resolution scan', page: 'p. {KYC_PAGE_01}', status: 'pending' },
    { mandateId: 'mandate-co-a', clientId: 'C001', issue: 'Tax domicile evidence missing - attach certificate of residence', page: 'p. {KYC_PAGE_02}', status: 'pending' },
    { mandateId: 'mandate-co-a', clientId: 'C001', issue: 'Source of wealth explanation incomplete - provide full narrative', page: 'p. {KYC_PAGE_03}', status: 'pending' },
    { mandateId: 'mandate-pc-a', clientId: 'C002', issue: 'Second nationality field left blank - confirm or mark N/A', page: 'p. {KYC_PAGE_04}', status: 'resubmitted' },
    { mandateId: 'mandate-pc-b', clientId: 'C002', issue: 'Spouse details missing - required for joint mandate', page: 'p. {KYC_PAGE_05}', status: 'corrected' },
  ]);
  console.log('🌱  Demo KYC corrections seeded (5)\n');
}

// ─── Auto-seed demo mandate risk profiles (runs once when the collection is empty) ─
async function autoSeedMandates() {
  const Mandate = require('./models/Mandate');
  const count = await Mandate.countDocuments();
  if (count > 0) return;

  const demos = [
    { mandateId: 'mandate-found-a', clientId: 'C004', category: 'Foundations', mandateName: 'Mandate A',
      country: 'Netherlands', rm: 'J. Smith', risk: 'High', docsApproved: 3, docsTotal: 7, status: 'pending',
      pendingDocs: [
        { name: 'Source of Funds Narrative', issue: 'Incomplete - narrative not provided', page: 'p. {FOUND_PAGE_01}', priority: 'High', owner: 'J. Smith', dueDate: '{DUE_DATE}', status: 'pending' },
        { name: 'Trust Identification Document', issue: 'Missing - no document uploaded', page: 'p. {FOUND_PAGE_02}', priority: 'Medium', owner: 'J. Smith', dueDate: '{DUE_DATE}', status: 'pending' },
      ] },
    { mandateId: 'mandate-found-b', clientId: 'C004', category: 'Foundations', mandateName: 'Mandate B',
      country: 'Switzerland', rm: 'M. Keller', risk: 'Medium', docsApproved: 5, docsTotal: 7, status: 'pending',
      pendingDocs: [
        { name: 'Beneficiary Control Chart', issue: 'Missing - chart not attached', page: 'p. {FOUND_PAGE_03}', priority: 'Medium', owner: 'M. Keller', dueDate: '{DUE_DATE}', status: 'pending' },
      ] },
    { mandateId: 'mandate-trust-a', clientId: 'C003', category: 'Trusts', mandateName: 'Mandate A',
      country: 'Cayman Islands', rm: 'A. Green', risk: 'High', docsApproved: 2, docsTotal: 8, status: 'pending',
      pendingDocs: [
        { name: 'Settlor Wealth Origin', issue: 'Not documented - needs full narrative', page: 'p. {TRUST_PAGE_01}', priority: 'High', owner: 'A. Green', dueDate: '{DUE_DATE}', status: 'pending' },
        { name: 'Protector KYC Passport', issue: 'Copy missing - upload required', page: 'p. {TRUST_PAGE_02}', priority: 'High', owner: 'A. Green', dueDate: '{DUE_DATE}', status: 'pending' },
      ] },
    { mandateId: 'mandate-trust-b', clientId: 'C003', category: 'Trusts', mandateName: 'Mandate B',
      country: 'Jersey', rm: 'L. Brown', risk: 'Medium', docsApproved: 4, docsTotal: 7, status: 'pending',
      pendingDocs: [
        { name: 'Trust Deed Annex', issue: 'Not uploaded - annex page missing', page: 'p. {TRUST_PAGE_03}', priority: 'Medium', owner: 'L. Brown', dueDate: '{DUE_DATE}', status: 'pending' },
      ] },
    { mandateId: 'mandate-pc-a', clientId: 'C002', category: 'Private Clients', mandateName: 'Personal Mandate',
      country: 'Singapore', rm: 'Michael Torres', risk: 'Low', docsApproved: 6, docsTotal: 8, status: 'pending',
      pendingDocs: [
        { name: 'Tax Domicile Evidence', issue: 'Not attached - supporting proof required', page: 'p. {PC_PAGE_01}', priority: 'Medium', owner: 'Michael Torres', dueDate: '{DUE_DATE}', status: 'pending' },
      ] },
    { mandateId: 'mandate-pc-b', clientId: 'C002', category: 'Private Clients', mandateName: 'Family Mandate',
      country: 'Spain', rm: 'Sarah Mitchell', risk: 'Medium', docsApproved: 3, docsTotal: 8, status: 'pending',
      pendingDocs: [
        { name: 'Wealth Origin Detail', issue: 'Requires clarification - explanation insufficient', page: 'p. {PC_PAGE_02}', priority: 'High', owner: 'Sarah Mitchell', dueDate: '{DUE_DATE}', status: 'pending' },
      ] },
    { mandateId: 'mandate-co-a', clientId: 'C001', category: 'Companies', mandateName: 'Treasury Mandate',
      country: 'United Kingdom', rm: 'Sarah Mitchell', risk: 'Medium', docsApproved: 4, docsTotal: 9, status: 'pending',
      pendingDocs: [
        { name: 'Certificate of Incorporation', issue: 'Latest version missing - outdated copy on file', page: 'p. {CO_PAGE_01}', priority: 'Medium', owner: 'Sarah Mitchell', dueDate: '{DUE_DATE}', status: 'pending' },
        { name: 'UBO Declaration', issue: 'Incomplete - section 3 not filled', page: 'p. {CO_PAGE_02}', priority: 'High', owner: 'Sarah Mitchell', dueDate: '{DUE_DATE}', status: 'pending' },
        { name: 'Sanctions Screening Attachment', issue: 'Missing - attachment not uploaded', page: 'p. {CO_PAGE_03}', priority: 'Medium', owner: 'Sarah Mitchell', dueDate: '{DUE_DATE}', status: 'pending' },
      ] },
    { mandateId: 'mandate-co-b', clientId: 'C005', category: 'Companies', mandateName: 'Mandate',
      country: 'United States', rm: 'Daniel Roth', risk: 'Low', docsApproved: 6, docsTotal: 8, status: 'pending',
      pendingDocs: [
        { name: 'Commercial Register Extract', issue: 'Outdated - please upload current version', page: 'p. {CO_PAGE_04}', priority: 'Low', owner: 'Daniel Roth', dueDate: '{DUE_DATE}', status: 'pending' },
      ] },
  ];

  await Mandate.insertMany(demos);
  console.log('🌱  Demo mandate risk profiles seeded (8)\n');
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(autoSeed)
  .then(autoSeedClients)
  .then(autoSeedMandates)
  .then(autoSeedKycCorrections)
  .then(autoSeedNotifications)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀  Server running — open http://localhost:${PORT} in your browser`);
    });
  })
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
