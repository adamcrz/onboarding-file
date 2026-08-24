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

module.exports = { UPLOADS_ROOT, ensureUploadsRoot, clientUploadDir };
