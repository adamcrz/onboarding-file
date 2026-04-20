const express = require('express');
const router = express.Router();
const {
  getAllDocuments, getDocumentById, createDocument, updateDocument, deleteDocument
} = require('../controllers/documents.controller');

router.get('/',      getAllDocuments);
router.get('/:id',   getDocumentById);
router.post('/',     createDocument);
router.put('/:id',   updateDocument);
router.delete('/:id',deleteDocument);

module.exports = router;
