const express = require('express');
const router  = express.Router();
const { protect, complianceOnly } = require('../middleware/auth.middleware');
const {
  refreshMandateRiskSchema,
  mandateRiskFields,
  addMandateRiskField,
  removeMandateRiskField,
  restoreMandateRiskField,
  removedFieldKeys,
} = require('../services/mandateRiskSchema.service');
const { MANDATE_RISK_FIELDS } = require('../config/mandateRiskFields');

// The Fragebogen zum Mandatsrisiko as it currently stands. Readable by anyone
// who can see a mandate; only Compliance may change the questionnaire itself.
router.get('/', protect, async (req, res) => {
  try {
    await refreshMandateRiskSchema();
    const removed = await removedFieldKeys();
    const builtInKeys = new Set(MANDATE_RISK_FIELDS.map((f) => f.key));
    res.json({
      fields: mandateRiskFields().map((f) => ({ ...f, builtIn: builtInKeys.has(f.key) })),
      // Retired shipped questions, so the screen can offer them back rather
      // than making a removal permanent and unexplained.
      removed: MANDATE_RISK_FIELDS
        .filter((f) => removed.includes(f.key))
        .map((f) => ({ key: f.key, no: f.no, label: `${f.no}) ${f.label}`, page: f.page })),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/fields', protect, complianceOnly, async (req, res) => {
  try {
    const actor = String(req.user.email || req.user.name || 'Compliance');
    const field = await addMandateRiskField(req.body || {}, actor);
    res.json({ success: true, field, fields: mandateRiskFields() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/fields/:key', protect, complianceOnly, async (req, res) => {
  try {
    const result = await removeMandateRiskField(req.params.key);
    res.json({ success: true, ...result, fields: mandateRiskFields() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/fields/:key/restore', protect, complianceOnly, async (req, res) => {
  try {
    const fields = await restoreMandateRiskField(req.params.key);
    res.json({ success: true, fields });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
