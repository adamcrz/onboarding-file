const { test, expect } = require('@playwright/test');
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

const headersFor = (token) => ({ Authorization: `Bearer ${token}` });

function validAnswersFor(task) {
  return Object.fromEntries(task.sections.flatMap((section) => section.fields).map((field) => {
    if (field.type === 'date') return [field.key, '1990-01-01'];
    if (field.type === 'select') return [field.key, field.options[0]];
    return [field.key, `${field.key} value`];
  }));
}

async function login(request, email, role) {
  const response = await request.post('/api/auth/login', {
    data: { email, password: 'Demo1234!', role },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()).token;
}

test.describe('KYC API integrity', () => {
  let clientEmail;

  test.afterEach(async () => {
    if (clientEmail) await deleteClientsByEmailPattern(clientEmail);
  });

  test('protects staff actions, validates canonical values, and merges concurrent answers', async ({ request }) => {
    const [rmToken, clientToken] = await Promise.all([
      login(request, 'rm@demo.com', 'rm'),
      login(request, 'client@demo.com', 'client'),
    ]);
    const rmHeaders = headersFor(rmToken);
    const clientHeaders = headersFor(clientToken);
    clientEmail = `kyc-api-integrity-${Date.now()}@e2e.local`;

    const inviteData = {
      clientName: 'KYC API Integrity',
      clientEmail,
      templateId: 'e2e-no-file',
      templateName: 'E2E Contract',
      fieldValues: { client_type: 'individual' },
      createClientAccount: false,
      requiredDocuments: [],
    };

    const forbiddenInvite = await request.post('/api/contracts/invite', {
      headers: clientHeaders,
      data: inviteData,
    });
    expect(forbiddenInvite.status()).toBe(403);
    expect((await request.post('/api/clients', {
      headers: clientHeaders,
      data: { clientId: 'CLT-FORBIDDEN', name: 'Forbidden direct client' },
    })).status()).toBe(403);

    const invite = await request.post('/api/contracts/invite', {
      headers: rmHeaders,
      data: inviteData,
    });
    expect(invite.ok()).toBe(true);

    const clients = await (await request.get('/api/clients', { headers: rmHeaders })).json();
    const client = clients.find((candidate) => candidate.email === clientEmail);
    expect(client).toBeTruthy();

    const forbiddenDelete = await request.delete(`/api/clients/${client.clientId}`, {
      headers: clientHeaders,
    });
    expect(forbiddenDelete.status()).toBe(403);
    expect((await request.get(`/api/clients/${client.clientId}`, { headers: clientHeaders })).status()).toBe(403);
    expect((await request.put(`/api/clients/${client.clientId}`, {
      headers: clientHeaders,
      data: { name: 'Cross-client mutation' },
    })).status()).toBe(403);
    const templateDocument = client.documents[0];
    expect(templateDocument).toBeTruthy();
    expect((await request.post(
      `/api/clients/${client.clientId}/documents/${templateDocument.docId}/approve`,
      { headers: clientHeaders }
    )).status()).toBe(403);

    const tasks = await (await request.get('/api/kyc-tasks', { headers: rmHeaders })).json();
    const task = tasks.find((candidate) => candidate.clientRef === client._id);
    expect(task).toBeTruthy();

    const invalid = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers: rmHeaders,
      data: {
        answers: {
          exposure: 'maybe',
          dateOfBirth: '2026-02-31',
          firstName: { unsafe: true },
        },
      },
    });
    expect(invalid.status()).toBe(400);
    const invalidBody = await invalid.json();
    expect(invalidBody.error).toBe('Invalid KYC field values');
    expect(invalidBody.details).toHaveLength(3);

    // Draft saves may be partial and concurrent. Dotted-path writes must
    // preserve both values without turning either save into a submission.
    const [legalNameResponse, beneficialOwnerNameResponse] = await Promise.all([
      request.post(`/api/kyc-tasks/${task._id}/save`, {
        headers: rmHeaders,
        data: { answers: { firstName: 'Concurrent' } },
      }),
      request.post(`/api/kyc-tasks/${task._id}/save`, {
        headers: rmHeaders,
        data: { answers: { lastName: 'Merge' } },
      }),
    ]);
    expect(legalNameResponse.ok()).toBe(true);
    expect(beneficialOwnerNameResponse.ok()).toBe(true);

    const updatedClients = await (await request.get('/api/clients', { headers: rmHeaders })).json();
    const updatedClient = updatedClients.find((candidate) => candidate._id === client._id);
    expect(updatedClient.kyc.firstName).toBe('Concurrent');
    expect(updatedClient.kyc.lastName).toBe('Merge');
    expect(updatedClient.kycStatus).toBe('draft');
    expect(updatedClient.kycSubmittedBy).toBeFalsy();

    const partialSubmit = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers: rmHeaders,
      data: { answers: { firstName: 'Concurrent', lastName: 'Merge' } },
    });
    expect(partialSubmit.status()).toBe(409);
    const partialBody = await partialSubmit.json();
    expect(partialBody.details.missingFields).toContain('dateOfBirth');
    expect(partialBody.details.missingFields).toContain('legalDomicile');
    expect(partialBody.details.missingFields).toContain('industry');

    const tasksAfterRejectedSubmit = await (await request.get('/api/kyc-tasks', { headers: rmHeaders })).json();
    expect(tasksAfterRejectedSubmit.find((candidate) => candidate._id === task._id).status).toBe('pending');

    const fullAnswers = { ...validAnswersFor(task), firstName: 'Concurrent', lastName: 'Merge' };
    const fullSave = await request.post(`/api/kyc-tasks/${task._id}/save`, {
      headers: rmHeaders,
      data: { answers: fullAnswers },
    });
    expect(fullSave.ok()).toBe(true);
    const fullSubmit = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers: rmHeaders,
      data: { answers: fullAnswers },
    });
    expect(fullSubmit.ok()).toBe(true);
    expect((await fullSubmit.json()).status).toBe('under_review');

    const corrections = await (await request.get('/api/corrections/kyc', { headers: rmHeaders })).json();
    const generatedKeys = corrections
      .filter((correction) => correction.clientId === client.clientId && correction.autoGenerated)
      .map((correction) => correction.fieldKey);
    expect(new Set(generatedKeys).size).toBe(generatedKeys.length);

    const invalidCorrection = await request.post('/api/corrections/kyc/resubmit-section', {
      headers: rmHeaders,
      data: { clientId: client.clientId, values: { usPerson: 'not-a-configured-range' } },
    });
    expect(invalidCorrection.status()).toBe(400);
    expect((await invalidCorrection.json()).error).toBe('Invalid KYC field values');

    const complianceToken = await login(request, 'compliance@demo.com', 'compliance');

    // Standalone Mongo uses the guarded correction-first compensation path;
    // replica sets use the transaction path. Both expose the same successful
    // API result and never overwrite Client.kyc as a whole.
    const flagResponse = await request.post('/api/corrections/kyc/flag', {
      headers: headersFor(complianceToken),
      data: { clientId: client.clientId, fieldKey: 'firstName' },
    });
    expect(flagResponse.ok()).toBe(true);
    expect((await flagResponse.json()).status).toBe('needs_correction');
    const afterFlag = (await (await request.get('/api/clients', { headers: rmHeaders })).json())
      .find((candidate) => candidate._id === client._id);
    expect(afterFlag.kyc.firstName).toBe('');
    const afterFlagCorrections = await (await request.get('/api/corrections/kyc', { headers: rmHeaders })).json();
    expect(afterFlagCorrections.some((correction) =>
      correction.clientId === client.clientId
      && correction.fieldKey === 'firstName'
      && correction.status === 'needs_correction'
    )).toBe(true);
  });

  test('requires saved complete data, then moves under review until Compliance approves it', async ({ request }) => {
    const [rmToken, complianceToken] = await Promise.all([
      login(request, 'rm@demo.com', 'rm'),
      login(request, 'compliance@demo.com', 'compliance'),
    ]);
    const rmHeaders = headersFor(rmToken);
    const complianceHeaders = headersFor(complianceToken);
    clientEmail = `kyc-verify-${Date.now()}@e2e.local`;

    const invite = await request.post('/api/contracts/invite', {
      headers: rmHeaders,
      data: {
        clientName: 'KYC Verify Integrity',
        clientEmail,
        templateId: 'e2e-no-file',
        templateName: 'E2E Contract',
        fieldValues: { client_type: 'individual' },
        createClientAccount: false,
        requiredDocuments: [],
      },
    });
    expect(invite.ok()).toBe(true);

    const clients = await (await request.get('/api/clients', { headers: rmHeaders })).json();
    const client = clients.find((candidate) => candidate.email === clientEmail);
    const tasks = await (await request.get('/api/kyc-tasks', { headers: rmHeaders })).json();
    const task = tasks.find((candidate) => candidate.clientRef === client._id);
    expect(task).toBeTruthy();

    const answers = validAnswersFor(task);
    const directSubmit = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers: rmHeaders,
      data: { answers },
    });
    expect(directSubmit.status()).toBe(409);
    const directSubmitBody = await directSubmit.json();
    expect(directSubmitBody.details.unsavedFields).toContain('firstName');

    const prematureCaseApproval = await request.put(`/api/clients/${encodeURIComponent(client.clientId)}`, {
      headers: complianceHeaders,
      data: { status: 'approved', progress: 100 },
    });
    expect(prematureCaseApproval.status()).toBe(409);
    expect((await prematureCaseApproval.json()).error).toContain('KYC must be approved by Compliance');

    let currentClients = await (await request.get('/api/clients', { headers: rmHeaders })).json();
    let currentClient = currentClients.find((candidate) => candidate._id === client._id);
    expect(currentClient.kycStatus).toBe('draft');
    expect(currentClient.kycSubmittedBy).toBeFalsy();
    let currentTasks = await (await request.get('/api/kyc-tasks', { headers: rmHeaders })).json();
    expect(currentTasks.find((candidate) => candidate._id === task._id).status).toBe('pending');

    const entries = Object.entries(answers);
    const firstHalf = Object.fromEntries(entries.filter((_, index) => index % 2 === 0));
    const secondHalf = Object.fromEntries(entries.filter((_, index) => index % 2 === 1));
    const saves = await Promise.all([
      request.post(`/api/kyc-tasks/${task._id}/save`, {
        headers: rmHeaders,
        data: { answers: firstHalf },
      }),
      request.post(`/api/kyc-tasks/${task._id}/save`, {
        headers: rmHeaders,
        data: { answers: secondHalf },
      }),
    ]);
    expect(saves.every((response) => response.ok())).toBe(true);

    currentClients = await (await request.get('/api/clients', { headers: rmHeaders })).json();
    currentClient = currentClients.find((candidate) => candidate._id === client._id);
    expect(currentClient.kyc).toEqual(answers);
    expect(currentClient.kycStatus).toBe('draft');
    currentTasks = await (await request.get('/api/kyc-tasks', { headers: rmHeaders })).json();
    expect(currentTasks.find((candidate) => candidate._id === task._id).status).toBe('pending');

    const changedAfterSave = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers: rmHeaders,
      data: { answers: { ...answers, firstName: 'Changed after save' } },
    });
    expect(changedAfterSave.status()).toBe(409);
    expect((await changedAfterSave.json()).details.unsavedFields).toContain('firstName');

    const submit = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers: rmHeaders,
      data: { answers },
    });
    expect(submit.ok()).toBe(true);
    expect((await submit.json()).status).toBe('under_review');

    currentClients = await (await request.get('/api/clients', { headers: rmHeaders })).json();
    currentClient = currentClients.find((candidate) => candidate._id === client._id);
    expect(currentClient.kycStatus).toBe('under_review');
    expect(currentClient.kycAwaitingVerification).toBe(true);
    currentTasks = await (await request.get('/api/kyc-tasks', { headers: rmHeaders })).json();
    expect(currentTasks.find((candidate) => candidate._id === task._id).status).toBe('under_review');

    const corrections = await (await request.get('/api/corrections/kyc', { headers: complianceHeaders })).json();
    const openForClient = corrections.filter((correction) =>
      correction.clientId === client.clientId
      && correction.autoGenerated
      && correction.status !== 'corrected'
    );
    expect(openForClient).toHaveLength(0);

    const verifyPath = `/api/kyc-tasks/client/${encodeURIComponent(client.clientId)}/verify`;
    const forbiddenVerify = await request.post(verifyPath, { headers: rmHeaders });
    expect(forbiddenVerify.status()).toBe(403);

    const verify = await request.post(verifyPath, { headers: complianceHeaders });
    expect(verify.ok()).toBe(true);
    expect((await verify.json()).status).toBe('approved');
    const verifiedClients = await (await request.get('/api/clients', { headers: complianceHeaders })).json();
    const verified = verifiedClients.find((candidate) => candidate._id === client._id);
    expect(verified.kycAwaitingVerification).toBe(false);
    expect(verified.kycStatus).toBe('approved');
    expect(verified.auditTrail.some((entry) => entry.action === 'KYC submission verified by Compliance')).toBe(true);
    const verifiedTasks = await (await request.get('/api/kyc-tasks', { headers: complianceHeaders })).json();
    expect(verifiedTasks.find((candidate) => candidate._id === task._id).status).toBe('approved');

    // Submitting is never approving, whoever does it: a Compliance-authored
    // submit still lands under review, and only the explicit verify action
    // records sign-off.
    const complianceSubmit = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers: complianceHeaders,
      data: { answers },
    });
    expect(complianceSubmit.ok()).toBe(true);
    expect((await complianceSubmit.json()).status).toBe('under_review');

    const afterComplianceSubmit = await (await request.get('/api/clients', { headers: complianceHeaders })).json();
    const complianceSubmittedClient = afterComplianceSubmit.find((candidate) => candidate._id === client._id);
    expect(complianceSubmittedClient.kycStatus).toBe('under_review');
    expect(complianceSubmittedClient.kycAwaitingVerification).toBe(true);
    expect(complianceSubmittedClient.kycApprovedAt).toBeFalsy();

    const complianceVerify = await request.post(verifyPath, { headers: complianceHeaders });
    expect(complianceVerify.ok()).toBe(true);
    expect((await complianceVerify.json()).status).toBe('approved');
  });
});
