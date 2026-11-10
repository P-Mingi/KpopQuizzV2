// The passport doors of the three builds (owner bug 2026-11-09: on OtakuQuiz the passport of the account menu was a 404).
// Cause: the shared chrome linked /profile, a kpop-only path then (KPOP_ONLY_SAMPLES), which is /anime/profile on the anime build.
// Owner, 2026-11-09 (lot o1/next C): OtakuQuiz now serves its own /profile (a redirect to /me, as kpop), and its doors open it.
// One test per link source: the href each build renders. Then: no build renders a passport link to a path it does not serve.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MeProfile } from '@/lib/auth/use-me';
import type { SiteId } from '@/lib/site/types';

const PROFILE: MeProfile = {
  username: 'fan1', display_name: 'Fan One', avatar_url: null, avatar_bg: '#222222', avatar_text: '#ffffff', xp: 1200,
  daily_streak: 3, last_daily_date: '2026-10-20',
};

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => ({ profile: PROFILE }) }));
vi.mock('@/components/ux-v1/sign-in-sheet', () => ({ useSignIn: () => () => undefined }));
vi.mock('@/components/ux-v1/toast', () => ({ useUxToast: () => () => undefined }));
vi.mock('@/lib/notifications-store', () => ({ refetchUnread: () => Promise.resolve(), useUnreadCount: () => 0 }));
vi.mock('@/components/layout/ux-v1/ux-search', () => ({ useUxSearch: () => () => undefined }));
vi.mock('@/components/layout/ux-v1/slots', () => ({ BellPanel: () => null }));

afterEach(() => { vi.unstubAllEnvs(); });

const BRIDGE = (letter: string): string => `/auth/passport/out?to=hub&amp;next=%2Fpassport&amp;via=${letter}.pp`;
const EXPECTED: Record<SiteId, { href: string; letter: string }> = {
  kpop: { href: '/profile', letter: 'k' },
  anime: { href: '/profile', letter: 'a' },
  hub: { href: '/passport', letter: 'f' },
};

async function loadSite(site: SiteId) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const [nav, common, routing, registry] = await Promise.all([
    import('@/components/layout/ux-v1/ux-nav-actions'), import('./common-passport'), import('@/lib/site/routing'), import('@/lib/site/registry'),
  ]);
  return { nav, common, routing, registry };
}

const hrefsOf = (html: string): string[] => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!.replace(/&amp;/g, '&'));
const SITES: SiteId[] = ['kpop', 'anime', 'hub'];

describe('the href each build renders', () => {
  for (const site of SITES) {
    it(`${site}: the account menu Passport row`, async () => {
      const { nav } = await loadSite(site);
      const html = renderToString(h(nav.AccountBody, { profile: PROFILE, close: () => undefined, onSignOut: () => undefined }));
      const passport = html.match(/<a[^>]*href="([^"]*)"[^>]*>(?:<svg.*?<\/svg>)?Passport<\/a>/);
      expect(passport?.[1]).toBe(EXPECTED[site].href);
    });
    it(`${site}: the streak popover "See your passport" button`, async () => {
      const { nav } = await loadSite(site);
      const html = renderToString(h(nav.StreakBody, { v: { days: 3, state: 'played', left: '', hoursLeft: 0, week: [] } as never, close: () => undefined }));
      expect(html.match(/<a[^>]*href="([^"]*)"[^>]*>See your passport<\/a>/)?.[1]).toBe(EXPECTED[site].href);
    });
  }

  it('anime: the settings row "whole passport" and the /me footer lead to the same bridge', async () => {
    const { registry } = await loadSite('anime');
    const { settingsWorld } = await import('./settings-world');
    expect(settingsWorld('anime')?.passportHref).toBe(BRIDGE('a').replace(/&amp;/g, '&'));
    expect(registry.SITE.id).toBe('anime');
    const { wholePassportHref } = await import('./world-data');
    expect(wholePassportHref()).toBe(BRIDGE('a').replace(/&amp;/g, '&'));
  });

  it('the mobile "You" tab: kpop /profile, anime /me, hub /passport (the page of the site itself)', async () => {
    for (const [site, href] of [['kpop', '/profile'], ['anime', '/me'], ['hub', '/passport']] as const) {
      const { registry } = await loadSite(site);
      const { tabItemsFor } = await import('@/lib/ux-v1/a0/nav');
      expect(tabItemsFor(registry.SITE).find((t) => t.key === 'you')?.href).toBe(href);
    }
  });

  it('the hub renders one signed-in jump per site on its passport page, each a path of that site', async () => {
    const { buildCommonPassport } = await import('@/lib/site/hub/passport-page');
    await loadSite('hub');
    const { buildCommonPassport: build } = await import('@/lib/site/hub/passport-page');
    void buildCommonPassport;
    const rows = (['kpop', 'anime'] as const).map((site_id) => ({ site_id, joined_at: '2026-01-01', joined_via: 'direct', via_code: null, activated_at: '2026-01-01', xp: 10, plays: 1, daily_streak: 0, quizzes_created: 0, show_elsewhere: true }));
    const out = build(rows as never, 'fan1');
    expect(out.sites.map((s) => s.href)).toEqual([
      '/auth/passport/out?to=kpop&next=%2Fme&via=f.pp',
      '/auth/passport/out?to=anime&next=%2Fme&via=f.pp',
    ]);
  });
});

describe('no build renders a passport link to a path it does not serve', () => {
  for (const site of SITES) {
    it(`${site}: every passport href of the shared chrome is a route of the build`, async () => {
      const { nav, routing, registry, common } = await loadSite(site);
      const html = renderToString(h(nav.AccountBody, { profile: PROFILE, close: () => undefined, onSignOut: () => undefined }));
      const hrefs = hrefsOf(html).filter((x) => /passport|profile|^\/me/.test(x));
      hrefs.push(common.commonPassportHref(registry.SITE), common.passportDoorProps(registry.SITE).href);
      expect(hrefs.length).toBeGreaterThan(2);
      for (const href of hrefs) {
        const path = href.split(/[?#]/)[0]!;
        expect(routing.isKnownRouteFor(site, path, { v1: true, v12: true }), `${site}: ${href}`).toBe(true);
      }
    });
  }

  it('the hub never links /profile (a path it does not serve); anime serves and links its own /profile; /anime/passport is linked nowhere', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const { nav, routing, registry } = await loadSite(site);
      const served = site === 'anime';
      expect(routing.isKnownRouteFor(site, '/profile', { v1: true, v12: true })).toBe(served);
      const html = renderToString(h(nav.AccountBody, { profile: PROFILE, close: () => undefined, onSignOut: () => undefined }));
      if (served) expect(hrefsOf(html)).toContain('/profile');
      else expect(hrefsOf(html)).not.toContain('/profile');
      expect(html).not.toContain('/anime/passport');
      expect(routing.isKnownRouteFor('anime', '/passport', { v1: true, v12: true })).toBe(false);
      expect(registry.SITE.id).toBe(site);
    }
  });

  it('anime: /profile is the OtakuQuiz passport, a noindex redirect to /me (as kpop /profile), and /me always links the Bunnyverse passport', async () => {
    const fs = await import('node:fs');
    const page = fs.readFileSync('src/app/sites/[site]/(anime)/profile/page.tsx', 'utf8');
    expect(page).toContain("redirect('/me')");
    expect(page).toContain('robots: { index: false, follow: false }');
    const me = fs.readFileSync('src/app/sites/[site]/(anime)/me/page.tsx', 'utf8');
    expect(me).toContain("footer={<p className=\"ux-help\"><Link className=\"ux-lnk\" href={wholePassportHref()} prefetch={false}>{p1('me.wholePassport')}</Link></p>}");
    expect(me).not.toContain('me.multiSite ?');
    await loadSite('anime');
    const { wholePassportHref } = await import('./world-data');
    expect(wholePassportHref()).toBe(BRIDGE('a').replace(/&amp;/g, '&'));
  });
});
