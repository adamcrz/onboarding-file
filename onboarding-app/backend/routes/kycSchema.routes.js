const express = require('express');
const router  = express.Router();
const { protect, complianceOnly } = require('../middleware/auth.middleware');
const {
  refreshKycSchema,
  addKycField,
  removeKycField,
  restoreKycField,
  removedFieldKeys,
  addedFieldKeys,
} = require('../services/kycSchema.service');
const { BUILT_IN_KYC_FIELDS, getKycFieldDefinitions } = require('../config/kycRequiredFields');

// The KYC questionnaire as it currently stands. Readable by any signed-in user
// — the same list the forms already render — but only Compliance may change
// the questionnaire itself.
router.get('/', protect, async (_req, res) => {
  try {
    await refreshKycSchema();
    const removed = await removedFieldKeys();
    const added = new Set(await addedFieldKeys());

    // Every legal form shares one list, so any type gives the same answer.
    const fields = getKycFieldDefinitions('Individual')
      .map((f) => ({ ...f, builtIn: !added.has(f.key) }));

    res.json({
      fields,
      sections: [...new Set(fields.map((f) => f.page))],
      // Retired shipped questions, so the screen can offer them back rather
      // than making a removal permanent and unexplained.
      removed: BUILT_IN_KYC_FIELDS
        .filter((f) => removed.includes(f.key))
        .map((f) => ({ key: f.key, label: f.label, page: f.page })),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/fields', protect, complianceOnly, async (req, res) => {
  try {
    const actor = String(req.user.email || req.user.name || 'Compliance');
    const field = await addKycField(req.body || {}, actor);
    res.json({ success: true, field });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/fields/:key', protect, complianceOnly, async (req, res) => {
  try {
    const result = await removeKycField(req.params.key);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/fields/:key/restore', protect, complianceOnly, async (req, res) => {
  try {
    await restoreKycField(req.params.key);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
