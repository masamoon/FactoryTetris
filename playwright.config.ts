import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: ['browser.spec.ts', 'asteroid.browser.spec.ts', 'rockhopper.browser.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:8084',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Optional: point at a preinstalled Chromium (e.g. CHROMIUM_PATH=/opt/pw-browsers/chromium).
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8084',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
