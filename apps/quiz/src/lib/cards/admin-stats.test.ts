// KpopCards launch (2026-11-23): the pure part of the KpopCards tab of the admin: the URL, the arguments of cards_admin_stats, the links, the three states.
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_QUERY, STATS_PAGE_SIZE, STATS_SORTS, fmtInt, fmtPct, fmtWhen, isMissingFunction, isStatsAnswer, loadCardsStats, pagesOf, parseStatsQuery, sortHref, statsArgs, statsHref,
} from './admin-stats';

import type { StatsAnswer } from './admin-stats';

const ANSWER: StatsAnswer = {
  totals: { players: 2, packs_total: 9, packs_today: 1, packs_7d: 4, ads_total: 3, ads_today: 1, cards_in_packs: 886, avg_pct: 4.2 },
  total: 1, limit: 50, offset: 0, at: '2026-11-23T10:00:00Z',
  rows: [{ username: 'alice', first_seen: '2026-10-01T00:00:00Z', last_seen: '2026-11-23T09:00:00Z', last_pack: null, level: 2, packs: 9, packs_7d: 4, src_stock: 5, src_focus: 1, src_daily: 1,
    src_shards: 1, src_bonus: 1, src_ad: 0, golden: 0, guarantee: 0, cards: 12, cards_in_packs: 12, pct: 1.4, copies: 15, dupes: 3, shards: 20, ads: 3, crafted: 0, recycled: 0 }],
};

describe('the filters of the URL', () => {
  it('reads every filter, and falls back to the default for what is unknown, repeated or out of range', () => {
    expect(parseStatsQuery(undefined)).toEqual(DEFAULT_QUERY);
    expect(parseStatsQuery({ q: ' Ali ', w: '7d', ads: 'yes', min: '3', sort: 'packs', dir: 'asc', page: '4' })).toEqual({ q: 'Ali', window: '7d', ads: 'yes', min: 3, sort: 'packs', dir: 'asc', page: 4 });
    expect(parseStatsQuery({ w: '1y', ads: 'maybe', min: '-2', sort: 'user_id', dir: 'sideways', page: '0' })).toEqual(DEFAULT_QUERY);
    expect(parseStatsQuery({ w: ['7d', '24h'], sort: ['packs'], q: ['a'] })).toEqual(DEFAULT_QUERY);
    expect(parseStatsQuery({ min: '1e9', page: '99999999' })).toEqual(DEFAULT_QUERY);
    expect(parseStatsQuery({ q: 'x'.repeat(200) }).q).toHaveLength(64);
    expect(parseStatsQuery({ q: 'a\nb\u0000c' }).q).toBe('a b c');
  });
  it('a nickname sort opens A to Z and a number sort opens high to low', () => {
    expect(parseStatsQuery({ sort: 'username' }).dir).toBe('asc');
    expect(parseStatsQuery({ sort: 'packs' }).dir).toBe('desc');
  });
  it('every sort the page offers is one the database lists', () => {
    expect(new Set(STATS_SORTS).size).toBe(STATS_SORTS.length);
    expect(STATS_SORTS).toHaveLength(23);
  });
});

describe('the call', () => {
  it('turns a query into the arguments of the function, a page into an offset', () => {
    expect(statsArgs({ ...DEFAULT_QUERY, q: 'ali', window: '30d', ads: 'no', min: 2, sort: 'ads', dir: 'asc', page: 3 })).toEqual({
      p_search: 'ali', p_window: '30d', p_ads: 'no', p_min_packs: 2, p_sort: 'ads', p_dir: 'asc', p_limit: STATS_PAGE_SIZE, p_offset: 2 * STATS_PAGE_SIZE });
    expect(statsArgs(DEFAULT_QUERY)).toMatchObject({ p_search: null, p_offset: 0 });
  });
  it('is ready with a good answer, missing when the function is not there, and error otherwise, without ever throwing', async () => {
    type Answer = { data: unknown; error: { code?: string; message?: string } | null };
    const rpc = (r: Answer) => () => ({ rpc: vi.fn(async (_fn: string, _args: Record<string, unknown>) => r) });
    expect(await loadCardsStats(rpc({ data: ANSWER, error: null }), DEFAULT_QUERY)).toEqual({ state: 'ready', data: ANSWER });
    expect(await loadCardsStats(rpc({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.cards_admin_stats' } }), DEFAULT_QUERY)).toEqual({ state: 'missing' });
    expect(await loadCardsStats(rpc({ data: null, error: { code: '42883', message: 'function cards_admin_stats does not exist' } }), DEFAULT_QUERY)).toEqual({ state: 'missing' });
    expect(await loadCardsStats(rpc({ data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }), DEFAULT_QUERY)).toEqual({ state: 'error' });
    expect(await loadCardsStats(rpc({ data: { nope: 1 }, error: null }), DEFAULT_QUERY)).toEqual({ state: 'error' });
    expect(await loadCardsStats(() => { throw new Error('supabaseUrl is required'); }, DEFAULT_QUERY)).toEqual({ state: 'error' });
    expect(await loadCardsStats(() => ({ rpc: async () => { throw new Error('fetch failed'); } }), DEFAULT_QUERY)).toEqual({ state: 'error' });
    const spy = vi.fn(async () => ({ data: ANSWER, error: null }));
    await loadCardsStats(() => ({ rpc: spy }), { ...DEFAULT_QUERY, sort: 'packs' });
    expect(spy).toHaveBeenCalledWith('cards_admin_stats', expect.objectContaining({ p_sort: 'packs' }));
  });
  it('knows the answers that mean "not applied"', () => {
    expect(isMissingFunction({ code: 'PGRST202' })).toBe(true);
    expect(isMissingFunction({ message: 'Could not find the function public.cards_admin_stats(...) in the schema cache' })).toBe(true);
    expect(isMissingFunction({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingFunction(null)).toBe(false);
  });
  it('a half answer is not an answer', () => {
    expect(isStatsAnswer(ANSWER)).toBe(true);
    expect(isStatsAnswer({ ...ANSWER, rows: 'x' })).toBe(false);
    expect(isStatsAnswer({ ...ANSWER, totals: { players: 1 } })).toBe(false);
    expect(isStatsAnswer(null)).toBe(false);
  });
});

describe('the links', () => {
  it('keep only what differs from the default, so a bookmark stays short', () => {
    expect(statsHref(DEFAULT_QUERY)).toBe('/admin?tab=cards-stats');
    expect(statsHref({ ...DEFAULT_QUERY, q: 'a b', window: '7d', ads: 'yes', min: 2, sort: 'packs', dir: 'asc', page: 2 })).toBe('/admin?tab=cards-stats&q=a+b&w=7d&ads=yes&min=2&sort=packs&dir=asc&page=2');
    const q = parseStatsQuery({ q: 'ali', w: '30d', sort: 'cards', dir: 'asc', page: '3', ads: 'no', min: '5' });
    expect(parseStatsQuery(Object.fromEntries(new URL(`http://x${statsHref(q)}`).searchParams))).toEqual(q);
  });
  it('a heading link sorts high to low first, flips on a second click, and goes back to page 1', () => {
    const q = { ...DEFAULT_QUERY, page: 4 };
    expect(sortHref(q, 'packs')).toContain('sort=packs&dir=desc');
    expect(sortHref(q, 'packs')).not.toContain('page=');
    expect(sortHref({ ...q, sort: 'packs', dir: 'desc' }, 'packs')).toContain('sort=packs&dir=asc');
    expect(sortHref(q, 'username')).toContain('sort=username&dir=asc');
  });
  it('counts the pages', () => {
    expect([0, 1, 50, 51, 101].map(pagesOf)).toEqual([1, 1, 1, 2, 3]);
  });
});

describe('the numbers', () => {
  it('are written like the rest of the admin', () => {
    expect(fmtInt(12345)).toBe('12,345');
    expect(fmtPct(4)).toBe('4.0%');
    expect(fmtPct(12.34)).toBe('12.3%');
    expect(fmtWhen('2026-11-23T14:05:59Z')).toBe('2026-11-23 14:05');
    expect(fmtWhen(null)).toBe('never');
    expect(fmtWhen('nonsense')).toBe('never');
  });
});
