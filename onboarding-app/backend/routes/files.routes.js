const express = require('express');
const router = express.Router();
const {
  getAllFiles,
  getFileById,
  createFile,
  updateFile,
  deleteFile,
} = require('../controllers/files.controller');

router.get('/', getAllFiles);
router.get('/:id', getFileById);
router.post('/', createFile);
router.put('/:id', updateFile);
router.delete('/:id', deleteFile);

module.exports = router;
