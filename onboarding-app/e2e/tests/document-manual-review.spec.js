const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

// Automatic signature/checkbox verification is switched off; documents are
// reviewed by a person. These tests cover that live behaviour: an upload is
// never auto-flagged, Compliance accepts or flags it, and a flagged item
// behaves exactly like any other correction (focused item, page download,
// corrected-page upload, role scoping).
const fixture = (name) => path.join(__dirname, '..', 'fixtures', name);
const headersFor = (token) => ({ Authorization: `Bearer ${token}` });
const AUTO_VERIFY = process.env.DOCUMENT_AUTO_VERIFY === 'true';

async function login(request, email, password, role) {
  const res = await request.post('/api/auth/login', { data: { email, password, role } });
  expect(res.ok(), `login failed for ${email}/${role}`).toBe(true);
  return (await res.json()).token;
}

test.describe('Manual document review', () => {
  let clientEmail;
  let rmH; let compH; let client; let docId;

  test.beforeEach(async ({ request }) => {
    test.skip(AUTO_VERIFY, 'these cover the manual-review mode; automatic verification is enabled');
    rmH = headersFor(await login(request, 'rm@demo.com', 'Demo1234!', 'rm'));
    compH = headersFor(await login(request, 'compliance@demo.com', 'Demo1234!', 'compliance'));
    clientEmail = `manual-review-${Date.now()}@e2e.local`;
    const invite = await request.post('/api/contracts/invite', {
      headers: rmH,
      data: {
        clientName: 'Manual Review Test', clientEmail,
        templateId: 'en-disc-all-in', templateName: 'Discretionary All-In',
        fieldValues: { client_type: 'individual' }, createClientAccount: false, requiredDocuments: [],
      },
    });
    expect(invite.ok()).toBe(true);
    client = (await (await request.get('/api/clients', { headers: rmH })).json()).find((c) => c.email === clientEmail);
    docId = client.documents.find((d) => d.type === 'Template').docId;

    const up = await request.post(`/api/clients/${client.clientId}/documents/upload`, {
      headers: rmH,
      multipart: {
        file: { name: 'test_fail.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(fixture('test_fail.pdf')) },
        name: 'test_fail.pdf', type: 'Signed Contract', docId, templateId: 'en-disc-all-in',
      },
    });
    expect(up.ok()).toBe(true);
  });

  test.afterEach(async () => { if (clientEmail) await deleteClientsByEmailPattern(clientEmail); });

  test('a known-bad contract is not auto-flagged — it waits for a reviewer', async ({ request }) => {
    const all = await (await request.get('/api/corrections/documents', { headers: rmH })).json();
    expect(all.filter((c) => c.clientId === client.clientId)).toHaveLength(0);
  });

  test('Compliance can accept a document', async ({ request }) => {
    const res = await request.post(`/api/clients/${client.clientId}/documents/${docId}/approve`, { headers: compH });
    expect(res.ok()).toBe(true);
    const updated = (await (await request.get('/api/clients', { headers: rmH })).json())
      .find((c) => c.clientId === client.clientId);
    expect(updated.documents.find((d) => d.docId === docId).status).toBe('approved');
  });

  test('Compliance can flag a document, producing a focused, downloadable correction', async ({ request }) => {
    const res = await request.post(`/api/clients/${client.clientId}/documents/${docId}/flag`, {
      headers: compH, data: { issue: 'Client signature missing', page: '18' },
    });
    expect(res.ok()).toBe(true);

    const all = await (await request.get('/api/corrections/documents', { headers: rmH })).json();
    const mine = all.filter((c) => c.clientId === client.clientId);
    expect(mine).toHaveLength(1);
    const item = mine[0];
    expect(item.issue).toBe('Client signature missing');
    expect(item.page).toBe('Page 18');
    expect(item.pageFrom).toBe(18);
    expect(item.ruleKind).toBe('manual');
    expect(item.contractType).toBeTruthy();
    expect(item.remedy).toContain('page 18');
    expect(item.history.some((h) => h.action === 'flagged')).toBe(true);

    // The flagged page is downloadable on its own, like any other correction.
    const dl = await request.get(`/api/corrections/documents/${item._id}/download`, { headers: rmH });
    expect(dl.ok()).toBe(true);
    expect((await dl.body()).length).toBeGreaterThan(0);
  });

  test('flagging requires a description and rejects a bad page number', async ({ request }) => {
    const noIssue = await request.post(`/api/clients/${client.clientId}/documents/${docId}/flag`, {
      headers: compH, data: { issue: '   ', page: '3' },
    });
    expect(noIssue.status()).toBe(400);

    const badPage = await request.post(`/api/clients/${client.clientId}/documents/${docId}/flag`, {
      headers: compH, data: { issue: 'Something is wrong', page: 'eighteen' },
    });
    expect(badPage.status()).toBe(400);
  });

  test('only Compliance may accept or flag — RM and client cannot', async ({ request }) => {
    const clientH = headersFor(await login(request, 'client@demo.com', 'Demo1234!', 'client'));
    for (const headers of [rmH, clientH]) {
      const flag = await request.post(`/api/clients/${client.clientId}/documents/${docId}/flag`, {
        headers, data: { issue: 'nope', page: '1' },
      });
      expect(flag.status()).toBe(403);
      const accept = await request.post(`/api/clients/${client.clientId}/documents/${docId}/approve`, { headers });
      expect(accept.status()).toBe(403);
    }
  });
});
