// FandomVerse: lib/site/client-base-path.ts is the base path of client modules (they never import lib/site/base-path.ts). Its
// BASE_PATH is the constant Next inlines ('' on kpop and the hub, '/anime' on the anime build) and its withClientBase gives the
// answer of prefixBasePath of base-path.ts for that base path, so the client and the server address a path the same way.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { prefixBasePath } from './base-path';

const PATHS = [
  '/', '/?a=1', '/#top', '/q/x', '/q/x?y=1#z', '/mascot/mascot-default.png', '/idols/BTS%20(1).jpg', '/anime', '/anime/q/x',
  '/anime?a=1', '/anime#h', '/animex', '/anime-mix-quiz', 'https://cdn.example.com/a.png', '//cdn.example.com/a.png',
  'data:image/png;base64,AAAA', 'blob:https://fandomverse.org/1', 'relative.png', '', '#frag',
];

async function load(base: string | undefined): Promise<typeof import('./client-base-path')> {
  vi.resetModules();
  if (base !== undefined) vi.stubEnv('__NEXT_ROUTER_BASEPATH', base);
  return import('./client-base-path');
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('client-base-path', () => {
  it('kpop and the hub (no base path): BASE_PATH is empty and every path comes back as it is', async () => {
    const m = await load(undefined);
    expect(m.BASE_PATH).toBe('');
    for (const p of PATHS) expect(m.withClientBase(p), p).toBe(p);
  });

  it('the anime build (/anime): withClientBase is prefixBasePath of lib/site/base-path.ts, and applying it twice changes nothing', async () => {
    const m = await load('/anime');
    expect(m.BASE_PATH).toBe('/anime');
    for (const p of PATHS) {
      expect(m.withClientBase(p), p).toBe(prefixBasePath('/anime', p));
      expect(m.withClientBase(m.withClientBase(p)), p).toBe(m.withClientBase(p));
    }
    expect(m.withClientBase('/mascot/mascot-default.png')).toBe('/anime/mascot/mascot-default.png');
    expect(m.withClientBase('/')).toBe('/anime');
  });
});
