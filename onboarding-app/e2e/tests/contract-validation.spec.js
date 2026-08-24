const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { demoLogin } = require('../helpers/demoLogin');
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

// Automatic verification is currently off in favour of manual Compliance
// review; these two prove the automatic path specifically.
const AUTO_VERIFY = process.env.DOCUMENT_AUTO_VERIFY === 'true';
const SKIP_REASON = 'automatic document verification is currently disabled — run with DOCUMENT_AUTO_VERIFY=true on server and tests';

const { checkContractRequirementsFile } = require('../../backend/services/pdfChecker.service');

const fixture = (name) => path.join(__dirname, '..', 'fixtures', name);

// The checker runs server-side now (Playwright + the app's own pdf.js build),
// so these calibration tests exercise it directly rather than through a
// browser global. Same real fixtures, same code path the upload flow calls.
async function runValidation(fixtureName, templateId) {
  return checkContractRequirementsFile(fixture(fixtureName), templateId);
}

test.describe('Signed-contract checkbox/initials validation', () => {
  test('an unmarked contract reads every checkbox as empty (calibration baseline)', async () => {
    const result = await runValidation('sample_contract_en.pdf', 'en-disc-all-in');
    expect(result.supported).toBe(true);
    const byId = Object.fromEntries(result.findings.map((r) => [r.ruleId, r]));

    // Nothing is ticked anywhere, so "at-least-one" regions must fail...
    expect(byId.investment_strategy.ok).toBe(false);
    expect(byId.investment_strategy.tickedCount).toBe(0);
    // ...and "at-most-one" regions (0 ticks satisfies "at most one") must pass.
    expect(byId.risk_capacity.ok).toBe(true);
    expect(byId.risk_capacity.tickedCount).toBe(0);
    expect(byId.risk_tolerance.ok).toBe(true);
    expect(byId.risk_tolerance.tickedCount).toBe(0);
    expect(byId.suitable_mandate.ok).toBe(true);
    expect(byId.suitable_mandate.tickedCount).toBe(0);
  });

  test('a fully and correctly completed contract passes every region', async () => {
    const result = await runValidation('test_pass.pdf', 'en-disc-all-in');
    expect(result.supported).toBe(true);
    for (const r of result.findings.filter((f) => f.kind === 'region')) {
      expect(r.ok, `${r.ruleId} expected ok=true, got tickedCount=${r.tickedCount}`).toBe(true);
    }
  });

  test('a contract with a missing selection and an over-ticked group fails exactly those regions', async () => {
    const result = await runValidation('test_fail.pdf', 'en-disc-all-in');
    expect(result.supported).toBe(true);
    const byId = Object.fromEntries(result.findings.map((r) => [r.ruleId, r]));

    expect(byId.investment_strategy.ok).toBe(false); // no box ticked, needs at-least-one
    expect(byId.investment_strategy.tickedCount).toBe(0);
    expect(byId.risk_capacity.ok).toBe(false); // two boxes ticked, needs at-most-one
    expect(byId.risk_capacity.tickedCount).toBe(2);
    expect(byId.risk_tolerance.ok).toBe(true);
    expect(byId.suitable_mandate.ok).toBe(true);
  });

  test('an unsupported template reports supported=false instead of guessing', async () => {
    const result = await runValidation('test_pass.pdf', 'not-a-real-template');
    expect(result.supported).toBe(false);
    expect(result.findings).toEqual([]);
  });
});

// The signed-contract upload widget has been removed from the Client Detail
// Documents tab — that tab is view/download only now, and uploading moves to
// the Compliance-side contract tasks. These tests therefore drive the upload
// through the real API endpoint (the same one any future upload UI will call)
// and keep asserting on what the user actually sees afterwards: how the
// resulting corrections render in the Corrections screen.
test.describe('Signed-contract upload flow (API upload, UI verification)', () => {
  let consoleErrors;
  let clientEmail;
  let token;
  let client;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  async function uploadSignedContract(request, fixtureName, templateId) {
    const templateDoc = client.documents.find((d) => d.type === 'Template');
    const res = await request.post(`/api/clients/${client.clientId}/documents/upload`, {
      headers: authHeaders(),
      multipart: {
        file: { name: fixtureName, mimeType: 'application/pdf', buffer: fs.readFileSync(fixture(fixtureName)) },
        name: fixtureName,
        type: 'Signed Contract',
        docId: templateDoc.docId,
        templateId,
      },
    });
    expect(res.ok(), `upload of ${fixtureName} failed`).toBe(true);
    return res.json();
  }

  async function openDocumentCorrections(page) {
    await page.evaluate(() => navigateTo('kyc-corrections'));
    await expect.poll(() => page.evaluate(() => State.currentPage), { timeout: 15000 }).toBe('kyc-corrections');
    await page.waitForTimeout(600);
    await page.evaluate(() => switchCorrectionsTab('docs'));
    await page.waitForTimeout(300);
    return page.locator('#corrtab-docs').innerText();
  }

  test.beforeEach(async ({ page, request }) => {
    consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

    // A dedicated, disposable client each time: the shared dev client carries
    // years of ad hoc manual-test debris, so "does the list mention X" could
    // never be asserted reliably against it.
    const loginRes = await request.post('/api/auth/login', { data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'rm' } });
    token = (await loginRes.json()).token;
    clientEmail = `signed-upload-${Date.now()}@e2e.local`;
    const inviteRes = await request.post('/api/contracts/invite', {
      headers: authHeaders(),
      data: {
        clientName: 'Signed Upload Test', clientEmail,
        templateId: 'en-disc-all-in', templateName: 'Discretionary All-In',
        fieldValues: { client_type: 'individual' }, createClientAccount: false, requiredDocuments: [],
      },
    });
    expect(inviteRes.ok()).toBe(true);
    client = (await (await request.get('/api/clients', { headers: authHeaders() })).json())
      .find((c) => c.email === clientEmail);
    expect(client).toBeTruthy();

    await demoLogin(page, 'rm');
  });

  test.afterEach(async () => {
    if (clientEmail) await deleteClientsByEmailPattern(clientEmail);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('a failing signed contract is flagged into Document Corrections with readable reasons', async ({ page, request }) => {
    test.skip(!AUTO_VERIFY, SKIP_REASON);
    const body = await uploadSignedContract(request, 'test_fail.pdf', 'en-disc-all-in');
    expect(body.missingNote).toContain('Investment Strategy');

    const bodyText = await openDocumentCorrections(page);
    expect(bodyText).toContain('Investment Strategy');
    expect(bodyText).toContain('Risk Capacity');
    // The focused-item format: contract → page → document type.
    expect(bodyText).toContain('Seite');
    expect(bodyText).toContain('Discretionary');
  });

  test('a passing signed contract uploads cleanly with no corrections flagged', async ({ page, request }) => {
    const body = await uploadSignedContract(request, 'test_pass.pdf', 'en-disc-all-in');
    expect(body.missingNote).toBeNull();

    const corrections = await (await request.get('/api/corrections/documents', { headers: authHeaders() })).json();
    const mine = corrections.filter((c) => c.clientId === client.clientId);
    expect(mine.length).toBe(0);

    const bodyText = await openDocumentCorrections(page);
    expect(bodyText).not.toContain(client.clientId);
  });

  test('re-uploading a corrected signed contract auto-resolves the prior correction for that same document', async ({ request }) => {
    test.skip(!AUTO_VERIFY, SKIP_REASON);
    await uploadSignedContract(request, 'test_fail.pdf', 'en-disc-all-in');
    let corrections = await (await request.get('/api/corrections/documents', { headers: authHeaders() })).json();
    let mine = corrections.filter((c) => c.clientId === client.clientId);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((c) => c.status === 'pending')).toBe(true);

    // Same client, same document slot — a corrected re-upload must close out
    // the stale issues rather than leaving them open forever.
    const passBody = await uploadSignedContract(request, 'test_pass.pdf', 'en-disc-all-in');
    expect(passBody.missingNote).toBeNull();

    corrections = await (await request.get('/api/corrections/documents', { headers: authHeaders() })).json();
    mine = corrections.filter((c) => c.clientId === client.clientId);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((c) => c.status === 'corrected')).toBe(true);
  });
});
