const fs = require('fs');
const CONTRACT_VALIDATION_MAPS = require('../config/contractValidationMaps');
const { requirementsFor } = require('../config/contractRequirements');

// Runs the signature/checkbox check for uploaded documents in a real headless
// browser (Playwright + Chromium) instead of relying on the uploader's own
// browser to run it client-side. It reuses the exact same pdf.js build the
// app ships (via frontend/pdf-checker.html) and the same ink-density
// heuristic that used to live in frontend/app.js — only where it now runs,
// and who it runs for (previously only the client's own "Upload Signed
// Docs" page reliably triggered it; now every upload path does, RM and
// Compliance included), has changed.
//
// One browser instance is launched lazily and kept open for the life of the
// process — a fresh browser per upload would be needlessly slow. If the
// browser can't be launched at all (e.g. no Chromium installed in this
// environment), checks degrade to "unsupported" rather than failing the
// upload itself — a missing automatic check should never block a real
// document from being received.
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    const { chromium } = require('playwright');
    browserPromise = chromium.launch({ headless: true }).catch((err) => {
      browserPromise = null; // allow a later call to retry
      throw err;
    });
  }
  return browserPromise;
}

function checkerHarnessUrl() {
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}/pdf-checker.html`;
}

async function withCheckerPage(fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(checkerHarnessUrl(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.pdfjsLib), null, { timeout: 10_000 });
    return await fn(page);
  } finally {
    await page.close();
  }
}

async function readPageCount(page, base64) {
  return page.evaluate(async ({ base64 }) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const pdfDoc = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    return pdfDoc.numPages;
  }, { base64 });
}

// Renders each requested PDF page once and returns the ink ratio (0..1) for
// every box on it, in the same order as `boxes`. Runs inside the headless
// page — everything referenced here must be self-contained (no closures over
// outer scope), since Playwright serializes this function to execute in-page.
async function renderPageInkRatios(page, base64, pageNum, boxes) {
  return page.evaluate(async ({ base64, pageNum, boxes }) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const pdfDoc = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    if (pageNum > pdfDoc.numPages) return null;

    const pdfPage = await pdfDoc.getPage(pageNum);
    const viewport = pdfPage.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;

    return boxes.map((box) => {
      const x0 = Math.max(0, Math.floor(box.x0 * canvas.width));
      const y0 = Math.max(0, Math.floor(box.y0 * canvas.height));
      const x1 = Math.min(canvas.width, Math.ceil(box.x1 * canvas.width));
      const y1 = Math.min(canvas.height, Math.ceil(box.y1 * canvas.height));
      const w = x1 - x0, h = y1 - y0;
      if (w <= 0 || h <= 0) return 0;
      const data = ctx.getImageData(x0, y0, w, h).data;
      let ink = 0;
      const total = w * h;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness < 190) ink++; // darker than plain paper background
      }
      return ink / total;
    });
  }, { base64, pageNum, boxes });
}

// Bottom-right-corner ink check for an image (jpg/png), same region a real
// wet-signed scan's stamp/signature/date normally lands in.
async function renderImageInkRatio(page, base64, mimeType) {
  return page.evaluate(async ({ base64, mimeType }) => {
    const img = new Image();
    const loaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src = `data:${mimeType};base64,${base64}`;
    await loaded;

    const w = img.naturalWidth, h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const rx = Math.floor(w * 0.72), ry = Math.floor(h * 0.78);
    const rw = w - rx, rh = h - ry;
    if (rw <= 0 || rh <= 0) return 0;
    const data = ctx.getImageData(rx, ry, rw, rh).data;
    let ink = 0;
    const total = rw * rh;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness < 190) ink++;
    }
    return ink / total;
  }, { base64, mimeType });
}

function regionOk(rule, tickedCount) {
  if (rule === 'at-least-one') return tickedCount >= 1;
  if (rule === 'at-most-one') return tickedCount <= 1;
  return tickedCount >= 1; // 'ink-present' — single box, same test
}

function regionFailureReason(result, region) {
  if (result.reason === 'page not found in upload') {
    return 'expected page not found in the uploaded PDF — please re-upload the complete package.';
  }
  if (region?.rule === 'at-most-one') return 'more than one option is ticked — only one should be selected.';
  return 'no option appears to be ticked.';
}

// Validates an uploaded signed contract PDF against the template's mapped
// regions. Returns { supported, results: [{id, label, ok, reason, page}] }.
async function checkContractPdf(fileBuffer, templateId) {
  const map = CONTRACT_VALIDATION_MAPS[templateId];
  if (!map) return { supported: false, results: [] };

  const base64 = fileBuffer.toString('base64');
  try {
    return await withCheckerPage(async (page) => {
      const results = [];
      for (const region of map.regions) {
        const ratios = await renderPageInkRatios(page, base64, region.page, region.boxes);
        if (!ratios) {
          const result = { id: region.id, label: region.label, ok: false, reason: 'page not found in upload', page: region.page };
          results.push({ ...result, failureText: regionFailureReason(result, region) });
          continue;
        }
        const tickedCount = ratios.filter((r) => r > 0.15).length;
        const ok = regionOk(region.rule, tickedCount);
        const result = { id: region.id, label: region.label, ok, page: region.page };
        results.push({ ...result, failureText: ok ? null : regionFailureReason(result, region) });
      }
      return { supported: true, results };
    });
  } catch (err) {
    console.error('⚠  PDF checker failed, treating as unsupported:', err.message);
    return { supported: false, results: [] };
  }
}

// Generic requirement evaluator — walks a template's declarative rule list
// (config/contractRequirements.js) instead of assuming every rule is a
// coordinate region, so a template with no mapped coordinates still gets its
// structural rules enforced. `onlyRuleIds` narrows the pass to specific rules,
// which is what the single-page correction flow uses so re-checking one fixed
// page can't re-report (and so duplicate) issues elsewhere in the document.
async function checkContractRequirements(fileBuffer, templateId, { onlyRuleIds = null } = {}) {
  const spec = requirementsFor(templateId);
  if (!spec) return { supported: false, findings: [], pageCount: null, hasRegionCoverage: false };

  const rules = onlyRuleIds
    ? spec.rules.filter((r) => onlyRuleIds.includes(r.id))
    : spec.rules;
  const base64 = fileBuffer.toString('base64');

  try {
    return await withCheckerPage(async (page) => {
      const pageCount = await readPageCount(page, base64);
      const findings = [];

      for (const rule of rules) {
        if (rule.kind === 'page-count') {
          const ok = pageCount >= rule.minPages;
          findings.push({
            ruleId: rule.id,
            kind: rule.kind,
            label: rule.label,
            page: null,
            ok,
            failureText: ok
              ? null
              : `the uploaded file has ${pageCount} page${pageCount === 1 ? '' : 's'} but this contract needs at least ${rule.minPages} — please upload the complete package.`,
          });
          continue;
        }

        if (rule.kind === 'region') {
          const ratios = await renderPageInkRatios(page, base64, rule.page, rule.boxes);
          if (!ratios) {
            findings.push({
              ruleId: rule.id,
              kind: rule.kind,
              label: rule.label,
              page: rule.page,
              ok: false,
              failureText: 'expected page not found in the uploaded PDF — please re-upload the complete package.',
            });
            continue;
          }
          const tickedCount = ratios.filter((r) => r > 0.15).length;
          const ok = regionOk(rule.rule, tickedCount);
          findings.push({
            ruleId: rule.id,
            kind: rule.kind,
            label: rule.label,
            page: rule.page,
            ok,
            tickedCount,
            failureText: ok
              ? null
              : rule.rule === 'at-most-one'
                ? 'more than one option is ticked — only one should be selected.'
                : 'no option appears to be ticked.',
          });
        }
      }

      return { supported: true, findings, pageCount, hasRegionCoverage: spec.hasRegionCoverage };
    });
  } catch (err) {
    console.error('⚠  Contract requirement check failed, treating as unsupported:', err.message);
    return { supported: false, findings: [], pageCount: null, hasRegionCoverage: false };
  }
}

async function checkContractRequirementsFile(filePath, templateId, options) {
  return checkContractRequirements(fs.readFileSync(filePath), templateId, options);
}

// Bottom-right stamp/signature check for an ID document. Supports both
// images (as before) and now PDFs too (page 1) — the old client-side check
// could never render a PDF at all, so every PDF ID upload was silently
// "unable to verify"; running in a real headless browser removes that gap.
async function checkIdDocumentStamp(fileBuffer, mimeType) {
  const base64 = fileBuffer.toString('base64');
  try {
    return await withCheckerPage(async (page) => {
      if (mimeType === 'application/pdf') {
        const ratios = await renderPageInkRatios(page, base64, 1, [{ x0: 0.72, y0: 0.78, x1: 1, y1: 1 }]);
        if (!ratios) return false;
        return ratios[0] > 0.015;
      }
      if (/^image\//.test(mimeType)) {
        const ratio = await renderImageInkRatio(page, base64, mimeType);
        return ratio > 0.015;
      }
      return null; // unsupported file type — treated as "unable to verify", not a failure
    });
  } catch (err) {
    console.error('⚠  ID stamp checker failed, treating as unable to verify:', err.message);
    return null;
  }
}

async function checkContractPdfFile(filePath, templateId) {
  return checkContractPdf(fs.readFileSync(filePath), templateId);
}

async function checkIdDocumentStampFile(filePath, mimeType) {
  return checkIdDocumentStamp(fs.readFileSync(filePath), mimeType);
}

// Same substring match the frontend's inferContractTemplateId uses (kept in
// sync manually — the frontend only needs the label list, not this
// function, since it never has to re-run the check itself anymore).
// buildDocEntries names a Contract Package document "<template label> —
// Contract Package" on the backend, so the label is always a substring.
function inferContractTemplateId(docName) {
  const name = docName || '';
  const entry = Object.entries(CONTRACT_VALIDATION_MAPS).find(([, map]) => {
    if (name.includes(map.label)) return true;
    const core = map.label.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return core.length > 0 && name.includes(core);
  });
  return entry ? entry[0] : null;
}

module.exports = {
  checkContractPdf,
  checkContractPdfFile,
  checkContractRequirements,
  checkContractRequirementsFile,
  checkIdDocumentStamp,
  checkIdDocumentStampFile,
  inferContractTemplateId,
};
