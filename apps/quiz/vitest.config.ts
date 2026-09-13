import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Unit tests only. Playwright specs live in e2e/*.spec.ts and are run by
// `test:e2e` (playwright), never by vitest. The `@/` alias mirrors tsconfig so
// isomorphic lib modules that import a sibling via `@/lib/...` resolve here too.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'e2e/**', '.next/**'],
  },
});
