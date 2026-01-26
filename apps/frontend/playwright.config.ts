import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, '..', '..');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  webServer: [
    {
      command: 'pnpm --filter @joker/backend dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      cwd: repoRoot,
      env: {
        SKIP_AUTH: 'true',
        E2E_TEST: 'true',
      },
    },
    {
      command: 'pnpm --filter @joker/frontend dev -- --host 127.0.0.1 --port 5173 --strictPort',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      cwd: repoRoot,
      env: {
        SKIP_AUTH: 'true',
      },
    },
  ],
  reporter: 'list',
});
