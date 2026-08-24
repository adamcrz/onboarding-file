const fs   = require('fs');
const path = require('path');
const Client = require('../models/Client');
const { buildKycXlsx } = require('./mandateExport.service');

// The KYC document of the client folder: written the moment the questionnaire
// is handed to Compliance, so the reviewer opens a finished sheet rather than
// reading answers off a screen, and the file exists in the record instead of
// being generated ad hoc each time someone asks for it.
//
// It is one document that gets replaced, not a new one per submission — a
// resubmission after a correction supersedes the previous sheet, with the old
// file preserved in versions[] like every other document here.
const KYC_DOCUMENT_NAME = 'KYC Questionnaire';
const { UPLOADS_ROOT } = require('../config/paths');
const fileStore = require('./fileStore.service');

async function writeKycExcelDocument(clientOrId, actor = 'System') {
  const id = clientOrId?._id || clientOrId;
  const client = await Client.findById(id);
  if (!client) return null;

  const { buffer, fileName } = buildKycXlsx(client);
  const dir = path.join(UPLOADS_ROOT, client.clientId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${fileName}`);
  fs.writeFileSync(filePath, buffer);
  // Generated sheets are documents of the mandate like any other, so they
  // belong in the shared store too.
  await fileStore.putFile(filePath, buffer,
    { clientId: client.clientId, clientName: client.name, docName: KYC_DOCUMENT_NAME });

  const existing = client.documents.find((d) => d.name === KYC_DOCUMENT_NAME);
  const today = new Date().toISOString().slice(0, 10);
  const size = `${(buffer.length / 1024).toFixed(0)} KB`;

  if (existing) {
    if (existing.filePath) {
      existing.versions.push({
        filePath: existing.filePath,
        uploadedBy: existing.uploadedBy,
        date: existing.date,
        size: existing.size,
        status: existing.status,
      });
    }
    existing.filePath = filePath;
    existing.uploadedBy = actor;
    existing.date = today;
    existing.size = size;
    existing.status = 'pending';
  } else {
    client.documents.push({
      docId: `DOC-${Date.now()}-kyc`,
      clientId: client.clientId,
      name: KYC_DOCUMENT_NAME,
      type: 'KYC',
      status: 'pending',
      uploadedBy: actor,
      date: today,
      size,
      required: true,
      filePath,
    });
  }

  client.auditTrail.push({
    action: 'KYC export (.xlsx) generated for Compliance review',
    user: actor,
    time: new Date().toLocaleString(),
    type: 'submitted',
  });
  await client.save();
  return client.documents.find((d) => d.name === KYC_DOCUMENT_NAME) || null;
}

// The mandate-risk equivalent. Its checklist entry is a questionnaire answered
// inside the app, not a file anyone uploads — so without this it would sit as a
// permanently outstanding "required document" and no mandate could ever be
// validated for export. Submitting it produces the sheet that fills the slot.
async function writeMandateRiskExcelDocument(clientOrId, actor = 'System') {
  const id = clientOrId?._id || clientOrId;
  const client = await Client.findById(id);
  if (!client) return null;

  const { refreshMandateRiskSchema, mandateRiskFields } = require('./mandateRiskSchema.service');
  const { buildMandateRiskRows, safeName } = require('./mandateExport.service');
  const { buildMinimalXlsx } = require('./kycExport.service');
  await refreshMandateRiskSchema();

  const buffer = buildMinimalXlsx(buildMandateRiskRows(client, mandateRiskFields()));
  const dir = path.join(UPLOADS_ROOT, client.clientId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${client.clientId}_${safeName(client.name)}_Mandatsrisiko.xlsx`);
  fs.writeFileSync(filePath, buffer);
  // Generated sheets are documents of the mandate like any other, so they
  // belong in the shared store too.
  await fileStore.putFile(filePath, buffer,
    { clientId: client.clientId, clientName: client.name, docName: MANDATE_RISK_DOCUMENT_NAME });

  const doc = client.documents.find((d) => d.name === MANDATE_RISK_DOCUMENT_NAME);
  const today = new Date().toISOString().slice(0, 10);
  const size = `${(buffer.length / 1024).toFixed(0)} KB`;

  if (doc) {
    if (doc.filePath) {
      doc.versions.push({ filePath: doc.filePath, uploadedBy: doc.uploadedBy, date: doc.date, size: doc.size, status: doc.status });
    }
    doc.filePath = filePath;
    doc.uploadedBy = actor;
    doc.date = today;
    doc.size = size;
    doc.status = 'pending';
  } else {
    client.documents.push({
      docId: `DOC-${Date.now()}-riskdoc`,
      clientId: client.clientId,
      name: MANDATE_RISK_DOCUMENT_NAME,
      type: 'Compliance',
      status: 'pending',
      uploadedBy: actor,
      date: today,
      size,
      required: true,
      filePath,
    });
  }
  await client.save();
  return doc || null;
}

const MANDATE_RISK_DOCUMENT_NAME = 'Fragebogen zum Mandatsrisiko';

module.exports = {
  writeKycExcelDocument,
  writeMandateRiskExcelDocument,
  KYC_DOCUMENT_NAME,
  MANDATE_RISK_DOCUMENT_NAME,
};
