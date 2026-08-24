const multer = require('multer');
const { UPLOADS_ROOT, clientUploadDir } = require('../config/paths');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, clientUploadDir(req.params.id));
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
