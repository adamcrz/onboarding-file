const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/kycTasks.controller');

router.post('/',              ctrl.createKycTask);
router.get('/',               ctrl.listKycTasks);
router.post('/:id/complete',  ctrl.completeKycTask);

module.exports = router;
