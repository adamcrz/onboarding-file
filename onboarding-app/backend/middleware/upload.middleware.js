const multer = require('multer');
const fs     = require('fs');
const path   = require('path');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_ROOT, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const uploadClientDoc = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — plenty for a signed contract scan
});

module.exports = { uploadClientDoc, UPLOADS_ROOT };
