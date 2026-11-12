import { defineConfig, devices } from '@playwright/test';

/**
 * Two kinds of UI test:
 *  - full-stack (*.e2e.spec.ts): real Angular app + real Kotlin host-server.
 *  - mocked (*.mocked.spec.ts): real Angular app, API faked in the browser, for error cases.
 *
 * `npm run e2e` runs both and starts both servers.
 * `npm run e2e:mocked` runs only the mocked tests and does not need Java.
 */
const mockOnly = Boolean(process.env['E2E_MOCK_ONLY']);

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mocked', testMatch: /.*\.mocked\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    ...(mockOnly
      ? []
      : [{ name: 'full-stack', testMatch: /.*\.e2e\.spec\.ts/, use: { ...devices['Desktop Chrome'] } }]),
  ],
  webServer: [
    ...(mockOnly
      ? []
      : [
          {
            // Always a fresh server, so the demo balance starts at ฿52,300 (stop any server already on 8080).
            command: './gradlew :host-server:run',
            cwd: '..',
            url: 'http://localhost:8080/host/v1/loan-eligibility', // 401 without a token counts as "up"
            timeout: 300_000,
            reuseExistingServer: false,
          },
        ]),
    {
      command: 'npm start',
      url: 'http://localhost:4200',
      timeout: 120_000,
      reuseExistingServer: !process.env['CI'],
    },
  ],
});
