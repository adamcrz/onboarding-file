const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/mandates.controller');

router.get('/',                    ctrl.listMandates);
router.post('/:id/approve',        ctrl.approveMandate);
router.post('/:id/reject',         ctrl.rejectMandate);
router.post('/:id/request-info',   ctrl.requestMandateInfo);

module.exports = router;
