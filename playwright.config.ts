import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  // Directory where test files are located
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Number of workers
  workers: 1,

  // Reporter configuration - HTML report as required
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  // Global test settings
  use: {
    // Base URL for OrangeHRM demo application
    baseURL: process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'on-first-retry',

    // Global timeout for each action
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Run tests in headless mode by default
    headless: true,
  },

  // Global test timeout
  timeout: 120000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
