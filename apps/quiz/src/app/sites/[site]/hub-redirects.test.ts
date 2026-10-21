import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Lot (d), H1: the pages /passport, /settings and /u/{username} of the hub are redirects. Supabase and next/navigation are
// fakes; each test loads the pages after setting the site of the build.

const fake = vi.hoisted(() => ({
  user: null as { id: string } | null,
  rows: {} as Record<string, Array<Record<string, unknown>>>,
}));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); },
  notFound: () => { throw new Error('NOT_FOUND'); },
}));

function builder(table: string): unknown {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  const pick = () => (fake.rows[table] ?? []).filter((r) => filters.every((f) => f(r)));
  const b = {
    select: () => b,
    eq: (col: string, v: unknown) => { filters.push((r) => r[col] === v); return b; },
    maybeSingle: () => Promise.resolve({ data: pick()[0] ?? null, error: null }),
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: pick(), error: null }).then(res),
  };
  return b;
}
const client = () => ({
  auth: { getUser: async () => ({ data: { user: fake.user }, error: null }) },
  from: (t: string) => builder(t),
});
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => client(),
  createServiceRoleClient: () => client(),
  createPublicReadClient: () => client(),
}));

const M = (user_id: string, site_id: string, extra: Record<string, unknown> = {}) => ({
  user_id, site_id, joined_at: '2026-01-01T00:00:00Z', activated_at: '2026-01-01T00:00:00Z', banned_at: null, show_elsewhere: true, ...extra,
});

beforeEach(() => {
  fake.user = null;
  fake.rows = {
    profiles: [
      { id: 'u-1', username: 'mina', banned_at: null },
      { id: 'u-2', username: 'banned_bo', banned_at: '2026-09-01T00:00:00Z' },
    ],
    world_memberships: [M('u-1', 'anime', { joined_at: '2026-02-01T00:00:00Z' }), M('u-1', 'kpop'), M('u-2', 'kpop')],
  };
});
afterEach(() => { vi.unstubAllEnvs(); });

async function load(site: 'hub' | 'anime' | 'kpop' = 'hub') {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const [passport, settings, member, registry] = await Promise.all([
    import('./(hub)/passport/page'), import('./settings/page'), import('./u/[username]/page'), import('@/lib/site/registry'),
  ]);
  return { passport, settings, member, registry };
}
const outcome = async (p: Promise<unknown>): Promise<string> => p.then(() => 'RENDERED', (e: Error) => e.message);

describe('/passport on the hub', () => {
  it('signed out: 302 style redirect to the root', async () => {
    const { passport } = await load();
    expect(await outcome(passport.default())).toBe('REDIRECT /');
  });
  it('signed in: the passport of the home site (/me), through the registry origin', async () => {
    fake.user = { id: 'u-1' };
    const { passport, registry } = await load();
    expect(await outcome(passport.default())).toBe(`REDIRECT ${registry.REGISTRY.kpop.url}/me`);
    fake.rows.world_memberships = [M('u-1', 'anime')];
    expect(await outcome(passport.default())).toBe(`REDIRECT ${registry.REGISTRY.anime.url}/me`);
  });
  it('is closed to search engines', async () => {
    const { passport } = await load();
    expect(passport.metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe('/settings on the hub', () => {
  it('signed out: the root', async () => {
    const { settings } = await load();
    expect(await outcome(settings.default())).toBe('REDIRECT /');
  });
  it('signed in: the settings of the home site', async () => {
    fake.user = { id: 'u-1' };
    const { settings, registry } = await load();
    expect(await outcome(settings.default())).toBe(`REDIRECT ${registry.REGISTRY.kpop.url}/settings`);
  });
  it('is not served by a build that is neither the hub nor anime', async () => {
    const { settings } = await load('kpop');
    expect(await outcome(settings.default())).toBe('NOT_FOUND');
  });
});

describe('/u/{username} on the hub', () => {
  const props = (username: string) => ({ params: Promise.resolve({ username }) });
  it('a member with a visible membership: their page on the first site joined', async () => {
    const { member, registry } = await load();
    expect(await outcome(member.default(props('mina')))).toBe(`REDIRECT ${registry.REGISTRY.kpop.url}/u/mina`);
  });
  it('signed in or not does not change the answer', async () => {
    fake.user = { id: 'u-9' };
    const { member, registry } = await load();
    expect(await outcome(member.default(props('mina')))).toBe(`REDIRECT ${registry.REGISTRY.kpop.url}/u/mina`);
  });
  it('an unknown member is a 404', async () => {
    const { member } = await load();
    expect(await outcome(member.default(props('nobody')))).toBe('NOT_FOUND');
  });
  it('a banned member is a 404', async () => {
    const { member } = await load();
    expect(await outcome(member.default(props('banned_bo')))).toBe('NOT_FOUND');
  });
  it('a member with no visible membership is a 404', async () => {
    fake.rows.world_memberships = [M('u-1', 'anime', { show_elsewhere: false })];
    const { member } = await load();
    expect(await outcome(member.default(props('mina')))).toBe('NOT_FOUND');
  });
  it('is always noindex', async () => {
    const { member } = await load();
    expect(await member.generateMetadata(props('mina'))).toEqual({ robots: { index: false, follow: false } });
  });
});

describe('the files stay small redirects', () => {
  const src = (rel: string) => readFileSync(join(__dirname, rel), 'utf8');
  it('the hub passport page copies and imports no kpop page', () => {
    const s = src('(hub)/passport/page.tsx');
    expect(s.split('\n').length).toBeLessThan(30);
    expect(s).not.toMatch(/from '@\/app\/\(site\)/);
    expect(s).not.toMatch(/@\/components\/(profile|verse)/);
  });
  it('the settings and member pages no longer import the kpop pages', () => {
    expect(src('settings/page.tsx')).not.toMatch(/from '@\/app\/\(site\)/);
    expect(src('u/[username]/page.tsx')).not.toMatch(/from '@\/app\/\(site\)/);
  });
});
