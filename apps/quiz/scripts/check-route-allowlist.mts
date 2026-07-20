/**
 * Build-time guard against the recurring "page exists but 301s to home" bug.
 *
 * Five real pages have shipped unreachable (/contact, /about, /me,
 * /notifications, /daily): each had a page.tsx, each was linked from the UI, and
 * each was silently redirected to / because the middleware allowlist did not
 * know about it. Nothing failed. The page just did not exist as far as users
 * and crawlers were concerned.
 *
 * This walks app/ for every page.tsx and asserts the route survives
 * isKnownRoute(), the REAL predicate imported from the middleware's allowlist
 * module. It is deliberately not a reimplementation: if the two could drift, the
 * guard would be worth nothing.
 *
 * Note on which predicate matters. The 301 is thrown by isKnownRoute(), not by
 * needsAuth(). needsAuth only decides whether to spend a Supabase round trip, so
 * asserting "needsAuth(path) === false" would have passed for /daily on every
 * single day it was broken. isKnownRoute is the one that decides whether a page
 * is reachable at all.
 *
 * Run: pnpm --filter quiz check:routes (also runs as part of build)
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isKnownRoute } from '../src/lib/route-allowlist.ts';

const APP_DIR = fileURLToPath(new URL('../src/app', import.meta.url));

/**
 * Routes that render a page but are intentionally NOT publicly reachable.
 * Everything here is a deliberate decision with a reason, so the guard can tell
 * "we meant this" apart from "we forgot this".
 */
const INTENTIONALLY_UNREACHABLE = new Map<string, string>([
  ['/avatar-studio', 'Avatar studio is frozen: hidden on purpose, code and assets kept.'],
]);

/**
 * Prefixes the middleware deliberately 301s to a canonical URL BEFORE the
 * allowlist check runs. These pages are supposed to be unreachable at this
 * path, so allowlisting them would be the actual bug.
 */
const CANONICAL_REDIRECT_PREFIXES: Array<[string, string]> = [
  ['/blind-test', 'SEO consolidation: 301s to /blindtest.'],
  ['/create-preview', 'Retired funnel: redirects to /create.'],
  ['/battle-preview', 'Retired prototype: redirects to /battle.'],
];

/** Turn an app-router directory path into a concrete URL path to test. */
function toRoutePath(dir: string): string {
  const segments = relative(APP_DIR, dir)
    .split('/')
    .filter(Boolean)
    // Route groups like (marketing) do not appear in the URL.
    .filter((s) => !(s.startsWith('(') && s.endsWith(')')))
    // Substitute a sample value for dynamic segments so the path is realistic.
    .map((s) => (s.startsWith('[') ? 'sample' : s));
  return '/' + segments.join('/');
}

// Both page.tsx AND route.ts count. /daily, the fifth and most recent victim,
// is a route handler that redirects to today's quiz, not a page. A guard that
// only walked pages would have missed the exact bug it was built for.
const ROUTE_FILES = new Set(['page.tsx', 'route.ts', 'route.tsx']);

function findRouteDirs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (ROUTE_FILES.has(entry)) out.push(dir);
    else if (statSync(full).isDirectory()) findRouteDirs(full, out);
  }
  return out;
}

const routes = [...new Set(findRouteDirs(APP_DIR).map(toRoutePath))].sort();

const failures: string[] = [];
const skipped: string[] = [];

for (const route of routes) {
  const canonical = CANONICAL_REDIRECT_PREFIXES.find(
    ([prefix]) => route === prefix || route.startsWith(`${prefix}/`),
  );
  if (canonical) {
    skipped.push(`${route} (${canonical[1]})`);
    continue;
  }

  if (INTENTIONALLY_UNREACHABLE.has(route)) {
    // Assert the intent is real: if someone allowlists it later, this entry is
    // stale and should be removed rather than quietly lying.
    if (isKnownRoute(route)) {
      failures.push(
        `${route} is listed as intentionally unreachable but IS in the middleware allowlist. Remove it from INTENTIONALLY_UNREACHABLE.`,
      );
    } else {
      skipped.push(`${route} (${INTENTIONALLY_UNREACHABLE.get(route)})`);
    }
    continue;
  }

  // The top-level dynamic catch-all serves the generated group landing pages
  // (/bts-quiz, /twice-trivia), which isKnownRoute matches by suffix.
  if (route === '/sample') {
    if (!isKnownRoute('/bts-quiz') || !isKnownRoute('/bts-trivia')) {
      failures.push('The group landing catch-all no longer matches /bts-quiz or /bts-trivia.');
    }
    continue;
  }

  if (!isKnownRoute(route)) {
    failures.push(
      `${route} renders a page but is not in the middleware public allowlist - it will 301 to home.`,
    );
  }
}

if (failures.length > 0) {
  console.error('\nRoute allowlist guard FAILED:\n');
  for (const f of failures) console.error(`  x ${f}`);
  console.error(
    `\nFix: add the missing prefix to KNOWN_ROUTES in src/lib/route-allowlist.ts,\n` +
      `or add the route to INTENTIONALLY_UNREACHABLE in this script if it is meant to be hidden.\n`,
  );
  process.exit(1);
}

console.log(`Route allowlist guard passed: ${routes.length} page routes reachable.`);
for (const s of skipped) console.log(`  - skipped ${s}`);
