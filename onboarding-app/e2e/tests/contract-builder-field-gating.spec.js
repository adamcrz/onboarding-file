const { test, expect } = require('@playwright/test');
const { demoLogin } = require('../helpers/demoLogin');

// Fee Structure and Currency Allocation are gated per-piece by what the
// underlying Word template actually has a bookmark for: Annual Management Fee
// needs "Fee", Performance Fee (+ frequency + hurdle rate) needs
// "PerfClauseAnnual", Currency Allocation needs "CHF". All-In templates have
// all three; Advisory and Execution Only each have a management fee (their own
// compensation clause) but no performance-fee mechanism or currency table.
// Filling in a field with no bookmark to write to would silently do nothing,
// so the Contract Builder step 2 form must only show what the template can
// actually hold — the same way it already gates the Formular letter behavior.

test.describe('Contract Builder: Fee Structure / Currency Allocation are template-scoped', () => {
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
    await demoLogin(page, 'rm');
    await page.evaluate(() => navigateTo('contract-building'));
    await page.waitForTimeout(300);
  });

  test.afterEach(() => {
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  async function sectionsShownFor(page, templateId) {
    await page.evaluate((id) => { cbSelectTemplate(id); cbGoStep2(); }, templateId);
    await page.waitForTimeout(1000);
    const hasFee = await page.locator('text=Fee Structure').count();
    const hasMgmtFeeInput = await page.locator('#cb_management_fee').count();
    const hasPerfFeeInput = await page.locator('#cb_performance_fee').count();
    const hasCcy = await page.locator('text=Currency Allocation').count();
    return { hasFee: hasFee > 0, hasMgmtFeeInput: hasMgmtFeeInput > 0, hasPerfFeeInput: hasPerfFeeInput > 0, hasCcy: hasCcy > 0 };
  }

  test('All-In templates (DE + EN) show management fee, performance fee, and currency allocation', async ({ page }) => {
    expect(await sectionsShownFor(page, 'de-all-in')).toEqual({ hasFee: true, hasMgmtFeeInput: true, hasPerfFeeInput: true, hasCcy: true });
    expect(await sectionsShownFor(page, 'en-disc-all-in')).toEqual({ hasFee: true, hasMgmtFeeInput: true, hasPerfFeeInput: true, hasCcy: true });
  });

  test('Advisory templates (DE + EN) show management fee only — no performance fee, no currency allocation', async ({ page }) => {
    expect(await sectionsShownFor(page, 'de-advisory')).toEqual({ hasFee: true, hasMgmtFeeInput: true, hasPerfFeeInput: false, hasCcy: false });
    expect(await sectionsShownFor(page, 'en-advisory')).toEqual({ hasFee: true, hasMgmtFeeInput: true, hasPerfFeeInput: false, hasCcy: false });
  });

  test('Execution Only shows management fee only — no performance fee, no currency allocation', async ({ page }) => {
    expect(await sectionsShownFor(page, 'en-execution')).toEqual({ hasFee: true, hasMgmtFeeInput: true, hasPerfFeeInput: false, hasCcy: false });
  });
});
