/**
 * Seed demo users into MongoDB.
 * Run once: npm run seed
 *
 * Demo credentials (all pre-verified):
 *   compliance@demo.com / Demo1234!  →  compliance role
 *   rm@demo.com         / Demo1234!  →  rm role
 *   client@demo.com     / Demo1234!  →  client role
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

const DEMO_USERS = [
  { name: 'Compliance Team',  email: 'compliance@demo.com', password: 'Demo1234!', role: 'compliance' },
  { name: 'Sarah Mitchell',   email: 'rm@demo.com',         password: 'Demo1234!', role: 'rm'         },
  { name: 'John Smith',       email: 'client@demo.com',     password: 'Demo1234!', role: 'client'     },
];

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('❌  MONGO_URI is not set. Copy .env.example → .env and fill it in.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  for (const u of DEMO_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  ↳  ${u.email.padEnd(25)} already exists — skipped`);
      continue;
    }
    const user = new User({ ...u, isEmailVerified: true });
    await user.save();
    console.log(`  ✓  ${u.email.padEnd(25)} created  (${u.role})`);
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log('Demo credentials (password: Demo1234!)');
  console.log('─────────────────────────────────────────────────');
  DEMO_USERS.forEach(u =>
    console.log(`  ${u.role.padEnd(12)}  ${u.email}`)
  );
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
