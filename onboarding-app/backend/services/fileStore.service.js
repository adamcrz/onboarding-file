// Shared storage for uploaded files.
//
// The database has always held a *pointer* to a file, never the file. That is
// fine when one machine both writes and reads it, and breaks the moment two
// people share a database: whoever did not upload the file sees the document
// listed and cannot open it, because the bytes are on somebody else's disk.
//
// So the bytes go in MongoDB too, in GridFS, keyed by the same relative path
// the document record stores. The local disk stays in front of it as a cache —
// every existing `fs.readFileSync(doc.filePath)` still works — but the store is
// what makes a file exist for everyone rather than for one laptop.
//
// Write-through on upload, read-through on access:
//   putFile()      after anything is written to disk
//   ensureLocal()  before anything is read from it
//
// GridFS rather than a plain binary field because a Mongo document caps at
// 16MB and uploads are allowed up to 25MB — a scanned contract can exceed the
// document limit, and failing on the largest files only is the kind of bug
// that shows up in front of a client.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { toStoredPath, toAbsolutePath, ARCHIVE_ROOT, archivePathFor } = require('../config/paths');

const BUCKET = 'uploads';

function bucket() {
  const db = mongoose.connection?.db;
  if (!db) throw new Error('No database connection for the file store');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

// The relative path is the identity of a file in the store, so a record written
// on one machine resolves on another.
const keyFor = (p) => toStoredPath(p);

async function findOne(key) {
  const [file] = await bucket().find({ filename: key }, { limit: 1 }).toArray();
  return file || null;
}

// Uploads the bytes at `absolutePath` (or a buffer) under its relative key.
// Replaces any previous copy: a corrected re-upload writes a new file at a new
// path, but a retried upload of the same path must not leave two versions
// behind for a later read to choose between.
async function putFile(absolutePath, buffer = null) {
  const key = keyFor(absolutePath);
  if (!key) return null;
  const data = buffer || fs.readFileSync(toAbsolutePath(absolutePath));

  const existing = await findOne(key);
  if (existing) await bucket().delete(existing._id).catch(() => {});

  await new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(key);
    stream.on('error', reject);
    stream.on('finish', resolve);
    stream.end(data);
  });

  archiveFile(key, data);
  return key;
}

// The permanent copy, in the OneDrive-synced SharePoint library. Never fatal:
// the archive being unavailable (OneDrive signed out, the library not synced
// on this machine, the folder renamed) must not fail an upload that has
// already been accepted — the file is still in the database, and
// scripts/archiveFiles.js can catch the archive up afterwards.
function archiveFile(key, data) {
  const target = archivePathFor(key);
  if (!target) return null;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    return target;
  } catch (err) {
    console.warn('⚠  Could not write to the archive:', err.message);
    return null;
  }
}

// Whether a file is safely in the archive, which is what makes removing it
// from the database safe.
function isArchived(storedPath) {
  const target = archivePathFor(storedPath);
  return Boolean(target && fs.existsSync(target));
}

// Reads a file out of the store. Returns null when it isn't there, so callers
// can fall back to the local disk rather than fail on a file that predates the
// store.
async function getFile(key) {
  const found = await findOne(key);
  if (!found) return null;
  const chunks = [];
  await new Promise((resolve, reject) => {
    bucket().openDownloadStreamByName(key)
      .on('data', (c) => chunks.push(c))
      .on('error', reject)
      .on('end', resolve);
  });
  return Buffer.concat(chunks);
}

// Guarantees a real file on this machine's disk for a stored path, fetching it
// from the shared store when this machine has never seen it. Returns the
// absolute path, or null when the file exists in neither place.
//
// This is what lets somebody open a contract a colleague uploaded: the record
// resolves, the bytes arrive from Mongo, and every fs-based code path
// downstream carries on exactly as before.
async function ensureLocal(storedPath) {
  if (!storedPath) return null;
  const absolute = toAbsolutePath(storedPath);
  if (fs.existsSync(absolute)) return absolute;

  // Database first — it is the fast path and always current. The archive is
  // the fallback for anything already purged from it, which is how an approved
  // contract stays downloadable long after it stopped taking up space.
  let data = await getFile(keyFor(absolute));
  if (!data) {
    const archived = archivePathFor(absolute);
    if (archived && fs.existsSync(archived)) {
      try { data = fs.readFileSync(archived); } catch (_) { data = null; }
    }
  }
  if (!data) return null;

  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, data);
  return absolute;
}

// Best-effort: a file that cannot be cached locally is not a reason to fail the
// request that mentioned it.
async function ensureLocalQuiet(storedPath) {
  try { return await ensureLocal(storedPath); } catch (_) { return null; }
}

async function deleteFile(storedPath) {
  const found = await findOne(keyFor(toAbsolutePath(storedPath)));
  if (found) await bucket().delete(found._id).catch(() => {});
}

// Everything the store holds for one client, used when a case is deleted so
// its files go with it rather than sitting in the database forever.
async function deleteClientFiles(clientId) {
  const prefix = `${clientId}/`;
  const files = await bucket().find({ filename: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` } }).toArray();
  for (const f of files) await bucket().delete(f._id).catch(() => {});
  return files.length;
}

// Creates a mandate's folder in the archive as soon as the case exists, so
// there is somewhere obvious to look before any document has been uploaded —
// an empty folder named after the client reads as "nothing yet", where a
// missing one reads as "something is wrong".
function ensureClientArchiveDir(clientId) {
  if (!ARCHIVE_ROOT || !clientId) return null;
  const dir = path.join(ARCHIVE_ROOT, String(clientId));
  try {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch (err) {
    console.warn('⚠  Could not create the archive folder:', err.message);
    return null;
  }
}

// Everything one mandate holds, written to the archive and then released from
// the database — the end of a mandate's life in the system, after its final
// export has been taken.
//
// Each file is archived, re-read from the archive, and compared byte for byte
// against what is about to be deleted. Anything that fails is kept: a file is
// only ever dropped from the database once a verified copy exists elsewhere.
// Returns what happened so the caller can record it.
async function releaseClientFiles(client) {
  const result = { released: 0, bytes: 0, kept: [] };
  if (!ARCHIVE_ROOT) { result.kept.push('ARCHIVE_DIR is not configured'); return result; }

  for (const doc of (client.documents || [])) {
    for (const target of [doc, ...(doc.versions || [])]) {
      if (!target.filePath || target.purgedFromStore) continue;

      const key = keyFor(toAbsolutePath(target.filePath));
      const stored = await getFile(key);
      if (!stored) continue; // already gone from the database

      archiveFile(key, stored);

      // Read it back rather than trusting the write: a OneDrive placeholder,
      // a full disk or a permissions problem all fail here instead of costing
      // the only copy of a contract.
      const archived = archivePathFor(target.filePath);
      let verified = false;
      try {
        verified = Boolean(archived) && fs.existsSync(archived)
          && fs.readFileSync(archived).equals(stored);
      } catch (_) { verified = false; }

      if (!verified) { result.kept.push(target.filePath); continue; }

      await deleteFile(target.filePath);
      if (target === doc) { doc.purgedFromStore = true; doc.purgedAt = new Date(); }
      result.released += 1;
      result.bytes += stored.length;
    }
  }
  return result;
}

module.exports = {
  putFile, getFile, ensureLocal, ensureLocalQuiet, deleteFile, deleteClientFiles, keyFor,
  archiveFile, isArchived, ensureClientArchiveDir, releaseClientFiles,
  ARCHIVE_ENABLED: Boolean(ARCHIVE_ROOT),
};
