const KycCorrection      = require('../models/KycCorrection');
const DocumentCorrection = require('../models/DocumentCorrection');
const Client             = require('../models/Client');
const { notify }         = require('../services/notify.service');

// Corrections only carry a `clientId` string, not an RM link, so an RM's
// visibility is derived by first resolving which clients are theirs.
const ownClientIdsFor = async (user) => {
  const clients = await Client.find({ rm: user.rmCode || '__none__' }).select('clientId');
  return clients.map(c => c.clientId);
};

exports.listKycCorrections = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'rm') filter.clientId = { $in: await ownClientIdsFor(req.user) };
    const items = await KycCorrection.find(filter).sort({ createdAt: -1 });
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
    if (req.user.role === 'rm') {
      const owningClient = await Client.findOne({ clientId: item.clientId });
      if (!owningClient || owningClient.rm !== req.user.rmCode) {
        return res.status(403).json({ error: 'Not authorised for this correction' });
      }
    }

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

exports.listDocumentCorrections = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'rm') filter.clientId = { $in: await ownClientIdsFor(req.user) };
    const items = await DocumentCorrection.find(filter).sort({ createdAt: -1 });
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
    if (req.user.role === 'rm') {
      const owningClient = await Client.findOne({ clientId: item.clientId });
      if (!owningClient || owningClient.rm !== req.user.rmCode) {
        return res.status(403).json({ error: 'Not authorised for this correction' });
      }
    }

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
