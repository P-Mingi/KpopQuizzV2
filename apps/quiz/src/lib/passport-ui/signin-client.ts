// Run O1, lot (b), lane P1: the browser side of signing in on a world site (anime, hub). kpop never imports this module.
//
// FandomVerse (owner, 2026-10-28): fandomverse.org (hub) and fandomverse.org/anime sign in with Google and Discord only, both
// through Supabase's OAuth redirect with the same Google client as kpopquiz.org, no Google Identity Services, no email. The
// browser goes to /auth/start of its build (signInWithProvider); the server keeps the return path and the tab's via in an
// HttpOnly cookie and sends the provider back to the exact /auth/callback of the build (lib/passport/signin.ts), which stamps
// the membership and says where to go. The Google ID-token flow of the earlier sheets (Google Identity Services,
// signInWithIdToken, then a POST to /api/passport/after-signin) is gone (review, 2026-10-28): nothing called it any more.

import { VIA_RE } from '@/lib/network/types';
import { siteConfig } from '@/lib/site/registry';

import type { OAuthProvider } from '@/lib/auth/oauth-return';
import type { SiteId } from '@/lib/site/types';

/** sessionStorage key of the tab's validated `via` (types.ts AfterSigninRequest). */
export const TAB_VIA_KEY = 'fq.net.via';

/** The tab's `via` when it is stored and valid, else null. `storage` is injected by tests. */
export function readTabVia(storage?: Pick<Storage, 'getItem'> | null): string | null {
  try {
    const s = storage ?? (typeof sessionStorage === 'undefined' ? null : sessionStorage);
    const v = s?.getItem(TAB_VIA_KEY) ?? null;
    return v !== null && VIA_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** The address the email link comes back to: the site's landing, with `next` as its only query. */
export function emailRedirect(origin: string, landing: string, next: string): string {
  return `${origin}${landing}?next=${encodeURIComponent(next)}`;
}

// ---------------------------------------------------------------------------------------------------------------
// FandomVerse: Google and Discord, started on the server of the build (GET /auth/start)
// ---------------------------------------------------------------------------------------------------------------

/** The two providers of a world site (registry auth.providers of anime and hub). */
export type { OAuthProvider };
export { oauthCallbackUrl } from '@/lib/auth/base-path';

/**
 * The path that starts Google or Discord on the server of the build: its basePath, /auth/start, the provider, the return
 * path (an app path) and the tab's via when it is valid. The server keeps returnTo and via in an HttpOnly cookie and asks
 * Supabase for the provider with the exact callback of the build (security review, 2026-10-28: no query on the callback).
 */
export function oauthStartPath(basePath: string, provider: OAuthProvider, back: string, via: string | null): string {
  const q = new URLSearchParams({ provider, returnTo: back });
  if (via !== null && VIA_RE.test(via)) q.set('via', via);
  return `${basePath}/auth/start?${q.toString()}`;
}

/** The app path of the page the browser is on (its basePath dropped): what a sign-in without an explicit returnTo comes back to. */
export function currentAppPath(basePath: string, pathname: string, search: string): string {
  let path = pathname;
  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) path = pathname.slice(basePath.length) || '/';
  return `${path}${search}`;
}

export type OAuthOutcome = { readonly kind: 'redirecting' } | { readonly kind: 'error'; readonly message: string };

/**
 * Google or Discord on a world site: the browser goes to /auth/start of its build. A provider the site does not offer
 * (registry auth.providers) is refused before any navigation. `navigate` is window.location.assign by default.
 */
export function signInWithProvider(
  site: SiteId,
  provider: OAuthProvider,
  back: string,
  opts: { readonly basePath: string; readonly via: string | null },
  navigate: (url: string) => void = (url) => window.location.assign(url),
): OAuthOutcome {
  if (!siteConfig(site).auth.providers.includes(provider)) return { kind: 'error', message: 'This sign-in is not offered here.' };
  navigate(oauthStartPath(opts.basePath, provider, back, opts.via));
  return { kind: 'redirecting' };
}
