import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// C3-002: with NEXT_PUBLIC_BT_TRACKING unset, /blindtest, /pt/blindtest and every
// /blindtest/<mode> must list no tracking chunk (server HTML identical to main).
// So the legacy games never import lib/tracking at load time: only types, plus
// one dynamic import() behind the inlined switch, which the bundler emits as a
// separate async chunk that is fetched only when tracking is on.

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const FILES = {
  'blindtest-game.tsx': read('./blindtest-game.tsx'),
  'blind-test-player.tsx': read('./blind-test-player.tsx'),
  'use-bt-tracking.ts': read('./use-bt-tracking.ts'),
};

/** Every static import / export-from statement (multi-line aware). */
function staticImports(src: string): string[] {
  return [...src.matchAll(/^\s*(import|export)\b[^;]*?\bfrom\s*['"][^'"]+['"]/gms)].map((m) => m[0].trim());
}

const TRACKING = /['"](@\/lib\/tracking\/[^'"]*|@\/lib\/anon-id|(\.\.\/)+lib\/tracking\/[^'"]*)['"]/;

describe('legacy blindtest games load no tracking code statically (C3-002)', () => {
  for (const [name, src] of Object.entries(FILES)) {
    it(`${name}: no value import of lib/tracking or lib/anon-id`, () => {
      const offending = staticImports(src).filter((s) => TRACKING.test(s) && !/^\s*(import|export)\s+type\b/.test(s));
      expect(offending).toEqual([]);
    });
  }

  it('the games reach tracking only through use-bt-tracking', () => {
    expect(FILES['blindtest-game.tsx']).toMatch(/from '\.\/use-bt-tracking'/);
    expect(FILES['blind-test-player.tsx']).toMatch(/from '\.\/use-bt-tracking'/);
  });

  it('use-bt-tracking loads the module once, through a dynamic import behind the inlined switch', () => {
    const src = FILES['use-bt-tracking.ts'];
    const dynamic = [...src.matchAll(/(?<!typeof )import\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
    expect(dynamic).toEqual(['@/lib/tracking/bt']);
    // withBt returns before the import when the switch is off.
    const body = src.slice(src.indexOf('function withBt'), src.indexOf("btLoading = import("));
    expect(body).toMatch(/if \(!BT_ON\) return;/);
    // open() opens nothing when the switch is off.
    expect(src).toMatch(/finish\(false\);\s*if \(!BT_ON\) return;/);
  });

  it('the inlined switch is the same test as BT_TRACKING in bt-shared.ts', () => {
    const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
    const shared = read('../../lib/tracking/bt-shared.ts').match(/export const BT_TRACKING: boolean =([^;]+);/);
    const local = FILES['use-bt-tracking.ts'].match(/const BT_ON: boolean =([^;]+);/);
    expect(shared?.[1]).toBeTruthy();
    expect(local && norm(local[1]!)).toBe(shared && norm(shared[1]!));
  });
});
