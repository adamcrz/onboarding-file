/**
 * Wipe all User accounts from MongoDB except the 3 seeded demo accounts.
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

const KEEP_EMAILS = ['compliance@demo.com', 'rm@demo.com', 'client@demo.com'];

async function wipe() {
  if (!process.env.MONGO_URI) {
    console.error('❌  MONGO_URI is not set. Copy .env.example → .env and fill it in.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  const kept = await User.find({ email: { $in: KEEP_EMAILS } }).select('email');
  const result = await User.deleteMany({ email: { $nin: KEEP_EMAILS } });

  console.log(`🗑️   Deleted ${result.deletedCount} user(s).`);
  console.log(`✓  Kept ${kept.length} demo account(s): ${kept.map(u => u.email).join(', ') || '(none found)'}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

wipe().catch(err => {
  console.error('❌  Wipe failed:', err.message);
  process.exit(1);
});
