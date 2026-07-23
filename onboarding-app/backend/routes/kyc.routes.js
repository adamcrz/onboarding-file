const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/kyc.controller');

router.post('/export/natural-person', ctrl.exportNaturalPersonKyc);

module.exports = router;
