// The pool of Surprise me on the kpopquiz.org home (CR-015) on each state of the database: production today (no quizzes.site_id, no series table),
// after session B, after launch, and the column with SITE_SCOPE off. K-pop quizzes only on all of them; hub and OtakuQuiz reads are not involved.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ORIGINS, quizRow } from './test-support';

import type { HubSurpriseCard } from './types';

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('the pool on each state of the database', () => {
  // A stand-in for PostgREST: it answers as production does when the column or the table is missing (the error of a select on a missing column),
  // and filters on site_id when the query asks.
  const MISSING_COLUMN = { code: '42703', message: 'column quizzes.site_id does not exist', details: null, hint: null };
  type Err = { code?: string; message: string } | null;
  function db(rows: readonly Record<string, unknown>[], { column, tables = ['quizzes'], fail = null }: { column: boolean; tables?: string[]; fail?: Err }) {
    const calls: Array<{ table: string; select: string; filters: string[]; from?: number }> = [];
    return {
      calls,
      from(table: string) {
        const call: { table: string; select: string; filters: string[]; from?: number } = { table, select: '', filters: [] };
        calls.push(call);
        const q = {
          select(cols: string) { call.select = cols; return q; },
          eq(col: string, v: string) { call.filters.push(`${col}=${v}`); return q; },
          order() { return q; },
          async range(from: number, to: number): Promise<{ data: unknown; error: Err }> {
            call.from = from;
            if (!tables.includes(table)) return { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` } };
            if (fail) return { data: null, error: fail };
            if (!column && (call.select.includes('site_id') || call.filters.some((f) => f.startsWith('site_id=')))) return { data: null, error: MISSING_COLUMN };
            let out = rows.filter((r) => r.status === 'published');
            for (const f of call.filters) if (f.startsWith('site_id=')) out = out.filter((r) => r.site_id === f.slice(8));
            return { data: out.slice(from, to + 1).map((r) => (column ? r : Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'site_id')))), error: null };
          },
        };
        return q;
      },
    };
  }
  const NOW = new Date('2026-10-31T12:00:00Z');
  const ANIME = quizRow({ id: 'a-top', slug: 'a-top', site_id: 'anime', play_count: 99999, like_count: 99999, group_id: 900, groups: { name: 'Naruto', slug: 'naruto' } });
  const KPOP = [quizRow({ id: 'k-1', slug: 'k-1', group_id: 1 }), quizRow({ id: 'k-reported', slug: 'k-rep', report_count: 6, group_id: 2 }), quizRow({ id: 'k-draft', slug: 'k-draft', status: 'draft', group_id: 3 })];
  async function read(d: ReturnType<typeof db>) {
    const { readKpopSurprisePool } = await import('./surprise-kpop');
    return readKpopSurprisePool(ORIGINS, NOW, d as never);
  }
  const expectKpopOnly = (out: HubSurpriseCard[] | null): void => {
    expect(out!.map((c) => c.id)).toEqual(['k-1']);
    expect(out![0]).toMatchObject({ site: 'kpop', siteName: 'KpopQuiz', href: `${ORIGINS.kpop}/q/k-1` });
  };

  it('state 1, production today: no site_id column, no series table: the block has its pool, the select retried without the column', async () => {
    vi.stubEnv('SITE_SCOPE', '');
    const d = db(KPOP, { column: false });
    expectKpopOnly(await read(d));
    expect(d.calls.map((c) => c.table)).toEqual(['quizzes', 'quizzes']);
    expect(d.calls[0]!.select).toContain('site_id');
    expect(d.calls[1]!.select).not.toContain('site_id');
    expect(d.calls[1]!.select).toContain('groups!inner(name, slug)');
  });

  it('state 1 pages past the 1000 row cap on the retry', async () => {
    vi.stubEnv('SITE_SCOPE', '');
    const many = Array.from({ length: 1200 }, (_, i) => quizRow({ id: `k${i}`, slug: `k${i}`, group_id: 1 }));
    const d = db(many, { column: false });
    expect(await read(d)).toHaveLength(100);
    expect(d.calls.filter((c) => !c.select.includes('site_id')).map((c) => c.from)).toEqual([0, 1000]);
  });

  it('state 1 with the flag on too: the retry names no column', async () => {
    vi.stubEnv('SITE_SCOPE', '1');
    const d = db(KPOP, { column: false });
    expectKpopOnly(await read(d));
    expect(d.calls[1]!.filters).toEqual(['status=published']);
  });

  it('state 2, after session B: the column exists, SITE_SCOPE=1, no anime rows: one read, filtered, no retry', async () => {
    vi.stubEnv('SITE_SCOPE', '1');
    const d = db(KPOP, { column: true });
    expectKpopOnly(await read(d));
    expect(d.calls).toHaveLength(1);
    expect(d.calls[0]!.filters).toContain('site_id=kpop');
  });

  it('state 3, after launch: anime rows exist, SITE_SCOPE=1: none in the pool', async () => {
    vi.stubEnv('SITE_SCOPE', '1');
    const d = db([ANIME, ...KPOP], { column: true });
    expectKpopOnly(await read(d));
    expect(d.calls.map((c) => c.table)).toEqual(['quizzes']);
  });

  it('the column exists, SITE_SCOPE off, anime rows returned by the read: each row is still filtered', async () => {
    vi.stubEnv('SITE_SCOPE', '');
    const d = db([ANIME, ...KPOP], { column: true });
    expectKpopOnly(await read(d));
    expect(d.calls[0]!.filters).not.toContain('site_id=kpop');
  });

  it('never reads the tiers of the anime series, on any state', async () => {
    for (const column of [false, true]) {
      const d = db(KPOP, { column });
      await read(d);
      expect(d.calls.some((c) => c.table === 'series')).toBe(false);
    }
  });

  it('any other error throws and is never retried: another column, another code, a closed connection', async () => {
    vi.stubEnv('SITE_SCOPE', '');
    for (const fail of [
      { code: '42703', message: 'column quizzes.like_count does not exist' },
      { code: '42501', message: 'permission denied for column site_id' },
      { code: 'PGRST301', message: 'JWT expired' },
      { message: 'TypeError: fetch failed' },
    ]) {
      const d = db(KPOP, { column: true, fail });
      await expect(read(d)).rejects.toThrow(/fetchAllRows/);
      expect(d.calls).toHaveLength(1);
    }
  });

  it('the fallback cannot apply on the anime or hub builds: the same error throws there', async () => {
    for (const site of ['anime', 'hub']) {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
      const d = db(KPOP, { column: false });
      await expect(read(d)).rejects.toThrow(/site_id does not exist/);
      expect(d.calls).toHaveLength(1);
    }
  });

  it('names only the undefined column of site_id, in the two forms of the code', async () => {
    const { isMissingSiteId, QUIZ_SELECT_BEFORE_SITE_ID } = await import('./surprise-kpop');
    const { QUIZ_SELECT } = await import('./util');
    expect(isMissingSiteId(MISSING_COLUMN)).toBe(true);
    expect(isMissingSiteId({ code: 'PGRST204', message: "Could not find the 'site_id' column of 'quizzes' in the schema cache" })).toBe(true);
    expect(isMissingSiteId({ code: '42703', message: 'column quizzes.my_site_id_x does not exist' })).toBe(false);
    expect(isMissingSiteId({ code: '42P01', message: 'relation site_id does not exist' })).toBe(false);
    expect(isMissingSiteId(null)).toBe(false);
    expect(QUIZ_SELECT_BEFORE_SITE_ID).not.toBe(QUIZ_SELECT);
    expect(QUIZ_SELECT_BEFORE_SITE_ID.split(', ')).toEqual(QUIZ_SELECT.split(', ').filter((c) => c !== 'site_id'));
  });
});
