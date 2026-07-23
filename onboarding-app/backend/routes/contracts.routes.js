const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/contracts.controller');

router.get('/templates',                   ctrl.getTemplates);
router.get('/placeholders/:templateId',    ctrl.getPlaceholders);
router.get('/download/:templateId',        ctrl.downloadTemplate);
router.post('/invite',                     ctrl.sendInvite);
router.post('/preview/:templateId',        ctrl.previewContract);
router.post('/generate/:templateId',       ctrl.generateContract);

router.post('/reviews',                    ctrl.submitContractReview);
router.get('/reviews',                     ctrl.listContractReviews);
router.post('/reviews/:id/approve',        ctrl.approveContractReview);
router.post('/reviews/:id/reject',         ctrl.rejectContractReview);

router.get('/appendix/preview/:clientType/:lang',  ctrl.previewAppendix);
router.get('/appendix/download/:clientType/:lang', ctrl.downloadAppendix);

module.exports = router;
