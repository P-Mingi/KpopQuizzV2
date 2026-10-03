// V12 (G9 R6, owner G9): readWeeklyRecap fills `splits` from G7's readWeeklySplits,
// inside soft(). Flag off: splits stay [] and duel_votes is never read. Flag on: the
// fan split is there and the editorial account's votes are not in it. A failing
// reader drops the line, never the recap.

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

type Row = Record<string, unknown>;
const fake = vi.hoisted(() => ({ rows: {} as Record<string, Row[]>, tables: [] as string[], failVotes: false }));

function chain(table: string): unknown {
  fake.tables.push(table);
  const rows = [...(fake.rows[table] ?? [])];
  const out = (): Row => (table === 'duel_votes' && fake.failVotes
    ? { data: null, error: { message: 'boom' }, status: 500 }
    : { data: rows, error: null, count: rows.length, status: 200 });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(out()).then(res, rej);
      if (prop === 'maybeSingle') return () => Promise.resolve({ ...out(), data: rows[0] ?? null });
      return () => proxy;
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
const Q = '99999999-9999-4999-8999-999999999999';
const SA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NOW = Date.parse('2026-10-03T12:00:00Z');

async function load(v12: boolean): Promise<typeof import('./template-data')> {
  vi.resetModules();
  fake.tables.length = 0;
  fake.failVotes = false;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-not-a-real-key-0123456789');
  vi.stubEnv('DUEL_SIGNING_SECRET', '');
  const { duelKey, voterHash } = await import('@/lib/duel/token');
  const key = duelKey() as Buffer;
  const vote = (winner: string, voter: string): Row => ({ question_id: Q, option_a_id: SA, option_b_id: SB, winner_id: winner, voter_hash: voterHash(key, `u:${voter}`) });
  fake.rows = {
    editorial_accounts: [{ user_id: MINA }],
    duel_questions: [{ id: Q, prompt: 'Which BTS song?' }],
    duel_ratings: [{ question_id: Q, entity_id: SA, entity_name: 'Spring Day' }, { question_id: Q, entity_id: SB, entity_name: 'Dynamite' }],
    duel_votes: [vote(SA, FAN), vote(SA, FAN), vote(SB, FAN), vote(SB, MINA), vote(SB, MINA)],
  };
  return import('./template-data');
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('readWeeklyRecap splits', () => {
  it('flag off: [] and duel_votes is never read', async () => {
    const { readWeeklyRecap } = await load(false);
    const out = await readWeeklyRecap(NOW);
    expect(out.splits).toEqual([]);
    expect(fake.tables).not.toContain('duel_votes');
    expect(fake.tables).not.toContain('editorial_accounts');
  });

  it('flag on: the fan split, the team votes left out', async () => {
    const { readWeeklyRecap } = await load(true);
    const out = await readWeeklyRecap(NOW);
    expect(out.splits).toEqual([{ question: 'Which BTS song?', a: 'Spring Day', b: 'Dynamite', votesA: 2, votesB: 1 }]);
    expect(out.from).toBe('2026-09-26');
    expect(out.to).toBe('2026-10-02');
  });

  it('flag on, read error: no splits line, the recap still comes back', async () => {
    const { readWeeklyRecap } = await load(true);
    fake.failVotes = true;
    const out = await readWeeklyRecap(NOW);
    expect(out.splits).toEqual([]);
    expect(out.from).toBe('2026-09-26');
  });
});
