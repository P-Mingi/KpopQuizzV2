// Run O1, lot H2b: vitest config of the one-off run of every block of the home against a Supabase branch (run-dev.run.ts).
//   scripts/o1/env.sh dev -- env NEXT_PUBLIC_SITE_ID=hub pnpm -C apps/quiz exec vitest run --config e2e/o1/H2b/vitest.run.config.ts
// Not part of `vitest run` (the project config only includes src/**/*.test.ts).
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../../src', import.meta.url)) } },
  test: { environment: 'node', include: ['e2e/o1/H2b/*.run.ts'], testTimeout: 120_000 },
});
