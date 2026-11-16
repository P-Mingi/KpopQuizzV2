import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Unit tests only. Playwright specs live in e2e/*.spec.ts and are run by
// `test:e2e` (playwright), never by vitest. The `@/` alias mirrors tsconfig so
// isomorphic lib modules that import a sibling via `@/lib/...` resolve here too.
//
// Two projects, one command (`vitest run` runs both):
//  - heavy: the files that boot a database (PGlite, or a real Postgres cluster) or run a
//    large simulation. Each one is CPU and memory hungry for tens of seconds, so they run
//    with a small worker cap, after the light project has finished. Run next to the light
//    files at full width they starve the static-scan tests (which read the whole src tree)
//    past their 5 s timeout. Membership is by content, so a new database test lands here
//    on its own.
//  - light: everything else, at a moderate worker cap.
// Timeouts stay at vitest's defaults (5 s test, 10 s hook). A test that needs more sets its own
// (vi.setConfig at the top of its file, or a third argument), with the measured time next to it.
// src/test-support/fs-memo.setup.ts keeps the tree scanners from re-reading src/ in every `it`.
const HEAVY_MARK = /PGlite|pg_ctl|initdb/;
const HEAVY_NAMES = ['src/lib/kpopcards/simulation.test.ts', 'src/lib/cards/draw.test.ts'];

const root = fileURLToPath(new URL('.', import.meta.url));
const all = readdirSync(root + 'src', { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => 'src/' + f.split('\\').join('/'))
  .sort();
// include entries are globs: escape the characters a route folder such as (site) or [slug] carries.
const asGlob = (f: string): string => f.replace(/[()[\]{}!*?+@]/g, '\\$&');
const heavy = all.filter((f) => HEAVY_NAMES.includes(f) || HEAVY_MARK.test(readFileSync(root + f, 'utf8')));
const heavySet = new Set(heavy);
const light = all.filter((f) => !heavySet.has(f));

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'light',
          environment: 'node',
          setupFiles: ['./src/test-support/fs-memo.setup.ts'],
          include: light.map(asGlob),
          maxWorkers: 4,
          sequence: { groupOrder: 1 },
        },
      },
      {
        extends: true,
        test: {
          name: 'heavy',
          environment: 'node',
          setupFiles: ['./src/test-support/fs-memo.setup.ts'],
          include: heavy.map(asGlob),
          maxWorkers: 2,
          sequence: { groupOrder: 2 },
        },
      },
    ],
  },
});
