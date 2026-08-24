const { test, expect } = require('@playwright/test');
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

function validAnswersFor(task) {
  return Object.fromEntries(task.sections.flatMap((section) => section.fields).map((field) => {
    if (field.type === 'date') return [field.key, '1990-01-01'];
    if (field.type === 'select') return [field.key, field.options[0]];
    return [field.key, `${field.key} value`];
  }));
}

test.describe('KYC legal-form integrity', () => {
  let clientEmail;

  test.afterEach(async () => {
    if (clientEmail) await deleteClientsByEmailPattern(clientEmail);
  });

  test('an invite cannot change the legal form after KYC answers have been submitted', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'rm' },
    });
    expect(loginRes.ok()).toBe(true);
    const { token } = await loginRes.json();
    const headers = authHeaders(token);

    clientEmail = `kyc-type-guard-${Date.now()}@e2e.local`;
    const inviteData = {
      clientName: 'KYC Type Guard',
      clientEmail,
      templateId: 'e2e-no-file',
      templateName: 'E2E Contract',
      fieldValues: { client_type: 'individual' },
      createClientAccount: false,
      requiredDocuments: [],
    };

    const inviteRes = await request.post('/api/contracts/invite', { headers, data: inviteData });
    expect(inviteRes.ok()).toBe(true);

    const clients = await (await request.get('/api/clients', { headers })).json();
    const originalClient = clients.find((client) => client.email === clientEmail);
    expect(originalClient).toBeTruthy();
    expect(originalClient.type).toBe('Individual');

    const tasks = await (await request.get('/api/kyc-tasks', { headers })).json();
    const task = tasks.find((candidate) => candidate.clientRef === originalClient._id);
    expect(task).toBeTruthy();

    const answers = validAnswersFor(task);
    const saveRes = await request.post(`/api/kyc-tasks/${task._id}/save`, {
      headers,
      data: { answers },
    });
    expect(saveRes.ok()).toBe(true);

    const completeRes = await request.post(`/api/kyc-tasks/${task._id}/complete`, {
      headers,
      data: { answers },
    });
    expect(completeRes.ok()).toBe(true);
    expect((await completeRes.json()).status).toBe('under_review');

    // Submitting writes the KYC sheet onto the case, so the baseline for
    // "the rejected invite added nothing" is taken after submission, not
    // before it.
    const afterSubmit = (await (await request.get('/api/clients', { headers })).json())
      .find((client) => client.email === clientEmail);
    const documentsBeforeInvite = afterSubmit.documents.length;

    const changeTypeRes = await request.post('/api/contracts/invite', {
      headers,
      data: {
        ...inviteData,
        fieldValues: { client_type: 'company' },
      },
    });
    expect(changeTypeRes.status()).toBe(409);
    expect(await changeTypeRes.json()).toEqual({
      error: 'Client legal form cannot be changed after KYC data has been submitted. Create a separate case for the new legal form.',
    });

    const directChangeRes = await request.put(`/api/clients/${originalClient.clientId}`, {
      headers,
      data: { type: 'Corporate' },
    });
    expect(directChangeRes.status()).toBe(409);

    const updatedClients = await (await request.get('/api/clients', { headers })).json();
    const unchangedClient = updatedClients.find((client) => client.email === clientEmail);
    expect(unchangedClient.type).toBe('Individual');
    expect(unchangedClient.kyc.firstName).toBe('firstName value');
    expect(unchangedClient.kycStatus).toBe('under_review');
    expect(unchangedClient.documents).toHaveLength(documentsBeforeInvite);
  });
});
