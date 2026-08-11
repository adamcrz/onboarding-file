// Performs a real login against the backend using the auto-seeded demo
// accounts (see backend/server.js autoSeed) — this yields a genuine JWT, which
// relevant endpoints now require (RM/Compliance data is server-side scoped to
// the authenticated identity, so an unauthenticated session-flags-only demo
// mode can no longer see any real records).
const DEMO_CREDENTIALS = {
  compliance: { email: 'compliance@demo.com', password: 'Demo1234!' },
  rm:         { email: 'rm@demo.com',         password: 'Demo1234!' },
  client:     { email: 'client@demo.com',     password: 'Demo1234!' },
};

async function demoLogin(page, role) {
  const creds = DEMO_CREDENTIALS[role];
  if (!creds) throw new Error(`No demo credentials configured for role "${role}"`);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.click(`.role-portal-${role}`);
  await page.fill('#login-email', creds.email);
  await page.fill('#login-password', creds.password);
  await page.click('#login-btn');
  await page.waitForSelector('#sidebar-nav', { timeout: 15000 });
  await page.waitForTimeout(400);
}

module.exports = { demoLogin };
