const { appendConfirmedKyc, buildNaturalPersonKycXlsx } = require('../services/kycExport.service');
const { buildKycSummaryPdf } = require('../services/kycPdfExport.service');
const Client = require('../models/Client');

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

// GET /api/kyc/export/pdf/:clientId  (protected)
// A real, working PDF summary of one client's KYC record — stands in for the
// .xlsx export in the Assetmax Export section, which only has Question-Ident
// mappings for 3 fields today.
exports.exportKycPdf = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.clientId });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (req.user.role === 'rm' && client.rm !== req.user.rmCode) {
      return res.status(403).json({ error: 'Not authorised for this client' });
    }
    if (req.user.role === 'client' && String(client.userId || '') !== String(req.user.id || '')) {
      return res.status(403).json({ error: 'Not authorised for this client' });
    }
    if (!['rm', 'client', 'compliance', 'compliance_external', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised for this client' });
    }

    const buffer = await buildKycSummaryPdf(client);
    res.setHeader('Content-Disposition', `attachment; filename="KYC_${client.clientId}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
