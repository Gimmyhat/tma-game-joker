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
const frontendPort = parsePort(process.env.PLAYWRIGHT_FRONTEND_PORT, 5173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${frontendPort}`;
const socketUrl = process.env.PLAYWRIGHT_SOCKET_URL ?? `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  timeout: 30_000,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @joker/backend dev',
      port: backendPort,
      reuseExistingServer: !process.env.CI,
      cwd: repoRoot,
      env: {
        SKIP_AUTH: 'true',
        E2E_TEST: 'true',
        NODE_ENV: 'test',
        PORT: String(backendPort),
      },
    },
    {
      command: `pnpm --filter @joker/frontend dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      port: frontendPort,
      reuseExistingServer: !process.env.CI,
      cwd: repoRoot,
      env: {
        SKIP_AUTH: 'true',
        VITE_SOCKET_URL: socketUrl,
      },
    },
  ],
  reporter: 'list',
});
