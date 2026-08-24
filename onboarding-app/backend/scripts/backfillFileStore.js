// Uploads files that exist only on this machine's disk into the shared store,
// so documents recorded before the store existed become downloadable by
// everyone rather than only by whoever originally uploaded them.
//
//   npm run backfill-files                 # database in .env
//   npm run backfill-files -- --uri "..."  # a hosted database
//   npm run backfill-files -- --dry-run
//
// Run it from the machine that holds the files. Anything already in the store
// is left alone, so it is safe to run more than once.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const mongoose = require('mongoose');
const { toAbsolutePath } = require('../config/paths');

const redact = (uri) => String(uri || '').replace(/\/\/[^@/]*@/, '//<user>:<password>@');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const has = (name) => process.argv.includes(`--${name}`);

(async () => {
  const uri = arg('uri') || process.env.MONGO_URI;
  const dryRun = has('dry-run');
  if (!uri) {
    console.error('No database. Pass --uri "<connection string>", or set MONGO_URI in .env.');
    process.exit(1);
  }

  console.log('database:', redact(uri));
  if (dryRun) console.log('(dry run — nothing will be uploaded)');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  // Required after connecting: the store resolves its bucket from the live
  // connection.
  const fileStore = require('../services/fileStore.service');

  const clients = await mongoose.connection.db.collection('clients').find({}).toArray();
  let uploaded = 0;
  let already = 0;
  const absent = [];
  let bytes = 0;

  for (const client of clients) {
    for (const doc of (client.documents || [])) {
      for (const target of [doc, ...(doc.versions || [])]) {
        if (!target.filePath) continue;
        const key = fileStore.keyFor(toAbsolutePath(target.filePath));
        if (await fileStore.getFile(key)) { already += 1; continue; }

        const absolute = toAbsolutePath(target.filePath);
        if (!fs.existsSync(absolute)) { absent.push(`${client.clientId}: ${target.filePath}`); continue; }

        const size = fs.statSync(absolute).size;
        console.log(`  ${(size / 1024).toFixed(1).padStart(9)} KB  ${key}`);
        if (!dryRun) await fileStore.putFile(absolute);
        uploaded += 1;
        bytes += size;
      }
    }
  }

  console.log(`\n${dryRun ? 'Would upload' : 'Uploaded'}: ${uploaded} files, ${(bytes / 1048576).toFixed(2)} MB`);
  console.log(`Already in the store: ${already}`);
  if (absent.length) {
    console.log('\n⚠  Recorded but not on this machine — run this from whichever machine holds them:');
    absent.forEach((a) => console.log('   ', a));
  }

  await mongoose.disconnect();
})().catch((err) => { console.error('\n❌ ', err.message); process.exit(1); });
