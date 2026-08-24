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
const { toStoredPath, toAbsolutePath } = require('../config/paths');

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
  return key;
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

  const data = await getFile(keyFor(absolute));
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

module.exports = {
  putFile, getFile, ensureLocal, ensureLocalQuiet, deleteFile, deleteClientFiles, keyFor,
};
