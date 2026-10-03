// V12 (G9 R5h, owner G3): today's Blindtest board leaves editorial accounts out of
// its rows, its total ("#N of M fans") and the viewer's rank count. With
// NEXT_PUBLIC_UX_V12 unset every query is the v11 one and editorial_accounts is
// never read.

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

type Row = Record<string, unknown>;
const fake = vi.hoisted(() => ({ rows: {} as Record<string, Row[]>, log: [] as Array<{ table: string; calls: Array<[string, unknown[]]> }> }));

function chain(table: string): unknown {
  const entry = { table, calls: [] as Array<[string, unknown[]]> };
  fake.log.push(entry);
  let rows = [...(fake.rows[table] ?? [])];
  const out = (): Row => ({ data: rows, error: null, count: rows.length, status: 200 });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(out()).then(res, rej);
      if (prop === 'maybeSingle') return () => Promise.resolve({ ...out(), data: rows[0] ?? null });
      return (...args: unknown[]) => {
        entry.calls.push([String(prop), args]);
        if (prop === 'not' && args[1] === 'in') {
          const ids = String(args[2]).slice(1, -1).split(',');
          rows = rows.filter((r) => !ids.includes(String(r[String(args[0])])));
        }
        if (prop === 'eq' && args[0] === 'user_id') rows = rows.filter((r) => r.user_id === args[1]);
        if (prop === 'in' && args[0] === 'id') rows = rows.filter((r) => (args[1] as unknown[]).includes(r.id));
        return proxy;
      };
    },
  });
  return proxy;
}
const client = { from: (t: string) => chain(t) };
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => client,
  createPublicReadClient: () => client,
  createServerClient: async () => client,
}));

const MINA = '11111111-1111-4111-8111-111111111111';
const FAN = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-03T12:00:00Z');

async function load(v12: boolean): Promise<typeof import('./board')> {
  vi.resetModules();
  fake.log.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  fake.rows = {
    daily_blindtest_scores: [{ user_id: MINA, score: 900, time_ms: 1000 }, { user_id: FAN, score: 500, time_ms: 2000 }],
    profiles: [{ id: MINA, username: 'mina', display_name: 'Mina' }, { id: FAN, username: 'fan', display_name: 'Fan' }],
    bt_players: [],
    editorial_accounts: [{ user_id: MINA, display_name: 'Mina from KpopQuiz', beat: 'news', active: true }],
  };
  return import('./board');
}

const scoreQueries = (): Array<Array<[string, unknown[]]>> => fake.log.filter((e) => e.table === 'daily_blindtest_scores').map((e) => e.calls);

afterEach(() => { vi.unstubAllEnvs(); });

describe('readBoard and editorial accounts', () => {
  it('flag off: v11 queries, every row and the full total, no team read', async () => {
    const { readBoard } = await load(false);
    const out = await readBoard(client as unknown as SupabaseClient, FAN, NOW);
    expect(out.top.map((r) => r.username)).toEqual(['mina', 'fan']);
    expect(out.total).toBe(2);
    expect(fake.log.map((e) => e.table)).not.toContain('editorial_accounts');
    expect(scoreQueries().flat().filter(([m]) => m === 'not')).toEqual([]);
    expect(scoreQueries()[0]).toEqual([
      ['select', ['user_id, score, time_ms']], ['eq', ['date', '2026-10-03']],
      ['order', ['score', { ascending: false }]], ['order', ['time_ms', { ascending: true }]], ['limit', [5]],
    ]);
    expect(scoreQueries()[1]).toEqual([['select', ['user_id', { count: 'exact', head: true }]], ['eq', ['date', '2026-10-03']]]);
  });

  it('flag on: the editorial row, its share of the total and of the rank count are gone', async () => {
    const { readBoard } = await load(true);
    const out = await readBoard(client as unknown as SupabaseClient, FAN, NOW);
    expect(out.top.map((r) => r.username)).toEqual(['fan']);
    expect(out.top[0]?.rank).toBe(1);
    expect(out.total).toBe(1);
    const nots = scoreQueries().filter((calls) => calls.some(([m, a]) => m === 'not' && JSON.stringify(a) === JSON.stringify(['user_id', 'in', `(${MINA})`])));
    // the top rows, the total and the "ahead of me" count
    expect(nots).toHaveLength(3);
  });
});
