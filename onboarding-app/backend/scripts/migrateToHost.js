// Copies every collection from one MongoDB to another — the local dev database
// into a hosted cluster, typically.
//
//   npm run migrate-to-host -- --to "mongodb+srv://user:pass@cluster.mongodb.net/onboarding-app"
//   npm run migrate-to-host -- --from "<uri>" --to "<uri>"     # explicit source
//   npm run migrate-to-host -- --to "<uri>" --dry-run          # show what would move
//   npm run migrate-to-host -- --to "<uri>" --force            # allow a non-empty target
//
// Written against the driver the app already depends on, so it needs no
// mongodump/mongorestore install. Suits this app's data volume (tens of
// documents); it is not a general-purpose tool for a large database.
//
// Refuses by default to write into a target that already holds data — the
// usual way to lose a database is to "migrate" onto a live one.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

const redact = (uri) => String(uri || '').replace(/\/\/[^@/]*@/, '//<user>:<password>@');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (name) => process.argv.includes(`--${name}`);

// Indexes are part of the schema, not decoration: the compound account-
// uniqueness index and the unique clientId are correctness constraints, so a
// copy without them is not the same database.
async function copyIndexes(source, target, name) {
  let indexes = [];
  try { indexes = await source.collection(name).indexes(); } catch (_) { return 0; }
  let made = 0;
  for (const idx of indexes) {
    if (idx.name === '_id_') continue; // always created automatically
    const { key, name: idxName, v, ns, background, ...options } = idx;
    try {
      await target.collection(name).createIndex(key, { name: idxName, ...options });
      made += 1;
    } catch (err) {
      console.warn(`    ⚠  index ${idxName} on ${name}: ${err.message}`);
    }
  }
  return made;
}

(async () => {
  const from = arg('from') || process.env.MONGO_URI;
  const to = arg('to');
  const dryRun = has('dry-run');
  const force = has('force');

  if (!from) {
    console.error('No source: pass --from "<uri>" or set MONGO_URI in backend/.env.');
    process.exit(1);
  }
  if (!to) {
    console.error('No target: pass --to "<uri>".');
    console.error('Example: npm run migrate-to-host -- --to "mongodb+srv://user:pass@cluster.mongodb.net/onboarding-app"');
    process.exit(1);
  }
  if (from === to) {
    console.error('Source and target are the same database.');
    process.exit(1);
  }

  console.log('from:', redact(from));
  console.log('to:  ', redact(to));
  if (dryRun) console.log('\n(dry run — nothing will be written)');

  const src = new MongoClient(from, { serverSelectionTimeoutMS: 10000 });
  const dst = new MongoClient(to, { serverSelectionTimeoutMS: 10000 });
  await src.connect();
  await dst.connect();
  const sdb = src.db();
  const tdb = dst.db();

  const collections = (await sdb.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'))
    .sort();

  // Check the whole target before writing anything, so a refusal happens
  // before a half-finished copy rather than partway through one.
  const occupied = [];
  for (const name of collections) {
    const n = await tdb.collection(name).countDocuments();
    if (n > 0) occupied.push(`${name} (${n} docs)`);
  }
  if (occupied.length && !force && !dryRun) {
    console.error('\n❌  The target already holds data:');
    occupied.forEach((o) => console.error('     ', o));
    console.error('\n    Nothing was written. Re-run with --force only if you mean to add to it.');
    await src.close(); await dst.close();
    process.exit(1);
  }

  console.log('');
  let totalDocs = 0;
  let totalIdx = 0;
  for (const name of collections) {
    const docs = await sdb.collection(name).find({}).toArray();
    if (!docs.length) {
      console.log(`  ${name.padEnd(34)} empty, skipped`);
      continue;
    }
    if (dryRun) {
      console.log(`  ${name.padEnd(34)} would copy ${docs.length} docs`);
      totalDocs += docs.length;
      continue;
    }
    // ordered:false so one duplicate cannot abandon the rest of the batch.
    await tdb.collection(name).insertMany(docs, { ordered: false });
    const idx = await copyIndexes(sdb, tdb, name);
    totalDocs += docs.length;
    totalIdx += idx;
    console.log(`  ${name.padEnd(34)} ${docs.length} docs, ${idx} indexes`);
  }

  console.log(`\n${dryRun ? 'Would copy' : 'Copied'} ${totalDocs} documents${dryRun ? '' : ` and ${totalIdx} indexes`}.`);

  if (!dryRun) {
    // Verify rather than assume: compare counts back out of the target.
    console.log('\nVerifying:');
    let mismatch = false;
    for (const name of collections) {
      const a = await sdb.collection(name).countDocuments();
      const b = await tdb.collection(name).countDocuments();
      if (a !== b) { mismatch = true; console.log(`  ✗ ${name}: source ${a}, target ${b}`); }
    }
    console.log(mismatch ? '  ⚠  Counts differ — see above.' : '  ✅  Every collection matches.');
    console.log('\nNext: put the target URI in backend/.env as MONGO_URI, then restart the server.');
    console.log('The local database is untouched, so you can switch back by restoring the old MONGO_URI.');
  }

  await src.close();
  await dst.close();
})().catch((err) => { console.error('\n❌ ', err.message); process.exit(1); });
