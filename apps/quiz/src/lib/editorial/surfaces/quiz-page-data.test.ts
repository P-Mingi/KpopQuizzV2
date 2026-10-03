// V12 F5a: the quiz page data (lib/ux-v1/p4/queries.ts). With the v12 flag on, the
// hall of fame leaves out the plays of editorial accounts (guest rows stay) and the
// "Made by" creator carries `team: true`. With NEXT_PUBLIC_UX_V12 unset:
// editorial_accounts is never read, no filter is added and the answer equals the v11
// one. Supabase is a recording fake that applies the `.or(col.is.null,col.not.in.(...))`
// filter, so "the row is gone" is proved through the real query chain.

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));
vi.mock('@/lib/blind-test-playlists', () => ({ getAdvertisablePlaylists: async () => ({ groups: [] }) }));

type Row = Record<string, unknown>;
const fake = vi.hoisted(() => ({ rows: {} as Record<string, Row[]>, log: [] as Array<{ table: string; calls: Array<[string, unknown[]]> }> }));

function chain(table: string): unknown {
  const entry = { table, calls: [] as Array<[string, unknown[]]> };
  fake.log.push(entry);
  let rows = [...(fake.rows[table] ?? [])];
  const out = (): { data: Row[]; error: null; status: number } => ({ data: rows, error: null, status: 200 });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(out()).then(res, rej);
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ ...out(), data: rows[0] ?? null });
      return (...args: unknown[]) => {
        entry.calls.push([String(prop), args]);
        const m = prop === 'or' ? /^(\w+)\.is\.null,\1\.not\.in\.\((.*)\)$/.exec(String(args[0])) : null;
        if (m) { const col = m[1] ?? ''; const ids = (m[2] ?? '').split(','); rows = rows.filter((r) => r[col] == null || !ids.includes(String(r[col]))); }
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
const prof = (username: string): Row => ({ username, avatar_url: null, name_accent: null, name_font: null, bias: null });
const PLAYS: Row[] = [
  { score: 8, total_questions: 8, time_taken_seconds: 40, player_id: MINA, profiles: prof('kpophistory') },
  { score: 7, total_questions: 8, time_taken_seconds: 50, player_id: null, profiles: null },
  { score: 6, total_questions: 8, time_taken_seconds: 60, player_id: FAN, profiles: prof('fan1') },
];
const CREATOR: Row[] = [{ username: 'kpophistory', avatar_url: null, xp: 14363, total_quizzes_created: 46, total_plays_received: 900 }];

async function load(v12: boolean): Promise<typeof import('@/lib/ux-v1/p4/queries')> {
  vi.resetModules();
  fake.log.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  fake.rows = { plays: PLAYS, profiles: CREATOR, editorial_accounts: [{ user_id: MINA, display_name: 'Mina', beat: 'history', active: true }] };
  return import('@/lib/ux-v1/p4/queries');
}

const tables = (): string[] => fake.log.map((e) => e.table);
const methods = (): string[] => fake.log.flatMap((e) => e.calls.map((c) => c[0]));

afterEach(() => { vi.unstubAllEnvs(); });

describe('quiz page hall of fame (F5a)', () => {
  it('flag off: the v11 read, editorial_accounts never read, no filter, every row', async () => {
    const q = await load(false);
    const rows = await q.getP4HallOfFame('q1', 5, false);
    expect(tables()).toEqual(['plays']);
    expect(methods()).not.toContain('or');
    expect(rows.map((r) => r.person?.username ?? null)).toEqual(['kpophistory', null, 'fan1']);
  });

  it('flag on: the editorial play leaves the board, the guest row and the fan stay', async () => {
    const q = await load(true);
    const rows = await q.getP4HallOfFame('q1', 5, false);
    expect(tables()).toContain('editorial_accounts');
    const or = fake.log.find((e) => e.table === 'plays')?.calls.find((c) => c[0] === 'or');
    expect(or?.[1][0]).toBe(`player_id.is.null,player_id.not.in.(${MINA})`);
    expect(rows.map((r) => r.person?.username ?? null)).toEqual([null, 'fan1']);
  });

  it('flag on with no editorial account (SQL not applied): the v11 read', async () => {
    const q = await load(true);
    fake.rows.editorial_accounts = [];
    const rows = await q.getP4HallOfFame('q1', 5, true);
    expect(methods()).not.toContain('or');
    expect(rows).toHaveLength(3);
  });
});

describe('quiz page "Made by" creator (F5a)', () => {
  it('flag off: the v11 object, no team key, no editorial read', async () => {
    const q = await load(false);
    const c = await q.getP4Creator(MINA);
    expect(c).toEqual({ username: 'kpophistory', avatarUrl: null, xp: 14363, quizzes: 46, playsReceived: 900 });
    expect(tables()).toEqual(['profiles']);
  });

  it('flag on: an editorial creator carries team, a fan does not', async () => {
    const q = await load(true);
    expect((await q.getP4Creator(MINA))?.team).toBe(true);
    expect(await q.getP4Creator(FAN)).not.toHaveProperty('team');
  });
});
