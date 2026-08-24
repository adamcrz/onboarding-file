const express = require('express');
const router = express.Router();
const { protect, staffOnly } = require('../middleware/auth.middleware');

// As with files.routes.js: not mounted, locked anyway so that mounting
// it later cannot silently expose it.
const {
  getAllFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
} = require('../controllers/folders.controller');

router.get('/', protect, staffOnly, getAllFolders);
router.get('/:id', protect, staffOnly, getFolderById);
router.post('/', protect, staffOnly, createFolder);
router.put('/:id', protect, staffOnly, updateFolder);
router.delete('/:id', protect, staffOnly, deleteFolder);

module.exports = router;
