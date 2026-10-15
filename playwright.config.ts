import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true, forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev', url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    env: { PORT: '3100', VITE_FIREBASE_PROJECT_ID: 'demo-codex-lab', VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_AUTH_DOMAIN: 'demo-codex-lab.firebaseapp.com', VITE_FIREBASE_APP_ID: 'demo-app', VITE_FIREBASE_DATABASE_ID: '(default)' },
  },
});
