const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/corrections.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadClientDoc } = require('../middleware/upload.middleware');

router.get('/kyc',                    protect, ctrl.listKycCorrections);
router.post('/kyc/save-section',      protect, ctrl.saveKycSection);
router.post('/kyc/resubmit-section',  protect, ctrl.resubmitKycSection);
router.post('/kyc/flag',              protect, ctrl.flagKycField);
router.post('/kyc/confirm',           protect, ctrl.confirmKycField);
router.post('/kyc/:id/status',        protect, ctrl.updateKycCorrectionStatus);

router.get('/documents',              protect, ctrl.listDocumentCorrections);
router.get('/documents/:id/download', protect, ctrl.downloadCorrectionPages);
router.post('/documents/:id/upload',  protect, uploadClientDoc.single('file'), ctrl.uploadCorrectedPages);
router.post('/documents',             protect, ctrl.createDocumentCorrection);
router.post('/documents/:id/status',  protect, ctrl.updateDocumentCorrectionStatus);

module.exports = router;
