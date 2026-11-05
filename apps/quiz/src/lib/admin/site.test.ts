// ADMIN-2: the explicit site of every admin call (lib/admin/site.ts), on every build.
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { adminSiteOf, parseSite, resolveAdminSite } from './site';
import { siteScope } from './site-scope';

import type { AdminSiteResult } from './site';

const ok = (r: AdminSiteResult): string => (r.ok ? r.site : `refused ${r.res.status}`);
async function code(r: AdminSiteResult): Promise<string> {
  if (r.ok) return 'ok';
  const body = (await r.res.json()) as { code: string };
  expect(r.res.status).toBe(400);
  expect(r.res.headers.get('cache-control')).toBe('no-store');
  expect(r.res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  return body.code;
}

describe('parseSite', () => {
  it('knows the three SITE_IDS exactly', () => {
    for (const s of ['kpop', 'anime', 'hub']) expect(parseSite(s)).toBe(s);
    for (const bad of ['', ' kpop', 'kpop ', 'KPOP', 'fanquiz', 'all', '*', 'kpop,anime', '__proto__', 'constructor', 'toString', null, undefined, 1, {}, ['kpop']]) expect(parseSite(bad), String(bad)).toBeNull();
  });
});

describe('resolveAdminSite', () => {
  it('validates a site that is present, on every build', async () => {
    for (const build of ['kpop', 'anime', 'hub'] as const) {
      expect(ok(resolveAdminSite('anime', { build }))).toBe('anime');
      expect(ok(resolveAdminSite('hub', { build }))).toBe('hub');
      expect(await code(resolveAdminSite('nope', { build }))).toBe('bad_site');
      expect(await code(resolveAdminSite('KPOP', { build }))).toBe('bad_site');
      expect(await code(resolveAdminSite(7, { build }))).toBe('bad_site');
      expect(await code(resolveAdminSite({ site: 'kpop' }, { build }))).toBe('bad_site');
    }
  });

  it('means the build\'s own site when none was sent on kpop and anime (their pages send none until step 6)', () => {
    for (const none of [undefined, null, '']) {
      expect(ok(resolveAdminSite(none, { build: 'kpop' }))).toBe('kpop');
      expect(ok(resolveAdminSite(none, { build: 'anime' }))).toBe('anime');
    }
  });

  it('requires it on the hub, where the build says nothing about the site; a cron on its own build may leave it out', async () => {
    for (const none of [undefined, null, '']) expect(await code(resolveAdminSite(none, { build: 'hub' }))).toBe('site_required');
    expect(ok(resolveAdminSite(undefined, { build: 'hub', buildDefault: true }))).toBe('hub');
  });

  it('refuses a site a tool does not serve', async () => {
    expect(ok(resolveAdminSite('kpop', { build: 'hub', only: ['kpop'] }))).toBe('kpop');
    expect(await code(resolveAdminSite('anime', { build: 'hub', only: ['kpop'] }))).toBe('site_unsupported');
    expect(await code(resolveAdminSite('hub', { build: 'hub', only: ['kpop', 'anime'] }))).toBe('site_unsupported');
    expect(await code(resolveAdminSite(undefined, { build: 'anime', only: ['kpop'] }))).toBe('site_unsupported');
  });
});

describe('adminSiteOf', () => {
  const req = (qs: string): NextRequest => new NextRequest(`https://bunnyverse.org/api/admin/x${qs}`);

  it('reads the query string first, then the JSON body', () => {
    expect(ok(adminSiteOf(req('?site=kpop'), { site: 'anime' }, { build: 'hub' }))).toBe('kpop');
    expect(ok(adminSiteOf(req(''), { site: 'anime' }, { build: 'hub' }))).toBe('anime');
    expect(ok(adminSiteOf(req('?site='), { site: 'anime' }, { build: 'hub' }))).toBe('anime');
  });

  it('a bad value in the query is refused even when the body is fine', async () => {
    expect(await code(adminSiteOf(req('?site=evil'), { site: 'kpop' }, { build: 'hub' }))).toBe('bad_site');
  });

  it('ignores a body that is not an object, and an absent one', async () => {
    for (const body of [undefined, null, 'kpop', 5, ['kpop'], true]) expect(await code(adminSiteOf(req(''), body, { build: 'hub' }))).toBe('site_required');
    expect(ok(adminSiteOf(req(''), undefined, { build: 'kpop' }))).toBe('kpop');
  });

  it('works with a plain Request (a route typed Request)', () => {
    expect(ok(adminSiteOf(new Request('https://bunnyverse.org/api/admin/x?site=anime'), undefined, { build: 'hub' }))).toBe('anime');
  });
});

describe('siteScope', () => {
  const recorder = (): { q: { eq: (k: string, v: string) => unknown }; calls: Array<[string, string]> } => {
    const calls: Array<[string, string]> = [];
    return { calls, q: { eq: (k: string, v: string) => { calls.push([k, v]); return undefined; } } };
  };

  it('filters and stamps rows with the chosen site, whatever the build is (a non-kpop site always acts)', () => {
    const { q, calls } = recorder();
    siteScope('anime').forSite(q);
    siteScope('hub').forSite(q);
    expect(calls).toEqual([['site_id', 'anime'], ['site_id', 'hub']]);
    expect(siteScope('anime').withSite({ a: 1 })).toEqual({ a: 1, site_id: 'anime' });
    expect(siteScope('hub').withSite({ a: 1, site_id: 'kpop' })).toEqual({ a: 1, site_id: 'kpop' });
  });

  it('reports whether it really filters', () => {
    expect(siteScope('anime').scoped).toBe(true);
    expect(siteScope('hub').scoped).toBe(true);
  });
});
