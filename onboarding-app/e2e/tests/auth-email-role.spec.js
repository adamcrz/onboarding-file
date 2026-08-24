const { test, expect } = require('@playwright/test');
const { deleteE2eTestUsers, deleteAccountByEmailAndRole } = require('../helpers/dbTestUsers');

// Public registration creates client accounts only; staff identities are
// trusted roles and must be provisioned administratively. Email uniqueness
// stays scoped per role, so a staff email can still have a client account.

test.describe('Registration: public client accounts only', () => {
  test.afterAll(async () => {
    await deleteE2eTestUsers();
  });

  test('registering twice with the same email and role is rejected', async ({ request }) => {
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

  test('caller-selected staff or unknown roles are rejected', async ({ request }) => {
    const email = `sneaky-${Date.now()}@e2e.local`;
    for (const role of ['rm', 'compliance', 'compliance_external', 'super-admin']) {
      const response = await request.post('/api/auth/register', {
        data: { name: 'Sneaky', email, password: 'Testpass1', role },
      });
      expect(response.status()).toBe(403);
      expect((await response.json()).error).toMatch(/staff accounts/i);
    }
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
