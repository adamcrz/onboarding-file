/**
 * Wipes all application/demo data from MongoDB so the app can be returned to
 * a clean state before a demo. Deletes documents only — never touches
 * collections, indexes, or schema. Reseeds nothing unless --seed is passed.
 *
 * Run:
 *   ALLOW_DATABASE_RESET=true npm run reset-db
 *   ALLOW_DATABASE_RESET=true npm run reset-db -- --seed   (also reseeds demo accounts + catalog)
 *
 * Safeguards (all must pass, or it refuses to run):
 *   - ALLOW_DATABASE_RESET=true must be set explicitly — the single biggest
 *     "did you mean to do this" guard.
 *   - NODE_ENV must not be 'production'.
 *   - MONGO_URI must point at a local/dev-looking database (localhost,
 *     127.0.0.1, or a mongodb+srv/host containing "dev"/"test"/"demo"/"local")
 *     unless --force-remote is also passed — a remote URI is far more likely
 *     to be a shared or production database.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const shouldSeed = args.includes('--seed');
const forceRemote = args.includes('--force-remote');

function abort(message) {
  console.error(`\n❌  ${message}\n`);
  process.exit(1);
}

function assertSafeToRun() {
  if (process.env.ALLOW_DATABASE_RESET !== 'true') {
    abort(
      'Refusing to reset the database: ALLOW_DATABASE_RESET is not set to "true".\n' +
      '    This script deletes all client/KYC/task/correction/user data.\n' +
      '    Run it as:  ALLOW_DATABASE_RESET=true npm run reset-db'
    );
  }
  if (process.env.NODE_ENV === 'production') {
    abort('Refusing to reset the database: NODE_ENV is "production".');
  }
  const uri = process.env.MONGO_URI || '';
  if (!uri) abort('MONGO_URI is not set. Copy .env.example → .env and fill it in.');

  const looksLocal = /localhost|127\.0\.0\.1|mongodb-memory-server/i.test(uri)
    || /dev|test|demo|local/i.test(uri);
  if (!looksLocal && !forceRemote) {
    abort(
      'MONGO_URI does not look like a local/dev database, and --force-remote was not passed.\n' +
      '    If this really is your dev/demo database, re-run with --force-remote to confirm.\n' +
      `    MONGO_URI: ${uri.replace(/\/\/[^@]+@/, '//<credentials>@')}`
    );
  }
}

async function resetDatabase() {
  assertSafeToRun();

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB');
  console.log(`⚠️   Resetting database at: ${process.env.MONGO_URI.replace(/\/\/[^@]+@/, '//<credentials>@')}\n`);

  // Deleted in dependency order (children before the records they reference) —
  // Mongo doesn't enforce foreign keys, but this keeps the intent explicit and
  // avoids any brief window where a correction/task could outlive its client.
  const models = [
    ['DocumentCorrection', require('../models/DocumentCorrection')],
    ['KycCorrection',      require('../models/KycCorrection')],
    ['KycTask',            require('../models/KycTask')],
    ['Notification',       require('../models/Notification')],
    ['Mandate',            require('../models/Mandate')],
    ['Document',           require('../models/Document')],
    ['Client',             require('../models/Client')],
    ['User',               require('../models/User')],
    ['DocumentRequirement', require('../models/DocumentRequirement')],
  ];

  for (const [name, Model] of models) {
    const result = await Model.deleteMany({});
    console.log(`🗑️   ${name}: deleted ${result.deletedCount}`);
  }

  // No separate sequence counter to reset — Client.generateClientId() derives
  // the next id from countDocuments(), so it's already back to CLT-0001.

  if (shouldSeed) {
    console.log('\n🌱  Reseeding demo accounts and the document requirements catalog…');
    const { seedDemoUsers, seedDocumentRequirements } = require('../services/demoSeed.service');
    await seedDemoUsers();
    await seedDocumentRequirements();
  }

  await mongoose.disconnect();
  console.log('\n✓  Database reset complete.' + (shouldSeed ? '' : ' Run with --seed to also reseed demo accounts.'));
}

resetDatabase().catch(err => {
  console.error('❌  Reset failed:', err.message);
  process.exit(1);
});
