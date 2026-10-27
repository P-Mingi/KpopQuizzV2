import { NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';
import { NOT_FOUND_REWRITE, isFilePath, isKnownRoute } from '@/lib/route-allowlist';
import {
  GONE_HTML, LEGACY_BATTLE_HANDLER, LEGACY_BATTLE_PATH, legacyAnswer,
} from '@/lib/seo/legacy-urls';
import { isUxV12 } from '@/lib/ux-v12';
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
    // SEO (owner, 2026-10-27): /blind-test/* goes 301 to its exact /blindtest page, query
    // kept, only when that page renders, else 410 (a blind 301 landed on 404s). That needs a
    // database read, which the middleware never does: the route handler answers
    // (LEGACY_BLIND_TEST_HANDLER in lib/seo/legacy-urls.ts). The path and the query string
    // go as request headers: a handler reached by a rewrite does not see the rewrite's query.
    if (pathname === '/blind-test' || pathname.startsWith('/blind-test/')) {
      const headers = new Headers(request.headers);
      headers.set('x-legacy-path', pathname);
      headers.set('x-legacy-search', request.nextUrl.search);
      return NextResponse.rewrite(new URL('/api/legacy/blind-test', request.url), { request: { headers } });
    }
    // H10: retired /create-preview funnel -> /create (preserve any query string).
    if (pathname === '/create-preview' || pathname.startsWith('/create-preview/')) {
      const to = new URL('/create', request.url);
      to.search = request.nextUrl.search;
      return NextResponse.redirect(to);
    }
    // SEO (owner, 2026-10-14): /battle?quiz=<slug> goes 301 to /q/<slug> or 404. That needs
    // a database read, which the middleware never does: the request is handed to the route
    // handler. Checked before the retired families below, which answer a bare /battle 410.
    if (pathname === LEGACY_BATTLE_PATH && request.nextUrl.searchParams.has('quiz')) {
      const to = new URL(LEGACY_BATTLE_HANDLER, request.url);
      to.searchParams.set('quiz', request.nextUrl.searchParams.get('quiz') ?? '');
      return NextResponse.rewrite(to);
    }
    // SEO (owner, 2026-10-14 and 2026-10-15): the URLs of the retired features (games,
    // rankings, tier lists, battle, the personality index). A 301 to the exact successor
    // (a name-all-<group> game -> its V12 page), else 410 Gone (lib/seo/legacy-urls.ts).
    // next.config leaves these paths to us.
    const legacy = legacyAnswer(pathname, isUxV12());
    if (legacy) {
      if (legacy.status === 301) return NextResponse.redirect(new URL(legacy.location, request.url), 301);
      return new NextResponse(GONE_HTML, {
        status: 410,
        headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
      });
    }
    // REFONTE P1: the /battle-preview -> /battle redirect and the
    // /which-{group}-member-are-you -> /personality rewrite were removed with the
    // battle and personality features. The pretty /which-* URLs of groups without a V12
    // page 301 to the group hub via next.config.ts (an edge redirect that runs before
    // this); /battle-preview and /battle answer 410 above.
    // SEO (owner, 2026-10-15): an unknown URL answers a real 404, never a redirect to the
    // home page (it 301'd to / before). A page path renders the site's not-found page
    // (a rewrite: status 404, the address bar keeps the URL); a file path goes on to
    // Next, which serves it from public/ or answers 404 (lib/route-allowlist.ts).
    if (!isKnownRoute(pathname)) {
      if (isFilePath(pathname)) return passthrough();
      return NextResponse.rewrite(new URL(NOT_FOUND_REWRITE, request.url));
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

// COST: the matcher decides which requests INVOKE the middleware function. It used
// to match every HTML page, so the ~67k daily middleware invocations were mostly a
// no-op passthrough on cached, known pages (/q/*, /, the -quiz/-trivia group pages,
// ...) that need no runtime logic. We exclude those known page prefixes so they
// never pay an invocation, while STILL matching (so behaviour is unchanged):
//   - the runtime-only work: /verse/* (verse gate), /login, /onboarding, /settings,
//     /admin (auth), and the retired /blind-test, /create-preview 301s, all still
//     handled here;
//   - genuinely UNKNOWN paths (not in any excluded prefix), so the unknown-route
//     404 still fires.
// Exclusion rules mirror isKnownRoute (route-allowlist.ts): slash-terminated prefixes
// exclude WITH the slash so `/q` (unknown -> 404) still runs while `/q/slug` skips;
// word prefixes use a `(?:/|$)` boundary so `/create-preview` (redirect) still runs
// while `/create` skips; `$` excludes the home page. INVARIANT (subset property): the
// excluded prefixes must be a subset of isKnownRoute, so a path is only skipped when
// the allowlist already knows it. REFONTE P1 removed games, tier-list, rankings,
// battle and personality from BOTH the allowlist and this exclusion together;
// requests to those now reach the middleware's 410 (or, for the per-group personality
// URLs, the next.config redirect that runs before it). `g/` stays: /g/[slug] (blind
// test) is a kept cached page.
// A prefix added to the allowlist but not here only costs a wasted invocation, never
// wrong behaviour. See middleware-matcher.test.ts for the full path matrix.
export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|_next/data|favicon.ico|apple-touch-icon.png|sitemap.xml|robots.txt|q/|g/|s/|u/|quiz/|group/|embed/|(?:quizzes|blindtest|leaderboard|trivia|articles|data|groups|trending|new|most-liked|build|search|profile|me|notifications|news|stats|create|guess-the-kpop-idol|kpop-true-or-false|easy-kpop-quizzes|hard-kpop-quizzes|kpop-quiz-2026|terms|privacy|legal|dmca|about|faq|contact|daily)(?:/|$)|[^/]+-(?:quiz|trivia)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$|$).*)',
  ],
};
