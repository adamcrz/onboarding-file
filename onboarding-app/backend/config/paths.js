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

// ─── The archive ─────────────────────────────────────────────────────────────
//
// A second, permanent copy of every uploaded file, written into a SharePoint
// library that OneDrive syncs to each person's machine. Two things follow from
// that: the documents are backed up somewhere the firm already governs, and
// the database only has to hold a file for as long as it is being worked on.
// Once a contract is approved and has been downloaded, its copy in the
// database can go — the archive still has it. See fileStore.purgeSettled().
//
// The path differs per user ("C:\Users\<name>\OneDrive - ...") so it is
// configured per machine, never hardcoded. Unset, archiving is simply off and
// the app behaves as it did before.
const ARCHIVE_ROOT = process.env.ARCHIVE_DIR ? path.resolve(process.env.ARCHIVE_DIR) : null;

// Characters Windows and SharePoint reject in a name, plus trailing dots and
// spaces, which Explorer silently drops and OneDrive then refuses to sync.
const safeName = (value, fallback) => {
  const cleaned = String(value ?? '')
    .replace(/[\\/:*?"<>|#%{}~&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return cleaned || fallback;
};

// The timestamp every stored filename begins with, as something a person can
// read. Keeps successive versions of one document distinct and in order,
// which a bare document name could not.
const stampFrom = (storedPath) => {
  const m = /(?:^|\/)(\d{10,})-/.exec(String(storedPath || ''));
  const d = m ? new Date(Number(m[1])) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}`;
};

// Where a file goes in the archive.
//
// The database keys files by "CLT-0255/1787570430057-2025_Vertragsset DE.docx",
// which is right for a key — stable, unique, never re-typed — and useless to
// somebody opening the folder in SharePoint looking for a client's contract.
// So the archive gets names meant to be read:
//
//   CLT-0255 Testfirma Muster AG/
//     Testfirma Muster AG - Contract Package (2026-08-24 1432).docx
//
// The client's name is in the file as well as the folder, so a document that
// gets dragged somewhere else still says whose it is. The path stays a pure
// function of the stored key plus the client and document names, so the same
// file always resolves to the same place — which is what lets the release step
// verify a copy exists before deleting the one in the database.
//
// With no meta (an older caller, or a file whose record is not to hand) it
// falls back to the stored layout, so nothing ever fails to archive.
const archivePathFor = (storedPath, meta = null) => {
  if (!ARCHIVE_ROOT || !storedPath) return null;
  const rel = toStoredPath(storedPath);
  if (!rel || path.isAbsolute(rel)) return null;

  if (!meta || !meta.clientName) return path.join(ARCHIVE_ROOT, rel);

  const clientId = meta.clientId || rel.split('/')[0];
  const folder = safeName(`${clientId} ${meta.clientName}`, clientId);
  const ext = path.extname(rel) || '';
  const base = safeName(
    `${meta.clientName} - ${meta.docName || path.basename(rel, ext)} (${stampFrom(rel)})`,
    path.basename(rel, ext),
  );
  return path.join(ARCHIVE_ROOT, folder, `${base}${ext}`);
};

module.exports = {
  UPLOADS_ROOT, ensureUploadsRoot, clientUploadDir, toStoredPath, toAbsolutePath,
  ARCHIVE_ROOT, archivePathFor, safeName,
};
