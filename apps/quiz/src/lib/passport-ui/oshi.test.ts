// Run O1, lot (b), lane P1: the oshi rule. A character above the reader's spoiler progress cannot be picked, and nothing is
// written when it is refused; a reached character is one upsert on favourite_characters (one row per series).
import { describe, expect, it } from 'vitest';

import { canPickOshi, clearOshi, pickOshi } from './oshi';

import type { OshiCharacter, OshiDb } from './oshi';

const open: OshiCharacter = { id: 1, slug: 'gojo', name: 'Gojo', spoiler_level: 0 };
const arc3: OshiCharacter = { id: 2, slug: 'sukuna', name: 'Sukuna', spoiler_level: 3 };
const arc9: OshiCharacter = { id: 3, slug: 'late', name: 'Late', spoiler_level: 9 };

function db(error: unknown = null): OshiDb & { writes: Array<{ op: string; row?: Record<string, unknown>; opts?: unknown }> } {
  const writes: Array<{ op: string; row?: Record<string, unknown>; opts?: unknown }> = [];
  return {
    writes,
    from: () => ({
      upsert: async (row, opts) => { writes.push({ op: 'upsert', row, opts }); return { error }; },
      delete: () => ({ eq: () => ({ eq: async () => { writes.push({ op: 'delete' }); return { error }; } }) }),
    }),
  };
}

describe('canPickOshi', () => {
  it('a character with no spoiler level is always open', () => {
    expect(canPickOshi(open, { arc: 0, scope: 'anime' })).toBe(true);
  });
  it('a character is open from the arc it is revealed at', () => {
    expect(canPickOshi(arc3, { arc: 2, scope: 'anime' })).toBe(false);
    expect(canPickOshi(arc3, { arc: 3, scope: 'anime' })).toBe(true);
    expect(canPickOshi(arc9, { arc: 3, scope: 'manga' })).toBe(false);
    expect(canPickOshi(arc9, { arc: 9999, scope: 'manga' })).toBe(true);
  });
});

describe('pickOshi', () => {
  it('refuses a character above the progress and writes nothing', async () => {
    const d = db();
    const r = await pickOshi(d, { userId: 'u', groupId: 7, character: arc9, progress: { arc: 3, scope: 'anime' } });
    expect(r).toEqual({ ok: false, reason: 'spoiler' });
    expect(d.writes).toEqual([]);
  });
  it('writes one upsert per series for a reached character', async () => {
    const d = db();
    const r = await pickOshi(d, { userId: 'u', groupId: 7, character: arc3, progress: { arc: 3, scope: 'anime' } });
    expect(r).toEqual({ ok: true });
    expect(d.writes).toEqual([{ op: 'upsert', row: { user_id: 'u', group_id: 7, character_id: 2 }, opts: { onConflict: 'user_id,group_id' } }]);
  });
  it('reports a failed write', async () => {
    expect(await pickOshi(db({ message: 'rls' }), { userId: 'u', groupId: 7, character: open, progress: { arc: 0, scope: 'anime' } })).toEqual({ ok: false, reason: 'error' });
  });
});

describe('clearOshi', () => {
  it('deletes the row of the series', async () => {
    const d = db();
    expect(await clearOshi(d, { userId: 'u', groupId: 7 })).toEqual({ ok: true });
    expect(d.writes).toEqual([{ op: 'delete' }]);
    expect(await clearOshi(db({ message: 'x' }), { userId: 'u', groupId: 7 })).toEqual({ ok: false, reason: 'error' });
  });
});
