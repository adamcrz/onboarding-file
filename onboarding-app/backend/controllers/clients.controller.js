const fs   = require('fs');
const path = require('path');
const Client = require('../models/Client');
const { notify } = require('../services/notify.service');

// RM accounts only ever see clients assigned to their own Kundenberater code;
// compliance/compliance_external/admin retain full visibility. Fails closed —
// an RM account with no rmCode assigned sees nothing rather than everything.
const scopeFilterFor = (user) => (user.role === 'rm' ? { rm: user.rmCode || '__none__' } : {});
const isOwnedByRm    = (client, user) => user.role !== 'rm' || client.rm === user.rmCode;

// GET /api/clients
const getAllClients = async (req, res) => {
  // A client account has exactly one case of its own — GET /clients/me is the
  // real endpoint for that; this list endpoint is for staff only.
  if (req.user.role === 'client') {
    return res.status(403).json({ error: 'Use GET /clients/me for your own case' });
  }
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
  // No gap-check here — nothing should read as "missing" until the client's
  // first real KYC submission (see completeKycTask / resubmitKycSection).
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
    // KYC data is never edited through the generic client update — it only
    // ever changes via a completed KYC Task or a Corrections resubmission/
    // flag, so it stays a single tracked submission history, not a silent
    // free-text edit.
    delete updates.kyc;
    delete updates.kycSubmittedBy;
    delete updates.kycAwaitingVerification;

    const client = await Client.findOneAndUpdate(
      { clientId: req.params.id },
      updates,
      { new: true, upsert: true }
    );
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

// POST /api/clients/:id/documents/upload  (multipart, field name "file")
// Real file persistence for a client's document package — the counterpart to
// the client-side signature/checkbox detection in simulateUpload(), which
// only ever validated the file in-browser and discarded the bytes. If
// `docId` in the body matches an existing document (e.g. the "Contract
// Package" placeholder from buildDocEntries, or a document being corrected),
// this REPLACES that entry — the outgoing version is pushed onto its
// `versions` history first, never left to become an unrelated document. With
// no matching docId, a new document entry is created.
const uploadDocument = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isOwnedByRm(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const { docId, name, type } = req.body;
    const uploadedBy = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';
    const sizeLabel = (req.file.size / 1024 / 1024).toFixed(1) + ' MB';
    const dateLabel = new Date().toISOString().slice(0, 10);

    let doc = docId ? client.documents.find(d => d.docId === docId) : null;
    if (doc) {
      if (doc.filePath) {
        doc.versions.push({ filePath: doc.filePath, uploadedBy: doc.uploadedBy, date: doc.date, size: doc.size, status: doc.status });
      }
      doc.filePath = req.file.path;
      doc.uploadedBy = uploadedBy;
      doc.date = dateLabel;
      doc.size = sizeLabel;
      doc.signedVersion = true;
      doc.status = 'pending';
      doc.missingNote = undefined;
    } else {
      doc = {
        docId: 'DOC-' + Date.now(),
        clientId: client.clientId,
        name: name || req.file.originalname,
        type: type || 'Uploaded Document',
        status: 'pending',
        uploadedBy, date: dateLabel, size: sizeLabel,
        required: false, signedVersion: true,
        filePath: req.file.path,
      };
      client.documents.push(doc);
    }

    client.auditTrail.push({
      action: `Document uploaded: ${doc.name}`,
      user: uploadedBy,
      time: new Date().toLocaleString(),
      type: 'uploaded',
    });
    await client.save();
    res.status(200).json({ success: true, docId: doc.docId, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/:id/documents/:docId/download — the client's own current
// file for this document slot (not the blank template — see contracts
// controller's downloadTemplate for that).
const downloadDocument = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isOwnedByRm(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    const doc = client.documents.find(d => d.docId === req.params.docId);
    if (!doc || !doc.filePath) return res.status(404).json({ error: 'No file has been uploaded for this document yet' });
    if (!fs.existsSync(doc.filePath)) return res.status(404).json({ error: 'File is missing on disk' });

    res.download(doc.filePath, `${doc.name}${path.extname(doc.filePath)}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/:id/documents/package — every currently-uploaded document
// for this client, bundled into one zip. Reuses PizZip (already a dependency
// for the docx/xlsx work) rather than adding a new archiving library.
const downloadFullPackage = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isOwnedByRm(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    const filesToZip = client.documents.filter(d => d.filePath && fs.existsSync(d.filePath));
    if (!filesToZip.length) return res.status(404).json({ error: 'No uploaded documents to package yet' });

    const PizZip = require('pizzip');
    const zip = new PizZip();
    const usedNames = new Set();
    filesToZip.forEach(d => {
      let entryName = `${d.name}${path.extname(d.filePath)}`;
      let n = 2;
      while (usedNames.has(entryName)) entryName = `${d.name} (${n++})${path.extname(d.filePath)}`;
      usedNames.add(entryName);
      zip.file(entryName, fs.readFileSync(d.filePath));
    });

    const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Disposition', `attachment; filename="${client.clientId}_Full_Package.zip"`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(buffer);
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
  approveDocument, requestDocumentInfo, uploadDocument, downloadDocument, downloadFullPackage,
};
