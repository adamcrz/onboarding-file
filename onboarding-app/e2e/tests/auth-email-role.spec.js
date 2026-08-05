const { test, expect } = require('@playwright/test');
const { deleteE2eTestUsers, deleteAccountByEmailAndRole } = require('../helpers/dbTestUsers');

// Business rule: an account is unique per (email, role) — the same email may
// hold one account per role category (e.g. an RM account AND a Client
// account), but never two accounts in the same category. Public
// self-registration always creates a 'client' account regardless of what a
// caller sends for `role`.

test.describe('Registration: one account per email per role category', () => {
  test.afterAll(async () => {
    await deleteE2eTestUsers();
  });

  test('registering twice with the same email is rejected', async ({ request }) => {
    const email = `dupe-${Date.now()}@e2e.local`;
    const first = await request.post('/api/auth/register', {
      data: { name: 'First', email, password: 'Testpass1' },
    });
    expect(first.ok()).toBe(true);

    const second = await request.post('/api/auth/register', {
      data: { name: 'Second', email, password: 'Testpass1' },
    });
    expect(second.ok()).toBe(false);
    const body = await second.json();
    expect(body.error).toMatch(/already exists/i);
  });

  test('a caller-supplied role is ignored — self-registration always creates a client account', async ({ request }) => {
    const email = `sneaky-${Date.now()}@e2e.local`;
    const res = await request.post('/api/auth/register', {
      data: { name: 'Sneaky', email, password: 'Testpass1', role: 'compliance' },
    });
    expect(res.ok()).toBe(true);

    // Logging in on the compliance portal must fail — no such account exists.
    const complianceLogin = await request.post('/api/auth/login', {
      data: { email, password: 'Testpass1', role: 'compliance' },
    });
    expect(complianceLogin.ok()).toBe(false);
  });

  test('the same email already used by an RM account can still register as a client', async ({ request }) => {
    // rm@demo.com is a seeded demo RM account — registering it fresh as a
    // client (a different category) must succeed, not be blocked as a dupe.
    const res = await request.post('/api/auth/register', {
      data: { name: 'RM As Client', email: 'rm@demo.com', password: 'Testpass1' },
    });
    expect(res.ok()).toBe(true);

    // But a second client registration for that same email must now fail.
    const dupe = await request.post('/api/auth/register', {
      data: { name: 'RM As Client Again', email: 'rm@demo.com', password: 'Testpass1' },
    });
    expect(dupe.ok()).toBe(false);

    // Clean-up: this test reuses the real demo email, so remove the extra
    // client account it created (leave the seeded RM account untouched).
    await deleteAccountByEmailAndRole('rm@demo.com', 'client');
  });
});

test.describe('Login: portal-scoped account lookup', () => {
  test('correct portal + correct password succeeds', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'rm' },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.user.role).toBe('rm');
  });

  test('wrong portal with credentials matching a different-category account gets a helpful redirect, not a silent login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'rm@demo.com', password: 'Demo1234!', role: 'compliance' },
    });
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error).toMatch(/Rel\. Manager portal/i);
  });

  test('wrong password on the correct portal is a generic invalid-credentials error (no account enumeration)', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'rm@demo.com', password: 'not-the-real-password', role: 'rm' },
    });
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error).toMatch(/invalid email or password/i);
  });
});
