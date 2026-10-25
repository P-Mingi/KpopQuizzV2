// The middleware's public route allowlist, extracted so it can be imported by
// both the middleware and the build-time guard.
//
// Why this file exists: anything NOT matched here answers 404 from the middleware
// (owner, 2026-10-15; until then it was 301'd to /). That silently swallowed five
// real pages (/contact, /about, /me, /notifications, /daily). The page existed,
// was linked, and was simply unreachable in production. scripts/check-route-allowlist.mts now walks
// app/ and fails the build when a page route is not reachable through
// isKnownRoute(), so the next omission cannot ship.
//
// Keep this module free of next/server and Supabase imports: the guard runs it
// in plain node via tsx.

export const KNOWN_ROUTES = [
  // '/quiz/' is the owner quiz editor (/quiz/[id]/edit); distinct from '/q/'
  // (the public quiz view) and '/quizzes' (browse). It self-gates to the
  // creator/admin server-side.
  '/quiz/',
  // W4: the embeddable widget. Prefix match, because every /embed/q/<slug> must be
  // reachable; without this the middleware 301s every embed to the home page and the
  // partner's iframe silently shows our homepage.
  '/embed/',
  // REFONTE P1: /games, /tier-list, /rankings, /which-, /personality, /battle were
  // removed with their features. The middleware answers them 410 before this list is
  // read (lib/seo/legacy-urls.ts), except the per-group personality URLs, which
  // next.config.ts redirects. '/g/' stays: /g/[slug] is the kept blind-test game.
  '/', '/q/', '/g/', '/blindtest', '/create', '/group/', '/u/', '/trending', '/new', '/most-liked',
  '/trivia',
  '/terms', '/privacy', '/legal', '/dmca', '/about', '/editorial-policy', '/faq', '/contact', '/search', '/guess-the-kpop-idol', '/kpop-true-or-false',
  '/easy-kpop-quizzes', '/hard-kpop-quizzes', '/kpop-quiz-2026',
  // SEO Mission 2 (owner, 2026-10-15): /kpop-games, every game of the site in one page.
  '/kpop-games',
  '/login', '/onboarding', '/settings', '/admin', '/banned', '/auth/', '/api/',
  '/sitemap.xml', '/robots.txt', '/llms.txt',
  // '/me' (the passport, where /profile redirects) and '/notifications' (the
  // bell) are real signed-in pages that were never allowlisted, so the
  // unknown-route rule 301'd them to / and made both unreachable. They guard
  // themselves server-side (redirect('/login') when signed out), so they belong
  // here and NOT in PROTECTED_PATH_PREFIXES, which would add a Supabase round
  // trip to the middleware for every hit.
  // '/daily' was the same oversight: app/daily/route.ts has existed and been
  // linked from the home streak nudge, but was never allowlisted, so every hit
  // 301'd to / and the daily ritual entry point was unreachable in production.
  '/daily',
  // '/s/' is the share short-link handler (app/s/[code]/route.ts), which
  // forwards to the click tracker. It was never allowlisted either, so every
  // short link we have ever handed out 301'd to home instead of resolving. The
  // guard below found this one; it is the sixth page this list has swallowed.
  '/s/',
  '/leaderboard', '/quizzes', '/groups', '/profile', '/me', '/notifications', '/news', '/stats',
  '/verse',
  // V-BUILDER-2: the chrome-less builder draft canvas (/build/<slug>). Curator-gated
  // server-side (404 otherwise) + noindex; it self-gates, so it stays out of
  // PROTECTED_PATH_PREFIXES (no Supabase round trip in the middleware).
  '/build',
  '/articles',
  // Workstream T0 monthly Pulse: /data/pulse (index) and /data/pulse/[month].
  // One '/data' prefix covers both via startsWith.
  '/data',
  // SEO Mission 3, part F.2: the press kit.
  '/press',
];

// UX v1 redesign (NEXT_PUBLIC_UX_V1, default off): routes that exist only for the new
// design. They are known ONLY when the flag is on, so with the flag off the middleware
// answers them 404, like any unknown URL (they 301'd to / before 2026-10-15).
// '/ux-v1/' is the noindex component kit, '/community' the community feed (P8).
// Same flag test as lib/ux-v1.ts, inlined so this module stays import-free.
const UX_V11_ROUTES = ['/ux-v1/', '/community'];
const UX_V1_ON =
  process.env.NEXT_PUBLIC_UX_V1 === '1' || process.env.NEXT_PUBLIC_UX_V1 === 'true';

// V12 growth (NEXT_PUBLIC_UX_V12, default off, and only ever on together with
// NEXT_PUBLIC_UX_V1: same rule as isUxV12() in lib/ux-v12.ts, inlined here). Known only
// with both flags on; otherwise they answer 404 like any unknown URL.
// '/live' host screen, '/join' phone, '/creators' board, the four blindtest landings
// ('/guess-the-kpop-song', '/fr/', '/es/', '/id/' with the slash: startsWith), and the
// internal routes behind the pretty per-group URLs ('/personality/', '/name-all/').
export const UX_V12_ROUTES = [
  '/live', '/join', '/creators', '/guess-the-kpop-song', '/fr/', '/es/', '/id/',
  '/personality/', '/name-all/',
];
const UX_V12_ON =
  UX_V1_ON &&
  (process.env.NEXT_PUBLIC_UX_V12 === '1' || process.env.NEXT_PUBLIC_UX_V12 === 'true');

// Per-group pretty URLs (rewrites in next.config.ts, flag on only). App Router has no
// partial dynamic segment, so these are suffix rules, like '-quiz' and '-trivia' below:
//   /<group>-name-all-members          -> /name-all/<group>
//   /which-<group>-member-are-you      -> /personality/<group>
function isV12PrettyUrl(pathname: string): boolean {
  if (pathname.indexOf('/', 1) !== -1) return false; // one segment only
  if (pathname.endsWith('-name-all-members') && pathname.length > '/-name-all-members'.length) return true;
  return (
    pathname.startsWith('/which-') &&
    pathname.endsWith('-member-are-you') &&
    pathname.length > '/which--member-are-you'.length
  );
}

// Every flag-only prefix, v11 and v12. This is the list the build-time guard
// (scripts/check-route-allowlist.mts) reads to skip pages that are unreachable on
// purpose while their flag is off; isKnownRoute() below still opens the v11 ones with
// NEXT_PUBLIC_UX_V1 alone and the v12 ones only with both flags.
export const UX_V1_ROUTES = [...UX_V11_ROUTES, ...UX_V12_ROUTES];

/**
 * The allowlist decision for an explicit flag state. isKnownRoute() calls it with the
 * build's flags; tests call it with each combination.
 */
export function isKnownRouteWith(pathname: string, flags: { v1: boolean; v12: boolean }): boolean {
  if (pathname === '/') return true;
  // Group landing pages are generated: /bts-quiz, /twice-trivia, and so on.
  if (pathname.endsWith('-quiz')) return true;
  if (pathname.endsWith('-trivia')) return true;
  if (flags.v1 && UX_V11_ROUTES.some((r) => pathname.startsWith(r))) return true;
  if (flags.v1 && flags.v12) {
    if (UX_V12_ROUTES.some((r) => pathname.startsWith(r))) return true;
    if (isV12PrettyUrl(pathname)) return true;
  }
  return KNOWN_ROUTES.some((r) => r !== '/' && pathname.startsWith(r));
}

/**
 * True when the middleware will let this path through instead of answering 404.
 *
 * This is the predicate the guard asserts against. Note it is NOT the same
 * question as needsAuth(): needsAuth only decides whether to spend a Supabase
 * round trip. A path can be perfectly public to needsAuth and still be refused
 * here, which is exactly how every one of the five bugs happened.
 */
export function isKnownRoute(pathname: string): boolean {
  return isKnownRouteWith(pathname, { v1: UX_V1_ON, v12: UX_V12_ON });
}

/**
 * Owner (2026-10-15): an unknown URL answers a real 404, never a redirect to the home
 * page. The middleware rewrites a page path that isKnownRoute() refuses to this one: a
 * single segment that the group catch-all app/(site)/[slug] owns and refuses (no -quiz
 * or -trivia suffix, so it makes no database read). It renders app/(site)/not-found.tsx,
 * site chrome included, with status 404, and the address bar keeps the requested URL.
 */
export const NOT_FOUND_REWRITE = '/page-not-found';

/**
 * True when the last segment names a file (/site.webmanifest, /fonts/x.woff2). The
 * middleware hands such a path to Next untouched: Next serves the file from public/, or
 * answers its own 404 when there is none.
 */
export function isFilePath(pathname: string): boolean {
  return /\.[a-z0-9]+$/i.test(pathname.slice(pathname.lastIndexOf('/') + 1));
}
