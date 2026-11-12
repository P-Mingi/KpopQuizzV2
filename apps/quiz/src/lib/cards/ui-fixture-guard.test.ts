// The test fixture and its in-browser stand-in must never be reachable from a production build (CARDS_UI_FIXTURE is development only).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cardsFixtureOn } from './ui-flag';

afterEach(() => { vi.unstubAllEnvs(); });

describe('CARDS_UI_FIXTURE', () => {
  it('is honoured outside production and never in production, whatever the value', () => {
    vi.stubEnv('CARDS_UI_FIXTURE', '1');
    vi.stubEnv('NODE_ENV', 'development');
    expect(cardsFixtureOn()).toBe(true);
    for (const v of ['1', 'true', 'on', 'yes']) {
      vi.stubEnv('CARDS_UI_FIXTURE', v);
      vi.stubEnv('NODE_ENV', 'production');
      expect(cardsFixtureOn()).toBe(false);
    }
  });
  it('the catalog seam answers the real read, not the fixture, in production', async () => {
    vi.stubEnv('CARDS_UI_FIXTURE', '1');
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    vi.doMock('./catalog', () => { throw new Error('real read'); });
    const { loadCatalog } = await import('./ui-catalog');
    expect(await loadCatalog()).toBeNull(); // the real read failed: fail closed, no fixture
    vi.doUnmock('./catalog');
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n)) out.push(p);
  }
  return out;
}

describe('no production import path reaches the fixture or the mock', () => {
  const SRC = join(__dirname, '../..');
  const IMPORT = /(?:from\s*|import\s*\(\s*)['"][^'"]*ui-(?:fixture|mock-api)['"]/;
  const users = walk(SRC).filter((f) => !/ui-(fixture|mock-api)\.ts$/.test(f) && IMPORT.test(readFileSync(f, 'utf8')));
  it('only ui-catalog.ts and cards-provider.tsx import them', () => {
    expect(users.map((f) => relative(SRC, f)).sort()).toEqual(['components/cards/cards-provider.tsx', 'lib/cards/ui-catalog.ts']);
  });
  it('each does it through a dynamic import on a line behind a NODE_ENV production check (dead code in a production build)', () => {
    for (const f of users) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/^import[^\n]*(ui-fixture|ui-mock-api)/m);
      const line = src.split('\n').find((l) => /import\(\s*'[^']*(ui-fixture|ui-mock-api)'/.test(l)) ?? '';
      expect(line).toMatch(/process\.env\.NODE_ENV !== 'production'/);
    }
  });
});
