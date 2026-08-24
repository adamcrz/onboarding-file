const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/contracts.controller');
const { protect, staffOnly } = require('../middleware/auth.middleware');

router.get('/templates',                   ctrl.getTemplates);
router.get('/placeholders/:templateId',    ctrl.getPlaceholders);
router.get('/download/:templateId',        ctrl.downloadTemplate);
router.post('/invite',                     protect, staffOnly, ctrl.sendInvite);
router.post('/preview/:templateId',        ctrl.previewContract);
router.post('/generate/:templateId',       ctrl.generateContract);

router.get('/appendix/download/:clientType/:lang', ctrl.downloadAppendix);

module.exports = router;
