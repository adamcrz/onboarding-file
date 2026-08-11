const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/corrections.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/kyc',                    protect, ctrl.listKycCorrections);
router.post('/kyc/:id/status',        protect, ctrl.updateKycCorrectionStatus);

router.get('/documents',              protect, ctrl.listDocumentCorrections);
router.post('/documents',             ctrl.createDocumentCorrection);
router.post('/documents/:id/status',  protect, ctrl.updateDocumentCorrectionStatus);

module.exports = router;
