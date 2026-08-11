const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/kycTasks.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/',              protect, ctrl.createKycTask);
router.get('/',               protect, ctrl.listKycTasks);
router.post('/:id/complete',  protect, ctrl.completeKycTask);

module.exports = router;
