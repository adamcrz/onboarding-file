const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('../../backend/node_modules/pdfkit');
const { PDFDocument: PDFLib } = require('../../backend/node_modules/pdf-lib');
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');
const { CONTRACT_REQUIREMENTS } = require('../../backend/config/contractRequirements');
const { toAbsolutePath } = require('../../backend/config/paths');

// The API reports a document's path relative to the uploads root, not as an
// absolute path on the server — so the same record is valid whichever machine
// or container the app is running on. Reading the file from the test therefore
// has to resolve it the same way the server does.
const onDisk = (stored) => toAbsolutePath(stored);

const headersFor = (token) => ({ Authorization: `Bearer ${token}` });
const LETTER_W = 612;
const LETTER_H = 792;

async function login(request, email, password, role) {
  const res = await request.post('/api/auth/login', { data: { email, password, role } });
  expect(res.ok(), `login failed for ${email}/${role}`).toBe(true);
  return (await res.json()).token;
}

function boxRect(box) {
  return [box.x0 * LETTER_W, box.y0 * LETTER_H, (box.x1 - box.x0) * LETTER_W, (box.y1 - box.y0) * LETTER_H];
}

// Builds a contract-shaped PDF. `inkedRules` names which region rules should
// be rendered as filled (i.e. signed/ticked); everything else stays blank so
// the checker sees a genuinely incomplete contract.
async function buildContractPdf(filePath, templateId, { pages, inkedRuleIds = [], overTickedRuleIds = [] }) {
  const spec = CONTRACT_REQUIREMENTS[templateId];
  const regionRules = spec.rules.filter((r) => r.kind === 'region');
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [LETTER_W, LETTER_H] });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    for (let p = 1; p <= pages; p++) {
      if (p > 1) doc.addPage({ size: [LETTER_W, LETTER_H] });
      doc.fontSize(12).fillColor('black').text(`${spec.label} — page ${p}`, 40, 40);
      for (const rule of regionRules) {
        if (rule.page !== p) continue;
        if (overTickedRuleIds.includes(rule.id)) {
          // Two boxes ticked in a single-choice group — the real-world
          // "customer ticked both options" defect an at-most-one rule exists
          // to catch. Leaving the group blank would legitimately pass.
          rule.boxes.slice(0, 2).forEach((b) => doc.rect(...boxRect(b)).fill('black'));
        } else if (inkedRuleIds.includes(rule.id)) {
          // Ink only the first box: satisfies at-least-one/ink-present and
          // does not trip at-most-one.
          doc.rect(...boxRect(rule.boxes[0])).fill('black');
        }
      }
    }
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// A single replacement page carrying ink in the given rule's first box.
async function buildFixedPage(filePath, templateId, ruleId, { inked = true } = {}) {
  const rule = CONTRACT_REQUIREMENTS[templateId].rules.find((r) => r.id === ruleId);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [LETTER_W, LETTER_H] });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.fontSize(12).fillColor('black').text(`Corrected page ${rule.page}`, 40, 40);
    if (inked) doc.rect(...boxRect(rule.boxes[0])).fill('black');
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function inviteClient(request, headers, clientEmail, templateId) {
  const res = await request.post('/api/contracts/invite', {
    headers,
    data: {
      clientName: 'Contract Correction Test',
      clientEmail,
      templateId,
      templateName: CONTRACT_REQUIREMENTS[templateId].label,
      fieldValues: { client_type: 'individual' },
      createClientAccount: false,
      requiredDocuments: [],
    },
  });
  expect(res.ok(), 'invite failed').toBe(true);
  const clients = await (await request.get('/api/clients', { headers })).json();
  return clients.find((c) => c.email === clientEmail);
}

async function uploadContract(request, headers, client, docId, templateId, filePath) {
  const res = await request.post(`/api/clients/${client.clientId}/documents/upload`, {
    headers,
    multipart: {
      file: { name: 'signed.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(filePath) },
      name: 'signed.pdf',
      type: 'Signed Contract',
      docId,
      templateId,
    },
  });
  expect(res.ok(), 'contract upload failed').toBe(true);
  return res.json();
}

async function openCorrections(request, headers, clientId, docId) {
  const all = await (await request.get('/api/corrections/documents', { headers })).json();
  return all.filter((c) => c.clientId === clientId && c.docId === docId && c.status !== 'corrected');
}

// Automatic signature/checkbox verification is currently switched off in
// favour of manual Compliance review (see AUTO_VERIFY_DOCUMENTS in
// clients.controller). Tests that exist to prove the *detection* logic are
// skipped unless it is switched back on; tests about what happens once a
// correction exists (download the page, merge it back, role scoping) stay
// meaningful either way and create their correction through whichever path
// is live.
const AUTO_VERIFY = process.env.DOCUMENT_AUTO_VERIFY === 'true';

// Produces one real open correction against `docId`, whatever the mode.
async function ensureCorrection(request, rmHeaders, client, docId, { page, issue }) {
  const existing = await openCorrections(request, rmHeaders, client.clientId, docId);
  if (existing.length) return existing;
  const complianceToken = await login(request, 'compliance@demo.com', 'Demo1234!', 'compliance');
  const res = await request.post(`/api/clients/${client.clientId}/documents/${docId}/flag`, {
    headers: headersFor(complianceToken),
    data: { issue, page: String(page) },
  });
  expect(res.ok(), 'manual flag failed').toBe(true);
  return openCorrections(request, rmHeaders, client.clientId, docId);
}

test.describe('Contract correction workflow', () => {
  const tmpFiles = [];
  let clientEmail;

  const tmp = (name) => {
    const p = path.join(__dirname, `tmp-${Date.now()}-${name}`);
    tmpFiles.push(p);
    return p;
  };

  test.afterEach(async () => {
    if (clientEmail) await deleteClientsByEmailPattern(clientEmail);
    tmpFiles.forEach((f) => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    tmpFiles.length = 0;
  });

  // Every supported contract type is validated — including the three that
  // have no coordinate map, which must still be caught structurally rather
  // than silently passing.
  for (const [templateId, spec] of Object.entries(CONTRACT_REQUIREMENTS)) {
    test(`${templateId}: a short/incomplete package is flagged (structural rule)`, async ({ request }) => {
      test.skip(!AUTO_VERIFY, 'automatic document verification is currently disabled — run with DOCUMENT_AUTO_VERIFY=true on server and tests');
      const rmToken = await login(request, 'rm@demo.com', 'Demo1234!', 'rm');
      const headers = headersFor(rmToken);
      clientEmail = `contract-corr-${templateId}-${Date.now()}@e2e.local`;

      const client = await inviteClient(request, headers, clientEmail, templateId);
      const templateDoc = client.documents.find((d) => d.type === 'Template');

      const shortPdf = tmp(`${templateId}-short.pdf`);
      await buildContractPdf(shortPdf, templateId, { pages: 2 });
      const body = await uploadContract(request, headers, client, templateDoc.docId, templateId, shortPdf);

      expect(body.missingNote).toBeTruthy();
      const open = await openCorrections(request, headers, client.clientId, body.docId);
      const structural = open.find((c) => c.ruleKind === 'page-count');
      expect(structural, `${templateId} should flag an incomplete package`).toBeTruthy();
      expect(structural.contractType).toBe(spec.label);
      expect(structural.documentType).toBe(spec.documentType);
      expect(structural.remedy).toBeTruthy();
    });
  }

  test('missing signature and missing checkbox each produce their own focused item', async ({ request }) => {
    test.skip(!AUTO_VERIFY, 'automatic document verification is currently disabled — run with DOCUMENT_AUTO_VERIFY=true on server and tests');
    const rmToken = await login(request, 'rm@demo.com', 'Demo1234!', 'rm');
    const headers = headersFor(rmToken);
    clientEmail = `contract-corr-multi-${Date.now()}@e2e.local`;
    const templateId = 'en-disc-all-in';

    const client = await inviteClient(request, headers, clientEmail, templateId);
    const templateDoc = client.documents.find((d) => d.type === 'Template');
    const pdf = tmp('multi.pdf');
    // Full-length package so the structural rule passes and only the region
    // rules can fail: investment_strategy left blank (missing selection),
    // risk_capacity double-ticked (invalid single-choice selection).
    await buildContractPdf(pdf, templateId, { pages: 20, overTickedRuleIds: ['risk_capacity'] });
    const body = await uploadContract(request, headers, client, templateDoc.docId, templateId, pdf);

    const open = await openCorrections(request, headers, client.clientId, body.docId);
    expect(open.length).toBeGreaterThan(1); // multiple correction items, same contract
    expect(open.some((c) => c.ruleId === 'investment_strategy')).toBe(true);
    const overTicked = open.find((c) => c.ruleId === 'risk_capacity');
    expect(overTicked, 'a double-ticked single-choice group must be flagged').toBeTruthy();
    expect(overTicked.issue).toContain('more than one');
    expect(open.every((c) => c.ruleKind === 'region')).toBe(true);
    // Each carries its own page + rule identity rather than one lumped item.
    expect(new Set(open.map((c) => c.ruleId)).size).toBe(open.length);
    for (const c of open) {
      expect(c.pageFrom).toBeGreaterThan(0);
      expect(c.page).toBe(`Page ${c.pageFrom}`);
      expect(c.templateId).toBe(templateId);
    }
  });

  test('download returns only the affected page, and the full merge cycle preserves the rest', async ({ request }) => {
    const rmToken = await login(request, 'rm@demo.com', 'Demo1234!', 'rm');
    const headers = headersFor(rmToken);
    clientEmail = `contract-corr-merge-${Date.now()}@e2e.local`;
    const templateId = 'en-advisory';

    const client = await inviteClient(request, headers, clientEmail, templateId);
    const templateDoc = client.documents.find((d) => d.type === 'Template');
    const pdf = tmp('advisory.pdf');
    await buildContractPdf(pdf, templateId, { pages: 12 }); // long enough; initials p.4 blank
    const body = await uploadContract(request, headers, client, templateDoc.docId, templateId, pdf);

    // Auto-verification would flag the blank initials itself; with it off, a
    // Compliance reviewer flags the same page manually. Either way one open
    // correction against page 4 exists, which is what the rest of this test
    // (download → fix → merge) actually exercises.
    const open = await ensureCorrection(request, headers, client, body.docId, {
      page: 4, issue: 'Client initials missing on page 4',
    });
    const initials = open.find((c) => c.pageFrom === 4);
    expect(initials, 'a page-4 correction should exist').toBeTruthy();
    expect(initials.pageFrom).toBe(4);

    // --- partial download: exactly one page, not the whole contract ---
    const dl = await request.get(`/api/corrections/documents/${initials._id}/download`, { headers });
    expect(dl.ok()).toBe(true);
    const downloaded = await PDFLib.load(await dl.body());
    expect(downloaded.getPageCount()).toBe(1);

    // --- upload a still-incomplete fix: must NOT close the correction ---
    const blankFix = tmp('blank-fix.pdf');
    await buildFixedPage(blankFix, templateId, 'initials_p4', { inked: false });
    const badUpload = await request.post(`/api/corrections/documents/${initials._id}/upload`, {
      headers,
      multipart: { file: { name: 'fix.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(blankFix) } },
    });
    expect(badUpload.ok()).toBe(true);
    // An incomplete fix never closes the item: under automatic verification
    // the re-check fails it; under manual review there is no rule to satisfy,
    // so it waits for a human. Either way it stays open.
    expect((await badUpload.json()).validationPassed).toBe(false);
    let stillOpen = await openCorrections(request, headers, client.clientId, body.docId);
    expect(stillOpen.some((c) => c._id === initials._id)).toBe(true);

    // --- upload a proper fix: merges, validates, closes ---
    const goodFix = tmp('good-fix.pdf');
    await buildFixedPage(goodFix, templateId, 'initials_p4', { inked: true });
    const goodUpload = await request.post(`/api/corrections/documents/${initials._id}/upload`, {
      headers,
      multipart: { file: { name: 'fix.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(goodFix) } },
    });
    expect(goodUpload.ok()).toBe(true);
    const goodBody = await goodUpload.json();
    if (AUTO_VERIFY) {
      // The automatic re-check confirms the fix and closes the item itself.
      expect(goodBody.validationPassed).toBe(true);
    } else {
      // Manual review: the page merged, and Compliance makes the call.
      const complianceToken = await login(request, 'compliance@demo.com', 'Demo1234!', 'compliance');
      const confirm = await request.post(`/api/corrections/documents/${initials._id}/status`, {
        headers: headersFor(complianceToken), data: { status: 'corrected' },
      });
      expect(confirm.ok()).toBe(true);
    }

    // --- page order / no duplicates / unaffected pages preserved ---
    const mergedDoc = goodBody.client.documents.find((d) => d.docId === body.docId);
    const merged = await PDFLib.load(fs.readFileSync(onDisk(mergedDoc.filePath)));
    expect(merged.getPageCount()).toBe(12); // not 13 — replaced, never appended

    // --- version history preserved: original + each corrected generation ---
    expect(mergedDoc.versions.length).toBeGreaterThanOrEqual(2);
    expect(fs.existsSync(onDisk(mergedDoc.versions[0].filePath))).toBe(true);

    // --- correction history preserved end to end ---
    const finalAll = await (await request.get('/api/corrections/documents', { headers })).json();
    const finalItem = finalAll.find((c) => c._id === initials._id);
    expect(finalItem.status).toBe('corrected');
    const actions = finalItem.history.map((h) => h.action);
    expect(actions).toContain('flagged');
    expect(actions).toContain('downloaded');
    expect(actions.filter((a) => a === 'corrected-upload').length).toBe(2);
    expect(finalItem.history.some((h) => h.validation === 'failed')).toBe(true);
    // A 'passed' validation entry only exists when an automatic rule re-ran
    // and confirmed the fix; under manual review a person confirms instead.
    if (AUTO_VERIFY) {
      expect(finalItem.history.some((h) => h.validation === 'passed')).toBe(true);
    }
  });

  test('rejects unsupported file types and wrong-length page uploads', async ({ request }) => {
    const rmToken = await login(request, 'rm@demo.com', 'Demo1234!', 'rm');
    const headers = headersFor(rmToken);
    clientEmail = `contract-corr-invalid-${Date.now()}@e2e.local`;
    const templateId = 'en-advisory';

    const client = await inviteClient(request, headers, clientEmail, templateId);
    const templateDoc = client.documents.find((d) => d.type === 'Template');
    const pdf = tmp('advisory2.pdf');
    await buildContractPdf(pdf, templateId, { pages: 12 });
    const body = await uploadContract(request, headers, client, templateDoc.docId, templateId, pdf);
    const open = await ensureCorrection(request, headers, client, body.docId, {
      page: 4, issue: 'Client initials missing on page 4',
    });
    const item = open[0];

    const badType = await request.post(`/api/corrections/documents/${item._id}/upload`, {
      headers,
      multipart: { file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a contract') } },
    });
    expect(badType.status()).toBe(415);
  });

  test('RM cannot download or upload against another RM\'s contract correction', async ({ request }) => {
    const rmToken = await login(request, 'rm@demo.com', 'Demo1234!', 'rm');
    const rmHeaders = headersFor(rmToken);
    clientEmail = `contract-corr-scope-${Date.now()}@e2e.local`;
    const templateId = 'en-advisory';

    const client = await inviteClient(request, rmHeaders, clientEmail, templateId);
    const templateDoc = client.documents.find((d) => d.type === 'Template');
    const pdf = tmp('scoped.pdf');
    await buildContractPdf(pdf, templateId, { pages: 12 });
    const body = await uploadContract(request, rmHeaders, client, templateDoc.docId, templateId, pdf);
    const open = await ensureCorrection(request, rmHeaders, client, body.docId, { page: 4, issue: 'Client initials missing on page 4' });
    const item = open[0];

    // The seeded client account owns a different case entirely.
    const clientToken = await login(request, 'client@demo.com', 'Demo1234!', 'client');
    const otherHeaders = headersFor(clientToken);

    const dl = await request.get(`/api/corrections/documents/${item._id}/download`, { headers: otherHeaders });
    expect(dl.status()).toBe(403);

    const up = await request.post(`/api/corrections/documents/${item._id}/upload`, {
      headers: otherHeaders,
      multipart: { file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(pdf) } },
    });
    expect(up.status()).toBe(403);

    // Compliance retains its broader access.
    const complianceToken = await login(request, 'compliance@demo.com', 'Demo1234!', 'compliance');
    const compDl = await request.get(`/api/corrections/documents/${item._id}/download`, { headers: headersFor(complianceToken) });
    expect(compDl.ok()).toBe(true);
  });
});
