// Run PWA: what /sw.js answers. Called by the two route handlers (app/sw.js for kpopquiz.org, app/sites/[site]/sw.js for the hub), so
// the answer is one function that the tests read as the handlers do.
//
//   kill switch on (NET_PWA_KILL): the self-unregistering worker, on any app build;
//   flag on (NEXT_PUBLIC_NET_PWA) and the site is an app: that app's worker;
//   anything else, and every build that is no app (OtakuQuiz): a plain 404, kpopquiz.org's answer today.
// Always `Cache-Control: no-cache`, so a browser asks again each time it checks the worker (and the registration passes
// updateViaCache 'none'): a new version, or the kill worker, arrives on the next visit.

import { siteConfig } from '@/lib/site/registry';

import { pwaAppOf, pwaMode } from './config';
import { killSwitchSource, serviceWorkerSource } from './sw-source';

import type { PwaEnv } from './config';
import type { SwTheme } from './sw-source';
import type { SiteId } from '@/lib/site/types';

const HEADERS = {
  'Content-Type': 'text/javascript; charset=utf-8',
  'Cache-Control': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
} as const;

/** The offline page's colours: the page, ink, muted and accent tokens of the site's light and dark themes. */
export function swThemeOf(site: SiteId): SwTheme {
  const { light, dark } = siteConfig(site).theme;
  return {
    page: light.page ?? '#FAF8F5',
    ink: light.ink ?? '#1F1B17',
    muted: light.muted ?? '#6B655E',
    accent: light['pink-fill'] ?? '#1F1B17',
    onAccent: light['on-accent'] ?? '#FFFFFF',
    pageDark: dark.page ?? '#141312',
    inkDark: dark.ink ?? '#F3F0EB',
    mutedDark: dark.muted ?? '#A8A198',
    accentDark: dark['pink-fill'] ?? light['pink-fill'] ?? '#F3F0EB',
    onAccentDark: dark['on-accent'] ?? '#FFFFFF',
  };
}

/** The answer of /sw.js for `site` under `env`. */
export function swResponse(site: SiteId, env: PwaEnv): Response {
  const app = pwaAppOf(site);
  const mode = pwaMode(env);
  if (app === null || mode === 'off') return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (mode === 'kill') return new Response(killSwitchSource(), { headers: HEADERS });
  return new Response(serviceWorkerSource({ app, brand: siteConfig(site).brand.name, theme: swThemeOf(site) }), { headers: HEADERS });
}
