import { test, expect } from '@playwright/test';

// REFONTE P1 - the kill's redirect matrix, proven live against the built app on
// :3021 (next build + next start, never dev). Every removed feature's URL must land
// on a kept surface with a PERMANENT redirect: Next's `permanent: true` emits 308
// (the method-preserving sibling of 301; Google treats them identically for SEO),
// and the tier-list resolver route returns 308 too. Group-scoped URLs carry their
// fandom intent to /{group}-quiz; the rest go to /quizzes, never to home.
//
// maxRedirects: 0 so we read the FIRST hop's status + Location, not the final page.

const PERMANENT = [301, 308];

function locationPath(location: string | undefined): string {
  if (!location) return '';
  try {
    // Location may be absolute or root-relative; compare on pathname only.
    return new URL(location, 'http://localhost:3021').pathname;
  } catch {
    return location;
  }
}

// Killed hubs / maker surfaces -> the kept browse hub.
const TO_QUIZZES = [
  '/games',
  '/games/sort-it',
  '/games/match-up',
  '/games/name-them-all',
  '/games/this-or-that',
  '/games/name-all/bts-members',
  '/rankings',
  '/tier-list',
  '/tier-list/new',
  '/tier-list/create',
  '/tier-list/share',
  '/battle',
  '/battle-preview',
  '/personality',
];

// Group-scoped killed URLs -> the group's kept hub /{group}-quiz.
const GROUP_SCOPED: Array<[string, string]> = [
  ['/rankings/bts/best-song', '/bts-quiz'],
  ['/tier-list/subject/bts/visual', '/bts-quiz'],
  ['/personality/bts', '/bts-quiz'],
  ['/personality/bts/r/jimin', '/bts-quiz'],
  ['/which-bts-member-are-you', '/bts-quiz'],
  ['/which-le-sserafim-member-are-you', '/le-sserafim-quiz'],
];

test.describe('REFONTE P1 kill: 301/308 redirect matrix', () => {
  for (const path of TO_QUIZZES) {
    test(`${path} -> /quizzes (permanent)`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(PERMANENT, `${path} status`).toContain(res.status());
      expect(locationPath(res.headers()['location'])).toBe('/quizzes');
    });
  }

  for (const [path, dest] of GROUP_SCOPED) {
    test(`${path} -> ${dest} (permanent, group intent)`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(PERMANENT, `${path} status`).toContain(res.status());
      expect(locationPath(res.headers()['location'])).toBe(dest);
    });
  }

  test('/pt/games -> /pt/quizzes (locale preserved)', async ({ request }) => {
    const res = await request.get('/pt/games', { maxRedirects: 0 });
    expect(PERMANENT).toContain(res.status());
    expect(locationPath(res.headers()['location'])).toBe('/pt/quizzes');
  });

  test('/tier-list/l/[slug] resolves to a kept surface (resolver route)', async ({ request }) => {
    // The list slug may not exist in the shared DB, in which case the resolver
    // falls back to /quizzes; if it does exist it 308s to its subject group hub.
    // Either way it is a permanent redirect to a kept surface, never a 404/500.
    const res = await request.get('/tier-list/l/does-not-exist-xyz', { maxRedirects: 0 });
    expect(PERMANENT).toContain(res.status());
    const dest = locationPath(res.headers()['location']);
    expect(dest === '/quizzes' || dest.endsWith('-quiz')).toBe(true);
  });

  test('an unknown legacy path still 301s to home (middleware)', async ({ request }) => {
    const res = await request.get('/zzz-totally-removed-xyz', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(locationPath(res.headers()['location'])).toBe('/');
  });
});
