const express = require('express');
const router  = express.Router();
const {
  getAllClients, getClientById, getMyClient, createClient, updateClient, deleteClient,
  approveDocument, requestDocumentInfo,
} = require('../controllers/clients.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/me',    protect, getMyClient);  // must be before /:id
router.get('/',      protect, getAllClients);
router.get('/:id',   protect, getClientById);
router.post('/',     createClient);
router.put('/:id',   protect, updateClient);
router.delete('/:id',protect, deleteClient);

router.post('/:id/documents/:docId/approve',      protect, approveDocument);
router.post('/:id/documents/:docId/request-info', protect, requestDocumentInfo);

module.exports = router;
