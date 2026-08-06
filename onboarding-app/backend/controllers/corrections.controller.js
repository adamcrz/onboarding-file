const KycCorrection      = require('../models/KycCorrection');
const DocumentCorrection = require('../models/DocumentCorrection');
const Client             = require('../models/Client');
const { notify }         = require('../services/notify.service');

exports.listKycCorrections = async (_req, res) => {
  try {
    const items = await KycCorrection.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateKycCorrectionStatus = async (req, res) => {
  const { status } = req.body;
  if (!['resubmitted', 'corrected'].includes(status)) {
    return res.status(400).json({ error: 'status must be "resubmitted" or "corrected"' });
  }
  try {
    const item = await KycCorrection.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'KYC correction not found' });

    item.status = status;
    await item.save();

    const client = await Client.findOne({ clientId: item.clientId });
    if (client) {
      client.auditTrail.push({
        action: `KYC correction "${item.issue}" marked ${status}`,
        user: status === 'corrected' ? 'Compliance' : 'RM',
        time: new Date().toLocaleString(),
        type: status === 'corrected' ? 'approved' : 'submitted',
      });
      await client.save();
    }

    await notify(`KYC correction "${item.issue}" marked ${status}`, status === 'corrected' ? 'success' : 'info');

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listDocumentCorrections = async (_req, res) => {
  try {
    const items = await DocumentCorrection.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Called automatically by upload-time validation (missing signature stamp,
// failed checkbox/initials check) as well as manual flags.
exports.createDocumentCorrection = async (req, res) => {
  const { clientId, docName, issue } = req.body;
  if (!clientId || !docName || !issue) {
    return res.status(400).json({ error: 'clientId, docName and issue are required' });
  }
  try {
    const item = await DocumentCorrection.create({ clientId, docName, issue, status: 'pending' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDocumentCorrectionStatus = async (req, res) => {
  const { status } = req.body;
  if (!['resubmitted', 'corrected'].includes(status)) {
    return res.status(400).json({ error: 'status must be "resubmitted" or "corrected"' });
  }
  try {
    const item = await DocumentCorrection.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Document correction not found' });

    item.status = status;
    await item.save();

    const client = await Client.findOne({ clientId: item.clientId });
    if (client) {
      client.auditTrail.push({
        action: `Document correction "${item.docName}" marked ${status}`,
        user: status === 'corrected' ? 'Compliance' : 'RM',
        time: new Date().toLocaleString(),
        type: status === 'corrected' ? 'approved' : 'submitted',
      });
      await client.save();
    }

    await notify(`Document correction "${item.docName}" marked ${status}`, status === 'corrected' ? 'success' : 'info');

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
