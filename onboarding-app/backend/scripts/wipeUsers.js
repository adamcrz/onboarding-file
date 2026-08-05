/**
 * Wipe all User accounts (and their Client records) from MongoDB except the
 * 3 seeded demo accounts.
 * Run: npm run wipe-users
 *
 * Preserved:
 *   compliance@demo.com
 *   rm@demo.com
 *   client@demo.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');
const Client   = require('../models/Client');

const KEEP_EMAILS = ['compliance@demo.com', 'rm@demo.com', 'client@demo.com'];

async function wipe() {
  if (!process.env.MONGO_URI) {
    console.error('❌  MONGO_URI is not set. Copy .env.example → .env and fill it in.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  const kept = await User.find({ email: { $in: KEEP_EMAILS } }).select('email');
  const toDelete = await User.find({ email: { $nin: KEEP_EMAILS } }).select('_id');
  const idsToDelete = toDelete.map(u => u._id);

  const clientResult = await Client.deleteMany({ userId: { $in: idsToDelete } });
  const userResult = await User.deleteMany({ _id: { $in: idsToDelete } });

  console.log(`🗑️   Deleted ${userResult.deletedCount} user(s) and ${clientResult.deletedCount} client record(s).`);
  console.log(`✓  Kept ${kept.length} demo account(s): ${kept.map(u => u.email).join(', ') || '(none found)'}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

wipe().catch(err => {
  console.error('❌  Wipe failed:', err.message);
  process.exit(1);
});
