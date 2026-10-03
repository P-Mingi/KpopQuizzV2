// V12 (G9 R5e, owner G1): the home daily band's `fans` count leaves out editorial
// accounts. With NEXT_PUBLIC_UX_V12 unset the query, the cache key and the count are
// exactly the v11 ones and editorial_accounts is never read. The test sits in
// lib/tracking/ because it is G1's test home for p1/home-data.ts (p1.test.ts is not
// edited).

import { afterEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
const fake = vi.hoisted(() => ({ rows: {} as Record<string, Row[]>, log: [] as Array<{ table: string; calls: Array<[string, unknown[]]> }>, keys: [] as unknown[] }));

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T, key: unknown) => { fake.keys.push(key); return fn; }, revalidateTag: () => undefined }));

function chain(table: string): unknown {
  const entry = { table, calls: [] as Array<[string, unknown[]]> };
  fake.log.push(entry);
  let rows = [...(fake.rows[table] ?? [])];
  const out = (): Row => ({ data: rows, error: null, count: rows.length, status: 200 });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(out()).then(res, rej);
      return (...args: unknown[]) => {
        entry.calls.push([String(prop), args]);
        if (prop === 'not' && args[1] === 'in') {
          const ids = String(args[2]).slice(1, -1).split(',');
          rows = rows.filter((r) => !ids.includes(String(r[String(args[0])])));
        }
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

async function load(v12: boolean): Promise<typeof import('@/lib/ux-v1/p1/home-data')> {
  vi.resetModules();
  fake.log.length = 0;
  fake.keys.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  fake.rows = {
    daily_blindtest_scores: [{ user_id: MINA, date: '2026-10-03' }, { user_id: FAN, date: '2026-10-03' }],
    editorial_accounts: [{ user_id: MINA, display_name: 'Mina from KpopQuiz', beat: 'news', active: true }],
  };
  return import('@/lib/ux-v1/p1/home-data');
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('readBand (home daily band) and editorial accounts', () => {
  it('flag off: same query, same cache key, every row counted, no team read', async () => {
    const { getHomeBand } = await load(false);
    expect(await getHomeBand(NOW)).toEqual({ date: '2026-10-03', fans: 2 });
    expect(fake.log.map((e) => e.table)).toEqual(['daily_blindtest_scores']);
    expect(fake.log[0]?.calls).toEqual([
      ['select', ['user_id', { count: 'exact', head: true }]],
      ['eq', ['date', '2026-10-03']],
    ]);
    expect(fake.keys).toContainEqual(['ux-v1:p1:band:v1']);
  });

  it('flag on: the editorial account is not a fan', async () => {
    const { getHomeBand } = await load(true);
    expect(await getHomeBand(NOW)).toEqual({ date: '2026-10-03', fans: 1 });
    const band = fake.log.find((e) => e.table === 'daily_blindtest_scores');
    expect(band?.calls).toContainEqual(['not', ['user_id', 'in', `(${MINA})`]]);
    expect(fake.keys).toContainEqual(['ux-v1:p1:band:v1']);
  });
});
