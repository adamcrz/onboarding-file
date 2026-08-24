// Copies every file the database holds into the SharePoint archive, so the
// archive is complete before anything is purged from the database.
//
//   npm run archive-files                 # database in .env
//   npm run archive-files -- --uri "..."  # a hosted database
//   npm run archive-files -- --dry-run
//
// Anything already archived at the right size is skipped, so it is safe to run
// repeatedly — and worth running before purge-files, which refuses to release
// anything the archive does not already hold.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const mongoose = require('mongoose');
const { ARCHIVE_ROOT, archivePathFor, toAbsolutePath } = require('../config/paths');

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
  if (!ARCHIVE_ROOT) {
    console.error('❌  ARCHIVE_DIR is not set in .env — there is nowhere to archive to.');
    process.exit(1);
  }

  console.log('database:', redact(uri));
  console.log('archive :', ARCHIVE_ROOT);
  if (dryRun) console.log('(dry run — nothing will be written)\n');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const fileStore = require('../services/fileStore.service');
  const clients = await mongoose.connection.db.collection('clients').find({}).toArray();

  let archived = 0;
  let already = 0;
  let bytes = 0;
  const unavailable = [];

  for (const client of clients) {
    for (const doc of (client.documents || [])) {
      for (const target of [doc, ...(doc.versions || [])]) {
        if (!target.filePath) continue;
        const key = fileStore.keyFor(toAbsolutePath(target.filePath));
        const dest = archivePathFor(target.filePath);
        if (!dest) continue;

        const data = (await fileStore.getFile(key))
          // Purged from the database already, but perhaps still on this disk.
          || (fs.existsSync(toAbsolutePath(target.filePath)) ? fs.readFileSync(toAbsolutePath(target.filePath)) : null);

        if (!data) { unavailable.push(`${client.clientId}: ${target.filePath}`); continue; }
        if (fs.existsSync(dest) && fs.statSync(dest).size === data.length) { already += 1; continue; }

        console.log(`  ${(data.length / 1024).toFixed(1).padStart(9)} KB  ${key}`);
        if (!dryRun) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, data);
        }
        archived += 1;
        bytes += data.length;
      }
    }
  }

  console.log(`\n${dryRun ? 'Would archive' : 'Archived'}: ${archived} file(s), ${(bytes / 1048576).toFixed(2)} MB`);
  console.log(`Already archived: ${already}`);
  if (unavailable.length) {
    console.log('\n⚠  Recorded but available nowhere this machine can reach:');
    unavailable.forEach((u) => console.log('   ', u));
  }

  await mongoose.disconnect();
})().catch((err) => { console.error('\n❌ ', err.message); process.exit(1); });
