const KycCorrection      = require('../models/KycCorrection');
const DocumentCorrection = require('../models/DocumentCorrection');
const Client             = require('../models/Client');
const { notify }         = require('../services/notify.service');
const { REQUIRED_KYC_FIELDS } = require('../config/kycRequiredFields');
const { submitKycFields, flagFieldIncorrect, refreshVerificationFlag } = require('../services/kycGapCheck.service');

const isComplianceRole = (role) => role === 'compliance' || role === 'compliance_external' || role === 'admin';

// Corrections only carry a `clientId` string, not an RM/user link, so
// visibility for a scoped role is derived by first resolving which clients
// are theirs: an RM's own book, or a client's own single case.
const ownClientIdsFor = async (user) => {
  if (user.role === 'client') {
    const own = await Client.findOne({ userId: user.id }).select('clientId');
    return own ? [own.clientId] : [];
  }
  const clients = await Client.find({ rm: user.rmCode || '__none__' }).select('clientId');
  return clients.map(c => c.clientId);
};
const needsScoping = (role) => role === 'rm' || role === 'client';

exports.listKycCorrections = async (req, res) => {
  try {
    const filter = {};
    if (needsScoping(req.user.role)) filter.clientId = { $in: await ownClientIdsFor(req.user) };
    const items = await KycCorrection.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Compliance-only: confirm a resubmitted field as correct, or reject it (or
// any already-resolved field) back into 'needs_correction'. RMs/clients never
// flip a correction's status directly — they only ever provide the actual
// field value, via resubmitKycSection below, which drives the status itself.
exports.updateKycCorrectionStatus = async (req, res) => {
  const { status } = req.body;
  if (!['needs_correction', 'corrected'].includes(status)) {
    return res.status(400).json({ error: 'status must be "needs_correction" or "corrected"' });
  }
  if (!isComplianceRole(req.user.role)) {
    return res.status(403).json({ error: 'Only Compliance can confirm or reject a KYC correction' });
  }
  try {
    const item = await KycCorrection.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'KYC correction not found' });

    const client = await Client.findOne({ clientId: item.clientId });

    if (status === 'needs_correction' && client && item.fieldKey) {
      client.kyc = { ...(client.kyc || {}), [item.fieldKey]: '' };
      client.kycAwaitingVerification = true;
    }

    item.status = status;
    item.everFilled = true;
    await item.save();

    if (client) {
      client.auditTrail.push({
        action: `KYC field "${item.issue}" marked ${status === 'corrected' ? 'corrected' : 'needs correction'}`,
        user: 'Compliance',
        time: new Date().toLocaleString(),
        type: status === 'corrected' ? 'approved' : 'requested',
      });
      await client.save();
      if (status === 'corrected') await refreshVerificationFlag(client);
    }

    await notify(`KYC correction "${item.issue}" marked ${status}`, status === 'corrected' ? 'success' : 'info');

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// RM/Compliance/client fills in every empty (pending or needs_correction)
// field for one page and resubmits it as a unit. The values land in the same
// shared client.kyc record; whether that closes the correction outright or
// hands it to Compliance for verification depends on who's submitting.
exports.resubmitKycSection = async (req, res) => {
  const { clientId, values } = req.body;
  if (!clientId || !values || typeof values !== 'object' || !Object.keys(values).length) {
    return res.status(400).json({ error: 'clientId and at least one field value are required' });
  }
  try {
    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (req.user.role === 'rm' && client.rm !== req.user.rmCode) {
      return res.status(403).json({ error: 'Not authorised for this client' });
    }
    if (req.user.role === 'client' && String(client.userId) !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised for this client' });
    }

    const fields = REQUIRED_KYC_FIELDS[client.type] || [];
    const validKeys = new Set(fields.map(f => f.key));
    const filteredValues = {};
    for (const [k, v] of Object.entries(values)) {
      if (validKeys.has(k)) filteredValues[k] = v;
    }

    const submittedBy = req.user.role === 'rm' ? 'rm' : isComplianceRole(req.user.role) ? 'compliance' : 'client';
    client.kyc = { ...(client.kyc || {}), ...filteredValues };
    client.kycSubmittedBy = submittedBy;
    client.kycAwaitingVerification = submittedBy !== 'compliance';
    client.auditTrail.push({
      action: `KYC section resubmitted (${Object.keys(filteredValues).length} field${Object.keys(filteredValues).length === 1 ? '' : 's'})`,
      user: submittedBy === 'rm' ? (client.rm || 'RM') : submittedBy === 'compliance' ? 'Compliance' : client.name,
      time: new Date().toLocaleString(),
      type: 'submitted',
    });
    await client.save();
    await submitKycFields(client, Object.keys(filteredValues), submittedBy);

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Compliance-only: flag an already-filled (and possibly already-corrected)
// field as wrong even though nothing detected it as missing — clears the
// value and reopens it as 'needs_correction' rather than a first-time gap.
exports.flagKycField = async (req, res) => {
  const { clientId, fieldKey } = req.body;
  if (!clientId || !fieldKey) {
    return res.status(400).json({ error: 'clientId and fieldKey are required' });
  }
  if (!isComplianceRole(req.user.role)) {
    return res.status(403).json({ error: 'Only Compliance can flag a KYC field as incorrect' });
  }
  try {
    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const correction = await flagFieldIncorrect(client, fieldKey);
    if (!correction) return res.status(400).json({ error: 'Unknown field for this client type' });

    client.kycAwaitingVerification = true;
    client.auditTrail.push({
      action: `KYC field "${correction.issue}" flagged incorrect by Compliance`,
      user: 'Compliance',
      time: new Date().toLocaleString(),
      type: 'requested',
    });
    await client.save();

    res.json(correction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listDocumentCorrections = async (req, res) => {
  try {
    const filter = {};
    if (needsScoping(req.user.role)) filter.clientId = { $in: await ownClientIdsFor(req.user) };
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
