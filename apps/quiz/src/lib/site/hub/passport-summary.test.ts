import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLevelInfo } from '@/lib/constants';

// Lot (d), H1: the "Your passport" summary. Supabase is a fake; no network, no write.

const fake = vi.hoisted(() => ({
  user: { id: 'u-1' } as { id: string } | null,
  profile: { data: { username: 'mina', xp: 120 }, error: null } as { data: unknown; error: unknown },
  memberships: { data: [] as unknown[], error: null } as { data: unknown; error: unknown },
  authError: null as unknown,
  throwOn: null as null | 'client' | 'auth' | 'from',
  seen: [] as string[],
}));

function query(table: string): unknown {
  const result = table === 'profiles' ? fake.profile : fake.memberships;
  const q = {
    select: (cols: string) => { fake.seen.push(`${table}:${cols}`); return q; },
    eq: (col: string, val: string) => { fake.seen.push(`${table}.${col}=${val}`); return q; },
    maybeSingle: () => Promise.resolve(result),
    then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
  };
  return q;
}
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => {
    if (fake.throwOn === 'client') throw new Error('database unreachable');
    return {
      auth: { getUser: async () => { if (fake.throwOn === 'auth') throw new Error('fetch failed'); return { data: { user: fake.user }, error: fake.authError }; } },
      from: (t: string) => { if (fake.throwOn === 'from') throw new Error('boom'); return query(t); },
    };
  },
}));

import { buildPassportSummary, readHubPassport } from './passport-summary';

const ROWS = [
  { site_id: 'kpop', xp: null, activated_at: '2026-01-01T00:00:00Z', banned_at: null },
  { site_id: 'anime', xp: 80, activated_at: '2026-10-01T00:00:00Z', banned_at: null },
];

beforeEach(() => {
  fake.user = { id: 'u-1' };
  fake.profile = { data: { username: 'mina', xp: 120 }, error: null };
  fake.memberships = { data: ROWS, error: null };
  fake.authError = null;
  fake.throwOn = null;
  fake.seen = [];
});

describe('buildPassportSummary', () => {
  it('adds up the xp of every site on the shared curve and lists the sites joined in the network order', () => {
    const s = buildPassportSummary({ username: 'mina', xp: 120 }, [ROWS[1]!, ROWS[0]!]);
    expect(s).toEqual({ username: 'mina', level: getLevelInfo(200, 'hub').level, sites: [{ id: 'kpop', name: 'KpopQuiz' }, { id: 'anime', name: 'OtakuQuiz' }] });
  });

  it('counts only activated, not banned world memberships', () => {
    const rows = [
      { site_id: 'kpop', xp: null, activated_at: '2026-01-01T00:00:00Z', banned_at: '2026-02-01T00:00:00Z' },
      { site_id: 'anime', xp: 500, activated_at: null, banned_at: null },
      { site_id: 'hub', xp: 900, activated_at: '2026-01-01T00:00:00Z', banned_at: null },
      { site_id: 'mars', xp: 900, activated_at: '2026-01-01T00:00:00Z', banned_at: null },
    ];
    const s = buildPassportSummary({ username: 'mina', xp: 0 }, rows);
    expect(s?.sites).toEqual([]);
    expect(s?.level).toBe(getLevelInfo(0, 'hub').level);
  });

  it('is null without a username', () => {
    expect(buildPassportSummary(null, ROWS)).toBeNull();
    expect(buildPassportSummary({ username: null, xp: 5 }, ROWS)).toBeNull();
    expect(buildPassportSummary({ username: '  ', xp: 5 }, ROWS)).toBeNull();
  });
});

describe('readHubPassport', () => {
  it('reads the own profile and memberships of the signed-in fan', async () => {
    const s = await readHubPassport();
    expect(s?.username).toBe('mina');
    expect(s?.sites.map((x) => x.id)).toEqual(['kpop', 'anime']);
    expect(fake.seen).toContain('profiles.id=u-1');
    expect(fake.seen).toContain('world_memberships.user_id=u-1');
  });

  it('is null when nobody is signed in', async () => {
    fake.user = null;
    expect(await readHubPassport()).toBeNull();
    expect(fake.seen).toEqual([]);
  });

  it('is null on every kind of error', async () => {
    fake.authError = new Error('jwt expired');
    expect(await readHubPassport()).toBeNull();
    fake.authError = null;
    fake.profile = { data: null, error: { message: 'rls' } };
    expect(await readHubPassport()).toBeNull();
    fake.profile = { data: { username: 'mina', xp: 1 }, error: null };
    fake.memberships = { data: null, error: { message: 'relation does not exist' } };
    expect(await readHubPassport()).toBeNull();
    for (const t of ['client', 'auth', 'from'] as const) {
      fake.memberships = { data: ROWS, error: null };
      fake.throwOn = t;
      expect(await readHubPassport(), t).toBeNull();
    }
  });
});
