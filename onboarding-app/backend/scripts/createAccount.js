/**
 * Provision a single staff (or client) account directly in MongoDB — the
 * admin-side counterpart to the public /api/auth/register endpoint, which
 * deliberately refuses to create anything but a 'client' account. Use this
 * whenever an RM, Compliance, or admin account needs to be created, since
 * there is no self-service sign-up for those roles.
 *
 * Usage:
 *   node scripts/createAccount.js --name "Jane Doe" --email jane@firm.com --password "Passw0rd!23" --role rm --rmCode JDO
 *
 * Flags:
 *   --name       required   Full name shown in the UI
 *   --email      required   Login email (case-insensitive)
 *   --password   required   At least 8 characters
 *   --role       required   compliance | compliance_external | rm | client | admin
 *   --rmCode     required for role=rm   Short RM code (e.g. "ACR") used to scope
 *                             that RM's visibility to their own clients — every
 *                             RM account needs one or the portal shows nothing.
 *   --uri        optional   Target database. Defaults to MONGO_URI from .env;
 *                             pass a hosted connection string to provision an
 *                             account on a deployed instance.
 *
 * The account is created pre-verified (isEmailVerified: true) since it's
 * provisioned directly by an admin, not through the email-verification flow.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

const VALID_ROLES = ['compliance', 'compliance_external', 'rm', 'client', 'admin'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  return args;
}

async function createAccount() {
  const { name, email, password, role, rmCode, uri } = parseArgs(process.argv.slice(2));

  const errors = [];
  if (!name) errors.push('--name is required');
  if (!email) errors.push('--email is required');
  if (!password) errors.push('--password is required');
  else if (String(password).length < 8) errors.push('--password must be at least 8 characters');
  if (!role) errors.push('--role is required');
  else if (!VALID_ROLES.includes(role)) errors.push(`--role must be one of: ${VALID_ROLES.join(', ')}`);
  if (role === 'rm' && !rmCode) errors.push('--rmCode is required for role=rm (scopes the RM to their own clients)');

  if (errors.length) {
    console.error('❌  Invalid arguments:\n' + errors.map((e) => `   - ${e}`).join('\n'));
    console.error('\nUsage: node scripts/createAccount.js --name "Jane Doe" --email jane@firm.com --password "Passw0rd!23" --role rm --rmCode JDO');
    process.exit(1);
  }

  // --uri provisions an account straight into a hosted database without
  // repointing .env at it, so the local setup does not have to be broken and
  // put back every time somebody needs an account on the deployed instance.
  const target = (typeof uri === 'string' && uri) || process.env.MONGO_URI;
  if (!target) {
    console.error('❌  No database. Pass --uri "<connection string>", or set MONGO_URI in .env.');
    process.exit(1);
  }

  await mongoose.connect(target, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅  Connected to ${String(target).replace(/\/\/[^@/]*@/, '//<user>:<password>@')}\n`);

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail, role });
    if (existing) {
      console.error(`❌  An account with email "${normalizedEmail}" already exists in the "${role}" portal — nothing created.`);
      process.exit(1);
    }

    const user = new User({
      name,
      email: normalizedEmail,
      password,
      role,
      rmCode: role === 'rm' ? String(rmCode).toUpperCase().trim() : undefined,
      isEmailVerified: true,
    });
    await user.save();

    console.log('─────────────────────────────────────────────────');
    console.log(`✓  Account created`);
    console.log(`   Name     ${user.name}`);
    console.log(`   Email    ${user.email}`);
    console.log(`   Role     ${user.role}`);
    if (user.rmCode) console.log(`   RM code  ${user.rmCode}`);
    console.log('─────────────────────────────────────────────────');
  } finally {
    await mongoose.disconnect();
  }
}

createAccount().catch((err) => {
  console.error('❌  Account creation failed:', err.message);
  process.exit(1);
});
