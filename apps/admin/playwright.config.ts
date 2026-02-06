import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, '..', '..');

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const backendPort = parsePort(process.env.PLAYWRIGHT_BACKEND_PORT, 3001);
const adminPort = parsePort(process.env.PLAYWRIGHT_ADMIN_PORT, 3002);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${adminPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false, // Admin tests may have state dependencies
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  // Storage state for authenticated sessions
  projects: [
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /(?!auth\.spec\.ts).*\.spec\.ts/,
      dependencies: ['auth'],
      use: {
        storageState: './tests/e2e/.auth/admin.json',
      },
    },
  ],
  webServer: process.env.CI
    ? []
    : [
        {
          command: 'pnpm --filter @joker/backend dev',
          port: backendPort,
          reuseExistingServer: true,
          cwd: repoRoot,
          env: {
            NODE_ENV: 'test',
            PORT: String(backendPort),
          },
        },
        {
          command: `pnpm --filter @joker/admin dev -- --host 127.0.0.1 --port ${adminPort} --strictPort`,
          port: adminPort,
          reuseExistingServer: true,
          cwd: repoRoot,
          env: {
            VITE_API_URL: `http://127.0.0.1:${backendPort}`,
          },
        },
      ],
  reporter: process.env.CI ? 'github' : 'list',
});
