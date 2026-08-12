const { test, expect } = require('@playwright/test');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const jwt = require(path.join(__dirname, '../../backend/node_modules/jsonwebtoken'));
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Real file persistence for the contract document package — sendInvite now
// generates and saves the filled contract to disk (not just a placeholder
// document entry with no file), an upload for that same document slot
// replaces/versions it instead of creating an unrelated document, and the
// whole package can be downloaded as one zip. Also covers RM-scoping on the
// new document endpoints, per the access-control rules established earlier.

async function loginAs(request, email, password, role) {
  const res = await request.post('/api/auth/login', { data: { email, password, role } });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  return body.token;
}

test.describe('Contract document storage: generation, download, versioning, full package', () => {
  let clientEmail;

  test.afterAll(async () => {
    if (clientEmail) await deleteClientsByEmailPattern(clientEmail);
  });

  test('sendInvite persists a real, downloadable contract; a second upload versions it in place; RM scoping holds; full package downloads', async ({ request }) => {
    const rmToken = await loginAs(request, 'rm@demo.com', 'Demo1234!', 'rm');

    clientEmail = `docstorage-${Date.now()}@e2e.local`;
    const inviteRes = await request.post('/api/contracts/invite', {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: {
        clientName: 'Doc Storage Test', clientEmail, templateId: 'de-advisory', templateName: 'Advisory',
        fieldValues: { client_type: 'individual', client_first_name: 'Doc', client_last_name: 'Storage' },
        createClientAccount: false, requiredDocuments: [],
      },
    });
    expect(inviteRes.ok()).toBe(true);

    const clientsRes = await request.get('/api/clients', { headers: { Authorization: `Bearer ${rmToken}` } });
    const clients = await clientsRes.json();
    const client = clients.find((c) => c.email === clientEmail);
    expect(client).toBeTruthy();
    const templateDoc = client.documents.find((d) => d.type === 'Template');
    expect(templateDoc).toBeTruthy();
    expect(templateDoc.filePath).toBeTruthy();

    // Real, non-trivial file — not an empty placeholder
    const downloadRes = await request.get(
      `/api/clients/${client.clientId}/documents/${templateDoc.docId}/download`,
      { headers: { Authorization: `Bearer ${rmToken}` } }
    );
    expect(downloadRes.ok()).toBe(true);
    const originalBuffer = await downloadRes.body();
    expect(originalBuffer.length).toBeGreaterThan(1000);

    // RM scoping: an RM whose rmCode doesn't match this client's assigned
    // rm (always 'DEMO' here, since rm@demo.com created it) must be refused,
    // by client id directly — not just hidden from a list view. The identity
    // only needs a valid signature to be honoured, so mint one directly
    // rather than a real registration + email-verification round trip.
    expect(client.rm).toBe('DEMO');
    const otherRmToken = jwt.sign(
      { id: 'e2e-other-rm', email: 'other-rm@e2e.local', role: 'rm', name: 'Other RM', rmCode: 'UNRELATED' },
      JWT_SECRET, { expiresIn: '10m' }
    );
    const forbiddenRes = await request.get(
      `/api/clients/${client.clientId}/documents/${templateDoc.docId}/download`,
      { headers: { Authorization: `Bearer ${otherRmToken}` } }
    );
    expect(forbiddenRes.status()).toBe(403);

    // Upload a corrected/signed version for the SAME document slot
    const fakePdf = Buffer.from('%PDF-1.4 fake signed contract for e2e testing');
    const uploadRes = await request.post(`/api/clients/${client.clientId}/documents/upload`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      multipart: {
        file: { name: 'signed.pdf', mimeType: 'application/pdf', buffer: fakePdf },
        docId: templateDoc.docId,
        name: 'Signed Contract',
        type: 'Signed Contract',
      },
    });
    expect(uploadRes.ok()).toBe(true);
    const uploadBody = await uploadRes.json();
    expect(uploadBody.docId).toBe(templateDoc.docId); // same slot, not a new document
    expect(uploadBody.client.documents.length).toBe(client.documents.length); // no unrelated duplicate

    const updatedDoc = uploadBody.client.documents.find((d) => d.docId === templateDoc.docId);
    expect(updatedDoc.versions.length).toBe(1); // the original generated contract preserved as history
    expect(updatedDoc.versions[0].filePath).toBe(templateDoc.filePath);
    expect(updatedDoc.filePath).not.toBe(templateDoc.filePath); // now points at the new upload

    const redownloadRes = await request.get(
      `/api/clients/${client.clientId}/documents/${templateDoc.docId}/download`,
      { headers: { Authorization: `Bearer ${rmToken}` } }
    );
    expect(redownloadRes.ok()).toBe(true);
    const newBuffer = await redownloadRes.body();
    expect(newBuffer.toString()).toContain('fake signed contract for e2e testing');

    // Full package — a real zip, not a stub
    const packageRes = await request.get(`/api/clients/${client.clientId}/documents/package`, {
      headers: { Authorization: `Bearer ${rmToken}` },
    });
    expect(packageRes.ok()).toBe(true);
    const zipBuffer = await packageRes.body();
    expect(zipBuffer.slice(0, 2).toString()).toBe('PK');
  });
});
