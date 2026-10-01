// The middleware's public route allowlist, extracted so it can be imported by
// both the middleware and the build-time guard.
//
// Why this file exists: anything NOT matched here is 301'd to / by the
// middleware. That has silently swallowed five real pages so far (/contact,
// /about, /me, /notifications, /daily). The page existed, was linked, and was
// simply unreachable in production. scripts/check-route-allowlist.mts now walks
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
  // removed with their features (see next.config.ts for the 301 redirects). '/g/'
  // stays: /g/[slug] is the kept blind-test game.
  '/', '/q/', '/g/', '/blindtest', '/create', '/group/', '/u/', '/trending', '/new', '/most-liked',
  '/trivia',
  '/terms', '/privacy', '/dmca', '/about', '/faq', '/contact', '/search', '/guess-the-kpop-idol', '/kpop-true-or-false',
  '/easy-kpop-quizzes', '/hard-kpop-quizzes', '/kpop-quiz-2026',
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
  // REFONTE P1: /tier-list is gone EXCEPT this one resolver route, which 301s a
  // published tier list to its subject group's kept hub (the rest of /tier-list is
  // 301'd in next.config, which runs before the middleware). The narrow '/tier-list/l/'
  // prefix keeps the resolver reachable while every other /tier-list/* stays unknown.
  '/tier-list/l/',
  // Workstream T0 monthly Pulse: /data/pulse (index) and /data/pulse/[month].
  // One '/data' prefix covers both via startsWith.
  '/data',
  '/pt',
];

// UX v1 redesign (NEXT_PUBLIC_UX_V1, default off): routes that exist only for the new
// design. They are known ONLY when the flag is on, so with the flag off the middleware
// keeps 301ing them to / exactly as today (flag off = today's site, byte for byte).
// '/ux-v1/' is the noindex component kit, '/community' the community feed (P8).
// Same flag test as lib/ux-v1.ts, inlined so this module stays import-free.
export const UX_V1_ROUTES = ['/ux-v1/', '/community'];
const UX_V1_ON =
  process.env.NEXT_PUBLIC_UX_V1 === '1' || process.env.NEXT_PUBLIC_UX_V1 === 'true';

/**
 * True when the middleware will let this path through instead of 301ing it to /.
 *
 * This is the predicate the guard asserts against. Note it is NOT the same
 * question as needsAuth(): needsAuth only decides whether to spend a Supabase
 * round trip. A path can be perfectly public to needsAuth and still be 301'd
 * into oblivion here, which is exactly how every one of the five bugs happened.
 */
export function isKnownRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  // Group landing pages are generated: /bts-quiz, /twice-trivia, and so on.
  if (pathname.endsWith('-quiz')) return true;
  if (pathname.endsWith('-trivia')) return true;
  if (UX_V1_ON && UX_V1_ROUTES.some((r) => pathname.startsWith(r))) return true;
  return KNOWN_ROUTES.some((r) => r !== '/' && pathname.startsWith(r));
}
