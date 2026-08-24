const express = require('express');
const router = express.Router();
const { protect, staffOnly } = require('../middleware/auth.middleware');

// Not mounted in server.js today, so unreachable — but an open route
// file is a hole waiting for whoever mounts it. Locked to staff now, while it
// costs nothing to do.
const {
  getAllFiles,
  getFileById,
  createFile,
  updateFile,
  deleteFile,
} = require('../controllers/files.controller');

router.get('/', protect, staffOnly, getAllFiles);
router.get('/:id', protect, staffOnly, getFileById);
router.post('/', protect, staffOnly, createFile);
router.put('/:id', protect, staffOnly, updateFile);
router.delete('/:id', protect, staffOnly, deleteFile);

module.exports = router;
