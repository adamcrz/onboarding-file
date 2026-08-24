const fs = require('fs');
const Client = require('../models/Client');
const fileStore = require('./fileStore.service');
const { convertWordToPdf, isWordFile } = require('./docxToPdf.service');

// Turns a Word document that has just been uploaded into the PDF the rest of
// the app can work with a page at a time.
//
// The page-level correction loop is the reason: Compliance writes "page 2", the
// RM downloads page 2, corrects it and uploads it, and it is spliced back in.
// None of that is possible on a .docx — Word has no fixed pages, and a
// corrected PDF page cannot be put back into one. Converting on upload is what
// makes the page number somebody typed mean something afterwards.
//
// Runs after the response has gone out. Word takes ten to fifteen seconds on a
// long contract, which is far too long to hold an upload open for, and the
// upload is complete and correct without it — the conversion only adds an
// ability, it does not make the document valid.
//
// The Word file is kept as a version. It is the editable original and the thing
// the client actually signed; the PDF is a rendition of it, not a replacement.

async function convertUploadedWordToPdf(clientId, docId) {
  try {
    const client = await Client.findOne({ clientId });
    if (!client) return null;
    const doc = (client.documents || []).find((d) => d.docId === docId);
    if (!doc || !doc.filePath || !isWordFile(doc.filePath)) return null;

    // The file may have been uploaded on another machine.
    await fileStore.ensureLocalQuiet(doc.filePath);
    if (!fs.existsSync(doc.filePath)) return null;

    const pdfPath = await convertWordToPdf(doc.filePath);
    if (!pdfPath) return null;   // no converter here — the document stays Word

    // Re-read: the upload may have been superseded while Word was working, and
    // overwriting a newer file with a rendition of an older one would lose it.
    const fresh = await Client.findOne({ clientId });
    const freshDoc = (fresh?.documents || []).find((d) => d.docId === docId);
    if (!freshDoc || freshDoc.filePath !== doc.filePath) {
      fs.rmSync(pdfPath, { force: true });
      return null;
    }

    freshDoc.versions.push({
      filePath: freshDoc.filePath,
      uploadedBy: freshDoc.uploadedBy,
      date: freshDoc.date,
      size: freshDoc.size,
      status: freshDoc.status,
    });
    freshDoc.filePath = pdfPath;
    freshDoc.size = (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(1) + ' MB';

    await fileStore.putFile(pdfPath, null, {
      clientId: fresh.clientId,
      clientName: fresh.name,
      docName: freshDoc.name,
      signed: Boolean(freshDoc.signedVersion),
      approved: freshDoc.status === 'approved',
    });

    fresh.auditTrail.push({
      action: `Converted "${freshDoc.name}" to PDF so it can be corrected page by page — the Word file is kept as a version`,
      user: 'System',
      time: new Date().toLocaleString(),
      type: 'uploaded',
    });
    await fresh.save();

    console.log(`📄  ${clientId}: converted "${freshDoc.name}" to PDF for page-level corrections`);
    return pdfPath;
  } catch (err) {
    // Never fatal. The document is already uploaded and usable; this only
    // decides whether its pages can be worked with individually.
    console.warn('⚠  Could not create a PDF rendition:', err.message);
    return null;
  }
}

// Fire and forget, so an upload response is never held open for Word.
function queuePdfRendition(clientId, docId) {
  setImmediate(() => { convertUploadedWordToPdf(clientId, docId).catch(() => {}); });
}

module.exports = { convertUploadedWordToPdf, queuePdfRendition };
