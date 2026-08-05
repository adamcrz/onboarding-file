// Enters the app in "demo" mode (no real token) for a given role, matching
// this app's own offline/demo fallback. This keeps the rich mock client
// dataset (Acme Corporation, Chen Wei, etc.) that features like KYC/Document
// Corrections are built around, instead of the near-empty real backend data
// a genuine login would load.
async function demoLogin(page, role) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((r) => {
    localStorage.setItem('sessionRole', r);
    localStorage.setItem('sessionActive', '1');
  }, role);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
}

module.exports = { demoLogin };
