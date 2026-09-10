import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './build/test-results-godot',
  testMatch: '**/godot.e2e.ts',
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4180',
    headless: process.env.GODOT_BROWSER_HEADED !== '1',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: ['--enable-unsafe-swiftshader', ...(process.env.GODOT_BROWSER_ANGLE ? ['--use-gl=angle', `--use-angle=${process.env.GODOT_BROWSER_ANGLE}`, '--ignore-gpu-blocklist'] : [])],
        },
      },
    },
    { name: 'firefox', use: { browserName: 'firefox', launchOptions: { firefoxUserPrefs: { 'webgl.force-enabled': true } } } },
  ],
  webServer: {
    command: 'npm run godot:serve',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: !process.env.CI,
  },
});
