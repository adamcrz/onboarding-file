// Moves every document out of the database and into the SharePoint archive.
//
//   npm run move-to-sharepoint -- --dry-run
//   npm run move-to-sharepoint
//   npm run move-to-sharepoint -- --uri "<hosted connection string>"
//
// The database is not meant to be a document store. It holds the information
// the tool works with — clients, KYC answers, tasks, corrections — and the
// documents themselves belong in the firm's own SharePoint library, where they
// are governed, backed up and reachable outside this app.
//
// Run this from a machine that has the library synced, which is what
// ARCHIVE_DIR points at. Every file is written to SharePoint and read back
// before its database copy is removed: this is the moment the archive becomes
// the only copy, so nothing is deleted on the strength of a write that merely
// did not throw.
//
// Safe to run repeatedly. A file already in SharePoint at the right size is
// left alone, and its database copy is still released.
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
    console.error('❌  ARCHIVE_DIR is not set, so there is nowhere to move the documents to.');
    console.error('    Run this from a machine with the SharePoint library synced. Nothing was done.');
    process.exit(1);
  }
  if (!fs.existsSync(ARCHIVE_ROOT)) {
    console.error(`❌  The archive folder does not exist: ${ARCHIVE_ROOT}`);
    console.error('    If OneDrive is still syncing, wait and run this again. Nothing was done.');
    process.exit(1);
  }

  console.log('database:', redact(uri));
  console.log('archive :', ARCHIVE_ROOT);
  if (dryRun) console.log('\n(dry run — nothing will be written or deleted)');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const fileStore = require('../services/fileStore.service');
  const Client = require('../models/Client');

  let moved = 0;
  let already = 0;
  let bytes = 0;
  const kept = [];

  for (const client of await Client.find({}).select('clientId name documents')) {
    for (const doc of (client.documents || [])) {
      for (const target of [doc, ...(doc.versions || [])]) {
        if (!target.filePath) continue;

        const meta = {
          clientId: client.clientId,
          clientName: client.name,
          docName: doc.name,
          signed: Boolean(doc.signedVersion),
          approved: doc.status === 'approved',
        };
        const key = fileStore.keyFor(toAbsolutePath(target.filePath));
        const inDb = await fileStore.getFile(key);
        if (!inDb) { continue; }               // already out of the database

        const dest = archivePathFor(target.filePath, meta);
        if (!dest) { kept.push(`${client.clientId}: ${doc.name} (no archive path)`); continue; }

        const alreadyThere = fs.existsSync(dest) && fs.readFileSync(dest).equals(inDb);

        if (dryRun) {
          // Nothing is written, so nothing can be verified — reporting these
          // as failures would be a dry run inventing a problem it caused.
          if (alreadyThere) already += 1;
          else { moved += 1; bytes += inDb.length; }
          console.log(`  ${(inDb.length / 1024).toFixed(0).padStart(6)} KB  ${key}`);
          continue;
        }

        if (!alreadyThere) fileStore.archiveFile(key, inDb, meta);

        // Verified against the bytes, every time, including when the file was
        // already there. This is the moment the archive becomes the only copy.
        const safe = fs.existsSync(dest) && fs.readFileSync(dest).equals(inDb);
        if (!safe) { kept.push(`${client.clientId}: ${doc.name} (archive copy did not verify)`); continue; }

        if (alreadyThere) already += 1;
        else { moved += 1; bytes += inDb.length; }

        await fileStore.deleteFile(target.filePath);
        console.log(`  ${(inDb.length / 1024).toFixed(0).padStart(6)} KB  ${key}`);
      }
    }
  }

  const remaining = await mongoose.connection.db.collection('uploads.files').countDocuments();
  console.log(`\n${dryRun ? 'Would move' : 'Moved'}: ${moved} file(s), ${(bytes / 1048576).toFixed(2)} MB`);
  console.log(`Already in SharePoint: ${already}`);
  console.log(`Files still in the database: ${remaining}${dryRun ? ' (unchanged — dry run)' : ''}`);

  if (kept.length) {
    console.log('\n⚠  Left in the database — their archive copy could not be verified:');
    kept.forEach((k) => console.log('   ', k));
    console.log('    Nothing was lost. Fix the archive folder and run this again.');
  }

  await mongoose.disconnect();
})().catch((err) => { console.error('\n❌ ', err.message); process.exit(1); });
