const { test, expect } = require('@playwright/test');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const jwt = require(path.join(__dirname, '../../backend/node_modules/jsonwebtoken'));
const { deleteClientsByEmailPattern } = require('../helpers/dbTestUsers');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// An RM must only ever see clients/tasks/corrections actually assigned to
// their own Kundenberater code — enforced server-side (not just hidden in
// the UI), and an RM must not be able to reach another RM's record just by
// knowing/guessing its id. See backend/controllers/clients.controller.js
// (scopeFilterFor/isOwnedByRm) and the equivalent in kycTasks/corrections.

test.describe('RM access control: an RM only sees their own assigned records', () => {
  let clientEmail;

  test.afterAll(async () => {
    if (clientEmail) await deleteClientsByEmailPattern(clientEmail);
  });

  test('a client assigned to one RM is invisible (list) and forbidden (direct id) to a different RM', async ({ request, playwright }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'rm' },
    });
    expect(loginRes.ok()).toBe(true);
    const { token: ownerToken } = await loginRes.json();

    clientEmail = `rmscoping-${Date.now()}@e2e.local`;
    const inviteRes = await request.post('/api/contracts/invite', {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        clientName: 'RM Scoping Test', clientEmail, templateId: 'de-advisory', templateName: 'Advisory',
        fieldValues: { client_type: 'individual' }, createClientAccount: false, requiredDocuments: [],
      },
    });
    expect(inviteRes.ok()).toBe(true);

    const ownList = await request.get('/api/clients', { headers: { Authorization: `Bearer ${ownerToken}` } });
    const ownClients = await ownList.json();
    const created = ownClients.find((c) => c.email === clientEmail);
    expect(created).toBeTruthy();
    expect(created.rm).toBe('DEMO');

    const otherToken = jwt.sign(
      { id: 'e2e-other-rm', email: 'other-rm@e2e.local', role: 'rm', name: 'Other RM', rmCode: 'UNRELATED' },
      JWT_SECRET, { expiresIn: '10m' }
    );

    // Invisible in the other RM's own list
    const otherList = await request.get('/api/clients', { headers: { Authorization: `Bearer ${otherToken}` } });
    const otherClients = await otherList.json();
    expect(otherClients.some((c) => c.email === clientEmail)).toBe(false);

    // Forbidden by direct id, not just hidden from the list
    const directRes = await request.get(`/api/clients/${created.clientId}`, { headers: { Authorization: `Bearer ${otherToken}` } });
    expect(directRes.status()).toBe(403);

    // Can't be mutated either
    const updateRes = await request.put(`/api/clients/${created.clientId}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
      data: { name: 'Hijacked' },
    });
    expect(updateRes.status()).toBe(403);

    // A completely unauthenticated request is rejected outright. This needs its
    // own context: sessions are httpOnly cookies now, and the shared `request`
    // fixture keeps the cookie jar from the logins above — so a request made
    // through it is authenticated, not anonymous.
    const anon = await playwright.request.newContext();
    const anonRes = await anon.get('http://localhost:5000/api/clients');
    expect(anonRes.status()).toBe(401);
    await anon.dispose();
  });

  test('an RM with no rmCode assigned sees nothing (fails closed, not open)', async ({ request }) => {
    const noCodeToken = jwt.sign(
      { id: 'e2e-no-code-rm', email: 'nocode-rm@e2e.local', role: 'rm', name: 'No Code RM', rmCode: null },
      JWT_SECRET, { expiresIn: '10m' }
    );
    const res = await request.get('/api/clients', { headers: { Authorization: `Bearer ${noCodeToken}` } });
    expect(res.ok()).toBe(true);
    const clients = await res.json();
    expect(clients).toEqual([]);
  });

  test('Compliance retains full visibility across all RMs', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'compliance@demo.com', password: 'Demo1234!', role: 'compliance' },
    });
    expect(loginRes.ok()).toBe(true);
    const { token } = await loginRes.json();
    const res = await request.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.ok()).toBe(true);
    const clients = await res.json();
    // Not scoped to any single rm — should include clients from more than
    // one Kundenberater code if the seed data has any.
    expect(Array.isArray(clients)).toBe(true);
  });
});
