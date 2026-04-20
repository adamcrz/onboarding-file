const express = require('express');
const router = express.Router();
const {
  getAllFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
} = require('../controllers/folders.controller');

router.get('/', getAllFolders);
router.get('/:id', getFolderById);
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
