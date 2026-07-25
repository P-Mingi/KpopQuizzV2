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
  '/', '/q/', '/g/', '/games', '/blindtest', '/create', '/group/', '/u/', '/trending', '/new', '/most-liked',
  '/trivia',
  '/rankings',
  // Workstream P personality quizzes. The public URL is
  // /which-{group}-member-are-you, rewritten by the middleware to /personality/*
  // (real route). Both prefixes are allowlisted: the pretty one for any direct
  // hit before the rewrite, the real one for the app/ route guard.
  '/which-', '/personality',
  '/terms', '/privacy', '/about', '/faq', '/contact', '/search', '/guess-the-kpop-idol', '/kpop-true-or-false',
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
  '/leaderboard', '/quizzes', '/profile', '/me', '/notifications', '/news', '/stats',
  '/articles',
  '/battle',
  '/pt',
];

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
  return KNOWN_ROUTES.some((r) => r !== '/' && pathname.startsWith(r));
}
