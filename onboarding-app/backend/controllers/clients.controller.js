const Client = require('../models/Client');
const { notify } = require('../services/notify.service');
const { syncKycCorrectionsForClient } = require('../services/kycGapCheck.service');

// RM accounts only ever see clients assigned to their own Kundenberater code;
// compliance/compliance_external/admin retain full visibility. Fails closed —
// an RM account with no rmCode assigned sees nothing rather than everything.
const scopeFilterFor = (user) => (user.role === 'rm' ? { rm: user.rmCode || '__none__' } : {});
const isOwnedByRm    = (client, user) => user.role !== 'rm' || client.rm === user.rmCode;

// GET /api/clients
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find(scopeFilterFor(req.user));
    res.status(200).json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/:id
const getClientById = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isOwnedByRm(client, req.user)) return res.status(403).json({ error: 'Not authorised to view this client' });
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clients
const createClient = async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const existing = await Client.findOne({ clientId: req.params.id });
    if (existing && !isOwnedByRm(existing, req.user)) {
      return res.status(403).json({ error: 'Not authorised to update this client' });
    }
    const updates = { ...req.body };
    // An RM can never reassign a client to a different Kundenberater by
    // slipping `rm` into the update body — only compliance/admin can.
    if (req.user.role === 'rm') delete updates.rm;

    const client = await Client.findOneAndUpdate(
      { clientId: req.params.id },
      updates,
      { new: true, upsert: true }
    );
    if (client) await syncKycCorrectionsForClient(client);
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    await Client.findOneAndDelete({ clientId: req.params.id });
    res.status(200).json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clients/:id/documents/:docId/approve
const approveDocument = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isOwnedByRm(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    const doc = client.documents.find(d => d.docId === req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    doc.status = 'approved';
    client.auditTrail.push({
      action: `Document approved: ${doc.name}`,
      user: 'Compliance',
      time: new Date().toLocaleString(),
      type: 'approved',
    });
    await client.save();
    await notify(`Document approved: ${doc.name} (${client.name})`, 'success');
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clients/:id/documents/:docId/request-info
const requestDocumentInfo = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isOwnedByRm(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    const doc = client.documents.find(d => d.docId === req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    doc.status = 'info-requested';
    client.auditTrail.push({
      action: `Additional information requested for: ${doc.name}`,
      user: 'Compliance',
      time: new Date().toLocaleString(),
      type: 'requested',
    });
    await client.save();
    await notify(`Additional information requested: ${doc.name} (${client.name})`, 'warning');
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/me  (protected — returns the logged-in client's own profile)
const getMyClient = async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.user.id });
    if (!client) return res.status(404).json({ error: 'Client profile not found' });
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllClients, getClientById, getMyClient, createClient, updateClient, deleteClient,
  approveDocument, requestDocumentInfo,
};
