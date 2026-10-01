import { afterEach, describe, expect, it, vi } from 'vitest';

import { composerLine, editorModes } from './draft';
import { feedSources } from './feed';
import { getPost } from './post';
import { badgeShown, gateVersePosts, verseScope, verseSpaceShown } from './verse-gate';

import type { FeedPost, P8Group } from './types';

// The Verse gates on /community (privacy fail-closed): the same decisions as the /verse
// pages (lib/verse/visibility: VERSE_PUBLIC must be exactly 'true'; only LIVE_SPACES,
// today 'bts', are published). Env per test with vi.stubEnv; the database is a recording
// fake (no network), so "nothing was read" is asserted, not assumed.

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => h.db,
  createServiceRoleClient: () => h.db,
  createServerClient: async () => h.db,
}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

interface Call { table: string; ops: [string, unknown[]][] }

/** A chainable, thenable query builder answering every read of `table` with rows[table]. */
function fakeDb(rows: Record<string, unknown[]>): { calls: Call[] } {
  const calls: Call[] = [];
  h.db = {
    from(table: string) {
      const rec: Call = { table, ops: [] };
      calls.push(rec);
      const list = rows[table] ?? [];
      const b: unknown = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') return (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve({ data: list, error: null, count: list.length, status: 200 }).then(ok, ko);
          if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: list[0] ?? null, error: null });
          return (...args: unknown[]) => { rec.ops.push([prop, args]); return b; };
        },
      });
      return b;
    },
  };
  return { calls };
}

const GROUPS = [
  { id: 1, name: 'BTS', slug: 'bts', fandom_name: 'ARMY' },
  { id: 2, name: 'Stray Kids', slug: 'stray-kids', fandom_name: 'STAY' },
];
const P8_GROUPS: P8Group[] = GROUPS.map((g) => ({ id: g.id, name: g.name, slug: g.slug, fandom: g.fandom_name }));
const NO_F = { likes: false, fanDebates: false, challenges: false };
const post = (kind: FeedPost['kind'], slug: string | null): Pick<FeedPost, 'kind' | 'group'> & { k: string } => ({
  kind, k: `${kind}:${slug}`, group: slug ? { id: 0, name: slug, slug, fandom: null } : null,
});
const verseTables = (calls: Call[]): string[] => calls.map((c) => c.table).filter((t) => t.startsWith('verse_'));

afterEach(() => { vi.unstubAllEnvs(); });

describe('Verse gate decisions (lib/verse/visibility rules)', () => {
  it('VERSE_PUBLIC exactly "true": live spaces only; parked and unknown spaces never', () => {
    vi.stubEnv('VERSE_PUBLIC', 'true');
    expect(verseSpaceShown('bts')).toBe(true);
    expect(verseSpaceShown('stray-kids')).toBe(false);
    expect(verseSpaceShown(null)).toBe(false);
    expect(verseScope(P8_GROUPS)).toEqual({ open: true, groupIds: [1] });
  });

  it('VERSE_PUBLIC off, absent or not exactly "true": no Verse content at all', () => {
    for (const v of ['false', '', 'TRUE', '1']) {
      vi.stubEnv('VERSE_PUBLIC', v);
      expect(verseSpaceShown('bts')).toBe(false);
      expect(verseScope(P8_GROUPS)).toEqual({ open: false, groupIds: [] });
    }
  });

  it('gateVersePosts: threads and blogs gated, play-side posts untouched', () => {
    const list = [post('thread', 'bts'), post('blog', 'bts'), post('thread', 'stray-kids'), post('blog', 'stray-kids'), post('thread', null), post('debate', 'stray-kids'), post('challenge', null)];
    vi.stubEnv('VERSE_PUBLIC', 'true');
    expect(gateVersePosts(list).map((p) => p.k)).toEqual(['thread:bts', 'blog:bts', 'debate:stray-kids', 'challenge:null']);
    vi.stubEnv('VERSE_PUBLIC', 'false');
    expect(gateVersePosts(list).map((p) => p.k)).toEqual(['debate:stray-kids', 'challenge:null']);
  });

  it('badge watch: Verse and cross-world badges only while the Verse is open', () => {
    expect(badgeShown('perfectionist_10', false)).toBe(true);
    expect(badgeShown('streak_7', false)).toBe(true);
    expect(badgeShown('essayist_1', false)).toBe(false);
    expect(badgeShown('pc_first', false)).toBe(false);
    expect(badgeShown('dual_citizen', false)).toBe(false);
    expect(badgeShown('essayist_1', true)).toBe(true);
  });

  it('editor modes: Thread and Blog only while the Verse is open; no dead door', () => {
    expect(editorModes(true, NO_F)).toEqual(['thread', 'blog', 'debate', 'challenge']);
    expect(editorModes(false, { ...NO_F, challenges: true })).toEqual(['debate', 'challenge']);
    expect(editorModes(false, NO_F)).toEqual([]);
    expect(composerLine(editorModes(true, NO_F))).toBe('Start a thread, a blog, a debate or a challenge');
    expect(composerLine(['debate', 'challenge'])).toBe('Start a debate or a challenge');
    expect(composerLine([])).toBe('');
  });
});

describe('Verse gates in the reads (recording fake database)', () => {
  const THREAD_SKZ = { id: 7, group_id: 2, slug: 't', title: 'Parked space thread', created_by: null, created_at: '2026-09-20T10:00:00Z' };
  const THREAD_BTS = { id: 1, group_id: 1, slug: 't', title: 'Live space thread', created_by: null, created_at: '2026-09-20T10:00:00Z' };
  const ESSAY_SKZ = { id: 9, group_id: 2, title: 'Parked space blog', author: 'u', content: { type: 'doc', content: [] }, cover: null, featured_at: null, created_at: '2026-09-20T10:00:00Z' };

  it('feed, Verse hidden: threads and blogs are empty and no Verse table is read', async () => {
    vi.stubEnv('VERSE_PUBLIC', 'false');
    const { calls } = fakeDb({ groups: GROUPS, verse_threads: [THREAD_BTS], verse_essays: [ESSAY_SKZ] });
    const src = feedSources(NO_F, verseScope(P8_GROUPS));
    expect(await src.threads).toEqual([]);
    expect(await src.blogs).toEqual([]);
    expect(verseTables(calls)).toEqual([]);
  });

  it('feed, Verse open: the query asks for live spaces only, and a parked row that slips through is dropped', async () => {
    vi.stubEnv('VERSE_PUBLIC', 'true');
    const { calls } = fakeDb({ groups: GROUPS, verse_threads: [THREAD_BTS, THREAD_SKZ], verse_discussions: [] });
    const threads = await feedSources(NO_F, verseScope(P8_GROUPS)).threads;
    expect(threads.map((t) => t.key)).toEqual(['1']);
    const q = calls.find((c) => c.table === 'verse_threads')!;
    expect(q.ops).toContainEqual(['in', ['group_id', [1]]]);
  });

  it('post view: a hidden Verse is a 404 without a single read', async () => {
    vi.stubEnv('VERSE_PUBLIC', 'false');
    const { calls } = fakeDb({ groups: GROUPS, verse_threads: [THREAD_BTS] });
    expect(await getPost('thread', '1', NO_F)).toBeNull();
    expect(await getPost('blog', '9', NO_F)).toBeNull();
    expect(calls).toEqual([]);
  });

  it('post view: a parked space is a 404 and its replies are never read; a live space renders', async () => {
    vi.stubEnv('VERSE_PUBLIC', 'true');
    let db = fakeDb({ groups: GROUPS, verse_threads: [THREAD_SKZ], verse_discussions: [{ id: 1, author: 'u', body: 'x', parent_id: null, created_at: '2026-09-20T10:00:00Z' }] });
    expect(await getPost('thread', '7', NO_F)).toBeNull();
    expect(verseTables(db.calls)).toEqual(['verse_threads']);

    db = fakeDb({ groups: GROUPS, verse_essays: [ESSAY_SKZ] });
    expect(await getPost('blog', '9', NO_F)).toBeNull();
    expect(verseTables(db.calls)).toEqual(['verse_essays']);

    db = fakeDb({ groups: GROUPS, verse_threads: [THREAD_BTS], verse_discussions: [] });
    const live = await getPost('thread', '1', NO_F);
    expect(live?.title).toBe('Live space thread');
    expect(live?.group?.slug).toBe('bts');
  });
});
