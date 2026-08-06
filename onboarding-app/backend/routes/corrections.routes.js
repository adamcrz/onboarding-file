const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/corrections.controller');

router.get('/kyc',                    ctrl.listKycCorrections);
router.post('/kyc/:id/status',        ctrl.updateKycCorrectionStatus);

router.get('/documents',              ctrl.listDocumentCorrections);
router.post('/documents',             ctrl.createDocumentCorrection);
router.post('/documents/:id/status',  ctrl.updateDocumentCorrectionStatus);

module.exports = router;
