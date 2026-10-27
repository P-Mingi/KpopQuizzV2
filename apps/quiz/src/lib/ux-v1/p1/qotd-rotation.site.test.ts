// Run O1, lot (e) part 1 (K1): the Supabase store of the QOTD rotation per site. kpop keeps its call shapes (the same
// filters, the same RPC, no site_id in a payload while SITE_SCOPE is off); the log upsert keys on (site_id, featured_date);
// the anime store filters every read and write on site_id 'anime' and publishes through ensure_daily_quiz_v2.
import { afterEach, describe, expect, it } from 'vitest';

import { rotateQotd, supabaseQotdStore } from './qotd-rotation';

import type { SupabaseClient } from '@supabase/supabase-js';

interface Call { table: string; op: string; arg?: unknown; opts?: unknown; filters: Array<[string, ...unknown[]]> }

function recorder(results: { rpc?: unknown; rpcError?: string; tables?: Record<string, unknown> } = {}) {
  const calls: Call[] = [];
  const rpcs: Array<{ fn: string; args: unknown }> = [];
  const db = {
    rpc(fn: string, args: unknown) {
      rpcs.push({ fn, args });
      return Promise.resolve({ data: results.rpc ?? null, error: results.rpcError ? { message: results.rpcError } : null });
    },
    from(table: string) {
      const c: Call = { table, op: 'select', filters: [] };
      calls.push(c);
      const b: Record<string, unknown> = {};
      b.select = (cols: unknown) => { if (c.op === 'select') c.arg = cols; return b; };
      b.update = (arg: unknown) => { c.op = 'update'; c.arg = arg; return b; };
      b.upsert = (arg: unknown, opts: unknown) => { c.op = 'upsert'; c.arg = arg; c.opts = opts; return b; };
      for (const m of ['eq', 'in', 'gte', 'order', 'limit', 'range', 'not']) b[m] = (...a: unknown[]) => { c.filters.push([m, ...a]); return b; };
      const data = results.tables?.[table];
      b.maybeSingle = async () => ({ data: Array.isArray(data) ? (data[0] ?? null) : (data ?? null), error: null });
      b.then = (ok: (v: unknown) => unknown) => ok({ data: Array.isArray(data) ? data : data ? [data] : [], error: null });
      return b;
    },
  };
  return { db: db as unknown as SupabaseClient, calls, rpcs };
}

afterEach(() => { delete process.env.SITE_SCOPE; });

const siteEq = (c: Call): unknown[] | undefined => c.filters.find((f) => f[0] === 'eq' && f[1] === 'site_id');

describe('supabaseQotdStore, kpop', () => {
  it('reads and writes with today\'s filters while SITE_SCOPE is off: no site_id anywhere', async () => {
    const { db, calls } = recorder({ tables: { quizzes: { id: 'q1', group_id: 3 } } });
    const store = supabaseQotdStore(db, 'kpop');
    await store.qotdFor('2026-10-20');
    await store.openBankEntries();
    await store.qotdNeighbour('2026-10-19');
    await store.moveBankEntry('b1', '2026-10-20');
    await store.catalogCandidates();
    await store.logSince('2026-07-01');
    await store.featureQuiz('q1', '2026-10-20', 12.5);
    expect(calls.filter((c) => siteEq(c))).toEqual([]);
    expect(calls[0]).toMatchObject({ table: 'quizzes', filters: [['eq', 'is_quiz_of_the_day', true], ['eq', 'quiz_of_the_day_date', '2026-10-20'], ['limit', 1]] });
  });

  it('publishes through ensure_daily_quiz(p_date): today\'s call', async () => {
    const { db, rpcs } = recorder({ rpc: 'quiz-1' });
    expect(await supabaseQotdStore(db, 'kpop').ensureDailyQuiz('2026-10-20')).toBe('quiz-1');
    expect(rpcs).toEqual([{ fn: 'ensure_daily_quiz', args: { p_date: '2026-10-20' } }]);
  });

  it('featureQuiz: the same three writes, the log upsert payload unchanged and keyed on site_id,featured_date', async () => {
    const { db, calls } = recorder();
    await supabaseQotdStore(db, 'kpop').featureQuiz('q1', '2026-10-20', 12.5);
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual(['quizzes:update', 'quizzes:update', 'qotd_log:upsert']);
    expect(calls[0]).toMatchObject({ arg: { is_quiz_of_the_day: false, quiz_of_the_day_date: null }, filters: [['eq', 'quiz_of_the_day_date', '2026-10-20']] });
    expect(calls[1]).toMatchObject({ arg: { is_quiz_of_the_day: true, quiz_of_the_day_date: '2026-10-20' }, filters: [['eq', 'id', 'q1']] });
    expect(calls[2]).toMatchObject({
      arg: { quiz_id: 'q1', featured_date: '2026-10-20', selection_method: 'auto', score: 12.5 },
      opts: { onConflict: 'site_id,featured_date' },
    });
  });

  it('with SITE_SCOPE on, kpop also filters and files its rows under site_id kpop', async () => {
    process.env.SITE_SCOPE = '1';
    const { db, calls } = recorder();
    const store = supabaseQotdStore(db, 'kpop');
    await store.qotdFor('2026-10-20');
    await store.featureQuiz('q1', '2026-10-20', 1);
    expect(siteEq(calls[0]!)).toEqual(['eq', 'site_id', 'kpop']);
    expect(calls[3]!.arg).toMatchObject({ site_id: 'kpop' });
  });
});

describe('supabaseQotdStore, anime', () => {
  it('every read and write of a scoped table carries site_id = anime', async () => {
    const { db, calls } = recorder({ tables: { quizzes: { id: 'q1', group_id: 3 } } });
    const store = supabaseQotdStore(db, 'anime');
    await store.qotdFor('2026-10-20');
    await store.openBankEntries();
    await store.qotdNeighbour('2026-10-19');
    await store.moveBankEntry('b1', '2026-10-20');
    await store.catalogCandidates();
    await store.logSince('2026-07-01');
    await store.featureQuiz('q1', '2026-10-20', 12.5);
    const scoped = calls.filter((c) => ['quizzes', 'quiz_bank', 'qotd_log'].includes(c.table) && c.op !== 'upsert');
    // the one bank read by published_quiz_id (qotdNeighbour) is keyed on a quiz id, not on the site
    const unscoped = scoped.filter((c) => !siteEq(c));
    expect(unscoped.map((c) => `${c.table}:${c.filters.filter((f) => f[0] === 'eq').map((f) => f[1]).join(',')}`)).toEqual(['quiz_bank:published_quiz_id']);
    const upsert = calls.find((c) => c.op === 'upsert')!;
    expect(upsert.arg).toMatchObject({ site_id: 'anime', quiz_id: 'q1', featured_date: '2026-10-20' });
    expect(upsert.opts).toEqual({ onConflict: 'site_id,featured_date' });
  });

  it('publishes through ensure_daily_quiz_v2(p_date, p_site) and names it in an error', async () => {
    const ok = recorder({ rpc: 'quiz-2' });
    expect(await supabaseQotdStore(ok.db, 'anime').ensureDailyQuiz('2026-10-20')).toBe('quiz-2');
    expect(ok.rpcs).toEqual([{ fn: 'ensure_daily_quiz_v2', args: { p_date: '2026-10-20', p_site: 'anime' } }]);
    const bad = recorder({ rpcError: 'boom' });
    await expect(supabaseQotdStore(bad.db, 'anime').ensureDailyQuiz('2026-10-20')).rejects.toThrow('ensure_daily_quiz_v2: boom');
  });

  it('rotateQotd on the anime store: an existing flagged quiz of anime wins, else the v2 publish', async () => {
    const flagged = recorder({ tables: { quizzes: { id: 'anime-q' } } });
    expect(await rotateQotd(supabaseQotdStore(flagged.db, 'anime'), '2026-10-20')).toMatchObject({ method: 'existing', quizId: 'anime-q' });
    expect(flagged.rpcs).toEqual([]);
    const fresh = recorder({ rpc: 'anime-new' });
    expect(await rotateQotd(supabaseQotdStore(fresh.db, 'anime'), '2026-10-20')).toMatchObject({ method: 'bank', quizId: 'anime-new' });
    expect(fresh.rpcs.map((r) => r.fn)).toEqual(['ensure_daily_quiz_v2']);
  });
});
