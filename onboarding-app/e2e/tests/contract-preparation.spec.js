const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

const AUTO_VERIFY = process.env.DOCUMENT_AUTO_VERIFY === 'true';

const fixture = (name) => path.join(__dirname, '..', 'fixtures', name);
const headersFor = (token) => ({ Authorization: `Bearer ${token}` });

async function login(request, email, password, role) {
  const res = await request.post('/api/auth/login', { data: { email, password, role } });
  expect(res.ok()).toBe(true);
  return (await res.json()).token;
}

async function seedClient(request, headers, clientEmail, templateId = 'en-disc-all-in') {
  const res = await request.post('/api/contracts/invite', {
    headers,
    data: {
      clientName: 'Contract Prep Test', clientEmail, templateId, templateName: 'Discretionary All-In',
      fieldValues: { client_type: 'individual' }, createClientAccount: false, requiredDocuments: [],
    },
  });
  expect(res.ok()).toBe(true);
  const clients = await (await request.get('/api/clients', { headers })).json();
  return clients.find((c) => c.email === clientEmail);
}

const uploadDraft = (request, headers, clientId, fixtureName) =>
  request.post(`/api/clients/${clientId}/contract-draft`, {
    headers,
    multipart: {
      file: { name: fixtureName, mimeType: 'application/pdf', buffer: fs.readFileSync(fixture(fixtureName)) },
    },
  });

test.describe('Contract Preparation (draft contracts)', () => {
  let clientEmail;
  test.afterEach(async () => { if (clientEmail) await deleteClientsByEmailPattern(clientEmail); });

  test('blank → incomplete saved version is blocked from final and surfaces in Corrections', async ({ request }) => {
    test.skip(!AUTO_VERIFY, 'automatic document verification is currently disabled — run with DOCUMENT_AUTO_VERIFY=true on server and tests');
    const headers = headersFor(await login(request, 'rm@demo.com', 'Demo1234!', 'rm'));
    clientEmail = `prep-incomplete-${Date.now()}@e2e.local`;
    const client = await seedClient(request, headers, clientEmail);

    // 1. Blank contract is downloadable from the start.
    let state = await (await request.get(`/api/clients/${client.clientId}/contract-preparation`, { headers })).json();
    expect(state.blank).toBeTruthy();
    expect(state.blank.hasFile).toBe(true);
    expect(state.draft).toBeNull();
    expect(state.canSubmitFinal).toBe(false);

    // 2/3. Upload a saved version that is still incomplete.
    const up = await uploadDraft(request, headers, client.clientId, 'test_fail.pdf');
    expect(up.ok()).toBe(true);
    const upBody = await up.json();
    expect(upBody.complete).toBe(false);
    expect(upBody.missingNote).toBeTruthy();

    // Missing items land in Corrections in the focused format.
    const corrections = await (await request.get('/api/corrections/documents', { headers })).json();
    const mine = corrections.filter((c) => c.clientId === client.clientId && c.status === 'pending');
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((c) => c.documentType && c.contractType)).toBe(true);

    // Final submission stays gated while items are outstanding.
    state = await (await request.get(`/api/clients/${client.clientId}/contract-preparation`, { headers })).json();
    expect(state.openIssues).toBeGreaterThan(0);
    expect(state.canSubmitFinal).toBe(false);
    const submit = await request.post(`/api/clients/${client.clientId}/contract-draft/submit`, { headers });
    expect(submit.status()).toBe(409);
  });

  test('complete saved version can be replaced, submitted, and downloaded — history preserved', async ({ request }) => {
    const headers = headersFor(await login(request, 'rm@demo.com', 'Demo1234!', 'rm'));
    clientEmail = `prep-complete-${Date.now()}@e2e.local`;
    const client = await seedClient(request, headers, clientEmail);

    // First saved version is incomplete...
    await uploadDraft(request, headers, client.clientId, 'test_fail.pdf');
    // ...then replaced with a complete one (step 4).
    const replaced = await uploadDraft(request, headers, client.clientId, 'test_pass.pdf');
    expect(replaced.ok()).toBe(true);
    expect((await replaced.json()).complete).toBe(true);

    let state = await (await request.get(`/api/clients/${client.clientId}/contract-preparation`, { headers })).json();
    expect(state.openIssues).toBe(0);
    expect(state.canSubmitFinal).toBe(true);
    // The superseded saved version is kept, not overwritten.
    expect(state.draft.versionCount).toBeGreaterThanOrEqual(1);

    // 5. Submit for final download.
    const submit = await request.post(`/api/clients/${client.clientId}/contract-draft/submit`, { headers });
    expect(submit.ok()).toBe(true);

    state = await (await request.get(`/api/clients/${client.clientId}/contract-preparation`, { headers })).json();
    expect(state.final).toBeTruthy();

    // Final is downloadable, and the blank + saved version both still exist.
    for (const docId of [state.blank.docId, state.draft.docId, state.final.docId]) {
      const dl = await request.get(`/api/clients/${client.clientId}/documents/${docId}/download`, { headers });
      expect(dl.ok(), `download failed for ${docId}`).toBe(true);
    }
  });

  test('rejects unsupported file types and enforces RM scoping', async ({ request }) => {
    const rmHeaders = headersFor(await login(request, 'rm@demo.com', 'Demo1234!', 'rm'));
    clientEmail = `prep-scope-${Date.now()}@e2e.local`;
    const client = await seedClient(request, rmHeaders, clientEmail);

    const badType = await request.post(`/api/clients/${client.clientId}/contract-draft`, {
      headers: rmHeaders,
      multipart: { file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('nope') } },
    });
    expect(badType.status()).toBe(415);

    // A client account may not touch another client's contract preparation.
    const clientHeaders = headersFor(await login(request, 'client@demo.com', 'Demo1234!', 'client'));
    const forbidden = await request.get(`/api/clients/${client.clientId}/contract-preparation`, { headers: clientHeaders });
    expect(forbidden.status()).toBe(403);

    // Compliance keeps its broader access.
    const compHeaders = headersFor(await login(request, 'compliance@demo.com', 'Demo1234!', 'compliance'));
    const allowed = await request.get(`/api/clients/${client.clientId}/contract-preparation`, { headers: compHeaders });
    expect(allowed.ok()).toBe(true);
  });
});
