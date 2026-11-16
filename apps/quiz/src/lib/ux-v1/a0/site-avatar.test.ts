// Bunnyverse (review of 2026-10-28): the site's own avatar is requested under /anime on the anime build. It is prefixed once,
// at its source; its users pass it on as it is (a second prefix would ask for /anime/anime/...).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

// Scans every file of src/: the first `it` that reads the tree took 5.0 s (failed at the 5 s default) measured (8 workers, load 13) against the 5 s default. 30 s for this file.
vi.setConfig({ testTimeout: 30_000 });

const SRC = fileURLToPath(new URL('../../../', import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

async function load(base: string | undefined): Promise<string> {
  vi.resetModules();
  if (base !== undefined) vi.stubEnv('__NEXT_ROUTER_BASEPATH', base);
  return (await import('./site-avatar')).SITE_AVATAR_SRC;
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('SITE_AVATAR_SRC', () => {
  it('kpop and the hub: the mascot at the root, as before; anime: the same file under /anime', async () => {
    expect(await load(undefined)).toBe('/mascot/mascot-default.png');
    expect(await load('/anime')).toBe('/anime/mascot/mascot-default.png');
  });

  it('no user prefixes it again (BASE_PATH, withBasePath or a concatenation in front of it)', () => {
    const users = walk(SRC).filter((f) => !f.endsWith('site-avatar.ts') && readFileSync(f, 'utf8').includes('SITE_AVATAR_SRC'));
    expect(users.map((f) => relative(SRC, f)).sort()).toEqual(['components/community/ux-v1/feed-card.tsx', 'components/community/ux-v1/post-view.tsx', 'lib/ux-v1/p1/home-data.ts']);
    for (const f of users) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/(?:BASE_PATH|withBasePath|withClientBase|prefixBasePath)[^;\n]{0,12}SITE_AVATAR_SRC|\+\s*SITE_AVATAR_SRC|\}\$\{SITE_AVATAR_SRC/);
    }
  });
});
