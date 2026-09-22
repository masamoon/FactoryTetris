import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: ['browser.spec.ts', 'asteroid.browser.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:8084',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8084',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
