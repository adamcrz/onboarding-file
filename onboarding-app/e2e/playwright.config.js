// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// The app server is started/managed manually (`npm run dev` in backend/),
// not by Playwright — tests assume it's already listening on baseURL.
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--no-sandbox'] },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 1000 } } },
  ],
});
