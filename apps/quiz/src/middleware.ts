import { NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';
import { isKnownRoute } from '@/lib/route-allowlist';
import { verseHidden, isGatedVersePath, hasAuthCookie } from '@/lib/verse/visibility';

import type { NextRequest } from 'next/server';

// Paths that actually require a user session check. Everything else is public
// and must NEVER call Supabase from middleware - the auth-getUser round trip
// is what was driving the [middleware] auth.getUser timed out warnings on
// the edge runtime (which is globally distributed, not co-located with
// Supabase in eu-west-1). Public requests pay zero Supabase cost.
const PROTECTED_PATH_PREFIXES = ['/onboarding', '/settings', '/admin'];

// The W-CUSTOM studio (and its curator-only draft preview) require a fresh session
// so the server-side curator gate is reliable. Everything else under /verse stays
// on the public fast path.
const STUDIO_RE = /^\/verse\/[^/]+\/studio(\/|$)/;

function needsAuth(pathname: string): boolean {
  if (pathname === '/login') return true;
  if (STUDIO_RE.test(pathname)) return true;
  return PROTECTED_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}


// Hard wall-clock cap on the middleware. Supabase auth + any redirect logic
// must complete inside this window or we fail OPEN (anonymous) so a slow DB
// degrades auth instead of 504-ing the whole site.
const MIDDLEWARE_TIMEOUT_MS = 2500;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // RENDER-FIX: the x-pathname header is gone. It existed only so the root layout
  // could branch chrome on/off for /embed via await headers(), which forced every
  // page dynamic. /embed now lives outside the (site) route group, so the chrome
  // is chosen by folder, not by a runtime header, and nothing reads x-pathname.
  const passthrough = (): NextResponse => NextResponse.next();

  // PUSH-GATE-1 (VERSE_PUBLIC): while the Verse is hidden, an ANONYMOUS request (no auth
  // cookie) to any gated Verse route -> 302 to the /verse teaser. Pure cookie-presence check,
  // NO Supabase call (edge-safe): crawlers + logged-out visitors are cookieless and get the
  // 302 here; logged-in users pass through and the server-side role gate (isVersePrivileged)
  // decides. 302 (temporary) parks the SEO equity - Google understands "coming back".
  if (verseHidden() && isGatedVersePath(pathname) && !hasAuthCookie(request.cookies.getAll().map((c) => c.name))) {
    return NextResponse.redirect(new URL('/verse', request.url), 302);
  }

  // PUBLIC FAST PATH - no Supabase call. Handles the vast majority of traffic.
  if (!needsAuth(pathname)) {
    // SEO consolidation: /blind-test/* -> /blindtest/* (301 permanent).
    if (pathname === '/blind-test' || pathname.startsWith('/blind-test/')) {
      const newPath = pathname.replace('/blind-test', '/blindtest');
      const to = new URL(newPath, request.url);
      to.search = request.nextUrl.search;
      return NextResponse.redirect(to, 301);
    }
    // H10: retired /create-preview funnel -> /create (preserve any query string).
    if (pathname === '/create-preview' || pathname.startsWith('/create-preview/')) {
      const to = new URL('/create', request.url);
      to.search = request.nextUrl.search;
      return NextResponse.redirect(to);
    }
    // E4: retired /battle-preview prototype -> /battle.
    if (pathname === '/battle-preview' || pathname.startsWith('/battle-preview/')) {
      return NextResponse.redirect(new URL('/battle', request.url));
    }
    // Workstream P: the SEO-friendly personality URLs
    // (/which-{group}-member-are-you [+ /r/{member}]) rewrite to the real
    // /personality/{group} route while the address bar keeps the pretty URL.
    const pm = pathname.match(/^\/which-(.+?)-member-are-you(?:\/r\/([^/]+))?\/?$/);
    if (pm) {
      const url = request.nextUrl.clone();
      url.pathname = pm[2] ? `/personality/${pm[1]}/r/${pm[2]}` : `/personality/${pm[1]}`;
      return NextResponse.rewrite(url);
    }
    // SEO: unknown legacy URLs 301 to home so the link equity carries over.
    if (!isKnownRoute(pathname)) {
      return NextResponse.redirect(new URL('/', request.url), 301);
    }
    return passthrough();
  }

  // PROTECTED PATH - full updateSession with the P1 fail-open guards.
  try {
    const result = await Promise.race([
      updateSession(request),
      new Promise<NextResponse>((resolve) => {
        setTimeout(() => {
          console.warn('[middleware] timeout after', MIDDLEWARE_TIMEOUT_MS, 'ms - failing open');
          resolve(passthrough());
        }, MIDDLEWARE_TIMEOUT_MS);
      }),
    ]);
    return result;
  } catch (err) {
    console.error('[middleware] top-level error - failing open:', err);
    return passthrough();
  }
}

export const config = {
  matcher: [
    // Skip Next internals, API routes, static assets, sitemap/robots, OG images,
    // and any root .txt file (robots.txt, llms.txt, the IndexNow key file).
    '/((?!api/|_next/static|_next/image|_next/data|favicon.ico|apple-touch-icon.png|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
  ],
};
