const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/kyc.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/confirm',                ctrl.confirmKyc);
router.get('/export/natural-person',   ctrl.exportNaturalPersonKyc);
router.get('/export/pdf/:clientId',    protect, ctrl.exportKycPdf);

module.exports = router;
