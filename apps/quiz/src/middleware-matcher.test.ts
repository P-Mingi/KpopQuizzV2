import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { isKnownRoute } from '@/lib/route-allowlist';

// The middleware matcher (src/middleware.ts) gates which requests INVOKE the
// middleware function. Next requires it to be an inline literal, so this test
// re-declares the exact same pattern, asserts it is byte-identical to what ships
// (drift guard), then proves the path matrix: known cached page prefixes are
// EXCLUDED (middleware skipped, no invocation), while verse/auth/redirect paths
// and genuinely unknown paths still MATCH (middleware runs, behaviour kept).
//
// REFONTE P1: the games, tier-list, rankings, battle and personality prefixes were
// removed from BOTH this matcher exclusion and the allowlist. Requests to them now
// MATCH the matcher (middleware runs and 301s them via the unknown-route rule, or
// the next.config redirect that runs before middleware catches them first). `g/`
// stays excluded: /g/[slug] (blind test) is a kept cached page.

const MATCHER =
  '/((?!api/|_next/static|_next/image|_next/data|favicon.ico|apple-touch-icon.png|sitemap.xml|robots.txt|q/|g/|s/|u/|quiz/|group/|embed/|(?:quizzes|blindtest|leaderboard|trivia|articles|data|groups|trending|new|most-liked|build|search|profile|me|notifications|news|stats|create|guess-the-kpop-idol|kpop-true-or-false|easy-kpop-quizzes|hard-kpop-quizzes|kpop-quiz-2026|terms|privacy|dmca|about|faq|contact|daily)(?:/|$)|[^/]+-(?:quiz|trivia)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$|$).*)';

// Next compiles the matcher string into a regex that tests the pathname.
const re = new RegExp('^' + MATCHER + '$');
const runsMiddleware = (path: string): boolean => re.test(path);

describe('middleware matcher (drift guard)', () => {
  it('ships the same exclusion signature in middleware.ts', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'middleware.ts'), 'utf8');
    // Distinctive, backslash-free slices of the pattern (avoids source-vs-runtime
    // escaping noise). If the exclude list is edited without updating this test's
    // MATCHER, one of these drifts and the matrix below stops proving the shipped
    // behaviour.
    expect(src).toContain('q/|g/|s/|u/|quiz/|group/|embed/|(?:quizzes|blindtest|leaderboard|trivia');
    expect(src).toContain('|create|guess-the-kpop-idol|kpop-true-or-false');
    expect(src).toContain('[^/]+-(?:quiz|trivia)(?:/|$)');
    // The killed prefixes must NOT reappear as matcher exclusions.
    expect(src).not.toContain('|games|');
    expect(src).not.toContain('tier-list|');
    expect(src).not.toContain('|rankings|');
    expect(src).not.toContain('|battle|');
    expect(src).not.toContain('|personality|');
  });
});

describe('middleware matcher: excluded (skipped) cached page prefixes', () => {
  const skip = [
    '/', // home
    '/q/seventeen-true-or-false',
    '/quizzes', '/quizzes/popular-today',
    '/blindtest', '/blindtest/group-bts',
    '/leaderboard',
    '/trivia',
    '/bts-quiz', '/le-sserafim-quiz', '/twice-trivia', // generated group pages
    '/g/abc123', '/s/xyz', '/u/someone', '/quiz/123/edit', '/group/bts', '/embed/q/slug',
    '/create',
    '/faq', '/about', '/terms', '/privacy', '/dmca', '/contact', '/search',
    '/articles/knowledge-report', '/data/pulse', '/me', '/notifications', '/profile',
    '/daily', '/new', '/trending', '/most-liked', '/build/slug', '/news', '/stats', '/groups',
    '/guess-the-kpop-idol', '/kpop-true-or-false', '/easy-kpop-quizzes', '/hard-kpop-quizzes', '/kpop-quiz-2026',
  ];
  for (const p of skip) {
    it(`skips ${p}`, () => expect(runsMiddleware(p)).toBe(false));
  }
});

describe('middleware matcher: still runs where runtime logic is needed', () => {
  const run = [
    // verse gate
    '/verse', '/verse/bts', '/verse/bts/studio',
    // protected auth
    '/login', '/onboarding', '/onboarding/step', '/settings', '/settings/profile', '/admin', '/admin/reports',
    // retired legacy 301s handled in middleware
    '/blind-test', '/blind-test/sample', '/create-preview', '/create-preview/x',
    // REFONTE P1 killed routes: no longer excluded, so they MATCH and reach either
    // the next.config redirect (first) or the unknown-route 301 in middleware.
    '/games', '/games/sort-it', '/games/this-or-that/all', '/games/name-all/bts',
    '/tier-list', '/tier-list/new', '/tier-list/subject/bts/visual', '/tier-list/l/some-list',
    '/rankings', '/rankings/bts/best-song', '/battle', '/battle-preview',
    '/personality/bts', '/personality/bts/r/jimin',
    '/which-bts-member-are-you', '/which-le-sserafim-member-are-you/r/chaewon',
    // unknown paths -> 301 to home
    '/q', '/g', '/zzz-unknown', '/random/deep/path', '/totally-made-up',
    // other runtime-kept
    '/banned', '/auth/callback',
  ];
  for (const p of run) {
    it(`runs ${p}`, () => expect(runsMiddleware(p)).toBe(true));
  }
});

describe('middleware matcher subset property: every skipped page is a known route', () => {
  // The invariant (PR #24 discipline): the matcher only skips middleware for paths
  // the allowlist already knows. A path excluded here but UNKNOWN to isKnownRoute
  // would never get the unknown-route 301 - it would 404 instead. REFONTE P1 kept
  // this true by removing the killed prefixes from BOTH lists together.
  const skippedPages = [
    '/', '/q/x', '/quizzes', '/blindtest', '/leaderboard', '/trivia', '/g/abc',
    '/bts-quiz', '/twice-trivia', '/create', '/search', '/me', '/notifications',
    '/profile', '/daily', '/new', '/trending', '/most-liked', '/news', '/stats',
    '/groups', '/data/pulse', '/articles/x', '/build/slug',
  ];
  for (const p of skippedPages) {
    it(`${p} is excluded AND known`, () => {
      expect(runsMiddleware(p)).toBe(false);
      expect(isKnownRoute(p)).toBe(true);
    });
  }
});

describe('middleware matcher subset property: killed routes are neither excluded nor known', () => {
  // The mirror of the invariant: the removed features run middleware (not excluded)
  // and are NOT known routes, so the unknown-route 301 fires for anything the
  // next.config redirects miss. /tier-list/l/ is the one exception kept known (its
  // resolver route lives there); it is listed in the `run` matrix above.
  const killed = ['/games', '/tier-list', '/tier-list/new', '/rankings', '/battle', '/personality/bts'];
  for (const p of killed) {
    it(`${p} runs middleware and is not a known route`, () => {
      expect(runsMiddleware(p)).toBe(true);
      expect(isKnownRoute(p)).toBe(false);
    });
  }
});

describe('middleware matcher: assets and api never run', () => {
  for (const p of ['/api/auth/me', '/_next/static/chunk.js', '/favicon.ico', '/sitemap.xml', '/robots.txt', '/logo.png', '/x.svg']) {
    it(`skips ${p}`, () => expect(runsMiddleware(p)).toBe(false));
  }
});
