// Converts stored absolute upload paths to paths relative to the uploads root.
//
//   npm run migrate-file-paths                 # the database in .env
//   npm run migrate-file-paths -- --uri "..."  # a hosted database
//   npm run migrate-file-paths -- --dry-run
//
// Records written before the paths change hold the full path of the machine
// that received the upload — "C:\Users\...\backend\uploads\CLT-0001\file.pdf".
// That is meaningless anywhere else: on a Linux container there is no C: drive,
// so the document lists correctly in the interface and fails on download. What
// belongs in the database is the part after the uploads root, which is valid
// wherever that directory is mounted.
//
// Only the tail after an "uploads" segment is kept, so it does not matter which
// machine's absolute prefix a row was written with.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const redact = (uri) => String(uri || '').replace(/\/\/[^@/]*@/, '//<user>:<password>@');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const has = (name) => process.argv.includes(`--${name}`);

// Absolute on either platform: "/var/..." or "C:\...".
const isAbsoluteAnywhere = (p) => /^(?:[A-Za-z]:[\\/]|\/)/.test(p);

// Everything after the last "uploads" segment, normalised to forward slashes.
// Returns null when the shape is not recognised, so an odd row is reported
// rather than rewritten into something wrong.
function toRelative(stored) {
  const parts = String(stored).split(/[\\/]+/);
  const idx = parts.lastIndexOf('uploads');
  if (idx === -1 || idx === parts.length - 1) return null;
  return parts.slice(idx + 1).join('/');
}

(async () => {
  const uri = arg('uri') || process.env.MONGO_URI;
  const dryRun = has('dry-run');
  if (!uri) {
    console.error('No database. Pass --uri "<connection string>", or set MONGO_URI in .env.');
    process.exit(1);
  }

  console.log('database:', redact(uri));
  if (dryRun) console.log('(dry run — nothing will be written)\n');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const clients = mongoose.connection.db.collection('clients');

  let converted = 0;
  let already = 0;
  const unrecognised = [];

  for (const client of await clients.find({}).toArray()) {
    let changed = false;
    const docs = client.documents || [];

    for (const doc of docs) {
      // Each document, plus every superseded version kept alongside it.
      for (const target of [doc, ...(doc.versions || [])]) {
        if (!target.filePath) continue;
        if (!isAbsoluteAnywhere(target.filePath)) { already += 1; continue; }
        const rel = toRelative(target.filePath);
        if (!rel) { unrecognised.push(`${client.clientId}: ${target.filePath}`); continue; }
        console.log(`  ${client.clientId}  ${target.filePath}`);
        console.log(`           ->  ${rel}`);
        target.filePath = rel;
        converted += 1;
        changed = true;
      }
    }

    if (changed && !dryRun) {
      await clients.updateOne({ _id: client._id }, { $set: { documents: docs } });
    }
  }

  console.log(`\n${dryRun ? 'Would convert' : 'Converted'}: ${converted}`);
  console.log(`Already relative: ${already}`);
  if (unrecognised.length) {
    console.log('\n⚠  Left alone — no "uploads" segment to cut at:');
    unrecognised.forEach((u) => console.log('   ', u));
  }

  await mongoose.disconnect();
})().catch((err) => { console.error('\n❌ ', err.message); process.exit(1); });
