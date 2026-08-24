// Releases database storage for documents that are finished business.
//
//   npm run purge-files                 # database in .env
//   npm run purge-files -- --uri "..."  # a hosted database
//   npm run purge-files -- --dry-run    # show what would go, delete nothing
//
// A document qualifies only when all three are true:
//
//   1. approved      — Compliance has signed it off
//   2. downloaded    — somebody has taken it out of the system
//   3. archived      — the file is in the SharePoint archive on this machine
//
// The third is checked file by file, immediately before each delete, and is
// never assumed: this is the only copy being removed, so "it should be there"
// is not good enough. Anything failing any test is left exactly as it is and
// reported.
//
// What is deleted is only the copy inside MongoDB. The document record, its
// history and the archived file are untouched — the app falls back to the
// archive on the next download, so nothing disappears from anyone's screen.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
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
    console.error('❌  ARCHIVE_DIR is not set, so there is no archive to fall back on.');
    console.error('    Purging now would destroy the only copy. Nothing was done.');
    process.exit(1);
  }
  if (!require('fs').existsSync(ARCHIVE_ROOT)) {
    console.error(`❌  The archive folder does not exist: ${ARCHIVE_ROOT}`);
    console.error('    If OneDrive is still syncing, wait and run this again. Nothing was done.');
    process.exit(1);
  }

  console.log('database:', redact(uri));
  console.log('archive :', ARCHIVE_ROOT);
  if (dryRun) console.log('\n(dry run — nothing will be deleted)');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const fileStore = require('../services/fileStore.service');
  const Client = require('../models/Client');

  const clients = await Client.find({});
  let freed = 0;
  let purged = 0;
  const skipped = { notApproved: 0, notDownloaded: 0, notArchived: [], alreadyPurged: 0, notInStore: 0 };

  for (const client of clients) {
    let changed = false;

    for (const doc of (client.documents || [])) {
      if (!doc.filePath) continue;
      if (doc.purgedFromStore) { skipped.alreadyPurged += 1; continue; }
      if (doc.status !== 'approved') { skipped.notApproved += 1; continue; }
      if (!doc.downloadedAt) { skipped.notDownloaded += 1; continue; }

      // Checked here, against the real filesystem, right before deleting.
      const meta = { clientId: client.clientId, clientName: client.name, docName: doc.name };
      if (!fileStore.isArchived(doc.filePath, meta)) {
        skipped.notArchived.push(`${client.clientId}: ${doc.name}`);
        continue;
      }

      const key = fileStore.keyFor(toAbsolutePath(doc.filePath));
      const stored = await fileStore.getFile(key);
      if (!stored) { skipped.notInStore += 1; continue; }

      // Belt and braces: the archived copy must be the same size as the one
      // about to be deleted. A half-synced OneDrive placeholder is exactly the
      // sort of thing that would otherwise pass an existence check.
      const archived = archivePathFor(doc.filePath, meta);
      const archivedSize = require('fs').statSync(archived).size;
      if (archivedSize !== stored.length) {
        skipped.notArchived.push(`${client.clientId}: ${doc.name} (archive ${archivedSize}B vs stored ${stored.length}B)`);
        continue;
      }

      console.log(`  ${(stored.length / 1024).toFixed(1).padStart(9)} KB  ${client.clientId}  ${doc.name}`);
      if (!dryRun) {
        await fileStore.deleteFile(doc.filePath);
        doc.purgedFromStore = true;
        doc.purgedAt = new Date();
        changed = true;
      }
      freed += stored.length;
      purged += 1;
    }

    if (changed && !dryRun) await client.save();
  }

  console.log(`\n${dryRun ? 'Would free' : 'Freed'}: ${(freed / 1048576).toFixed(2)} MB across ${purged} file(s)`);
  console.log('\nLeft alone:');
  console.log(`  not approved yet      ${skipped.notApproved}`);
  console.log(`  not downloaded yet    ${skipped.notDownloaded}`);
  console.log(`  already released      ${skipped.alreadyPurged}`);
  console.log(`  not in the database   ${skipped.notInStore}`);
  console.log(`  not safely archived   ${skipped.notArchived.length}`);
  if (skipped.notArchived.length) {
    console.log('\n⚠  Kept because the archive copy is missing or incomplete:');
    skipped.notArchived.forEach((n) => console.log('   ', n));
    console.log('    Run "npm run archive-files" from a machine that has the files, then retry.');
  }

  await mongoose.disconnect();
})().catch((err) => { console.error('\n❌ ', err.message); process.exit(1); });
