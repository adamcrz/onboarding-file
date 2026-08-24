// Everything one mandate has to hand over, as a single .zip: the KYC answers
// and the Fragebogen zum Mandatsrisiko as .xlsx sheets, plus every document
// file on the case. One download instead of three separate ones that have to be
// collected by hand and can drift out of step with each other.
const fs   = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { buildMinimalXlsx } = require('./kycExport.service');
const { REQUIRED_KYC_FIELDS } = require('../config/kycRequiredFields');

const val = (v) => (v === undefined || v === null ? '' : String(v));

// One row per canonical KYC field, in the questionnaire's own order, so the
// sheet reads the same way the form does.
function buildKycRows(client) {
  const fields = REQUIRED_KYC_FIELDS[client.type] || [];
  const kyc = client.kyc || {};
  const rows = [
    ['KYC — ' + val(client.name)],
    ['Client Id', val(client.clientId), 'Legal form', val(client.type), 'Kundenberater', val(client.rm)],
    ['Status', val(client.kycStatus || ''), 'Submitted', val(client.kycSubmittedAt || ''), 'Approved', val(client.kycApprovedAt || '')],
    [],
    ['Section', 'Field', 'Answer'],
  ];
  fields.forEach((f) => rows.push([val(f.page), val(f.label), val(kyc[f.key])]));
  return rows;
}

// The mandate-risk questionnaire as it currently stands — the caller passes the
// live schema so an added or retired question is reflected here too. Prefilled
// answers are marked, because "carried over from the KYC" and "typed by the RM"
// are not the same statement.
function buildMandateRiskRows(client, fields) {
  const risk = client.mandateRisk || {};
  const answers = risk.answers || {};
  const prefilled = new Set(risk.prefilledKeys || []);
  const rows = [
    ['Fragebogen zum Mandatsrisiko — ' + val(client.name)],
    ['Client Id', val(client.clientId), 'Status', val(risk.status || 'draft'), 'Risk rating', val(client.risk)],
    ['Submitted by', val(risk.submittedBy || ''), 'Submitted', val(risk.submittedAt || ''), 'Approved', val(risk.approvedAt || '')],
    [],
    ['No.', 'Section', 'Question', 'Answer', 'Source', 'Feeds risk rating'],
  ];
  fields.forEach((f) => rows.push([
    val(f.no),
    val(f.page),
    val(f.label).replace(/^\s*\S+\)\s*/, ''),
    val(answers[f.key]),
    prefilled.has(f.key) ? 'Pre-filled from KYC/contract' : answers[f.key] ? 'Entered' : '',
    f.affectsRisk ? 'Yes' : '',
  ]));
  return rows;
}

// name -> a filename that is safe in a zip entry on every platform.
const safeName = (name) => String(name || 'document')
  .replace(/[\\/:*?"<>|]+/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 120);

function buildMandatePackage(client, mandateRiskFields = []) {
  const zip = new PizZip();
  const base = `${client.clientId}_${safeName(client.name)}`;

  zip.file(`${base}_KYC.xlsx`, buildMinimalXlsx(buildKycRows(client)));
  zip.file(`${base}_Mandatsrisiko.xlsx`, buildMinimalXlsx(buildMandateRiskRows(client, mandateRiskFields)));

  // The KYC and Mandatsrisiko sheets are written fresh above and also exist as
  // documents on the case. Including both copies would ship the same sheet
  // twice under two different names — and the pair in Documents/ could be older
  // than the pair at the root.
  const GENERATED = new Set(['KYC Questionnaire', 'Fragebogen zum Mandatsrisiko']);

  const used = new Set();
  let fileCount = 0;
  (client.documents || []).forEach((d) => {
    if (GENERATED.has(d.name)) return;
    if (!d.filePath || !fs.existsSync(d.filePath)) return;
    let entry = `Documents/${safeName(d.name)}${path.extname(d.filePath)}`;
    let n = 2;
    while (used.has(entry)) {
      entry = `Documents/${safeName(d.name)} (${n++})${path.extname(d.filePath)}`;
    }
    used.add(entry);
    zip.file(entry, fs.readFileSync(d.filePath));
    fileCount += 1;
  });

  return {
    buffer: zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }),
    fileName: `${base}_Export.zip`,
    fileCount,
  };
}

// The completed KYC on its own, as a .xlsx — what Compliance receives when the
// questionnaire is handed over for review, and what ends up in the client's
// folder beside the mandate-risk sheet.
function buildKycXlsx(client) {
  return {
    buffer: buildMinimalXlsx(buildKycRows(client)),
    fileName: `${client.clientId}_${safeName(client.name)}_KYC.xlsx`,
  };
}

module.exports = { buildMandatePackage, buildKycRows, buildMandateRiskRows, buildKycXlsx, safeName };
