// Run O1, lane B2: forSite and withSite (rpcs.md 3, flags-env.md 3). The kpop build with SITE_SCOPE off keeps
// today's queries and insert payloads; SITE_SCOPE on filters kpop reads; anime and hub builds always filter; a
// non-kpop site always filters. The last case runs a real supabase-js builder through forSite (no network).

import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SITE_ID } from './registry';
import { forSite, siteScoped, withSite } from './scope';

import type { SiteFilterable, SiteId } from './types';

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
