import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.live.spec.ts',
  fullyParallel: false,
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'Desktop Chromium', use: { ...devices['Desktop Chrome'] } }],
})
