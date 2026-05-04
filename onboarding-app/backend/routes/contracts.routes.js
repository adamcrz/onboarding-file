const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/contracts.controller');

router.get('/templates',                   ctrl.getTemplates);
router.get('/placeholders/:templateId',    ctrl.getPlaceholders);
router.get('/download/:templateId',        ctrl.downloadTemplate);
router.post('/invite',                     ctrl.sendInvite);

module.exports = router;
