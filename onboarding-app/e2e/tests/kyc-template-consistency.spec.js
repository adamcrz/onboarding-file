const { test, expect } = require('@playwright/test');
const { demoLogin } = require('../helpers/demoLogin');
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

// cbSubmit() creates the client (via /contracts/invite) and its KYC task (via
// /kyc-tasks) as two separate calls — the task only inherits the invite
// response's clientId if it's actually passed through. Without it, KYC Tasks
// silently falls back to the old generic KYC_TEMPLATE snapshot instead of the
// client's real REQUIRED_KYC_FIELDS, so the fill form and the client's own
// "KYC Details" (Kunden profile) tab end up showing two different sets of
// fields for the very same client — the bug reported directly by the user.

test.describe('KYC template consistency: KYC Tasks vs the client profile (Kunden profile)', () => {
  let consoleErrors;
  let clientEmail;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
    await demoLogin(page, 'rm');
  });

  test.afterEach(async () => {
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    if (clientEmail) await deleteClientsByEmailPattern(clientEmail);
  });

  test('a client created via Contract Building gets a KYC task with the real clientId, and its fields match the client profile exactly', async ({ page, request }) => {
    clientEmail = `kyctemplate-${Date.now()}@e2e.local`;

    await page.evaluate(() => navigateTo('contract-building'));
    await page.waitForSelector('.cb-template-card[onclick*="en-advisory"]', { timeout: 10000 });
    await page.evaluate((id) => cbSelectTemplate(id), 'en-advisory');
    await page.evaluate(() => cbGoStep2());
    await page.waitForSelector('#cb_client_last_name', { timeout: 10000 });

    const fill = async (id, value) => page.fill(`#${id}`, value);
    await fill('cb_client_last_name', 'Template');
    await fill('cb_client_first_name', 'Consistency');
    await fill('cb_client_email', clientEmail);
    await fill('cb_client_dob', '1980-01-01');
    await fill('cb_client_address1', 'Test Street 1');
    await fill('cb_client_address2', 'Apt 2');
    await fill('cb_client_city', 'Zurich');
    await fill('cb_client_country', 'Switzerland');
    await fill('cb_client_nationality', 'Swiss');
    await fill('cb_contract_date', '2026-08-12');
    await fill('cb_depot_bank', 'Test Bank');
    await fill('cb_portfolio_number', 'PF-0001');
    await fill('cb_management_fee', '1.5');

    await page.evaluate(() => cbSubmit());
    // cbSubmit awaits two sequential API calls (invite, then the KYC task)
    // before advancing to the confirmation step — under parallel test load
    // that can take longer than a fixed pause, so poll for real completion.
    await expect.poll(() => page.evaluate(() => CB.step), { timeout: 15000 }).toBe(3);

    const rmLoginRes = await request.post('/api/auth/login', { data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'rm' } });
    const { token } = await rmLoginRes.json();
    const clientsRes = await request.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } });
    const client = (await clientsRes.json()).find((c) => c.email === clientEmail);
    expect(client).toBeTruthy();

    const tasksRes = await request.get('/api/kyc-tasks', { headers: { Authorization: `Bearer ${token}` } });
    const task = (await tasksRes.json()).find((t) => t.clientEmail === clientEmail);
    expect(task).toBeTruthy();
    expect(task.clientId).toBe(client.clientId); // the actual root cause of the reported mismatch

    // Now compare the two rendered views field-for-field.
    await page.evaluate(() => refreshClients());
    await page.waitForTimeout(300);
    await page.evaluate((id) => openClientDetail(id), client.clientId);
    await page.waitForTimeout(400);
    await page.evaluate(() => switchTab('kyc'));
    await page.waitForTimeout(300);
    const profileLabels = (await page.locator('#tab-kyc [style*="text-transform:uppercase"]').allTextContents())
      .map((l) => l.trim());
    expect(profileLabels.length).toBeGreaterThan(0);

    await page.evaluate(() => navigateTo('kyc-tasks'));
    await page.waitForTimeout(500);
    await page.evaluate((email) => {
      const t = State.kycTasks.find((t) => t.clientEmail === email);
      openKycTask(t.id);
    }, clientEmail);
    await page.waitForTimeout(400);
    const taskLabels = (await page.locator('#kyc-fill-form label').allTextContents())
      .map((l) => l.replace(/\*$/, '').replace(/—.*/, '').trim());

    expect(new Set(taskLabels)).toEqual(new Set(profileLabels));
  });
});
