const fs = require('fs');
const Client = require('../models/Client');
const { ARCHIVE_ROOT, archivePathFor, toAbsolutePath } = require('../config/paths');

// Keeps the SharePoint archive up with the database, on a timer.
//
// Why this exists: the hosted instance cannot write to the archive. It runs in
// a container with no OneDrive, so ARCHIVE_DIR is unset there and files it
// receives live only in the database. Everything still works — documents
// upload, download and export — but nothing lands in the SharePoint folder,
// which is where the firm actually keeps its records.
//
// So whichever copy of the app *can* see the archive takes responsibility for
// it. While a local instance is open, it catches the archive up with whatever
// the hosted one has been doing: on startup, and then every few minutes.
// Nothing is destructive — it only ever adds a file that is missing, and never
// deletes or overwrites a good copy.
//
// scripts/archiveFiles.js does the same thing on demand, for when nobody has
// had the app open for a while.

const SYNC_INTERVAL_MS = Number.parseInt(process.env.ARCHIVE_SYNC_MINUTES || '10', 10) * 60 * 1000;

let timer = null;
let running = false;

async function syncOnce({ quiet = false } = {}) {
  if (!ARCHIVE_ROOT) return { skipped: 'no ARCHIVE_DIR' };
  // The folder can vanish mid-session — OneDrive signing out, a laptop waking
  // on a different network. That is not an error worth shouting about; the
  // next tick will find it again.
  if (!fs.existsSync(ARCHIVE_ROOT)) return { skipped: 'archive folder not reachable' };
  if (running) return { skipped: 'already running' };

  running = true;
  const result = { copied: 0, bytes: 0, failed: 0 };
  try {
    // Required lazily: the store resolves its bucket from the live mongoose
    // connection, which does not exist when this module is first loaded.
    const fileStore = require('./fileStore.service');

    for (const client of await Client.find({}).select('clientId name documents')) {
      for (const doc of (client.documents || [])) {
        for (const target of [doc, ...(doc.versions || [])]) {
          if (!target.filePath) continue;

          const meta = { clientId: client.clientId, clientName: client.name, docName: doc.name,
            signed: Boolean(doc.signedVersion), approved: doc.status === 'approved' };
          const dest = archivePathFor(target.filePath, meta);
          if (!dest) continue;

          // Present and the right size? Nothing to do. Comparing sizes rather
          // than just existence catches a copy that was interrupted halfway.
          let data = null;
          const key = fileStore.keyFor(toAbsolutePath(target.filePath));
          try {
            data = await fileStore.getFile(key);
          } catch (_) { continue; }
          if (!data) continue;                       // released from the database already
          if (fs.existsSync(dest) && fs.statSync(dest).size === data.length) continue;

          try {
            fileStore.archiveFile(key, data, meta);
            result.copied += 1;
            result.bytes += data.length;
          } catch (_) {
            result.failed += 1;
          }
        }
      }
    }
  } catch (err) {
    if (!quiet) console.warn('⚠  Archive sync could not complete:', err.message);
    return { error: err.message };
  } finally {
    running = false;
  }

  if (result.copied && !quiet) {
    console.log(`📁  Archived ${result.copied} file(s) to SharePoint (${(result.bytes / 1048576).toFixed(2)} MB)`);
  }
  return result;
}

function startArchiveSync() {
  if (!ARCHIVE_ROOT) {
    console.log('📁  Archive sync: off (ARCHIVE_DIR is not set)');
    return null;
  }
  console.log(`📁  Archive sync: on, every ${Math.round(SYNC_INTERVAL_MS / 60000)} min → ${ARCHIVE_ROOT}`);

  // Catch up on whatever happened while this machine was not running, but not
  // in the way of startup: a slow first pass must not delay the app coming up.
  setTimeout(() => { syncOnce().catch(() => {}); }, 5000);

  if (timer) clearInterval(timer);
  timer = setInterval(() => { syncOnce({ quiet: true }).catch(() => {}); }, SYNC_INTERVAL_MS);
  timer.unref?.();                        // never hold the process open on its own
  return timer;
}

function stopArchiveSync() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startArchiveSync, stopArchiveSync, syncOnce };
