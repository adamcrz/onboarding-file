// Demo/reference data seeding — used both by server.js on every startup
// (idempotent: each function no-ops once its collection is non-empty) and by
// scripts/resetDatabase.js's optional --seed step after a full wipe.
async function seedDemoUsers() {
  const User = require('../models/User');
  const count = await User.countDocuments();
  if (count > 0) return;

  const demos = [
    { name: 'Compliance Team', email: 'compliance@demo.com', password: 'Demo1234!', role: 'compliance' },
    { name: 'Sarah Mitchell',  email: 'rm@demo.com',         password: 'Demo1234!', role: 'rm', rmCode: 'DEMO' },
    { name: 'John Smith',      email: 'client@demo.com',     password: 'Demo1234!', role: 'client'     },
  ];

  for (const u of demos) {
    await new User({ ...u, isEmailVerified: true }).save();
  }

  console.log('🌱  Demo users seeded:');
  console.log('    compliance@demo.com / Demo1234!  (Compliance Officer)');
  console.log('    rm@demo.com         / Demo1234!  (Relationship Manager, rmCode=DEMO)');
  console.log('    client@demo.com     / Demo1234!  (Client)\n');
}

// The client-facing document checklist per legal form (individual/company/
// foundation/trust) — sourced from the firm's Onboarding Checklist. Used to be
// hardcoded in the frontend; now lives here so it's a real editable catalog.
async function seedDocumentRequirements() {
  const DocumentRequirement = require('../models/DocumentRequirement');
  const count = await DocumentRequirement.countDocuments();
  if (count > 0) return;

  const rows = [
    // individual — Form A and the Asset Management Agreement itself are already
    // embedded in the generated contract, so they're not listed again here.
    { clientType: 'individual', type: 'Identification',    name: 'Copy of Official Identification Document (Passport / ID / Driving Licence)' },
    { clientType: 'individual', type: 'Identification',    name: 'Proof of Residential Address (max. 3 months old)' },
    { clientType: 'individual', type: 'Compliance',         name: 'Confirmation of Tax Compliance Status' },
    // domiciliary company (Formular A — same beneficial-owner identification as a
    // natural person; not the same legal form as an operating company or foundation).
    // Form A itself is already embedded in the generated contract.
    { clientType: 'domiciliary', type: 'Legal',             name: 'Commercial Register Extract (Zefix, < 12 months)' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Memorandum & Articles of Association (Statutes/Bylaws)' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Certificate of Incorporation' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Certificate of Good Standing' },
    { clientType: 'domiciliary', type: 'Legal',             name: 'Certificate of Incumbency' },
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

module.exports = { seedDemoUsers, seedDocumentRequirements };
