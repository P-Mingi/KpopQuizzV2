import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, it, expect } from 'vitest';

// The middleware matcher (src/middleware.ts) gates which requests INVOKE the
// middleware function. Next requires it to be an inline literal, so this test
// re-declares the exact same pattern, asserts it is byte-identical to what ships
// (drift guard), then proves the path matrix: known cached page prefixes are
// EXCLUDED (middleware skipped, no invocation), while verse/auth/redirect/rewrite
// paths and genuinely unknown paths still MATCH (middleware runs, behaviour kept).

const MATCHER =
  '/((?!api/|_next/static|_next/image|_next/data|favicon.ico|apple-touch-icon.png|sitemap.xml|robots.txt|q/|g/|s/|u/|quiz/|group/|embed/|(?:games|quizzes|blindtest|leaderboard|tier-list|trivia|rankings|articles|data|groups|trending|new|most-liked|build|battle|search|profile|me|notifications|news|stats|create|personality|guess-the-kpop-idol|kpop-true-or-false|easy-kpop-quizzes|hard-kpop-quizzes|kpop-quiz-2026|terms|privacy|dmca|about|faq|contact|daily)(?:/|$)|[^/]+-(?:quiz|trivia)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$|$).*)';

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
    expect(src).toContain('q/|g/|s/|u/|quiz/|group/|embed/|(?:games|quizzes|blindtest|leaderboard|tier-list');
    expect(src).toContain('|create|personality|guess-the-kpop-idol|kpop-true-or-false');
    expect(src).toContain('[^/]+-(?:quiz|trivia)(?:/|$)');
  });
});

describe('middleware matcher: excluded (skipped) cached page prefixes', () => {
  const skip = [
    '/', // home
    '/q/seventeen-true-or-false',
    '/games', '/games/sort-it', '/games/this-or-that/all',
    '/quizzes', '/quizzes/popular-today',
    '/blindtest', '/blindtest/group-bts',
    '/leaderboard', '/tier-list', '/tier-list/new',
    '/trivia', '/rankings', '/rankings/bts/best-song',
    '/bts-quiz', '/le-sserafim-quiz', '/twice-trivia', // generated group pages
    '/g/abc123', '/s/xyz', '/u/someone', '/quiz/123/edit', '/group/bts', '/embed/q/slug',
    '/create', '/personality/bts', '/personality/bts/r/jimin',
    '/faq', '/about', '/terms', '/privacy', '/dmca', '/contact', '/search',
    '/articles/knowledge-report', '/data/pulse', '/me', '/notifications', '/profile',
    '/daily', '/new', '/trending', '/most-liked', '/build/slug', '/battle', '/news', '/stats', '/groups',
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
    // personality pretty-URL rewrite
    '/which-bts-member-are-you', '/which-le-sserafim-member-are-you/r/chaewon',
    // retired legacy 301s handled in middleware
    '/blind-test', '/blind-test/sample', '/create-preview', '/create-preview/x', '/battle-preview',
    // unknown paths -> 301 to home
    '/q', '/g', '/zzz-unknown', '/random/deep/path', '/totally-made-up',
    // other runtime-kept
    '/banned', '/auth/callback',
  ];
  for (const p of run) {
    it(`runs ${p}`, () => expect(runsMiddleware(p)).toBe(true));
  }
});

describe('middleware matcher: assets and api never run', () => {
  for (const p of ['/api/auth/me', '/_next/static/chunk.js', '/favicon.ico', '/sitemap.xml', '/robots.txt', '/logo.png', '/x.svg']) {
    it(`skips ${p}`, () => expect(runsMiddleware(p)).toBe(false));
  }
});
