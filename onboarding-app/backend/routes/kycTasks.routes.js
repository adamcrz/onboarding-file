const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/kycTasks.controller');
const { protect, complianceOnly } = require('../middleware/auth.middleware');

router.post('/',              protect, ctrl.createKycTask);
router.get('/',               protect, ctrl.listKycTasks);
router.post('/:id/save',      protect, ctrl.saveKycTask);
router.post('/:id/complete',  protect, ctrl.completeKycTask);
router.post('/client/:clientId/verify', protect, complianceOnly, ctrl.verifyKycTask);
router.post('/:id/verify',    protect, complianceOnly, ctrl.verifyKycTask);

module.exports = router;
