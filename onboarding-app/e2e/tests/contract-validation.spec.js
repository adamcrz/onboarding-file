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
    expect(toast).toContain('check(s) failed');

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
});
