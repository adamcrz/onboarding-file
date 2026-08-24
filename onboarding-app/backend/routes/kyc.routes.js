const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/kyc.controller');
const { protect, complianceOnly } = require('../middleware/auth.middleware');

router.post('/confirm',                protect, complianceOnly, ctrl.confirmKyc);
router.get('/export/natural-person',   protect, complianceOnly, ctrl.exportNaturalPersonKyc);
router.get('/export/pdf/:clientId',    protect, ctrl.exportKycPdf);

module.exports = router;
