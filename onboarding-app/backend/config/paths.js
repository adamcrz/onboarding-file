// Where uploaded files live.
//
// Kept in one place because a hosted deployment has to point it somewhere that
// survives a restart. Most platforms give a container an ephemeral filesystem:
// anything written next to the code is gone on the next deploy, which for this
// app means every signed contract and every supporting document a client sent.
// Mounting a persistent disk and setting UPLOADS_DIR to its mount path is what
// makes those files durable.
//
// Unset, it resolves to backend/uploads exactly as before, so local development
// is unchanged.
const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');

// Created eagerly: a disk mounted empty has no directory yet, and the first
// upload should not be the thing that discovers it.
function ensureUploadsRoot() {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  return UPLOADS_ROOT;
}

// One client's folder, created on demand.
function clientUploadDir(clientId) {
  const dir = path.join(UPLOADS_ROOT, String(clientId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Stored vs. real paths ───────────────────────────────────────────────────
//
// What goes in the database is the path *relative to* the uploads root
// ("CLT-0001/1699-contract.pdf"), never an absolute one. An absolute path
// records the machine it was uploaded on: "C:\Users\AdamCroz\...\uploads\..."
// means nothing on a Linux container, and nothing on a colleague's laptop, so
// the document would list correctly and fail to download. Relative paths make
// the same record valid wherever the uploads directory happens to be mounted.
//
// Always stored with forward slashes so a file uploaded on Windows resolves on
// Linux and vice versa.

const toStoredPath = (absolute) => {
  if (!absolute) return absolute;
  const rel = path.relative(UPLOADS_ROOT, absolute);
  // Outside the uploads root (nothing should be, but never silently mangle a
  // path we do not own) — keep it exactly as given.
  if (rel.startsWith('..')) return absolute;
  return rel.split(path.sep).join('/');
};

// Windows-absolute paths are recognised explicitly: path.isAbsolute('C:\\x')
// is false on Linux, so without this a legacy row would be joined onto the
// uploads root and produce nonsense. Such rows are converted for real by
// scripts/migrateFilePaths.js; this only keeps them working in place.
const LEGACY_ABSOLUTE = /^(?:[A-Za-z]:[\\/]|\/)/;

const toAbsolutePath = (stored) => {
  if (!stored) return stored;
  if (path.isAbsolute(stored) || LEGACY_ABSOLUTE.test(stored)) return stored;
  return path.join(UPLOADS_ROOT, stored);
};

module.exports = {
  UPLOADS_ROOT, ensureUploadsRoot, clientUploadDir, toStoredPath, toAbsolutePath,
};
