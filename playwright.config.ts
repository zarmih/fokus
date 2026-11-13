import { defineConfig, devices } from '@playwright/test';

// E2E runs against the production build (vite preview, base /fokus/), Russian locale, Moscow time.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/fokus/',
    ...devices['Pixel 7'],
    browserName: 'chromium',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/fokus/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
