const { buildNaturalPersonKycXlsx } = require('../services/kycExport.service');

// POST /api/kyc/export/natural-person
// Called once Compliance confirms a client's KYC — generates the bulk-import
// .xlsx for the external KYC system from the confirmed answers.
exports.exportNaturalPersonKyc = (req, res) => {
  const { clientId, firstName, lastName, occupation } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  try {
    const buffer = buildNaturalPersonKycXlsx({
      importIdent: `NaturalPersonKYC-${clientId}`,
      firstName, lastName, occupation,
    });
    res.setHeader('Content-Disposition', `attachment; filename="NaturalPersonKYC-${clientId}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
