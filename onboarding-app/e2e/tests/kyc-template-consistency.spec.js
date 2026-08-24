const { test, expect } = require('@playwright/test');
const { demoLogin } = require('../helpers/demoLogin');
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

function clientSchemaTuples(client) {
  return (client.kycSchema || []).map(({ page, key, label }) => ({ page, key, label }));
}

function clientSchemaMetadata(client) {
  return (client.kycSchema || []).map((field) => ({
    page: field.page,
    key: field.key,
    label: field.label,
    type: field.type || 'text',
    required: field.required !== false,
    options: Array.isArray(field.options) ? field.options : [],
  }));
}

function taskSchemaTuples(task) {
  return (task.sections || []).flatMap((section) =>
    (section.fields || []).map((field) => ({
      page: section.title,
      key: field.key,
      label: field.label,
    }))
  );
}

function taskSchemaMetadata(task) {
  return (task.sections || []).flatMap((section) =>
    (section.fields || []).map((field) => ({
      page: section.title,
      key: field.key,
      label: field.label,
      type: field.type || 'text',
      required: field.required !== false,
      options: Array.isArray(field.options) ? field.options : [],
    }))
  );
}

function taskValueTuples(task) {
  return (task.sections || []).flatMap((section) =>
    (section.fields || []).map((field) => ({
      page: section.title,
      key: field.key,
      label: field.label,
      value: String(field.value ?? ''),
    }))
  );
}

// Every field gets a recognizable value so a key swap, duplicate value, or
// dropped field cannot accidentally pass the comparison. Selects use a real
// option so the browser can render the stored answer when the task is reopened.
function distinctAnswer(field, index) {
  if (field.type === 'date') {
    return `${1990 + index}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`;
  }
  if (field.type === 'select' && Array.isArray(field.options) && field.options.length) {
    const safeOptions = field.options.filter((option) => !/[<>]/.test(option));
    const options = safeOptions.length ? safeOptions : field.options;
    return options[index % options.length];
  }
  // A number input silently discards anything non-numeric, so the value would
  // read back as empty and the comparison would fail for reasons that have
  // nothing to do with the schema being consistent.
  if (field.type === 'number') return String(1000 + index);
  return `e2e-${String(index + 1).padStart(2, '0')}-${field.key}`;
}

async function readTaskFormTuples(page) {
  return page.locator('#kyc-fill-form [name][data-kyc-key]').evaluateAll((controls) =>
    controls.map((control) => {
      const labelText = control.closest('.form-group')?.querySelector('label')?.textContent || '';
      return {
        page: control.closest('[data-kyc-page]')?.getAttribute('data-kyc-page') || '',
        key: control.getAttribute('data-kyc-key') || '',
        label: labelText
          .replace(/\s+—\s+needs correction.*$/i, '')
          // Every field now always carries a trailing status badge (Please
          // Fill In / Saved / Under Review by Compliance / Approved by
          // Compliance) — strip it before the required-asterisk so the
          // comparison is purely about the schema label, not its live status.
          .replace(/\s*(Please Fill In|Saved|Under Review by Compliance|Approved by Compliance)\s*$/, '')
          .replace(/\s*\*\s*$/, '')
          .trim(),
        value: control.value,
      };
    })
  );
}

async function readClientKycTuples(page) {
  return page.locator('#tab-kyc [data-kyc-key]').evaluateAll((fields) =>
    fields.map((field) => ({
      page: field.closest('[data-kyc-page]')?.getAttribute('data-kyc-page') || '',
      key: field.getAttribute('data-kyc-key') || '',
      label: field.getAttribute('data-kyc-label') || '',
      value: field.getAttribute('data-kyc-value') || '',
    }))
  );
}

async function readEditableSchemaMetadata(locator) {
  return locator.locator('[data-kyc-control]').evaluateAll((fields) =>
    fields.map((field) => {
      const firstControl = field.querySelector('select, textarea, input');
      const declaredType = field.getAttribute('data-kyc-type') || 'text';
      const actualType = declaredType === 'yesno'
        ? 'yesno'
        : firstControl?.tagName === 'SELECT'
          ? 'select'
          : firstControl?.tagName === 'TEXTAREA'
            ? 'textarea'
            : firstControl?.getAttribute('type') || 'text';
      return {
        page: field.getAttribute('data-page') || '',
        key: field.getAttribute('data-kyc-key') || '',
        label: field.getAttribute('data-kyc-label') || '',
        type: actualType,
        required: field.getAttribute('data-kyc-required') === 'true',
        options: JSON.parse(field.getAttribute('data-kyc-options') || '[]'),
      };
    })
  );
}

test.describe('KYC canonical schema: KYC Tasks vs client KYC Details', () => {
  let consoleErrors;
  let clientEmail;

  test.beforeEach(async ({ page }) => {
    clientEmail = null;
    consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
    await demoLogin(page, 'rm');
  });

  test.afterEach(async () => {
    // Clean the Client and its KycTask even when an assertion fails. The helper
    // matches tasks by email/clientRef, never by the recyclable display id.
    if (clientEmail) await deleteClientsByEmailPattern(clientEmail);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('one ordered schema and one value record drive the task API, task form, and client profile', async ({ page, request }) => {
    clientEmail = `kyctemplate-${Date.now()}@e2e.local`;

    // Exercise the real Contract Building path: it creates the Client first,
    // then must pass that stable database reference into the KYC task.
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
    await page.uncheck('#cb-create-account-toggle');

    await page.evaluate(() => cbSubmit());
    await expect.poll(() => page.evaluate(() => CB.step), { timeout: 15000 }).toBe(3);

    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'rm' },
    });
    expect(loginRes.ok()).toBe(true);
    const { token } = await loginRes.json();
    const headers = authHeaders(token);

    const clientsRes = await request.get('/api/clients', { headers });
    expect(clientsRes.ok()).toBe(true);
    const client = (await clientsRes.json()).find((candidate) => candidate.email === clientEmail);
    expect(client).toBeTruthy();
    expect(Array.isArray(client.kycSchema)).toBe(true);
    expect(client.kycSchema.length).toBeGreaterThan(0);

    const tasksRes = await request.get('/api/kyc-tasks', { headers });
    expect(tasksRes.ok()).toBe(true);
    const task = (await tasksRes.json()).find((candidate) => candidate.clientEmail === clientEmail);
    expect(task).toBeTruthy();
    expect(task.clientRef).toBe(client._id);
    expect(task.clientId).toBe(client.clientId);

    const canonicalSchema = clientSchemaTuples(client);
    const canonicalMetadata = clientSchemaMetadata(client);
    expect(taskSchemaTuples(task)).toEqual(canonicalSchema);
    expect(taskSchemaMetadata(task)).toEqual(canonicalMetadata);
    // A new client's KYC is no longer blank: the details the contract form
    // already captured (name, date of birth, address, country, nationality)
    // are carried straight into it, so the same fact is never asked twice.
    // Every key still exists on the task; some simply arrive pre-answered.
    expect(Object.keys(task.answers).sort()).toEqual(client.kycSchema.map((f) => f.key).sort());
    expect(client.kyc.firstName).toBe('Consistency');
    expect(client.kyc.lastName).toBe('Template');
    expect(client.kyc.passportFullName).toBe('Consistency Template');
    expect(client.kyc.dateOfBirth).toBe('1980-01-01');
    expect(client.kyc.residentialStreet).toContain('Test Street 1');
    expect(client.kyc.residentialCountry).toBe('Switzerland');
    expect(client.kyc.nationality).toBe('Swiss');
    // Anything the contract does not know stays empty for the RM to answer.
    expect(client.kyc.industry ?? '').toBe('');

    const answers = Object.fromEntries(
      client.kycSchema.map((field, index) => [field.key, distinctAnswer(field, index)])
    );
    const saveRes = await request.post(`/api/kyc-tasks/${task._id}/save`, {
      headers,
      data: { answers },
    });
    expect(saveRes.ok()).toBe(true);
    expect((await saveRes.json()).status).toBe('pending');

    const completeRes = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers,
      data: { answers },
    });
    expect(completeRes.ok()).toBe(true);
    const completedTask = await completeRes.json();
    expect(completedTask.status).toBe('under_review');
    expect(completedTask.answers).toEqual(answers);
    expect(taskSchemaTuples(completedTask)).toEqual(canonicalSchema);

    const [updatedClientsRes, updatedTasksRes] = await Promise.all([
      request.get('/api/clients', { headers }),
      request.get('/api/kyc-tasks', { headers }),
    ]);
    expect(updatedClientsRes.ok()).toBe(true);
    expect(updatedTasksRes.ok()).toBe(true);
    const updatedClient = (await updatedClientsRes.json()).find((candidate) => candidate.email === clientEmail);
    const updatedTask = (await updatedTasksRes.json()).find((candidate) => candidate._id === task._id);

    expect(updatedClient).toBeTruthy();
    expect(updatedTask).toBeTruthy();
    expect(updatedClient.kycStatus).toBe('under_review');
    expect(updatedTask.status).toBe('under_review');
    expect(updatedClient.kyc).toEqual(answers);
    expect(updatedTask.answers).toEqual(updatedClient.kyc);
    const expectedTuples = canonicalSchema.map((field) => ({ ...field, value: answers[field.key] }));
    expect(taskValueTuples(updatedTask)).toEqual(expectedTuples);

    // Client Detail is a read-only projection of the same canonical values.
    await page.evaluate(() => refreshClients());
    await page.evaluate((id) => openClientDetail(id), client.clientId);
    await page.evaluate(() => switchTab('kyc'));
    await expect(page.locator('#tab-kyc [data-kyc-key]')).toHaveCount(expectedTuples.length);
    expect(await readClientKycTuples(page)).toEqual(expectedTuples);

    // Reopening the submitted task must render the same ordered fields and
    // prefill them from Client.kyc, not from a second task-owned answer copy.
    await page.evaluate(() => navigateTo('kyc-tasks'));
    const reviewRow = page.locator('.client-row', { hasText: clientEmail });
    await expect(reviewRow).toBeVisible({ timeout: 10000 });
    await expect(reviewRow.locator('[data-task-status]')).toHaveText('Under Review by Compliance');
    await page.evaluate((email) => {
      const activeTask = State.kycTasks.find((candidate) => candidate.clientEmail === email);
      openKycTask(activeTask.id);
    }, clientEmail);
    await expect(page.locator('#kyc-fill-form [name][data-kyc-key]')).toHaveCount(expectedTuples.length);
    expect(await readTaskFormTuples(page)).toEqual(expectedTuples);
    expect(await readEditableSchemaMetadata(page.locator('#kyc-fill-form'))).toEqual(canonicalMetadata);

    // Filled values are still awaiting review here. No field may claim green
    // Compliance approval until the separate verify request succeeds.
    await page.evaluate((clientId) => {
      const sourceClient = State.clients.find((candidate) => candidate.id === clientId);
      const host = document.createElement('div');
      host.id = 'kyc-under-review-probe';
      host.innerHTML = clientKycEditableFormHTML(sourceClient);
      document.body.appendChild(host);
    }, client.clientId);
    await expect(page.locator('#kyc-under-review-probe .status-approved')).toHaveCount(0);
    const underReviewBadges = page.locator('#kyc-under-review-probe [data-kyc-key] .status-badge');
    await expect(underReviewBadges).toHaveCount(expectedTuples.length);
    await expect(underReviewBadges).toHaveText(Array(expectedTuples.length).fill('Under Review by Compliance'));
    await page.locator('#kyc-under-review-probe').evaluate((element) => element.remove());

    // The correction editor uses the same shared control renderer. Exercise
    // its editable form directly so date/select/textarea/options/requiredness
    // are checked as exact metadata, not merely the field names and values.
    await page.evaluate((clientId) => {
      const sourceClient = State.clients.find((candidate) => candidate.id === clientId);
      const host = document.createElement('div');
      host.id = 'kyc-correction-schema-probe';
      host.innerHTML = clientKycEditableFormHTML(sourceClient, true);
      document.body.appendChild(host);
    }, client.clientId);
    expect(await readEditableSchemaMetadata(page.locator('#kyc-correction-schema-probe'))).toEqual(canonicalMetadata);

    const collectedControlValues = await page.evaluate(() => {
      const host = document.getElementById('kyc-correction-schema-probe');
      // One of each control shape the questionnaire uses: a dropdown, a date,
      // and a textarea whose value needs trimming and must survive escaping.
      host.querySelector('#clientkyc_usPerson').value = 'Ja';
      host.querySelector('#clientkyc_dateOfBirth').value = '1999-12-31';
      host.querySelector('#clientkyc_profileRemarks').value = '  <Suite & Street>  ';
      return {
        identity: collectKycPageValues('1. Personenprofil', host),
        exposure: collectKycPageValues('3. Beziehung & Akquisition', host),
      };
    });
    expect(collectedControlValues.exposure.usPerson).toBe('Ja');
    expect(collectedControlValues.identity.dateOfBirth).toBe('1999-12-31');
    expect(collectedControlValues.identity.profileRemarks).toBe('<Suite & Street>');
    await page.locator('#kyc-correction-schema-probe').evaluate((element) => element.remove());

    // The former browser-only "template builder" is now an explicitly
    // read-only view of this selected client's API schema.
    await page.evaluate((clientId) => {
      State.selectedClientId = clientId;
      navigateTo('kyc-form');
    }, client.clientId);
    await expect(page.locator('[data-kyc-schema-source="client-api"]')).toBeVisible();
    await expect(page.getByText('Read-only.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Template' })).toHaveCount(0);
    const schemaViewMetadata = await page.locator('[data-kyc-schema-field]').evaluateAll((rows) =>
      rows.map((row) => ({
        page: row.closest('[data-kyc-schema-page]')?.getAttribute('data-kyc-schema-page') || '',
        key: row.getAttribute('data-kyc-key') || '',
        label: row.getAttribute('data-kyc-label') || '',
        type: row.getAttribute('data-kyc-type') || 'text',
        required: row.getAttribute('data-kyc-required') === 'true',
        options: JSON.parse(row.getAttribute('data-kyc-options') || '[]'),
      }))
    );
    expect(schemaViewMetadata).toEqual(canonicalMetadata);

    const complianceLoginRes = await request.post('/api/auth/login', {
      data: { email: 'compliance@demo.com', password: 'Demo1234!', role: 'compliance' },
    });
    expect(complianceLoginRes.ok()).toBe(true);
    const complianceToken = (await complianceLoginRes.json()).token;
    const verifyRes = await request.post(`/api/kyc-tasks/client/${encodeURIComponent(client.clientId)}/verify`, {
      headers: authHeaders(complianceToken),
    });
    expect(verifyRes.ok()).toBe(true);
    expect((await verifyRes.json()).status).toBe('approved');

    await page.evaluate(() => navigateTo('kyc-tasks'));
    const approvedRow = page.locator('.client-row', { hasText: clientEmail });
    await expect(approvedRow).toBeVisible({ timeout: 10000 });
    const approvedBadge = approvedRow.locator('[data-task-status]');
    await expect(approvedBadge).toContainText('Approved by Compliance');
    await expect(approvedBadge).toHaveClass(/status-approved/);
  });

  test('saving blanks keeps them gold and keeps Submit disabled', async ({ page, request }) => {
    clientEmail = `kycblank-${Date.now()}@e2e.local`;
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'rm' },
    });
    expect(loginRes.ok()).toBe(true);
    const { token } = await loginRes.json();
    const headers = authHeaders(token);

    const inviteRes = await request.post('/api/contracts/invite', {
      headers,
      data: {
        clientName: 'KYC Blank Save',
        clientEmail,
        templateId: 'e2e-no-file',
        templateName: 'E2E Contract',
        fieldValues: { client_type: 'individual' },
        createClientAccount: false,
        requiredDocuments: [],
      },
    });
    expect(inviteRes.ok()).toBe(true);

    const clients = await (await request.get('/api/clients', { headers })).json();
    const client = clients.find((candidate) => candidate.email === clientEmail);
    const tasks = await (await request.get('/api/kyc-tasks', { headers })).json();
    const task = tasks.find((candidate) => candidate.clientRef === client._id);
    expect(task).toBeTruthy();

    await page.evaluate(() => navigateTo('kyc-tasks'));
    await expect(page.locator('.client-row', { hasText: clientEmail })).toBeVisible({ timeout: 10000 });
    await page.evaluate((taskId) => openKycTask(taskId), task._id);
    await expect(page.locator('#kyc-fill-form')).toBeVisible();

    await page.locator('#clientkyc_firstName').fill('Saved Alice');
    await page.locator('#kyc-save-btn').click();
    await expect(page.locator('#clientkyc_firstName')).toHaveValue('Saved Alice');

    await expect(page.locator('#clientkyc_firstName')).not.toHaveClass(/kyc-field-missing/);
    await expect(page.locator('#clientkyc_lastName')).toHaveValue('');
    await expect(page.locator('#clientkyc_lastName')).toHaveClass(/kyc-field-missing/);
    // Optional-in-the-schema display fields are still configured KYC fields:
    // this workflow requires every one of them to be saved non-empty too.
    await expect(page.locator('#clientkyc_legalDomicile')).toHaveValue('');
    await expect(page.locator('#clientkyc_legalDomicile')).toHaveClass(/kyc-field-missing/);
    await expect(page.locator('#clientkyc_residentialStreet')).toHaveValue('');
    await expect(page.locator('#clientkyc_residentialStreet')).toHaveClass(/kyc-field-missing/);
    await expect(page.locator('#kyc-submit-btn')).toBeDisabled();
    await expect(page.locator('#kyc-submit-hint')).toBeVisible();

    const savedClients = await (await request.get('/api/clients', { headers })).json();
    const savedClient = savedClients.find((candidate) => candidate._id === client._id);
    expect(savedClient.kyc.firstName).toBe('Saved Alice');
    expect(Object.prototype.hasOwnProperty.call(savedClient.kyc, 'lastName')).toBe(true);
    expect(savedClient.kyc.lastName).toBe('');
    expect(savedClient.kyc.legalDomicile).toBe('');
    expect(savedClient.kyc.residentialStreet).toBe('');
    expect(savedClient.kycStatus).toBe('draft');
  });
});
