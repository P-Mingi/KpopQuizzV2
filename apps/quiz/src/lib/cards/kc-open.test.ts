// KpopCards: "Open another" on /kpopcards/open/all sends the player to the SAME address, so the opening needs its own round to draw the next pack
// (the freeze of 2026-11-22: the page kept the old cards with the buttons locked, because the key of the opening had not changed).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { nextSpec, runKey, specOf } from './kc-open';

describe('the next opening', () => {
  const all = specOf({ segments: ['all'] })!;
  it('"open another" from /open/all is the same spec, so only the round tells the two openings apart', () => {
    expect(nextSpec(all, 'stock')).toEqual(all);
    expect(runKey(nextSpec(all, 'stock'), 0)).toBe(runKey(all, 0));
    expect(runKey(nextSpec(all, 'stock'), 1)).not.toBe(runKey(all, 0));
  });
  it('keeps the theme for one pack, opens five of "all", and leaves a daily or demo opening for a plain pack', () => {
    expect(nextSpec({ kind: 'theme', theme: 'girls', packs: 1 }, 'stock')).toEqual({ kind: 'theme', theme: 'girls', packs: 1 });
    expect(nextSpec({ kind: 'theme', theme: 'girls', packs: 1 }, 'stock5')).toEqual({ kind: 'theme', theme: 'all', packs: 5 });
    expect(nextSpec({ kind: 'theme', theme: 'all', packs: 5 }, 'stock5')).toEqual({ kind: 'theme', theme: 'all', packs: 5 });
    expect(nextSpec({ kind: 'daily' }, 'stock')).toEqual(all);
    expect(nextSpec({ kind: 'demo' }, 'stock')).toEqual(all);
  });
  it('the mount draws again on a new round and drops the old cards, instead of waiting for the address to change', () => {
    const src = readFileSync(new URL('../../components/cards/opening-mount.tsx', import.meta.url), 'utf8');
    expect(src).toContain('runKey(run.spec, run.round)');
    expect(src).toContain('setDealt(null)');
  });
});
