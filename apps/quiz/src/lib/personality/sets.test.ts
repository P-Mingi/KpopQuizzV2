// Run O1, lane PERS: the series with a quiz, read for the sitemap of the anime site; the quiz result a reader sends is recomputed on
// the server from the series' own rows (the save route reads getWmaData, which is the series quiz on the anime build).
import { afterEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from '@/lib/site/test-recorder';

import { saveResult } from './save';
import { countSets, listSeriesSets } from './sets';

import type { SeriesWmaData } from './data';
import type { Axes } from './engine';
import type { SaveStore } from './save';

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => state.db,
  createServiceRoleClient: () => state.db,
}));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); state.db = null; });

const rows = (slug: string, n: number): Array<{ groups: { slug: string } }> => Array.from({ length: n }, () => ({ groups: { slug } }));

describe('countSets', () => {
  it('lists the series with six active profiles at least, A to Z', () => {
    expect(countSets([...rows('naruto', 5), ...rows('death-note', 6), ...rows('bleach', 8)])).toEqual(['bleach', 'death-note']);
    expect(countSets([...rows('naruto', 5)])).toEqual([]);
    expect(countSets([...rows('naruto', 2)], 2)).toEqual(['naruto']);
  });

  it('reads the group as an object or a one item array, and ignores a row without a valid slug', () => {
    const six = (g: unknown) => Array.from({ length: 6 }, () => ({ groups: g as { slug?: unknown } }));
    expect(countSets(six([{ slug: 'death-note' }]))).toEqual(['death-note']);
    expect(countSets([...six(null), ...six({ slug: 'No Such/Slug' }), ...six({ slug: 3 }), ...six({})])).toEqual([]);
  });
});

describe('listSeriesSets', () => {
  it('reads the active profiles of the anime site only, past the 1000 row cap, and throws on a failed read', async () => {
    const db = recordingDb({ personality_profiles: rows('death-note', 6) });
    expect(await listSeriesSets(db)).toEqual(['death-note']);
    expect(db.scopedTo('personality_profiles', 'anime')).toBe(true);
    expect(db.calls('personality_profiles', 'eq')).toContainEqual(['active', true]);
    expect(db.calls('personality_profiles', 'range')).toEqual([[0, 999]]);
    const failing = new Proxy({}, { get: (_t, prop) => (prop === 'then' ? (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(ok) : () => failing) });
    await expect(listSeriesSets({ from: () => failing })).rejects.toThrow(/boom/);
  });
});

describe('the anime sitemap lists the quiz of a series', () => {
  it('puts /which-{series}-character-are-you after the hubs and before the quizzes, on its own origin, only for a series with a quiz', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    const db = recordingDb({
      series: [{ group_id: 1 }],
      groups: [{ id: 1, slug: 'death-note', name: 'Death Note' }],
      quizzes: [{ slug: 'dn-1', created_at: '2026-10-04T00:00:00Z' }],
      personality_profiles: rows('death-note', 6),
    });
    const { REGISTRY } = await import('@/lib/site/registry');
    const { sitemapEntriesFor } = await import('@/lib/site/root-files');
    const paths = (await sitemapEntriesFor(REGISTRY.anime, db)).map((e) => e.path);
    expect(paths).toContain('/which-death-note-character-are-you');
    expect(paths.indexOf('/which-death-note-character-are-you')).toBeLessThan(paths.indexOf('/q/dn-1'));
    expect(paths.some((p) => p.includes('member-are-you'))).toBe(false);
    expect(db.scopedTo('personality_profiles', 'anime')).toBe(true);
  });

  it('lists none when no series has a quiz', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    const db = recordingDb({ series: [], groups: [], quizzes: [], personality_profiles: [] });
    const { REGISTRY } = await import('@/lib/site/registry');
    const { sitemapEntriesFor } = await import('@/lib/site/root-files');
    expect((await sitemapEntriesFor(REGISTRY.anime, db)).map((e) => e.path)).toEqual(['/', '/series']);
  });
});

describe('saving a result of a series quiz', () => {
  const AX = (energy: number): Axes => ({ energy, chaos: 50, care: 50, craft: 50, heart: 50, spotlight: 50 });
  const q = { text: 'Q', options: [{ text: 'a', weights: { energy: 0 } }, { text: 'b', weights: { energy: 5 } }] };
  const series: SeriesWmaData = {
    group: { id: 7, slug: 'death-note', name: 'Death Note', fandom: null },
    questions: new Array(8).fill(q),
    profiles: [
      { id: 'kanzo-mogi', name: 'Kanzo Mogi', axes: AX(5), lines: ['You notice.'], role: 'supporting', affiliation: null },
      { id: 'touta-matsuda', name: 'Touta Matsuda', axes: AX(90), lines: ['You smile.'], role: 'supporting', affiliation: null },
    ],
  };
  const store = (): { s: SaveStore; rows: Array<{ groupId: number; memberName: string }> } => {
    const rowsOut: Array<{ groupId: number; memberName: string }> = [];
    return { rows: rowsOut, s: { wma: async () => series, bridgeGroupId: async () => null, insert: async (r) => { rowsOut.push(r); return 'saved'; } } };
  };

  it('recomputes the character from the sheet and stores the character name under the group id of the series', async () => {
    const { s, rows: out } = store();
    const res = await saveResult({ body: { quiz: 'wma', group: 'death-note', picks: new Array(8).fill(1) }, store: s, allow: () => true });
    expect(res.body).toEqual({ saved: true, result: 'touta-matsuda', status: 'saved' });
    expect(out).toEqual([{ groupId: 7, memberName: 'Touta Matsuda' }]);
  });

  it('refuses a sheet that does not fit the eight questions, and a client that names its own result', async () => {
    const { s, rows: out } = store();
    expect((await saveResult({ body: { quiz: 'wma', group: 'death-note', picks: [1, 1, 1] }, store: s, allow: () => true })).http).toBe(400);
    const res = await saveResult({ body: { quiz: 'wma', group: 'death-note', picks: new Array(8).fill(0), result: 'touta-matsuda' }, store: s, allow: () => true });
    expect(res.body.result).toBe('kanzo-mogi');
    expect(out).toEqual([{ groupId: 7, memberName: 'Kanzo Mogi' }]);
  });
});
