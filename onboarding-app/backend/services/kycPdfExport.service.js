// Generates a one-page-per-section PDF summary of a single client's KYC
// record, using the same obligatory-field/page structure the app's gap-check
// and Corrections views are built on — a stand-in export while the .xlsx path
// to the external system only has Question-Ident mappings for 3 fields
// (see kycExport.service.js).
const PDFDocument = require('pdfkit');
const { REQUIRED_KYC_FIELDS } = require('../config/kycRequiredFields');

function buildKycSummaryPdf(client) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.fontSize(18).font('Helvetica-Bold').text('KYC Summary', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica').fillColor('#555555')
    .text(`${client.name}  ·  ${client.type || '—'}  ·  Case ${client.clientId}`);
  doc.text(`Generated ${new Date().toLocaleString()}`);
  doc.fillColor('#000000');
  doc.moveDown(1);

  const fields = REQUIRED_KYC_FIELDS[client.type] || [];
  const kyc = client.kyc || {};

  const pages = [];
  const pageIndex = new Map();
  fields.forEach((f) => {
    if (!pageIndex.has(f.page)) { pageIndex.set(f.page, pages.length); pages.push({ page: f.page, fields: [] }); }
    pages[pageIndex.get(f.page)].fields.push(f);
  });

  pages.forEach(({ page, fields: pageFields }) => {
    if (doc.y > 700) doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text(page);
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.4);

    pageFields.forEach((f) => {
      const value = String(kyc[f.key] || '').trim();
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(f.label.toUpperCase());
      doc.fontSize(11).font('Helvetica').fillColor(value ? '#0f172a' : '#94a3b8')
        .text(value || 'Not provided');
      doc.moveDown(0.5);
      if (doc.y > 740) doc.addPage();
    });
    doc.moveDown(0.6);
  });

  doc.end();
  return done;
}

module.exports = { buildKycSummaryPdf };
