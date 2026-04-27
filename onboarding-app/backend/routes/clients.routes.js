const express = require('express');
const router  = express.Router();
const {
  getAllClients, getClientById, getMyClient, createClient, updateClient, deleteClient
} = require('../controllers/clients.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/me',    protect, getMyClient);  // must be before /:id
router.get('/',      getAllClients);
router.get('/:id',   getClientById);
router.post('/',     createClient);
router.put('/:id',   updateClient);
router.delete('/:id',deleteClient);

module.exports = router;
