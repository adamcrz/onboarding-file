const DocumentRequirement = require('../models/DocumentRequirement');

// GET /api/document-requirements — the full catalog, sorted so the Contract
// Builder can group it by clientType client-side without further sorting.
exports.getAll = async (_req, res) => {
  try {
    const rows = await DocumentRequirement.find().sort({ clientType: 1, order: 1, name: 1 });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
