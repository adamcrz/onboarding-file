// Checks that a MongoDB URI actually works before you commit to it.
//
//   npm run check-db                  # checks MONGO_URI from backend/.env
//   npm run check-db -- "<uri>"       # checks a URI you paste in
//
// Reports what it connected to and what is in there, so a hosted cluster can
// be confirmed as reachable (and as the right cluster) without starting the
// app and guessing from a failure.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// Never print a URI with its password in it — these end up pasted into chats
// and issue trackers.
const redact = (uri) => String(uri || '').replace(/\/\/[^@/]*@/, '//<user>:<password>@');

(async () => {
  const uri = process.argv[2] || process.env.MONGO_URI;
  if (!uri) {
    console.error('No URI given and MONGO_URI is not set in backend/.env.');
    console.error('Usage: npm run check-db -- "mongodb+srv://user:pass@cluster.mongodb.net/onboarding-app"');
    process.exit(1);
  }

  console.log('Connecting to:', redact(uri));
  const started = Date.now();
  try {
    // A hosted cluster that is paused, IP-blocked or misspelled should fail
    // fast with a clear message rather than hanging on the default timeout.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    console.error('\n❌  Could not connect:', err.message);
    if (/authentication failed/i.test(err.message)) {
      console.error('    → Wrong username or password. If the password has @ : / ? # % in it,');
      console.error('      it must be percent-encoded in the URI.');
    } else if (/ENOTFOUND|querySrv/i.test(err.message)) {
      console.error('    → Hostname not found. Check the cluster address was copied whole.');
    } else if (/timed out|ETIMEDOUT/i.test(err.message)) {
      console.error('    → Reachable name but no answer. On Atlas this is almost always');
      console.error('      Network Access: add your current IP to the access list.');
    }
    process.exit(1);
  }

  const db = mongoose.connection.db;
  const admin = db.admin();
  let version = 'unknown';
  try { version = (await admin.serverInfo()).version; } catch (_) { /* Atlas free tier can refuse this */ }

  console.log(`\n✅  Connected in ${Date.now() - started}ms`);
  console.log('    server version:', version);
  console.log('    database:', db.databaseName);
  console.log('    host:', mongoose.connection.host);

  const cols = await db.listCollections().toArray();
  if (!cols.length) {
    console.log('\n    (empty — no collections yet)');
  } else {
    console.log('\n    collections:');
    for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`      ${c.name.padEnd(34)} ${await db.collection(c.name).countDocuments()} docs`);
    }
  }

  // A write is the only real proof the user has more than read access.
  try {
    const probe = db.collection('__connection_probe');
    await probe.insertOne({ at: new Date() });
    await probe.drop();
    console.log('\n    write access: yes');
  } catch (err) {
    console.log('\n    write access: NO —', err.message);
    console.log('    → On Atlas, the database user needs "Read and write to any database".');
  }

  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
