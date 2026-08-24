const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/mandates.controller');
const { protect, staffOnly, complianceOnly } = require('../middleware/auth.middleware');

// Every route here was open. On a laptop that was invisible; on a public URL it
// meant anyone who could reach the site could list the mandates and, worse,
// approve or reject one — decisions that write to the client record and to the
// audit trail under Compliance's name.
//
// Reading is staff-only, and the three decisions are Compliance's alone, which
// is the same rule the rest of the app already applies to them.
router.get('/',                    protect, staffOnly,      ctrl.listMandates);
router.post('/:id/approve',        protect, complianceOnly, ctrl.approveMandate);
router.post('/:id/reject',         protect, complianceOnly, ctrl.rejectMandate);
router.post('/:id/request-info',   protect, complianceOnly, ctrl.requestMandateInfo);

module.exports = router;
