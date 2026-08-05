/**
 * One-off migration: replaces the old single-field unique index on
 * User.email with a compound unique index on (email, role), so the same
 * email can hold one account per role category (e.g. an RM account and a
 * Client account) instead of being globally unique across all roles.
 * Run: node scripts/migrateUserEmailIndex.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

async function migrate() {
  if (!process.env.MONGO_URI) {
    console.error('❌  MONGO_URI is not set. Copy .env.example → .env and fill it in.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  const existing = await User.collection.indexes();
  const staleIndex = existing.find(i => i.unique && i.key && Object.keys(i.key).join(',') === 'email');

  if (staleIndex) {
    await User.collection.dropIndex(staleIndex.name);
    console.log(`🗑️   Dropped stale unique index "${staleIndex.name}" on email alone.`);
  } else {
    console.log('ℹ️   No stale single-field unique email index found.');
  }

  await User.syncIndexes();
  console.log('✓  Synced indexes — compound unique index on (email, role) is now in place.');

  await mongoose.disconnect();
  console.log('\nDone.');
}

migrate().catch(err => {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
});
