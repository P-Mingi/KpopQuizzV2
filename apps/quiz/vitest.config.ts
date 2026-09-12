import { defineConfig } from 'vitest/config';

// Unit tests only. Playwright specs live in e2e/*.spec.ts and are run by
// `test:e2e` (playwright), never by vitest.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'e2e/**', '.next/**'],
  },
});
