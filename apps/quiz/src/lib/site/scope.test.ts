// Run O1, lane B2: forSite and withSite (rpcs.md 3, flags-env.md 3). The kpop build with SITE_SCOPE off keeps
// today's queries and insert payloads; SITE_SCOPE on filters kpop reads; anime and hub builds always filter; a
// non-kpop site always filters. A real supabase-js client with a recording fetch (nothing leaves the process)
// then drives the kpop readers B2 owns (passport, notifications) and pins their requests of today.

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SITE_ID } from './registry';
import { forSite, siteScoped, withSite } from './scope';

import type { SiteFilterable, SiteId } from './types';

type Sent = { method: string; url: string; body: string | null };
const net = vi.hoisted(() => {
  const sent: Array<{ method: string; url: string; body: string | null }> = [];
  const record = async (input: unknown, init?: { method?: string; body?: unknown }): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as { url: string }).url;
    const u = new URL(href);
    const method = init?.method ?? 'GET';
    sent.push({ method, url: decodeURIComponent(u.pathname + u.search), body: typeof init?.body === 'string' ? init.body : null });
    return new Response(method === 'HEAD' ? null : '[]', {
      status: 200, headers: { 'content-type': 'application/json', 'content-range': '0-0/0' },
    });
  };
  return { sent, record };
});

vi.mock('@/lib/supabase/server', async () => {
  const { createClient: make } = await import('@supabase/supabase-js');
  const client = make('http://127.0.0.1:9', 'o1-b2-fake-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: net.record as unknown as typeof fetch },
  });
  return {
    createServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u-b2' } } }) },
      from: (table: string) => client.from(table),
    }),
    createServiceRoleClient: () => client,
    client,
  };
});

/** A query builder that records its eq calls (the shape Supabase's filter builders have). */
class FakeQuery implements SiteFilterable<FakeQuery> {
  readonly calls: Array<[string, string]> = [];
  eq(column: 'site_id', value: SiteId): FakeQuery {
    this.calls.push([column, value]);
    return this;
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('siteScoped', () => {
  it('is off only for kpop on the kpop build with SITE_SCOPE off', () => {
    for (const flag of [undefined, '', '0', 'false', 'off', 'yes', 'TRUE']) {
      expect(siteScoped('kpop', 'kpop', flag), String(flag)).toBe(false);
    }
    for (const flag of ['1', 'true']) expect(siteScoped('kpop', 'kpop', flag), flag).toBe(true);
  });

  it('is always on for anime and hub builds, whatever the flag (fail closed)', () => {
    for (const build of ['anime', 'hub'] as const) {
      for (const site of ['kpop', 'anime', 'hub'] as const) {
        for (const flag of [undefined, '0', '1']) expect(siteScoped(site, build, flag)).toBe(true);
      }
    }
  });

  it('is always on for a non-kpop site, even on the kpop build with SITE_SCOPE off', () => {
    expect(siteScoped('anime', 'kpop', undefined)).toBe(true);
    expect(siteScoped('hub', 'kpop', '0')).toBe(true);
  });

  it('defaults to the build site and the SITE_SCOPE variable', () => {
    expect(SITE_ID).toBe('kpop');
    vi.stubEnv('SITE_SCOPE', '');
    expect(siteScoped()).toBe(false);
    vi.stubEnv('SITE_SCOPE', '1');
    expect(siteScoped()).toBe(true);
  });
});

describe('forSite on the kpop build', () => {
  it('returns the query itself, with no filter, while SITE_SCOPE is unset (today)', () => {
    vi.stubEnv('SITE_SCOPE', '');
    const q = new FakeQuery();
    expect(forSite(q)).toBe(q);
    expect(forSite(q, 'kpop')).toBe(q);
    expect(q.calls).toEqual([]);
  });

  it('filters kpop reads by site_id when SITE_SCOPE is on', () => {
    vi.stubEnv('SITE_SCOPE', '1');
    const q = new FakeQuery();
    expect(forSite(q)).toBe(q);
    expect(q.calls).toEqual([['site_id', 'kpop']]);
  });

  it('filters a read that names another site even with SITE_SCOPE off', () => {
    vi.stubEnv('SITE_SCOPE', '0');
    const q = new FakeQuery();
    forSite(q, 'anime');
    expect(q.calls).toEqual([['site_id', 'anime']]);
  });
});

describe('withSite on the kpop build', () => {
  it('returns the row unchanged while SITE_SCOPE is unset (the column default gives kpop)', () => {
    vi.stubEnv('SITE_SCOPE', '');
    const row = { title: 'A quiz', group_id: 3 };
    const out = withSite(row);
    expect(out).toBe(row);
    expect(Object.keys(out)).toEqual(['title', 'group_id']);
  });

  it('sets site_id on a copy when SITE_SCOPE is on', () => {
    vi.stubEnv('SITE_SCOPE', 'true');
    const row = { title: 'A quiz' };
    const out = withSite(row);
    expect(out).toEqual({ title: 'A quiz', site_id: 'kpop' });
    expect(out).not.toBe(row);
    expect(row).toEqual({ title: 'A quiz' });
  });

  it('sets a named non-kpop site even with SITE_SCOPE off', () => {
    vi.stubEnv('SITE_SCOPE', '');
    expect(withSite({ title: 'A quiz' }, 'anime')).toEqual({ title: 'A quiz', site_id: 'anime' });
  });

  it('keeps an explicit site_id of the row', () => {
    vi.stubEnv('SITE_SCOPE', '1');
    expect(withSite({ title: 'A quiz', site_id: 'hub' as SiteId }, 'anime').site_id).toBe('hub');
    expect(withSite({ site_id: 'anime' as SiteId }).site_id).toBe('anime');
  });

  it('treats a null or undefined site_id as unset', () => {
    vi.stubEnv('SITE_SCOPE', '1');
    const unset: { title: string; site_id?: SiteId | null | undefined } = { title: 'A quiz', site_id: undefined };
    const empty: { title: string; site_id?: SiteId | null | undefined } = { title: 'A quiz', site_id: null };
    expect(withSite(unset).site_id).toBe('kpop');
    expect(withSite(empty).site_id).toBe('kpop');
  });
});

describe('an anime build (module loaded with NEXT_PUBLIC_SITE_ID=anime)', () => {
  it('filters and stamps every call, whatever SITE_SCOPE says', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    vi.stubEnv('SITE_ID', '');
    vi.stubEnv('SITE_SCOPE', '');
    vi.resetModules();
    const scope = await import('./scope');
    const q = new FakeQuery();
    scope.forSite(q);
    expect(q.calls).toEqual([['site_id', 'anime']]);
    expect(scope.withSite({ title: 'An anime quiz' })).toEqual({ title: 'An anime quiz', site_id: 'anime' });
    vi.stubEnv('SITE_SCOPE', '0');
    const k = new FakeQuery();
    scope.forSite(k, 'kpop');
    expect(k.calls).toEqual([['site_id', 'kpop']]);
  });

  it('does the same on a hub build', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    vi.stubEnv('SITE_ID', '');
    vi.stubEnv('SITE_SCOPE', '');
    vi.resetModules();
    const scope = await import('./scope');
    const q = new FakeQuery();
    scope.forSite(q);
    expect(q.calls).toEqual([['site_id', 'hub']]);
  });
});

describe('a real supabase-js builder', () => {
  const client = createClient('http://127.0.0.1:9', 'o1-b2-fake-anon-key', { auth: { persistSession: false } });

  it('passes through untouched on kpop with SITE_SCOPE off and gains site_id=eq.kpop when on', () => {
    vi.stubEnv('SITE_SCOPE', '');
    const off = forSite(client.from('quizzes').select('id, title'));
    expect((off as unknown as { url: URL }).url.searchParams.get('site_id')).toBeNull();
    vi.stubEnv('SITE_SCOPE', '1');
    const on = forSite(client.from('quizzes').select('id, title')).order('created_at', { ascending: false }).limit(5);
    const url = (on as unknown as { url: URL }).url;
    expect(url.searchParams.get('site_id')).toBe('eq.kpop');
    expect(url.searchParams.get('select')).toBe('id,title');
    expect(url.searchParams.get('limit')).toBe('5');
  });
});

describe('the kpop readers B2 owns send today\'s requests while SITE_SCOPE is off', () => {
  beforeEach(() => {
    net.sent.length = 0;
  });

  const run = async (flag: string): Promise<Sent[]> => {
    vi.stubEnv('SITE_SCOPE', flag);
    net.sent.length = 0;
    const { client } = (await import('@/lib/supabase/server')) as unknown as { client: ReturnType<typeof createClient> };
    const { readCollectionProgress } = await import('@/lib/passport');
    const notifications = await import('@/lib/notifications');
    const list = await import('@/app/api/notifications/route');
    const markRead = await import('@/app/api/notifications/mark-read/route');
    await readCollectionProgress(client, 'u-b2');
    await list.GET(new NextRequest('http://127.0.0.1/api/notifications?limit=5'));
    await list.DELETE(new NextRequest('http://127.0.0.1/api/notifications', { method: 'DELETE', body: JSON.stringify({ ids: ['n1'] }) }));
    await markRead.POST(new NextRequest('http://127.0.0.1/api/notifications/mark-read', { method: 'POST', body: '{}' }));
    await notifications.notifyNewFollower({ followedId: 'u-b2', followerId: 'u-2', followerUsername: 'fan2' });
    await notifications.notifyMilestone({ creatorId: 'u-b2', quizId: 'q-1', quizTitle: 'A quiz', playCount: 10 });
    await notifications.notifyComment({ creatorId: 'u-b2', quizId: 'q-1', quizTitle: 'A quiz', username: 'fan2', content: 'hi', recentCount: 1 });
    return net.sent.map((r) => ({ ...r }));
  };

  it('off: the exact requests of today (no site_id anywhere)', async () => {
    // Order-free (the readers run some requests in parallel); the time cut-offs are replaced by <t>.
    const norm = (list: Sent[]): string[] =>
      list.map((r) => `${r.method} ${r.url.replace(/created_at=gte\.[^&]+/, 'created_at=gte.<t>')} ${r.body ?? ''}`).sort();
    const sent = await run('');
    expect(norm(sent)).toEqual(norm([
      { method: 'GET', url: '/rest/v1/groups?select=id,name,generation,display_color', body: null },
      { method: 'GET', url: '/rest/v1/player_group_mastery?select=group_id,songs_played,songs_correct&player_id=eq.u-b2', body: null },
      { method: 'GET', url: '/rest/v1/creator_notifications?select=id,user_id,type,title,body,quiz_id,link_url,is_read,created_at,quizzes:quiz_id(slug)&user_id=eq.u-b2&order=created_at.desc&offset=0&limit=5', body: null },
      { method: 'HEAD', url: '/rest/v1/creator_notifications?select=*&user_id=eq.u-b2&is_read=eq.false', body: null },
      { method: 'DELETE', url: '/rest/v1/creator_notifications?id=in.(n1)', body: null },
      { method: 'PATCH', url: '/rest/v1/creator_notifications?user_id=eq.u-b2&is_read=eq.false&select=id', body: '{"is_read":true}' },
      { method: 'HEAD', url: '/rest/v1/creator_notifications?select=id&user_id=eq.u-b2&type=eq.new_follower&sender_id=eq.u-2&created_at=gte.<t>', body: null },
      { method: 'POST', url: '/rest/v1/creator_notifications', body: '{"user_id":"u-b2","type":"new_follower","title":"fan2 started following you","link_url":"/u/fan2","sender_id":"u-2"}' },
      { method: 'POST', url: '/rest/v1/creator_notifications?on_conflict=user_id,quiz_id,type,title', body: '{"user_id":"u-b2","type":"milestone","title":"Your quiz hit 10 plays!","body":"\\"A quiz\\" is getting traction.","quiz_id":"q-1"}' },
      { method: 'GET', url: '/rest/v1/creator_notifications?select=id&user_id=eq.u-b2&quiz_id=eq.q-1&type=eq.comment&created_at=gte.<t>&order=created_at.desc&limit=1', body: null },
      { method: 'POST', url: '/rest/v1/creator_notifications?on_conflict=user_id,quiz_id,type,title', body: '{"user_id":"u-b2","quiz_id":"q-1","type":"comment","title":"fan2 commented on your quiz","body":"hi"}' },
    ]));
    for (const r of sent) {
      expect(r.url).not.toContain('site_id');
      expect(r.body ?? '').not.toContain('site_id');
    }
  });

  it('on: every read of creator_notifications and groups filters site_id=eq.kpop, every insert carries site_id kpop', async () => {
    const sent = await run('1');
    const scoped = sent.filter((r) => r.url.startsWith('/rest/v1/groups') || r.url.startsWith('/rest/v1/creator_notifications'));
    expect(scoped).toHaveLength(10);
    for (const r of scoped) {
      if (r.method === 'POST') expect(JSON.parse(r.body!).site_id, r.url).toBe('kpop');
      else expect(r.url, `${r.method} ${r.url}`).toContain('site_id=eq.kpop');
    }
    const mastery = sent.find((r) => r.url.startsWith('/rest/v1/player_group_mastery'));
    expect(mastery?.url).not.toContain('site_id');
  });
});
