const { test, expect } = require('@playwright/test');
const { demoLogin } = require('../helpers/demoLogin');

// Fee Structure (management/performance fee, hurdle rate) and Currency
// Allocation only make sense for the two "All-In" templates — Advisory and
// Execution Only have no performance fee mechanism and no currency table in
// the underlying Word template at all, so filling in those fields there
// would silently do nothing. The Contract Builder step 2 form should only
// show a section when the selected template actually has a bookmark for it
// (PerfClauseAnnual / CHF), the same way it already gates the Formular
// letter behavior.

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
    const hasCcy = await page.locator('text=Currency Allocation').count();
    return { hasFee: hasFee > 0, hasCcy: hasCcy > 0 };
  }

  test('All-In templates (DE + EN) show both sections', async ({ page }) => {
    expect(await sectionsShownFor(page, 'de-all-in')).toEqual({ hasFee: true, hasCcy: true });
    expect(await sectionsShownFor(page, 'en-disc-all-in')).toEqual({ hasFee: true, hasCcy: true });
  });

  test('Advisory templates (DE + EN) show neither section', async ({ page }) => {
    expect(await sectionsShownFor(page, 'de-advisory')).toEqual({ hasFee: false, hasCcy: false });
    expect(await sectionsShownFor(page, 'en-advisory')).toEqual({ hasFee: false, hasCcy: false });
  });

  test('Execution Only shows neither section', async ({ page }) => {
    expect(await sectionsShownFor(page, 'en-execution')).toEqual({ hasFee: false, hasCcy: false });
  });
});
