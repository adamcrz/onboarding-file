const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { demoLogin } = require('../helpers/demoLogin');

const fixture = (name) => path.join(__dirname, '..', 'fixtures', name);
const base64Of = (name) => fs.readFileSync(fixture(name)).toString('base64');

// Runs validateSignedContractPdf() inside the page against a fixture PDF, the
// same real code path the app's upload flow calls.
async function runValidation(page, fixtureName, templateId) {
  const b64 = base64Of(fixtureName);
  return page.evaluate(async ({ b64, templateId }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const file = new File([bytes], 'upload.pdf', { type: 'application/pdf' });
    return validateSignedContractPdf(file, templateId);
  }, { b64, templateId });
}

test.describe('Signed-contract checkbox/initials validation', () => {
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
    await demoLogin(page, 'rm');
    await expect.poll(() => page.evaluate(() => !!window.pdfjsLib)).toBe(true);
  });

  test.afterEach(() => {
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('an unmarked contract reads every checkbox as empty (calibration baseline)', async ({ page }) => {
    const result = await runValidation(page, 'sample_contract_en.pdf', 'en-disc-all-in');
    expect(result.supported).toBe(true);
    const byId = Object.fromEntries(result.results.map((r) => [r.id, r]));

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

  test('a fully and correctly completed contract passes every region', async ({ page }) => {
    const result = await runValidation(page, 'test_pass.pdf', 'en-disc-all-in');
    expect(result.supported).toBe(true);
    for (const r of result.results) {
      expect(r.ok, `${r.id} expected ok=true, got tickedCount=${r.tickedCount}`).toBe(true);
    }
  });

  test('a contract with a missing selection and an over-ticked group fails exactly those regions', async ({ page }) => {
    const result = await runValidation(page, 'test_fail.pdf', 'en-disc-all-in');
    expect(result.supported).toBe(true);
    const byId = Object.fromEntries(result.results.map((r) => [r.id, r]));

    expect(byId.investment_strategy.ok).toBe(false); // no box ticked, needs at-least-one
    expect(byId.investment_strategy.tickedCount).toBe(0);
    expect(byId.risk_capacity.ok).toBe(false); // two boxes ticked, needs at-most-one
    expect(byId.risk_capacity.tickedCount).toBe(2);
    expect(byId.risk_tolerance.ok).toBe(true);
    expect(byId.suitable_mandate.ok).toBe(true);
  });

  test('an unsupported template reports supported=false instead of guessing', async ({ page }) => {
    const result = await runValidation(page, 'test_pass.pdf', 'not-a-real-template');
    expect(result.supported).toBe(false);
    expect(result.results).toEqual([]);
  });
});

test.describe('Signed-contract upload flow (full UI, RM role)', () => {
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
    await demoLogin(page, 'rm');
    await page.click('#nav-clients');
    await page.waitForTimeout(400);
    await page.click('.client-row, tr.clickable, [onclick^="openClientDetail"]');
    await page.waitForTimeout(400);
    await page.evaluate(() => switchTab('docs'));
    await page.waitForTimeout(300);
  });

  test.afterEach(() => {
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  async function uploadSignedContract(page, fixtureName, templateId) {
    await page.selectOption('#upload-doc-type', 'Signed Contract');
    await expect(page.locator('#upload-contract-template-wrap')).toBeVisible();
    await page.selectOption('#upload-contract-template', templateId);
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#upload-zone'),
    ]);
    await chooser.setFiles(fixture(fixtureName));
    await page.waitForTimeout(1200);
  }

  test('a failing signed contract is flagged into Document Corrections with readable reasons', async ({ page }) => {
    await uploadSignedContract(page, 'test_fail.pdf', 'en-disc-all-in');

    const toast = await page.evaluate(() => document.querySelector('.toast')?.textContent || '');
    expect(toast).toContain('flagged for correction');

    await page.click('#nav-kyc-corrections');
    await page.waitForTimeout(300);
    await page.evaluate(() => switchCorrectionsTab('docs'));
    await page.waitForTimeout(300);

    const rows = await page.locator('#corrtab-docs tbody tr, #corrtab-docs .doc-item').allTextContents().catch(() => []);
    const bodyText = await page.locator('#corrtab-docs').innerText();
    expect(bodyText).toContain('test_fail.pdf');
    expect(bodyText).toContain('Investment Strategy');
    expect(bodyText).toContain('Risk Capacity');
  });

  test('a passing signed contract uploads cleanly with no corrections flagged', async ({ page }) => {
    await uploadSignedContract(page, 'test_pass.pdf', 'en-disc-all-in');

    const toast = await page.evaluate(() => document.querySelector('.toast')?.textContent || '');
    expect(toast).toContain('uploaded successfully');

    await page.click('#nav-kyc-corrections');
    await page.waitForTimeout(300);
    await page.evaluate(() => switchCorrectionsTab('docs'));
    await page.waitForTimeout(300);

    const bodyText = await page.locator('#corrtab-docs').innerText();
    expect(bodyText).not.toContain('test_pass.pdf');
  });

  test('re-uploading a corrected signed contract auto-resolves the prior correction for that same document', async ({ page, request }) => {
    // The shared dev client this describe block's beforeEach lands on has
    // accumulated years of ad hoc manual-test debris (dozens of stale
    // test_fail.pdf corrections), so a generic "does the list still mention
    // X" assertion would never be reliable there. Use a dedicated, disposable
    // client created fresh via the real API instead, and jump straight to it.
    const loginRes = await request.post('/api/auth/login', { data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'rm' } });
    const { token } = await loginRes.json();
    const clientEmail = `autoresolve-${Date.now()}@e2e.local`;
    const inviteRes = await request.post('/api/contracts/invite', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        clientName: 'Autoresolve Test', clientEmail, templateId: 'en-disc-all-in', templateName: 'Discretionary All-In',
        fieldValues: { client_type: 'individual' }, createClientAccount: false, requiredDocuments: [],
      },
    });
    expect(inviteRes.ok()).toBe(true);
    const clientsRes = await request.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } });
    const newClient = (await clientsRes.json()).find((c) => c.email === clientEmail);
    expect(newClient).toBeTruthy();

    try {
      // The page's State.clients was populated by the beforeEach's login,
      // before this client existed server-side — refresh it first so
      // openClientDetail can actually find the new record.
      await page.evaluate(() => refreshClients());
      await page.waitForTimeout(300);
      await page.evaluate((id) => openClientDetail(id), newClient.clientId);
      await page.waitForTimeout(400);
      await page.evaluate(() => switchTab('docs'));
      await page.waitForTimeout(300);

      await uploadSignedContract(page, 'test_fail.pdf', 'en-disc-all-in');
      let toast = await page.evaluate(() => document.querySelector('.toast')?.textContent || '');
      expect(toast).toContain('flagged for correction');

      // The UI keeps resolved corrections visible as history (badge flips
      // to "Corrected" rather than the row disappearing), so verify the
      // actual record state via the API rather than scraping table text.
      let corrections = await (await request.get('/api/corrections/documents', { headers: { Authorization: `Bearer ${token}` } })).json();
      let mine = corrections.filter((c) => c.clientId === newClient.clientId);
      expect(mine.length).toBeGreaterThan(0);
      expect(mine.every((c) => c.status === 'pending')).toBe(true);

      // Same client, same document slot (Signed Contract always targets the
      // existing Contract Package doc) — a corrected re-upload must close
      // out the stale issue rather than leaving it sitting open forever.
      await page.evaluate((id) => openClientDetail(id), newClient.clientId);
      await page.waitForTimeout(400);
      await page.evaluate(() => switchTab('docs'));
      await page.waitForTimeout(300);
      await uploadSignedContract(page, 'test_pass.pdf', 'en-disc-all-in');
      // Two toasts can coexist in the DOM briefly (each lingers ~4s before
      // auto-dismissing) — take the most recent one, not the first match.
      toast = await page.evaluate(() => {
        const all = document.querySelectorAll('.toast');
        return all[all.length - 1]?.textContent || '';
      });
      expect(toast).toContain('uploaded successfully');

      corrections = await (await request.get('/api/corrections/documents', { headers: { Authorization: `Bearer ${token}` } })).json();
      mine = corrections.filter((c) => c.clientId === newClient.clientId);
      // The stale issues from the failing upload are auto-closed, and the
      // passing re-upload introduces no new ones — nothing should be left open.
      expect(mine.length).toBeGreaterThan(0);
      expect(mine.every((c) => c.status === 'corrected')).toBe(true);
    } finally {
      const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');
      await deleteClientsByEmailPattern(clientEmail);
    }
  });
});
