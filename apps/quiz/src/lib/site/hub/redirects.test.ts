import { describe, expect, it } from 'vitest';

import { MEMBER_FILTER_COLUMNS, MEMBER_PUBLIC_COLUMNS } from '@/lib/passport/types';
import { fakeDb } from '@/lib/passport-ui/test-support';
import { REGISTRY } from '@/lib/site/registry';

import {
  DEFAULT_HOME_SITE, MEMBER_MEMBERSHIP_COLUMNS, memberPageTarget, OWN_MEMBERSHIP_COLUMNS, ownPageTarget, pickMemberHomeSite,
  pickOwnHomeSite, siteUrl,
} from './redirects';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MembershipChoiceRow } from './redirects';
import type { Rows } from '@/lib/passport-ui/test-support';

// Lot (d), H1: where /passport, /settings and /u/{username} of the hub send a fan. A fake database; no network, no write.

const ENV = {};
const row = (site_id: string, extra: Partial<MembershipChoiceRow> = {}): MembershipChoiceRow => ({
  site_id, joined_at: '2026-01-01T00:00:00Z', activated_at: '2026-01-01T00:00:00Z', banned_at: null, ...extra,
});

/** The fake query builder plus the auth part of a Supabase client. */
function client(rows: Rows, user: { id: string } | null | 'throws', failing: ReadonlySet<string> = new Set()): { db: SupabaseClient; selects: Array<{ table: string; columns: string }> } {
  const fake = fakeDb(rows, failing);
  const auth = {
    getUser: async () => {
      if (user === 'throws') throw new Error('fetch failed');
      return { data: { user }, error: null };
    },
  };
  return { db: { ...(fake.client as unknown as object), auth } as unknown as SupabaseClient, selects: fake.selects };
}

describe('pickOwnHomeSite', () => {
  it('is kpop with no membership, and kpop by default', () => {
    expect(DEFAULT_HOME_SITE).toBe('kpop');
    expect(pickOwnHomeSite([])).toBe('kpop');
  });
  it('is the first membership joined when no row tells the last used site', () => {
    expect(pickOwnHomeSite([row('anime', { joined_at: '2026-10-01T00:00:00Z' }), row('kpop')])).toBe('kpop');
    expect(pickOwnHomeSite([row('kpop', { joined_at: '2026-10-01T00:00:00Z' }), row('anime', { joined_at: '2026-02-01T00:00:00Z' })])).toBe('anime');
  });
  it('is the site used last when a row tells it', () => {
    const rows = [row('kpop', { last_seen_at: '2026-10-01T00:00:00Z' }), row('anime', { joined_at: '2026-10-05T00:00:00Z', last_seen_at: '2026-10-20T00:00:00Z' })];
    expect(pickOwnHomeSite(rows)).toBe('anime');
  });
  it('skips a membership that is banned or not activated, and the hub', () => {
    expect(pickOwnHomeSite([row('kpop', { banned_at: '2026-05-01T00:00:00Z' }), row('anime')])).toBe('anime');
    expect(pickOwnHomeSite([row('anime', { activated_at: null })])).toBe('kpop');
    expect(pickOwnHomeSite([row('hub'), row('nowhere')])).toBe('kpop');
  });
});

describe('pickMemberHomeSite', () => {
  it('is null with no visible membership', () => {
    expect(pickMemberHomeSite([])).toBeNull();
    expect(pickMemberHomeSite([row('kpop'), row('anime', { show_elsewhere: false })])).toBeNull();
  });
  it('is the first visible membership: activated, not banned, shown off its own site', () => {
    const rows = [
      row('kpop', { joined_at: '2026-01-01T00:00:00Z', show_elsewhere: false }),
      row('anime', { joined_at: '2026-03-01T00:00:00Z', show_elsewhere: true }),
    ];
    expect(pickMemberHomeSite(rows)).toBe('anime');
    expect(pickMemberHomeSite([...rows, row('kpop', { show_elsewhere: true, banned_at: '2026-04-01T00:00:00Z' })])).toBe('anime');
  });
});

describe('siteUrl', () => {
  it('goes through the registry origin, and the override only outside production', () => {
    expect(siteUrl('anime', '/me', ENV)).toBe(`${REGISTRY.anime.url}/me`);
    const o = { NEXT_PUBLIC_NET_ORIGINS: 'anime=http://anime.localhost:3001' };
    expect(siteUrl('anime', '/me', o)).toBe('http://anime.localhost:3001/me');
    expect(siteUrl('anime', '/me', { ...o, VERCEL_ENV: 'production' })).toBe(`${REGISTRY.anime.url}/me`);
  });
});

describe('ownPageTarget (/passport, /settings)', () => {
  const memberships = [
    { user_id: 'u-1', ...row('kpop') },
    { user_id: 'u-1', ...row('anime', { joined_at: '2026-06-01T00:00:00Z' }) },
    { user_id: 'u-2', ...row('anime') },
  ];

  it('signed out: the root of the hub', async () => {
    const { db, selects } = client({ world_memberships: memberships }, null);
    expect(await ownPageTarget(db, '/me', ENV)).toBe('/');
    expect(selects).toHaveLength(0);
  });
  it('an auth failure reads as signed out', async () => {
    expect(await ownPageTarget(client({}, 'throws').db, '/settings', ENV)).toBe('/');
  });
  it('signed in: the same page on the first site joined', async () => {
    const { db, selects } = client({ world_memberships: memberships }, { id: 'u-1' });
    expect(await ownPageTarget(db, '/me', ENV)).toBe(`${REGISTRY.kpop.url}/me`);
    expect(await ownPageTarget(db, '/settings', ENV)).toBe(`${REGISTRY.kpop.url}/settings`);
    expect(selects[0]).toEqual({ table: 'world_memberships', columns: OWN_MEMBERSHIP_COLUMNS });
  });
  it('signed in: the site used last wins', async () => {
    const rows = [{ user_id: 'u-1', ...row('kpop', { last_seen_at: '2026-09-01T00:00:00Z' }) }, { user_id: 'u-1', ...row('anime', { last_seen_at: '2026-10-01T00:00:00Z' }) }];
    expect(await ownPageTarget(client({ world_memberships: rows }, { id: 'u-1' }).db, '/settings', ENV)).toBe(`${REGISTRY.anime.url}/settings`);
  });
  it('signed in with no membership, or an unreadable table: kpop', async () => {
    expect(await ownPageTarget(client({ world_memberships: memberships }, { id: 'u-3' }).db, '/me', ENV)).toBe(`${REGISTRY.kpop.url}/me`);
    expect(await ownPageTarget(client({ world_memberships: memberships }, { id: 'u-1' }, new Set(['world_memberships'])).db, '/me', ENV)).toBe(`${REGISTRY.kpop.url}/me`);
  });
});

describe('memberPageTarget (/u/{username})', () => {
  const rows: Rows = {
    profiles: [
      { id: 'u-1', username: 'mina', banned_at: null },
      { id: 'u-2', username: 'banned_bo', banned_at: '2026-09-01T00:00:00Z' },
      { id: 'u-3', username: 'hidden_hana', banned_at: null },
      { id: 'u-4', username: 'new_nao', banned_at: null },
      { id: 'u-5', username: 'a b', banned_at: null },
    ],
    world_memberships: [
      { user_id: 'u-1', ...row('anime', { joined_at: '2026-03-01T00:00:00Z', show_elsewhere: true }) },
      { user_id: 'u-1', ...row('kpop', { joined_at: '2026-01-01T00:00:00Z', show_elsewhere: false }) },
      { user_id: 'u-2', ...row('kpop', { show_elsewhere: true }) },
      { user_id: 'u-3', ...row('anime', { show_elsewhere: false }) },
      { user_id: 'u-5', ...row('kpop', { show_elsewhere: true }) },
    ],
  };

  it('a member with a visible membership: their page on that site', async () => {
    const { db } = client(rows, null);
    expect(await memberPageTarget(db, 'mina', ENV)).toBe(`${REGISTRY.anime.url}/u/mina`);
    expect(await memberPageTarget(db, 'a b', ENV)).toBe(`${REGISTRY.kpop.url}/u/a%20b`);
  });
  it('an unknown member: null (404)', async () => {
    expect(await memberPageTarget(client(rows, null).db, 'nobody', ENV)).toBeNull();
  });
  it('a banned member: null (404), even with a visible membership', async () => {
    expect(await memberPageTarget(client(rows, null).db, 'banned_bo', ENV)).toBeNull();
  });
  it('a member with no visible membership, or none at all: null (404)', async () => {
    const { db } = client(rows, null);
    expect(await memberPageTarget(db, 'hidden_hana', ENV)).toBeNull();
    expect(await memberPageTarget(db, 'new_nao', ENV)).toBeNull();
  });
  it('a read error: null (fail closed)', async () => {
    expect(await memberPageTarget(client(rows, null, new Set(['profiles'])).db, 'mina', ENV)).toBeNull();
    expect(await memberPageTarget(client(rows, null, new Set(['world_memberships'])).db, 'mina', ENV)).toBeNull();
  });
  it('reads the public and filter columns of the membership, never a private one', async () => {
    const { db, selects } = client(rows, null);
    await memberPageTarget(db, 'mina', ENV);
    const asked = selects.find((s) => s.table === 'world_memberships')!.columns.split(',').map((c) => c.trim());
    expect(asked.join(', ')).toBe(MEMBER_MEMBERSHIP_COLUMNS);
    const allowed = new Set<string>([...MEMBER_PUBLIC_COLUMNS, ...MEMBER_FILTER_COLUMNS]);
    for (const c of asked) expect(allowed.has(c), c).toBe(true);
  });
});
