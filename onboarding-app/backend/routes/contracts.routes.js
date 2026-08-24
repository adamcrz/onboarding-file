const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/contracts.controller');
const { protect, staffOnly } = require('../middleware/auth.middleware');

// The templates are the firm's own contract paperwork, and the appendices are
// the Formular A/T/S sets. On a laptop, serving them to anyone who asked cost
// nothing; on a public URL it meant a stranger could download the complete
// contract set, read which mandate types the firm offers, and generate filled
// contracts on the firm's own paper.
//
// Everything here is reached from the Contract Builder, which is behind the
// login, and every call the frontend makes already sends the session — so
// requiring it changes nothing about how the app behaves.
router.get('/templates',                protect, staffOnly, ctrl.getTemplates);
router.get('/placeholders/:templateId', protect, staffOnly, ctrl.getPlaceholders);
router.get('/download/:templateId',     protect, staffOnly, ctrl.downloadTemplate);
router.post('/invite',                  protect, staffOnly, ctrl.sendInvite);
router.post('/preview/:templateId',     protect, staffOnly, ctrl.previewContract);
router.post('/generate/:templateId',    protect, staffOnly, ctrl.generateContract);

router.get('/appendix/download/:clientType/:lang', protect, staffOnly, ctrl.downloadAppendix);

module.exports = router;
