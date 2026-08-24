const express = require('express');
const router  = express.Router();
const {
  getAllClients, getClientById, getMyClient, createClient, updateClient, deleteClient,
  approveDocument, flagDocument, uploadDocument, replaceDocumentPage, downloadDocument, downloadFullPackage,
  getContractPreparation, uploadContractDraft, submitContractFinal, saveRelatedPartyKyc, getMandateRisk, saveMandateRisk,
  downloadMandateExport, downloadKycExcel, validateContracts, reviewMandateRiskField,
} = require('../controllers/clients.controller');
const { protect, staffOnly, complianceOnly } = require('../middleware/auth.middleware');
const { uploadClientDoc } = require('../middleware/upload.middleware');

router.get('/me',    protect, getMyClient);  // must be before /:id
router.get('/',      protect, getAllClients);
router.get('/:id',   protect, getClientById);
router.post('/',     protect, staffOnly, createClient);
router.put('/:id',   protect, staffOnly, updateClient);
router.delete('/:id', protect, staffOnly, deleteClient);

router.post('/:id/documents/upload',              protect, uploadClientDoc.single('file'), uploadDocument);
router.post('/:id/documents/:docId/pages/:pageNum', protect, uploadClientDoc.single('file'), replaceDocumentPage);
router.get('/:id/contract-preparation',           protect, getContractPreparation);
router.post('/:id/contract-draft',                protect, uploadClientDoc.single('file'), uploadContractDraft);
router.post('/:id/contract-draft/submit',         protect, submitContractFinal);
router.get('/:id/mandate-risk',                    protect, getMandateRisk);
router.put('/:id/mandate-risk',                    protect, saveMandateRisk);
router.post('/:id/mandate-risk/review',            protect, complianceOnly, reviewMandateRiskField);
router.put('/:id/related-parties/:partyId',        protect, saveRelatedPartyKyc);
router.get('/:id/documents/package',              protect, downloadFullPackage);
router.get('/:id/export',                         protect, staffOnly, downloadMandateExport);
router.get('/:id/kyc-export',                     protect, staffOnly, downloadKycExcel);
router.post('/:id/validate-contracts',            protect, complianceOnly, validateContracts);
router.get('/:id/documents/:docId/download',      protect, downloadDocument);
router.post('/:id/documents/:docId/approve',      protect, complianceOnly, approveDocument);
router.post('/:id/documents/:docId/flag',         protect, complianceOnly, flagDocument);

module.exports = router;
