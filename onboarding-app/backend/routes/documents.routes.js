const express = require('express');
const router = express.Router();
const {
  getAllDocuments, getDocumentById, createDocument, updateDocument, deleteDocument
} = require('../controllers/documents.controller');
const { protect, staffOnly, complianceOnly } = require('../middleware/auth.middleware');

// This is the older, standalone Document collection — the per-client documents
// the app actually uses live on the Client record and are served through
// /api/clients/:id/documents, which has always been scoped and protected.
//
// These routes were open to anyone. The collection is empty, so nothing was
// exposed, but the write routes would have let a stranger create, alter or
// delete records in it. Staff to read, Compliance to change, and deleting is
// Compliance's alone.
router.get('/',       protect, staffOnly,      getAllDocuments);
router.get('/:id',    protect, staffOnly,      getDocumentById);
router.post('/',      protect, complianceOnly, createDocument);
router.put('/:id',    protect, complianceOnly, updateDocument);
router.delete('/:id', protect, complianceOnly, deleteDocument);

module.exports = router;
