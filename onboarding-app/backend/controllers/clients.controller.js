const fs   = require('fs');
const path = require('path');
const Client = require('../models/Client');
const KycTask = require('../models/KycTask');
const KycCorrection = require('../models/KycCorrection');
const DocumentCorrection = require('../models/DocumentCorrection');
const Notification = require('../models/Notification');
const { notifyRm, notifyCompliance } = require('../services/notify.service');
const { isStaffRole } = require('../middleware/auth.middleware');
const { assertKycTypeChangeAllowed } = require('../services/kycTypeIntegrity.service');
const { effectiveKycStatus } = require('../services/kycTask.service');
const { checkContractRequirementsFile, checkIdDocumentStampFile, inferContractTemplateId } = require('../services/pdfChecker.service');
const { replacePdfPageRange, extractPdfPages } = require('../services/pdfPageSplice.service');
const { requirementsFor } = require('../config/contractRequirements');
const { withMandateProgress, mandateProgress } = require('../services/mandateProgress.service');
const fileStore = require('../services/fileStore.service');
const { validateKycSubmission, missingKycFieldDefinitions } = require('../config/kycRequiredFields');
const {
  mandateRiskFields: currentMandateRiskFields,
  missingFields: missingMandateRiskFields,
  refreshMandateRiskSchema,
} = require('../services/mandateRiskSchema.service');

// RM accounts only ever see clients assigned to their own Kundenberater code;
// compliance/compliance_external/admin retain full visibility. Fails closed —
// an RM account with no rmCode assigned sees nothing rather than everything.
const scopeFilterFor = (user) => (user.role === 'rm' ? { rm: user.rmCode || '__none__' } : {});
const canAccessClient = (client, user) => {
  if (!client || !user) return false;
  if (user.role === 'client') return String(client.userId || '') === String(user.id || '');
  if (user.role === 'rm') return Boolean(user.rmCode) && client.rm === user.rmCode;
  return isStaffRole(user.role);
};

// GET /api/clients
const getAllClients = async (req, res) => {
  // A client account has exactly one case of its own — GET /clients/me is the
  // real endpoint for that; this list endpoint is for staff only.
  if (req.user.role === 'client') {
    return res.status(403).json({ error: 'Use GET /clients/me for your own case' });
  }
  try {
    const clients = await Client.find(scopeFilterFor(req.user));
    res.status(200).json(clients.map(withMandateProgress));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/:id
const getClientById = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised to view this client' });
    res.status(200).json(withMandateProgress(client));
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
    // Somewhere obvious to look for this mandate's paperwork from the moment
    // the case exists, rather than only once the first file lands.
    fileStore.ensureClientArchiveDir(client.clientId);
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const existing = await Client.findOne({ clientId: req.params.id });
    if (existing && !canAccessClient(existing, req.user)) {
      return res.status(403).json({ error: 'Not authorised to update this client' });
    }
    const updates = { ...req.body };
    // An RM can never reassign a client to a different Kundenberater by
    // slipping `rm` into the update body — only compliance/admin can.
    if (req.user.role === 'rm') {
      delete updates.rm;
      delete updates.status;
      delete updates.progress;
    }
    if (req.user.role === 'client') {
      return res.status(403).json({ error: 'Clients cannot update a case through this endpoint' });
    }
    // KYC data is never edited through the generic client update — it only
    // ever changes via a completed KYC Task or a Corrections resubmission/
    // flag, so it stays a single tracked submission history, not a silent
    // free-text edit.
    delete updates.kyc;
    delete updates.kycSubmittedBy;
    delete updates.kycAwaitingVerification;
    delete updates.kycStatus;
    delete updates.kycSubmittedAt;
    delete updates.kycApprovedAt;
    delete updates.kycApprovedBy;
    delete updates.auditTrail;
    delete updates.documents;
    delete updates.clientId;
    delete updates.userId;

    if (existing && updates.status === 'approved' && effectiveKycStatus(existing) !== 'approved') {
      return res.status(409).json({
        error: 'KYC must be approved by Compliance before the case can be approved',
      });
    }

    if (existing && updates.type) {
      await assertKycTypeChangeAllowed(existing, updates.type);
    }

    if (!existing) return res.status(404).json({ error: 'Client not found' });
    const typePredicate = updates.type && updates.type !== existing.type
      ? {
          type: existing.type,
          kycSubmittedBy: { $exists: false },
          kycAwaitingVerification: { $ne: true },
          $or: [{ kyc: { $exists: false } }, { kyc: {} }],
        }
      : { type: existing.type };
    const client = await Client.findOneAndUpdate(
      { _id: existing._id, ...typePredicate },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!client) {
      return res.status(409).json({
        error: 'Client legal form cannot be changed after KYC data has been submitted. Create a separate case for the new legal form.',
      });
    }
    res.status(200).json(client);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    // Defence in depth for direct controller use: client accounts (and any
    // future/unknown role) must never delete a case, even when they know its
    // public CLT-* id. The route also applies staffOnly before reaching here.
    if (!isStaffRole(req.user?.role)) {
      return res.status(403).json({ error: 'Staff access required' });
    }

    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised to delete this client' });

    // MongoDB does not cascade references. Remove every workflow record that
    // belongs to this exact client before its public CLT-* id can ever be
    // reused, otherwise an old KYC task could attach to a different person.
    await Promise.all([
      KycTask.deleteMany({ $or: [
        { clientRef: client._id },
        { clientId: client.clientId, clientEmail: String(client.email || '').toLowerCase() },
      ] }),
      KycCorrection.deleteMany({ clientId: client.clientId }),
      DocumentCorrection.deleteMany({ clientId: client.clientId }),
      // Notifications are keyed by the same public CLT-* id, so they belong to
      // this list for exactly the reason above: left behind, they point a bell
      // at a client who no longer exists, and would read as belonging to the
      // new holder of a recycled id once one is issued.
      Notification.deleteMany({ clientId: client.clientId }),
      // The shared store is keyed by the same clientId prefix, so the files go
      // with the case rather than sitting in the database unreferenced.
      fileStore.deleteClientFiles(client.clientId).catch(() => 0),
      Client.db.collection('kyctaskmigrationarchives').deleteMany({ clientRef: client._id }),
      Client.db.collection('kycmigrationmanualreviews').deleteMany({ clientRef: client._id }),
    ]);
    await client.deleteOne();
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
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
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
    // Compliance's decision is news for the RM who has to act on it, not for
    // every other Kundenberater in the bank.
    await notifyRm(`Document approved: ${doc.name} (${client.name})`, 'success',
      { rmCode: client.rm, clientId: client.clientId, page: 'contract-prep' });
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clients/:id/documents/:docId/flag
// Manual Compliance review: record exactly what is wrong with a document and
// on which page, producing the same DocumentCorrection an automatic check
// used to produce — so the correction list, the download-this-page action and
// the corrected-page upload all behave identically either way.
const flagDocument = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    const doc = client.documents.find(d => d.docId === req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const issue = String(req.body.issue || '').trim();
    if (!issue) return res.status(400).json({ error: 'Describe what needs to be corrected' });
    const pageFrom = req.body.page ? Number.parseInt(req.body.page, 10) : null;
    if (req.body.page && (!Number.isInteger(pageFrom) || pageFrom < 1)) {
      return res.status(400).json({ error: 'Page must be a whole number' });
    }

    const templateId = inferContractTemplateId(doc.name);
    const spec = requirementsFor(templateId);
    const reviewer = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';

    const correction = await DocumentCorrection.create({
      clientId: client.clientId,
      docId: doc.docId,
      docName: doc.name,
      issue,
      page: pageFrom ? `Page ${pageFrom}` : undefined,
      pageFrom: pageFrom || undefined,
      pageTo: pageFrom || undefined,
      status: 'pending',
      templateId: templateId || undefined,
      contractType: spec?.label,
      documentType: spec?.documentType || doc.type,
      ruleId: 'manual-review',
      ruleKind: 'manual',
      remedy: pageFrom
        ? `Download page ${pageFrom}, make the correction, and upload the corrected page.`
        : 'Correct the document and upload the corrected version.',
      history: [{ action: 'flagged', actor: reviewer, detail: issue, validation: 'manual' }],
    });

    doc.status = 'info-requested';
    doc.missingNote = issue;
    client.auditTrail.push({
      action: `Document flagged by ${reviewer}: ${doc.name}${pageFrom ? ` (page ${pageFrom})` : ''}`,
      user: reviewer,
      time: new Date().toLocaleString(),
      type: 'requested',
    });
    await client.save();
    await notifyRm(`Document sent back: ${doc.name} (${client.name}) — ${issue}`, 'warning',
      { rmCode: client.rm, clientId: client.clientId, page: 'contract-prep' });
    res.status(200).json({ success: true, correction, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Re-runs the same automatic check regardless of who uploaded (RM,
// Compliance, or the client) or which upload widget they used — previously
// this only ever ran client-side, in the uploader's own browser, and several
// upload paths (notably anything Compliance touched) had no way to trigger
// it at all. Returns a human-readable note to store on the document (or null
// if nothing was flagged) and creates the matching DocumentCorrection rows.
// onlyPage narrows the Signed Contract check to a single page's regions —
// used by replaceDocumentPage, which only ever touched one page and must
// not re-report (and so re-flag/duplicate) issues on pages it left alone.
// Automatic signature/checkbox verification is currently switched off in
// favour of manual Compliance review: an uploaded document is simply marked
// as awaiting review, and Compliance accepts it or flags what is wrong. The
// detection pipeline (pdfChecker/contractRequirements) is left intact and
// fully tested — flip this back to true (or set DOCUMENT_AUTO_VERIFY=true)
// to re-enable it without any other change.
const AUTO_VERIFY_DOCUMENTS = process.env.DOCUMENT_AUTO_VERIFY === 'true';

async function runUploadChecks({ doc, type, templateId, expiryDate, mimeType, onlyPage, onlyRuleIds = null }) {
  if (!AUTO_VERIFY_DOCUMENTS) {
    // Nothing is auto-flagged; the document waits for a human decision.
    return { missingNote: '', pendingCorrections: [] };
  }
  const pendingCorrections = []; // [{ issue, page }]
  let missingNote = '';

  if (type === 'ID Document') {
    const issues = [];
    await fileStore.ensureLocalQuiet(doc.filePath);
    const hasStamp = await checkIdDocumentStampFile(doc.filePath, mimeType);
    if (hasStamp === false) {
      issues.push('Automatic check found no signature/stamp with date in the bottom-right corner — please re-upload a clearer scan.');
    }
    if (!expiryDate) {
      issues.push('No expiry date was entered for this ID/passport.');
    } else if (new Date(expiryDate) < new Date(new Date().toDateString())) {
      issues.push(`This document expired on ${expiryDate} — an expired passport or ID cannot be accepted.`);
    }
    if (issues.length) {
      missingNote = issues.join(' ');
      pendingCorrections.push({ issue: missingNote });
    }
  }

  if (type === 'Signed Contract') {
    const spec = requirementsFor(templateId);
    // Signature/checkbox detection works by rendering PDF pages — a Word file
    // (which is what the blank contract is handed out as) cannot be inspected
    // at all. Say so explicitly rather than reporting a vague "not available",
    // because the fix is entirely in the uploader's hands.
    const isPdf = (mimeType || '').includes('pdf') || /\.pdf$/i.test(doc.filePath || '');
    if (!isPdf) {
      missingNote = 'This upload is not a PDF, so signatures and checkboxes could not be checked.';
      pendingCorrections.push({
        issue: missingNote,
        templateId,
        contractType: spec?.label,
        documentType: spec?.documentType,
        ruleId: 'file-format',
        ruleKind: 'page-count',
        remedy: 'Open the completed contract, save or print it as a PDF, and upload the PDF here so the automatic check can run.',
      });
      return { missingNote, pendingCorrections };
    }

    await fileStore.ensureLocalQuiet(doc.filePath);
    const { supported, findings } = await checkContractRequirementsFile(doc.filePath, templateId, { onlyRuleIds });
    if (!supported) {
      missingNote = spec
        ? `Automatic checking isn't set up for ${spec.label} yet — please review this contract by hand.`
        : 'This contract type could not be identified, so it was not checked automatically — please review it by hand.';
      pendingCorrections.push({
        issue: missingNote,
        templateId,
        contractType: spec?.label,
        documentType: spec?.documentType,
        ruleId: 'manual-review',
        ruleKind: 'page-count',
        remedy: 'Confirm by hand that every signature, checkbox and required page is present.',
      });
    } else {
      // A rule scoped to one page keeps that page's number; a structural rule
      // (e.g. an incomplete package) has none, so the item renders at document
      // level rather than inventing a page reference.
      const failed = findings.filter((f) => !f.ok && (!onlyPage || f.page === onlyPage));
      if (failed.length) {
        missingNote = 'Automatic check found issues: ' + failed.map((f) => f.label).join('; ') + '.';
        for (const f of failed) {
          pendingCorrections.push({
            issue: `${f.label}: ${f.failureText}`,
            page: f.page ? `Page ${f.page}` : undefined,
            pageFrom: f.page || undefined,
            pageTo: f.page || undefined,
            templateId,
            contractType: spec?.label,
            documentType: spec?.documentType,
            ruleId: f.ruleId,
            ruleKind: f.kind,
            remedy: remedyFor(f),
          });
        }
      }
    }
  }

  return { missingNote, pendingCorrections };
}

// The instruction the reviewer acts on, kept distinct from the defect itself.
function remedyFor(finding) {
  if (finding.kind === 'page-count') {
    return 'Re-upload the complete signed contract package — the current file is missing pages.';
  }
  if (finding.kind === 'region') {
    return finding.failureText?.includes('more than one')
      ? `Download page ${finding.page}, leave only one option ticked, and upload the corrected page.`
      : `Download page ${finding.page}, complete the missing signature/selection, and upload the corrected page.`;
  }
  return 'Complete the missing item and upload the corrected document.';
}

// POST /api/clients/:id/documents/upload  (multipart, field name "file")
// Real file persistence for a client's document package, plus the automatic
// signature/checkbox check — run here, server-side, via Playwright
// (services/pdfChecker.service.js) so it fires the same way no matter who
// uploads or which page they used, instead of depending on the uploader's
// own browser having run it. If `docId` in the body matches an existing
// document (e.g. the "Contract Package" placeholder from buildDocEntries, or
// a document being corrected), this REPLACES that entry — the outgoing
// version is pushed onto its `versions` history first, never left to become
// an unrelated document. With no matching docId, a new document entry is
// created.
const uploadDocument = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const { docId, name, type, templateId, expiryDate } = req.body;
    // A contract uploaded under a generic type would otherwise skip validation
    // entirely and sit in "Other Documents" unchecked. If the file name (or an
    // explicit templateId) identifies it as one of the known contracts, treat
    // it as a contract regardless of the type the caller sent.
    const looksLikeContract = Boolean(templateId) || Boolean(inferContractTemplateId(name || req.file.originalname));
    const effectiveType = type === 'Uploaded Document' && looksLikeContract ? 'Signed Contract' : type;
    const uploadedBy = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';
    const sizeLabel = (req.file.size / 1024 / 1024).toFixed(1) + ' MB';
    const dateLabel = new Date().toISOString().slice(0, 10);

    const existingDoc = docId ? client.documents.find(d => d.docId === docId) : null;
    let doc = existingDoc;
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
      if (expiryDate) doc.expiryDate = expiryDate;
    } else {
      doc = {
        docId: 'DOC-' + Date.now(),
        clientId: client.clientId,
        name: name || req.file.originalname,
        type: effectiveType || 'Uploaded Document',
        status: 'pending',
        uploadedBy, date: dateLabel, size: sizeLabel,
        required: false, signedVersion: true,
        filePath: req.file.path,
        expiryDate: expiryDate || undefined,
      };
      client.documents.push(doc);
    }

    // Into the shared store as well, so the file exists for every user of this
    // database rather than only on the machine that received the upload.
    await fileStore.putFile(req.file.path);

    let missingNote = '';
    let pendingCorrections = [];
    try {
      const checkResult = await runUploadChecks({ doc, type: effectiveType, templateId: templateId || inferContractTemplateId(doc.name), expiryDate, mimeType: req.file.mimetype });
      missingNote = checkResult.missingNote;
      pendingCorrections = checkResult.pendingCorrections;
    } catch (checkErr) {
      console.error('⚠  Upload check failed, continuing without it:', checkErr.message);
    }
    if (missingNote) doc.missingNote = missingNote;

    client.auditTrail.push({
      action: `Document uploaded: ${doc.name}`,
      user: uploadedBy,
      time: new Date().toLocaleString(),
      type: 'uploaded',
    });
    await client.save();

    // Every re-upload of the same document slot re-runs validation from
    // scratch, so whatever was open against the PREVIOUS version of the file
    // is stale the moment a new one lands — close it out before any fresh
    // issues from this upload get flagged, so the correction list always
    // reflects only the current file's real problems, not an ever-growing pile.
    if (type === 'Signed Contract' && existingDoc) {
      await DocumentCorrection.updateMany(
        { clientId: client.clientId, docId: doc.docId, status: { $in: ['pending', 'resubmitted'] } },
        { $set: { status: 'corrected' } }
      );
    }
    for (const c of pendingCorrections) {
      await DocumentCorrection.create({
        clientId: client.clientId,
        docId: doc.docId,
        docName: doc.name,
        issue: c.issue,
        page: c.page,
        status: 'pending',
        templateId: c.templateId,
        contractType: c.contractType,
        documentType: c.documentType,
        ruleId: c.ruleId,
        ruleKind: c.ruleKind,
        pageFrom: c.pageFrom,
        pageTo: c.pageTo,
        remedy: c.remedy,
        history: [{ action: 'flagged', actor: uploadedBy, detail: c.issue, validation: 'failed' }],
      });
    }

    // A new file is something for Compliance to look at, and it is what moves
    // the mandate's completion figure — so the bell carries the new figure
    // rather than making them open the case to find out.
    const progressNow = mandateProgress(client);
    await notifyCompliance(
      `Document uploaded: ${doc.name} (${client.name}) — ${progressNow.completed} of ${progressNow.total} documents complete`,
      'info',
      { clientId: client.clientId, page: 'contract-prep' },
    );

    res.status(200).json({
      success: true,
      docId: doc.docId,
      client: withMandateProgress(client),
      documentProgress: progressNow,
      missingNote: missingNote || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clients/:id/documents/:docId/pages/:pageNum  (multipart, field "file")
// Fixes one flagged page of an already-uploaded Signed Contract without
// requiring a full re-upload — splices the uploaded replacement (a single
// page, PDF or image) into the existing PDF at that page number, leaving
// every other page untouched, then re-runs the same automatic check against
// the result. Only meaningful for a document that already has a base PDF to
// splice into and whose issue was tied to one specific page.
const replaceDocumentPage = async (req, res) => {
  let uploadedTempPath = null;
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    uploadedTempPath = req.file.path;

    const doc = client.documents.find((d) => d.docId === req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    // Pull it down from the shared store if this machine has never held it.
    await fileStore.ensureLocalQuiet(doc.filePath);
    if (!doc.filePath || !fs.existsSync(doc.filePath)) {
      return res.status(409).json({ error: 'This document has no existing file to splice a page into yet — upload the full document first' });
    }

    const pageNum = Number.parseInt(req.params.pageNum, 10);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'A valid page number is required' });
    }

    const templateId = req.body.templateId || inferContractTemplateId(doc.name);
    if (!templateId) {
      return res.status(409).json({ error: 'Could not determine which contract template this document uses — re-upload the full document instead' });
    }

    let splicedBuffer;
    try {
      splicedBuffer = await replacePdfPage(doc.filePath, pageNum, req.file.path, req.file.mimetype);
    } catch (spliceErr) {
      return res.status(spliceErr.status || 422).json({ error: spliceErr.message || 'Could not merge that page into the existing document' });
    }

    const splicedPath = path.join(path.dirname(doc.filePath), `${Date.now()}-page${pageNum}-fix${path.extname(doc.filePath) || '.pdf'}`);
    fs.writeFileSync(splicedPath, splicedBuffer);

    const uploadedBy = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';
    doc.versions.push({ filePath: doc.filePath, uploadedBy: doc.uploadedBy, date: doc.date, size: doc.size, status: doc.status });
    doc.filePath = splicedPath;
    await fileStore.putFile(splicedPath);
    doc.uploadedBy = uploadedBy;
    doc.date = new Date().toISOString().slice(0, 10);
    doc.size = (splicedBuffer.length / 1024 / 1024).toFixed(1) + ' MB';
    doc.status = 'pending';
    doc.missingNote = undefined;

    let pendingCorrections = [];
    try {
      const checkResult = await runUploadChecks({ doc, type: 'Signed Contract', templateId, expiryDate: null, mimeType: null, onlyPage: pageNum });
      pendingCorrections = checkResult.pendingCorrections;
    } catch (checkErr) {
      console.error('⚠  Upload check failed after page fix, continuing without it:', checkErr.message);
    }

    client.auditTrail.push({
      action: `Page ${pageNum} of "${doc.name}" replaced and re-checked`,
      user: uploadedBy,
      time: new Date().toLocaleString(),
      type: 'uploaded',
    });
    await client.save();

    // The fix targeted one page — only close out corrections tied to that
    // same page; a still-open issue elsewhere in the document must stay open,
    // and (since the re-check above was narrowed to just this page) must
    // never be re-created as a duplicate of itself.
    await DocumentCorrection.updateMany(
      { clientId: client.clientId, docId: doc.docId, page: `Page ${pageNum}`, status: { $in: ['pending', 'resubmitted'] } },
      { $set: { status: 'corrected' } }
    );
    for (const c of pendingCorrections) {
      await DocumentCorrection.create({
        clientId: client.clientId,
        docId: doc.docId,
        docName: doc.name,
        issue: c.issue,
        page: c.page,
        status: 'pending',
        templateId: c.templateId,
        contractType: c.contractType,
        documentType: c.documentType,
        ruleId: c.ruleId,
        ruleKind: c.ruleKind,
        pageFrom: c.pageFrom,
        pageTo: c.pageTo,
        remedy: c.remedy,
        history: [{ action: 'flagged', actor: uploadedBy, detail: c.issue, validation: 'failed' }],
      });
    }

    // The per-document inline note (shown in the Documents tab) reflects
    // everything still open on this doc, not just the page just fixed — a
    // real issue elsewhere must not silently disappear from view just
    // because this endpoint only touched one page.
    const stillOpen = await DocumentCorrection.find({
      clientId: client.clientId, docId: doc.docId, status: { $in: ['pending', 'resubmitted'] },
    });
    const missingNote = stillOpen.length
      ? `Automatic check found ${stillOpen.length} unresolved issue${stillOpen.length === 1 ? '' : 's'} — see Document Uploads for details.`
      : '';
    if (missingNote !== (doc.missingNote || '')) {
      doc.missingNote = missingNote || undefined;
      await client.save();
    }

    res.status(200).json({ success: true, docId: doc.docId, client, missingNote: missingNote || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // The uploaded replacement page is only ever an ingredient, not itself a
    // stored document — clean it up once it's been merged in.
    if (uploadedTempPath) fs.unlink(uploadedTempPath, () => {});
  }
};

// GET /api/clients/:id/documents/:docId/download — the client's own current
// file for this document slot (not the blank template — see contracts
// controller's downloadTemplate for that).
/* ============================================================
   CONTRACT PREPARATION (draft contracts)
   Blank generated contract  →  saved version (uploaded, re-uploadable)
   →  final submitted contract. Deliberately has no approve/reject
   actions: preparing a contract is document work, not a review step.
   Each stage is its own Client.documents entry, so the blank original,
   every saved generation and the final all survive independently and
   each keeps its own versions[] history.
   ============================================================ */
const DRAFT_TYPE = 'Draft Contract';
const FINAL_TYPE = 'Final Contract';

// Everything the Contract Preparation screen needs for one client, derived
// from the documents that already exist rather than a parallel store.
const getContractPreparation = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    const blank = client.documents.find((d) => d.type === 'Template');
    const draft = client.documents.find((d) => d.type === DRAFT_TYPE);
    const final = client.documents.find((d) => d.type === FINAL_TYPE);
    const templateId = blank ? inferContractTemplateId(blank.name) : null;
    // Count across every contract-bearing document, not just the draft: a
    // signed upload replaces the Template doc's file in place, so its issues
    // are filed against that docId and would otherwise be invisible here.
    const contractDocIds = [blank, draft, final].filter(Boolean).map((d) => d.docId);
    const openIssues = contractDocIds.length
      ? await DocumentCorrection.countDocuments({
          clientId: client.clientId,
          docId: { $in: contractDocIds },
          status: { $in: ['pending', 'resubmitted'] },
        })
      : 0;

    res.json({
      clientId: client.clientId,
      clientName: client.name,
      templateId,
      contractType: requirementsFor(templateId)?.label || null,
      blank: blank ? { docId: blank.docId, name: blank.name, hasFile: Boolean(blank.filePath) } : null,
      // A 'Signed Contract' upload replaces the Template doc's file in place
      // (the blank is kept in its versions[]), so the signed state lives on
      // that same entry rather than a separate document.
      signedStatus: blank ? (blank.status || 'pending') : null,
      signed: blank
        ? {
            docId: blank.docId,
            received: Boolean(blank.signedVersion),
            // Compliance's decision on the uploaded contract, so the UI can
            // tell "provided" apart from "checked and accepted".
            status: blank.status || 'pending',
            date: blank.signedVersion ? blank.date : null,
            uploadedBy: blank.signedVersion ? blank.uploadedBy : null,
            missingNote: blank.missingNote || null,
          }
        : null,
      draft: draft
        ? { docId: draft.docId, name: draft.name, date: draft.date, size: draft.size,
            uploadedBy: draft.uploadedBy, versionCount: draft.versions.length, missingNote: draft.missingNote }
        : null,
      final: final
        ? { docId: final.docId, name: final.name, date: final.date, size: final.size, uploadedBy: final.uploadedBy }
        : null,
      openIssues,
      // The same n-documents/1-each figure the dashboards show, so the card
      // header and the client's progress bar can never disagree.
      documentProgress: mandateProgress(client),
      mandateRisk: {
        status: (client.mandateRisk || {}).status || 'draft',
        missingCount: missingMandateRiskFields((client.mandateRisk || {}).answers || {}).length,
        prefilledCount: ((client.mandateRisk || {}).prefilledKeys || []).length,
      },
      // People the checklist requires their own KYC for.
      relatedParties: (client.relatedParties || []).map((p) => ({
        partyId: p.partyId,
        role: p.role,
        name: p.name || '',
        sourceDocument: p.sourceDocument,
        status: p.status,
        kyc: p.kyc || {},
        missingCount: missingKycFieldDefinitions(p.kyc || {}, client.type).length,
      })),
      // The gate for "Submit for Final Download": a saved version must exist
      // and carry no unresolved validation issues.
      // Submittable once *something* has been uploaded and nothing is
      // outstanding — either a saved draft or a signed version counts, since
      // both are "the filled-in contract" from the user's point of view.
      canSubmitFinal: Boolean(draft || blank?.signedVersion)
        && openIssues === 0
        && !draft?.missingNote
        && !blank?.missingNote,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upload (or replace) the saved version. Runs the identical validation the
// signed-contract path uses, so an incomplete draft surfaces in Corrections
// in exactly the same focused format.
const uploadContractDraft = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(415).json({ error: 'Unsupported file type — upload the saved contract as a PDF.' });
    }

    const blank = client.documents.find((d) => d.type === 'Template');
    const templateId = req.body.templateId || (blank ? inferContractTemplateId(blank.name) : null);
    const uploadedBy = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';
    const sizeLabel = (req.file.size / 1024 / 1024).toFixed(1) + ' MB';
    const dateLabel = new Date().toISOString().slice(0, 10);

    let draft = client.documents.find((d) => d.type === DRAFT_TYPE);
    if (draft) {
      // Replacing a saved version keeps the one it supersedes in history.
      if (draft.filePath) {
        draft.versions.push({ filePath: draft.filePath, uploadedBy: draft.uploadedBy, date: draft.date, size: draft.size, status: draft.status });
      }
      draft.filePath = req.file.path;
      await fileStore.putFile(req.file.path);
      draft.uploadedBy = uploadedBy;
      draft.date = dateLabel;
      draft.size = sizeLabel;
      draft.missingNote = undefined;
    } else {
      draft = {
        docId: 'DOC-' + Date.now(),
        clientId: client.clientId,
        name: `${requirementsFor(templateId)?.label || 'Contract'} — Saved Version`,
        type: DRAFT_TYPE,
        status: 'draft',
        uploadedBy, date: dateLabel, size: sizeLabel,
        required: false, signedVersion: false,
        filePath: req.file.path,
      };
      client.documents.push(draft);
      draft = client.documents[client.documents.length - 1];
    }

    // Prior issues belong to the version just replaced — close them before
    // re-validating so the list reflects only the current file.
    await DocumentCorrection.updateMany(
      { clientId: client.clientId, docId: draft.docId, status: { $in: ['pending', 'resubmitted'] } },
      { $set: { status: 'corrected' } }
    );

    let missingNote = '';
    let pendingCorrections = [];
    try {
      const result = await runUploadChecks({ doc: draft, type: 'Signed Contract', templateId, expiryDate: null, mimeType: req.file.mimetype });
      missingNote = result.missingNote;
      pendingCorrections = result.pendingCorrections;
    } catch (checkErr) {
      console.error('⚠  Draft contract check failed, continuing without it:', checkErr.message);
    }
    if (missingNote) draft.missingNote = missingNote;

    client.auditTrail.push({
      action: `Saved contract version uploaded${missingNote ? ' — incomplete, see Corrections' : ' — complete'}`,
      user: uploadedBy,
      time: new Date().toLocaleString(),
      type: 'uploaded',
    });
    await client.save();

    for (const c of pendingCorrections) {
      await DocumentCorrection.create({
        clientId: client.clientId, docId: draft.docId, docName: draft.name,
        issue: c.issue, page: c.page, status: 'pending',
        templateId: c.templateId, contractType: c.contractType, documentType: c.documentType,
        ruleId: c.ruleId, ruleKind: c.ruleKind, pageFrom: c.pageFrom, pageTo: c.pageTo, remedy: c.remedy,
        history: [{ action: 'flagged', actor: uploadedBy, detail: c.issue, validation: 'failed' }],
      });
    }

    res.json({ success: true, docId: draft.docId, complete: !missingNote, missingNote: missingNote || null, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Promote the saved version to the final contract. Only allowed once the
// required components validate clean — this is a completeness gate, not an
// approval step, so it carries no reviewer identity or accept/reject state.
const submitContractFinal = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    // The source is whichever filled-in contract exists: a saved draft, or
    // the contract document itself once a signed version has been uploaded
    // over it. Either is "the completed contract" as far as the user is
    // concerned, so both can be promoted to final.
    const blankDoc = client.documents.find((d) => d.type === 'Template');
    const draft = client.documents.find((d) => d.type === DRAFT_TYPE)
      || (blankDoc && blankDoc.signedVersion ? blankDoc : null);
    if (!draft || !draft.filePath) {
      return res.status(409).json({ error: 'Upload a completed version before submitting for final download.' });
    }
    await fileStore.ensureLocalQuiet(draft.filePath);
    if (!fs.existsSync(draft.filePath)) return res.status(409).json({ error: 'The uploaded version is missing on disk' });

    const openIssues = await DocumentCorrection.countDocuments({
      clientId: client.clientId, docId: draft.docId, status: { $in: ['pending', 'resubmitted'] },
    });
    if (openIssues > 0 || draft.missingNote) {
      return res.status(409).json({
        error: `This contract still has ${openIssues || 'unresolved'} outstanding item${openIssues === 1 ? '' : 's'} — resolve them in Corrections before submitting.`,
      });
    }

    const uploadedBy = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';
    // The final is its own file, copied from the saved version — the draft
    // and all of its history stay exactly as they are.
    const finalPath = path.join(path.dirname(draft.filePath), `${Date.now()}-final${path.extname(draft.filePath) || '.pdf'}`);
    fs.copyFileSync(draft.filePath, finalPath);
    await fileStore.putFile(finalPath);

    let final = client.documents.find((d) => d.type === FINAL_TYPE);
    if (final) {
      if (final.filePath) {
        final.versions.push({ filePath: final.filePath, uploadedBy: final.uploadedBy, date: final.date, size: final.size, status: final.status });
      }
      final.filePath = finalPath;
      final.uploadedBy = uploadedBy;
      final.date = new Date().toISOString().slice(0, 10);
      final.size = draft.size;
    } else {
      client.documents.push({
        docId: 'DOC-' + Date.now(),
        clientId: client.clientId,
        name: `${draft.name.replace(/ — Saved Version$/, '')} — Final Contract`,
        type: FINAL_TYPE,
        status: 'pending',
        uploadedBy,
        date: new Date().toISOString().slice(0, 10),
        size: draft.size,
        required: false, signedVersion: true,
        filePath: finalPath,
      });
    }

    client.auditTrail.push({
      action: 'Contract submitted for final download',
      user: uploadedBy,
      time: new Date().toLocaleString(),
      type: 'submitted',
    });
    await client.save();

    const created = client.documents.find((d) => d.type === FINAL_TYPE);
    await notifyCompliance(`Contract submitted for final download: ${client.name} (${client.clientId})`, 'success',
      { clientId: client.clientId, page: 'contract-prep' });
    res.json({ success: true, docId: created.docId, client: withMandateProgress(client) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   RELATED-PARTY KYC
   People connected to the mandate (settlor, trustee, protector, ...) whose
   own KYC the checklist requires. They use the same shared questionnaire as
   the client, so there is no second schema to keep in step.
   ============================================================ */

// PUT /api/clients/:id/related-parties/:partyId
// Saves a party's details and/or answers. `submit` promotes it to under
// review; Compliance approval is a separate explicit action.
const saveRelatedPartyKyc = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    const party = (client.relatedParties || []).find((p) => p.partyId === req.params.partyId);
    if (!party) return res.status(404).json({ error: 'Related party not found' });

    const { name, answers, submit, approve } = req.body;
    const actor = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';

    if (typeof name === 'string') party.name = name.trim();
    if (answers && typeof answers === 'object') {
      // Validate against the same canonical schema the client's KYC uses, so
      // a party can never store a value the questionnaire would reject.
      const { values, errors } = validateKycSubmission(answers, client.type, { includeEmpty: true });
      if (errors.length) return res.status(400).json({ error: 'Invalid KYC field values', details: errors });
      party.kyc = { ...(party.kyc || {}), ...values };
    }

    if (approve) {
      if (!isStaffRole(req.user.role) || req.user.role === 'rm') {
        return res.status(403).json({ error: 'Only Compliance can approve a related-party KYC' });
      }
      party.status = 'approved';
      party.approvedAt = new Date();
      party.approvedBy = String(req.user.email || req.user.name || 'Compliance');
    } else if (submit) {
      const missing = missingKycFieldDefinitions(party.kyc, client.type).map((f) => f.key);
      if (missing.length) {
        return res.status(409).json({
          error: `Complete every field for the ${party.role} before submitting`,
          details: { missingFields: missing },
        });
      }
      party.status = 'under_review';
      party.submittedBy = actor;
      party.submittedAt = new Date();
    }

    client.auditTrail.push({
      action: `${party.role} KYC ${approve ? 'approved' : submit ? 'submitted for review' : 'saved'}${party.name ? ` — ${party.name}` : ''}`,
      user: actor,
      time: new Date().toLocaleString(),
      type: approve ? 'approved' : submit ? 'submitted' : 'uploaded',
    });
    await client.save();
    res.json({ success: true, party, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET/PUT /api/clients/:id/mandate-risk — the Fragebogen zum Mandatsrisiko.
const getMandateRisk = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    // The questionnaire is editable, so read the current schema rather than a
    // list cached before the last edit.
    await refreshMandateRiskSchema();
    const risk = client.mandateRisk || {};
    res.json({
      clientId: client.clientId,
      clientName: client.name,
      fields: currentMandateRiskFields(),
      answers: risk.answers || {},
      prefilledKeys: risk.prefilledKeys || [],
      // Compliance's per-question decisions, so the questionnaire can be
      // reviewed in place the same way the KYC is.
      reviews: risk.reviews || {},
      status: risk.status || 'draft',
      missingCount: missingMandateRiskFields(risk.answers || {}).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const saveMandateRisk = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    const { answers, submit, approve } = req.body;
    const actor = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';
    const risk = client.mandateRisk || { answers: {}, prefilledKeys: [] };
    // Read before the merge below: the guards below judge the state that was
    // stored, not the state this request is trying to create.
    const previousStatus = risk.status || 'draft';
    await refreshMandateRiskSchema();
    const defs = currentMandateRiskFields();
    const allowedKeys = new Set(defs.map((f) => f.key));
    const complianceOnly = new Set(defs.filter((f) => f.complianceOnly).map((f) => f.key));

    if (answers && typeof answers === 'object') {
      const next = { ...(risk.answers || {}) };
      for (const [key, value] of Object.entries(answers)) {
        if (!allowedKeys.has(key)) continue;
        // Section 7 (Compliance & Geschäftsleitung) is part of the same sheet
        // the RM completes and hands over, so the RM fills it in too —
        // Compliance confirms or sends it back on review like every other
        // answer. Only the client portal stays out of it: nothing an outside
        // party types belongs under a Compliance visa.
        if (complianceOnly.has(key) && !isStaffRole(req.user.role)) continue;
        next[key] = typeof value === 'string' ? value.trim() : String(value ?? '');
      }
      risk.answers = next;
    }

    if (approve) {
      if (req.user.role === 'rm' || !isStaffRole(req.user.role)) {
        return res.status(403).json({ error: 'Only Compliance can approve the mandate-risk questionnaire' });
      }
      // Approval works the way the KYC's does: it confirms a questionnaire
      // that was handed over and is complete. Signing off a draft, or one with
      // unanswered mandatory questions, would put a Compliance name against
      // something nobody submitted.
      if (previousStatus !== 'under_review') {
        return res.status(409).json({
          error: previousStatus === 'approved'
            ? 'This mandate-risk questionnaire has already been approved'
            : 'The mandate-risk questionnaire has not been submitted for review yet',
        });
      }
      const unanswered = missingMandateRiskFields(risk.answers || {});
      if (unanswered.length) {
        return res.status(409).json({
          error: 'Every mandatory question must be answered before approval',
          details: { missingFields: unanswered.map((f) => f.key) },
        });
      }
      risk.status = 'approved';
      risk.approvedAt = new Date();
      risk.approvedBy = String(req.user.email || req.user.name || 'Compliance');
    } else if (submit) {
      const missing = missingMandateRiskFields(risk.answers || {});
      if (missing.length) {
        return res.status(409).json({
          error: 'Complete every mandatory question before submitting',
          details: { missingFields: missing.map((f) => f.key) },
        });
      }
      risk.status = 'under_review';
      risk.submittedBy = actor;
      risk.submittedAt = new Date();
    } else {
      risk.status = risk.status === 'approved' ? 'approved' : 'saved';
    }

    client.mandateRisk = risk;
    client.auditTrail.push({
      action: `Mandate-risk questionnaire ${approve ? 'approved' : submit ? 'submitted for review' : 'saved'}`,
      user: actor,
      time: new Date().toLocaleString(),
      type: approve ? 'approved' : submit ? 'submitted' : 'uploaded',
    });
    await client.save();

    // Submitting or approving hands the questionnaire over, which is the point
    // it becomes a document of the mandate. Never fatal — a failed sheet must
    // not lose an answer that has already been recorded.
    if (submit || approve) {
      try {
        const { writeMandateRiskExcelDocument } = require('../services/kycHandover.service');
        await writeMandateRiskExcelDocument(client._id, actor);
      } catch (err) {
        console.error('⚠  Could not write the mandate-risk export document:', err.message);
      }
    }

    // A handover is the moment somebody else has work to do, so it is the
    // moment worth telling them about. A plain save is not — it would bury the
    // bell under every keystroke of a questionnaire nobody has finished.
    if (submit) {
      await notifyCompliance(`Mandate risk submitted for review: ${client.name} (${client.clientId})`, 'info',
        { clientId: client.clientId, page: 'kyc-tasks' });
    } else if (approve) {
      await notifyRm(`Mandate risk approved by Compliance: ${client.name} (${client.clientId})`, 'success',
        { rmCode: client.rm, clientId: client.clientId, page: 'kyc-tasks' });
    }

    const fresh = await Client.findById(client._id);
    res.json({
      success: true,
      status: risk.status,
      missingCount: missingMandateRiskFields(risk.answers || {}).length,
      client: withMandateProgress(fresh || client),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });
    const doc = client.documents.find(d => d.docId === req.params.docId);
    if (!doc || !doc.filePath) return res.status(404).json({ error: 'No file has been uploaded for this document yet' });
    // The file may have been uploaded from another machine — fetch it from the
    // shared store before deciding it is missing.
    await fileStore.ensureLocalQuiet(doc.filePath);
    if (!fs.existsSync(doc.filePath)) return res.status(404).json({ error: 'File is missing on disk' });

    // Record that it left the system. An approved document that has been
    // downloaded is finished business, and its copy in the database can be
    // released once the archive holds it — see scripts/purgeSettledFiles.js.
    doc.downloadedAt = new Date();
    doc.downloadedBy = req.user.role === 'rm' ? 'RM' : req.user.role === 'client' ? 'Client' : 'Compliance';
    client.save().catch((err) => console.warn('Could not record the download:', err.message));

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
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    for (const d of client.documents) await fileStore.ensureLocalQuiet(d.filePath);
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

// POST /api/clients/:id/mandate-risk/review — Compliance's decision on one
// question of a submitted mandate-risk questionnaire. This is the mandate-risk
// equivalent of flagging or confirming a single KYC field: tick what is right,
// send back only what is wrong, with the reason attached.
const reviewMandateRiskField = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    const risk = client.mandateRisk || {};
    if ((risk.status || 'draft') !== 'under_review') {
      return res.status(409).json({ error: 'Only a submitted questionnaire can be reviewed' });
    }

    await refreshMandateRiskSchema();
    const { fieldKey, action, reason } = req.body || {};
    const field = currentMandateRiskFields().find((f) => f.key === fieldKey);
    if (!field) return res.status(400).json({ error: 'Unknown mandate-risk question' });
    if (!['approve', 'flag'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "flag"' });
    }
    if (action === 'flag' && !String(reason || '').trim()) {
      return res.status(400).json({ error: 'Describe what needs to be corrected' });
    }

    const actor = String(req.user.email || req.user.name || 'Compliance');
    const reviews = { ...(risk.reviews || {}) };
    const answers = { ...(risk.answers || {}) };

    if (action === 'approve') {
      reviews[fieldKey] = { status: 'approved', by: actor, at: new Date() };
    } else {
      reviews[fieldKey] = { status: 'flagged', reason: String(reason).trim(), by: actor, at: new Date() };
      // Same as a flagged KYC field: the answer is cleared so it has to be
      // genuinely re-entered rather than resubmitted unchanged, and the
      // questionnaire goes back to the RM.
      answers[fieldKey] = '';
    }

    const anyFlagged = Object.values(reviews).some((r) => r && r.status === 'flagged');
    client.mandateRisk = {
      ...risk,
      answers,
      reviews,
      status: anyFlagged ? 'saved' : risk.status,
    };
    client.auditTrail.push({
      action: action === 'approve'
        ? `Mandate-risk question "${field.label}" confirmed by Compliance`
        : `Mandate-risk question "${field.label}" sent back: ${String(reason).trim()}`,
      user: actor,
      time: new Date().toLocaleString(),
      type: action === 'approve' ? 'approved' : 'requested',
    });
    await client.save();
    // Sending a question back puts the questionnaire on the RM's desk again,
    // which they have no other way of finding out about.
    if (action === 'flag') {
      await notifyRm(`Mandate risk sent back — "${field.label}" (${client.name}): ${String(reason).trim()}`, 'warning',
        { rmCode: client.rm, clientId: client.clientId, page: 'kyc-tasks' });
    }
    res.json({ success: true, reviews, status: client.mandateRisk.status, client: withMandateProgress(client) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clients/:id/validate-contracts — Compliance signs off the contract
// paperwork as a whole. Contract Tasks is deliberately a download-and-upload
// screen with no approve action on it, so this is where a human states that the
// contracts are correct: the last gate before a mandate can leave the system.
const validateContracts = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    // Signing off paperwork that isn't there would make the record say
    // something untrue, so an outstanding requirement blocks this.
    const outstanding = (client.documents || []).filter((d) => d.required && !d.filePath);
    if (outstanding.length) {
      return res.status(409).json({
        error: `${outstanding.length} required document${outstanding.length === 1 ? ' is' : 's are'} still missing`,
        details: outstanding.map((d) => d.name),
      });
    }

    const actor = String(req.user.email || req.user.name || 'Compliance');
    let validated = 0;
    for (const doc of client.documents) {
      if (!doc.filePath || doc.status === 'approved') continue;
      doc.status = 'approved';
      validated += 1;
    }
    client.auditTrail.push({
      action: `Contracts validated by Compliance (${validated} document${validated === 1 ? '' : 's'})`,
      user: actor,
      time: new Date().toLocaleString(),
      type: 'approved',
    });
    await client.save();
    res.json({ success: true, validated, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/:id/kyc-export — the completed KYC as a .xlsx, built fresh
// from the current answers. Available once the questionnaire has actually been
// handed over: exporting a half-filled draft as a finished sheet would
// misrepresent what the client has stated.
const downloadKycExcel = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    const status = effectiveKycStatus(client);
    if (!['under_review', 'approved'].includes(status)) {
      return res.status(409).json({
        error: 'The KYC has not been submitted yet — it can be exported once it is with Compliance.',
      });
    }

    const { buildKycXlsx } = require('../services/mandateExport.service');
    const { buffer, fileName } = buildKycXlsx(client);
    client.auditTrail.push({
      action: 'KYC exported to Excel',
      user: String(req.user.email || req.user.name || 'Compliance'),
      time: new Date().toLocaleString(),
      type: 'approved',
    });
    await client.save();

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/:id/export — the whole mandate as one .zip: the KYC sheet,
// the Mandatsrisiko sheet, and every document file on the case. This is what
// gets handed to the external system, so it is recorded in the audit trail.
const downloadMandateExport = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!canAccessClient(client, req.user)) return res.status(403).json({ error: 'Not authorised for this client' });

    await refreshMandateRiskSchema();
    // buildMandatePackage reads each document straight off the disk, so every
    // file has to be present locally before it runs.
    for (const d of (client.documents || [])) await fileStore.ensureLocalQuiet(d.filePath);
    const { buildMandatePackage } = require('../services/mandateExport.service');
    const { buffer, fileName, fileCount } = buildMandatePackage(client, currentMandateRiskFields());

    const actor = String(req.user.email || req.user.name || 'Compliance');
    client.auditTrail.push({
      action: `Mandate exported (KYC + Mandatsrisiko sheets and ${fileCount} document${fileCount === 1 ? '' : 's'})`,
      user: actor,
      time: new Date().toLocaleString(),
      type: 'approved',
    });
    client.exportedAt = new Date();
    client.exportedBy = actor;

    // The export is the mandate leaving the system as a finished package, so
    // this is the point its files stop needing to be in the database. Each one
    // is written to the archive and read back byte for byte before its copy
    // here is dropped; anything that cannot be verified is kept. Downloads
    // still work afterwards — they fall back to the archive.
    const release = await fileStore.releaseClientFiles(client);
    if (release.released) {
      client.filesReleasedAt = new Date();
      client.auditTrail.push({
        action: `${release.released} file(s) archived and released from the database (${(release.bytes / 1048576).toFixed(2)} MB)`,
        user: actor,
        time: new Date().toLocaleString(),
        type: 'uploaded',
      });
    }
    if (release.kept.length) {
      console.warn(`⚠  ${release.kept.length} file(s) kept in the database — no verified archive copy:`);
      release.kept.forEach((k) => console.warn('   ', k));
    }
    await client.save();

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
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
    res.status(200).json(withMandateProgress(client));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllClients, getClientById, getMyClient, createClient, updateClient, deleteClient,
  approveDocument, flagDocument, uploadDocument, replaceDocumentPage, downloadDocument, downloadFullPackage,
  getContractPreparation, uploadContractDraft, submitContractFinal, saveRelatedPartyKyc, getMandateRisk, saveMandateRisk,
  downloadMandateExport, downloadKycExcel, validateContracts, reviewMandateRiskField,
};
