import { NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';
import { isKnownRoute } from '@/lib/route-allowlist';
import {
  GONE_HTML, LEGACY_BATTLE_HANDLER, LEGACY_BATTLE_PATH, legacyNameAllAnswer,
} from '@/lib/seo/legacy-urls';
import { isUxV12 } from '@/lib/ux-v12';
import { verseHidden, isGatedVersePath, hasAuthCookie } from '@/lib/verse/visibility';
import { aiVisitFromRequest } from '@/lib/seo/watch/ai-referrer';
import { recordAiVisit } from '@/lib/seo/watch/ai-visit-record';

import type { NextFetchEvent, NextRequest } from 'next/server';

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

export async function middleware(request: NextRequest, event?: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  // SEO Mission 3 D4: a page load referred by an AI assistant adds 1 to that day's counter
  // (assistant + landing path, nothing about the visitor), after the response, never blocking it.
  // Only known routes: an unknown path is 301'd below and is not a landing page.
  const aiVisit = aiVisitFromRequest(request);
  if (aiVisit && isKnownRoute(pathname) && event) event.waitUntil(recordAiVisit(aiVisit.source, aiVisit.path));
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
    // SEO (owner, 2026-10-14): the retired /games/name-all/* URLs Bing still crawls. A
    // name-all-<group> game goes 301 to its V12 page; the rest are 410 Gone
    // (lib/seo/legacy-urls.ts). next.config leaves these paths to us.
    const nameAll = legacyNameAllAnswer(pathname, isUxV12());
    if (nameAll) {
      if (nameAll.status === 301) return NextResponse.redirect(new URL(nameAll.location, request.url), 301);
      return new NextResponse(GONE_HTML, { status: 410, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    // SEO (owner, 2026-10-14): /battle?quiz=<slug> goes 301 to /q/<slug> or 404. That needs
    // a database read, which the middleware never does: the request is handed to the route
    // handler. A bare /battle never gets here (its next.config redirect runs first).
    if (pathname === LEGACY_BATTLE_PATH && request.nextUrl.searchParams.has('quiz')) {
      const to = new URL(LEGACY_BATTLE_HANDLER, request.url);
      to.searchParams.set('quiz', request.nextUrl.searchParams.get('quiz') ?? '');
      return NextResponse.rewrite(to);
    }
    // REFONTE P1: the /battle-preview -> /battle redirect and the
    // /which-{group}-member-are-you -> /personality rewrite were removed with the
    // battle and personality features. The pretty /which-* URLs now 301 to the
    // group hub via next.config.ts (an edge redirect that runs before this), and
    // /battle-preview / /battle fall through to the unknown-route 301 below.
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

// COST: the matcher decides which requests INVOKE the middleware function. It used
// to match every HTML page, so the ~67k daily middleware invocations were mostly a
// no-op passthrough on cached, known pages (/q/*, /, the -quiz/-trivia group pages,
// ...) that need no runtime logic. We exclude those known page prefixes so they
// never pay an invocation, while STILL matching (so behaviour is unchanged):
//   - the runtime-only work: /verse/* (verse gate), /login, /onboarding, /settings,
//     /admin (auth), and the retired /blind-test, /create-preview 301s, all still
//     handled here;
//   - genuinely UNKNOWN paths (not in any excluded prefix), so the unknown-route
//     301-to-home still fires.
// Exclusion rules mirror isKnownRoute (route-allowlist.ts): slash-terminated prefixes
// exclude WITH the slash so `/q` (unknown -> 301) still runs while `/q/slug` skips;
// word prefixes use a `(?:/|$)` boundary so `/create-preview` (redirect) still runs
// while `/create` skips; `$` excludes the home page. INVARIANT (subset property): the
// excluded prefixes must be a subset of isKnownRoute, so a path is only skipped when
// the allowlist already knows it. REFONTE P1 removed games, tier-list, rankings,
// battle and personality from BOTH the allowlist and this exclusion together;
// requests to those now reach the unknown-route 301 (or the next.config redirect that
// runs before middleware). `g/` stays: /g/[slug] (blind test) is a kept cached page.
// A prefix added to the allowlist but not here only costs a wasted invocation, never
// wrong behaviour. See middleware-matcher.test.ts for the full path matrix.
export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|_next/data|favicon.ico|apple-touch-icon.png|sitemap.xml|robots.txt|q/|g/|s/|u/|quiz/|group/|embed/|(?:quizzes|blindtest|leaderboard|trivia|articles|data|groups|trending|new|most-liked|build|search|profile|me|notifications|news|stats|create|guess-the-kpop-idol|kpop-true-or-false|easy-kpop-quizzes|hard-kpop-quizzes|kpop-quiz-2026|terms|privacy|dmca|about|faq|contact|daily)(?:/|$)|[^/]+-(?:quiz|trivia)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$|$).*)',
    // SEO Mission 3 D4: the pages skipped above still run the middleware when, and only when,
    // the visit comes from an AI assistant (Referer host, or utm_source), so it can be counted.
    // Rare requests, so no cost regression. The two values are copies of AI_REFERER_MATCHER and
    // AI_UTM_MATCHER in lib/seo/watch/ai-referrer.ts (a matcher must be a literal here);
    // ai-referrer.test.ts fails if they drift.
    {
      source: '/((?!api/|_next/|[^?]*\\.[a-z0-9]+$).*)',
      has: [{ type: 'header', key: 'referer', value: 'https?://(?:[a-z0-9-]+\\.)*(?:chatgpt\\.com|perplexity\\.ai|copilot\\.microsoft\\.com|gemini\\.google\\.com)(?:[/:?#].*)?' }],
    },
    {
      source: '/((?!api/|_next/|[^?]*\\.[a-z0-9]+$).*)',
      has: [{ type: 'query', key: 'utm_source', value: '(?:chatgpt\\.com|perplexity(?:\\.ai)?|copilot(?:\\.microsoft\\.com)?|gemini(?:\\.google\\.com)?)' }],
    },
  ],
};
