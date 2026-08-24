const fs = require('fs');
const os = require('os');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const PDFKitDocument = require('pdfkit');

// Wraps a single image (jpg/png) into a one-page PDF so it can be spliced
// into an existing PDF the same way a re-scanned page would be. Reuses
// pdfkit — already a dependency for contract generation — instead of
// pulling in a second PDF-writing library just for this.
function imageToOnePagePdf(imagePath) {
  return new Promise((resolve, reject) => {
    const tmpPath = path.join(os.tmpdir(), `page-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    const doc = new PDFKitDocument({ autoFirstPage: false });
    const out = fs.createWriteStream(tmpPath);
    doc.pipe(out);
    try {
      const { width, height } = doc.openImage(imagePath);
      doc.addPage({ size: [width, height] });
      doc.image(imagePath, 0, 0, { width, height });
    } catch (err) {
      reject(err);
      return;
    }
    doc.end();
    out.on('finish', () => resolve(tmpPath));
    out.on('error', reject);
  });
}

// Replaces a single page (1-indexed) inside an existing PDF with the first
// page of an uploaded replacement file (PDF or image), and returns the
// resulting document as a Buffer. Everything else in the original file — every
// other page, the pages before and after — is left untouched; only the one
// flagged page changes.
async function replacePdfPage(originalPath, pageNumber, replacementPath, replacementMimeType) {
  const originalBytes = fs.readFileSync(originalPath);
  const originalDoc = await PDFDocument.load(originalBytes);
  const pageCount = originalDoc.getPageCount();
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
    const err = new Error(`Page ${pageNumber} does not exist in this document (it has ${pageCount} pages).`);
    err.status = 400;
    throw err;
  }

  let replacementPdfPath = replacementPath;
  let tmpImagePdf = null;
  if (/^image\//.test(replacementMimeType || '')) {
    tmpImagePdf = await imageToOnePagePdf(replacementPath);
    replacementPdfPath = tmpImagePdf;
  }

  try {
    const replacementBytes = fs.readFileSync(replacementPdfPath);
    const replacementDoc = await PDFDocument.load(replacementBytes);
    // Only the replacement's first page is used — the uploader is expected to
    // submit just the one corrected page, not a full re-scan.
    const [copiedPage] = await originalDoc.copyPages(replacementDoc, [0]);
    originalDoc.removePage(pageNumber - 1);
    originalDoc.insertPage(pageNumber - 1, copiedPage);
    return Buffer.from(await originalDoc.save());
  } finally {
    if (tmpImagePdf) fs.unlink(tmpImagePdf, () => {});
  }
}

// Extracts an inclusive page range as its own PDF, for the "download only the
// part that needs fixing" step. Whole pages are copied verbatim — never
// cropped to the flagged region — so every signature box, checkbox, label and
// surrounding instruction the signer needs stays intact.
async function extractPdfPages(originalPath, fromPage, toPage) {
  const originalDoc = await PDFDocument.load(fs.readFileSync(originalPath));
  const pageCount = originalDoc.getPageCount();
  const start = Math.max(1, fromPage);
  const end = Math.min(pageCount, toPage ?? fromPage);
  if (!Number.isInteger(start) || start > pageCount || end < start) {
    const err = new Error(`Page range ${fromPage}-${toPage ?? fromPage} is not valid for this document (it has ${pageCount} pages).`);
    err.status = 400;
    throw err;
  }

  const out = await PDFDocument.create();
  const indices = [];
  for (let p = start; p <= end; p++) indices.push(p - 1);
  const copied = await out.copyPages(originalDoc, indices);
  copied.forEach((page) => out.addPage(page));
  return { buffer: Buffer.from(await out.save()), from: start, to: end, totalPages: pageCount };
}

// Replaces an inclusive range in one operation. The single-page case is by far
// the common one, but a rule whose remedy spans facing pages needs the range
// swapped atomically or the page order drifts partway through.
async function replacePdfPageRange(originalPath, fromPage, toPage, replacementPath, replacementMimeType) {
  const from = fromPage;
  const to = toPage ?? fromPage;
  if (to === from) {
    return replacePdfPage(originalPath, from, replacementPath, replacementMimeType);
  }

  const originalDoc = await PDFDocument.load(fs.readFileSync(originalPath));
  const pageCount = originalDoc.getPageCount();
  if (from < 1 || to > pageCount || to < from) {
    const err = new Error(`Page range ${from}-${to} does not exist in this document (it has ${pageCount} pages).`);
    err.status = 400;
    throw err;
  }

  let replacementPdfPath = replacementPath;
  let tmpImagePdf = null;
  if (/^image\//.test(replacementMimeType || '')) {
    tmpImagePdf = await imageToOnePagePdf(replacementPath);
    replacementPdfPath = tmpImagePdf;
  }

  try {
    const replacementDoc = await PDFDocument.load(fs.readFileSync(replacementPdfPath));
    const expected = to - from + 1;
    if (replacementDoc.getPageCount() !== expected) {
      const err = new Error(`This correction covers ${expected} pages, but the uploaded file has ${replacementDoc.getPageCount()}. Upload exactly the pages you downloaded.`);
      err.status = 400;
      throw err;
    }
    const copied = await originalDoc.copyPages(replacementDoc, replacementDoc.getPageIndices());
    // Remove back-to-front so earlier indices stay valid, then insert in
    // order at the original start position — page order is preserved and no
    // page is ever appended to the end or duplicated.
    for (let p = to; p >= from; p--) originalDoc.removePage(p - 1);
    copied.forEach((page, i) => originalDoc.insertPage(from - 1 + i, page));
    return Buffer.from(await originalDoc.save());
  } finally {
    if (tmpImagePdf) fs.unlink(tmpImagePdf, () => {});
  }
}

module.exports = { replacePdfPage, replacePdfPageRange, extractPdfPages };
