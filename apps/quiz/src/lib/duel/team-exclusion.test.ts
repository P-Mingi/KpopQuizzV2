// V12 (G9 R4 and R6, owner G7): editorial accounts never count in This or that.
//   R4  the vote route answers 403 for an editorial account; Fans picked (the
//       nightly cron) leaves its votes out.
//   R6  readWeeklySplits: the last 7 full UTC days, real votes only, most voted
//       first, editorial votes left out, fail soft to [].
// With NEXT_PUBLIC_UX_V12 unset nothing here reads anything: the route is a 404 and
// the reader answers [] before any query.

import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
const fake = vi.hoisted(() => ({ rows: {} as Record<string, Row[]>, log: [] as Array<{ table: string; calls: Array<[string, unknown[]]> }>, user: null as string | null }));

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
        const col = String(args[0]);
        if (prop === 'eq') rows = rows.filter((r) => !(col in r) || r[col] === args[1]);
        return proxy;
      };
    },
  });
  return proxy;
}
const client = {
  from: (t: string) => chain(t),
  rpc: (fn: string) => { fake.log.push({ table: `rpc:${fn}`, calls: [] }); return Promise.resolve({ data: [{ status: 'ok', votes_a: 3, votes_b: 2 }], error: null }); },
  auth: { getUser: async () => ({ data: { user: fake.user ? { id: fake.user } : null } }) },
};
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
const SC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW = Date.parse('2026-10-03T12:00:00Z');

async function setup(v12: boolean): Promise<{ hash: (id: string) => string; sign: (user: string) => string }> {
  vi.resetModules();
  fake.log.length = 0;
  fake.user = null;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-not-a-real-key-0123456789');
  vi.stubEnv('DUEL_SIGNING_SECRET', '');
  vi.stubEnv('CRON_SECRET', 'cron-test');
  const { duelKey, signPair, voterHash } = await import('./token');
  const key = duelKey() as Buffer;
  const hash = (id: string): string => voterHash(key, `u:${id}`);
  const votes = (n: number, a: string, b: string, winner: string, voter: string | null): Row[] =>
    Array.from({ length: n }, () => ({ question_id: Q, option_a_id: a, option_b_id: b, winner_id: winner, voter_hash: voter, created_at: '2026-09-30T10:00:00Z' }));
  fake.rows = {
    editorial_accounts: [{ user_id: MINA, display_name: 'Mina from KpopQuiz', beat: 'news', active: true }],
    duel_questions: [{ id: Q, group_slug: 'bts', prompt: 'Which BTS song?', min_votes: 0 }],
    duel_ratings: [{ question_id: Q, entity_id: SA, entity_name: 'Spring Day' }, { question_id: Q, entity_id: SB, entity_name: 'Dynamite' }, { question_id: Q, entity_id: SC, entity_name: 'Butter' }],
    duel_votes: [
      ...votes(3, SA, SB, SA, hash(FAN)), ...votes(1, SB, SA, SB, 'anon-voter-hash-00000'),
      ...votes(5, SA, SB, SB, hash(MINA)), // the team: never counted
      ...votes(2, SC, SA, SA, hash(FAN)),
      ...votes(1, SA, SB, SC, hash(FAN)), // winner not in the pair: not a real vote
    ],
    duel_vote_guard: [], duel_song_rankings: [],
  };
  return { hash, sign: (user: string) => signPair(key, { q: Q, a: SA, b: SB, v: hash(user), exp: Date.now() + 60_000 }) };
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('R6 readWeeklySplits', () => {
  it('flag off: [] and not one read', async () => {
    await setup(false);
    const { readWeeklySplits } = await import('./weekly-splits');
    expect(await readWeeklySplits(NOW)).toEqual([]);
    expect(fake.log).toHaveLength(0);
  });

  it('flag on: the last 7 full UTC days, real fan votes only, most voted first', async () => {
    await setup(true);
    const { readWeeklySplits } = await import('./weekly-splits');
    expect(await readWeeklySplits(NOW)).toEqual([
      { question: 'Which BTS song?', a: 'Spring Day', b: 'Dynamite', votesA: 3, votesB: 1 },
      { question: 'Which BTS song?', a: 'Spring Day', b: 'Butter', votesA: 2, votesB: 0 },
    ]);
    const read = fake.log.find((e) => e.table === 'duel_votes');
    expect(read?.calls).toContainEqual(['gte', ['created_at', '2026-09-26T00:00:00.000Z']]);
    expect(read?.calls).toContainEqual(['lt', ['created_at', '2026-10-03T00:00:00.000Z']]);
  });

  it('a read error fails soft to []', async () => {
    await setup(true);
    const { readWeeklySplits } = await import('./weekly-splits');
    const broken = { from: () => { throw new Error('down'); } };
    expect(await readWeeklySplits(NOW, broken as never)).toEqual([]);
  });
});

async function vote(token: string): Promise<{ status: number; body: unknown }> {
  const { POST } = await import('@/app/api/duel/vote/route');
  const res = await POST(new NextRequest('http://localhost/api/duel/vote', { method: 'POST', body: JSON.stringify({ token, winner: 'a' }) }));
  return { status: res.status, body: await res.json() };
}

describe('R4 vote route', () => {
  it('flag off: 404 and no read', async () => {
    const { sign } = await setup(false);
    fake.user = MINA;
    expect((await vote(sign(MINA))).status).toBe(404);
    expect(fake.log).toHaveLength(0);
  });

  it('flag on: 403 for an editorial account, nothing cast', async () => {
    const { sign } = await setup(true);
    fake.user = MINA;
    expect(await vote(sign(MINA))).toEqual({ status: 403, body: { error: 'not_allowed' } });
    expect(fake.log.map((e) => e.table)).not.toContain('rpc:duel_cast_song_vote');
  });

  it('flag on: a fan still votes', async () => {
    const { sign } = await setup(true);
    fake.user = FAN;
    const out = await vote(sign(FAN));
    expect(out.status).toBe(200);
    expect(fake.log.map((e) => e.table)).toContain('rpc:duel_cast_song_vote');
  });
});

describe('R4 Fans picked (nightly cron)', () => {
  it('the editorial votes are not counted', async () => {
    await setup(true);
    const { GET } = await import('@/app/api/cron/fans-picked/route');
    const res = await GET(new NextRequest('http://localhost/api/cron/fans-picked?dry=1', { headers: { authorization: 'Bearer cron-test' } }));
    const body = (await res.json()) as { ok: boolean; editorialExcluded: number; groups: Array<{ votes: number }> };
    expect(body.ok).toBe(true);
    expect(body.editorialExcluded).toBe(1);
    // 3 + 1 + 2 fan votes; the 5 team votes and the invalid one are out
    expect(body.groups[0]?.votes).toBe(6);
  });
});
