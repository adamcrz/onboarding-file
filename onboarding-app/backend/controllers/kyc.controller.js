const { appendConfirmedKyc, buildNaturalPersonKycXlsx } = require('../services/kycExport.service');

// POST /api/kyc/confirm
// Called when Compliance confirms a client's KYC Form — adds the client's
// mapped answers to the running NaturalPersonKYC export store.
exports.confirmKyc = (req, res) => {
  const { clientId, firstName, lastName, occupation } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  try {
    const record = appendConfirmedKyc({ clientId, firstName, lastName, occupation });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/kyc/export/natural-person
// Downloads the accumulated bulk-import .xlsx for every client confirmed so far.
exports.exportNaturalPersonKyc = (_req, res) => {
  try {
    const buffer = buildNaturalPersonKycXlsx();
    res.setHeader('Content-Disposition', 'attachment; filename="NaturalPersonKYC.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
