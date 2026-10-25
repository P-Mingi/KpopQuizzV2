import { test, expect } from '@playwright/test';

// REFONTE P1 - the kill's URL matrix, proven live against the built app on :3021
// (next build + next start, never dev).
//
// Owner rule, 2026-10-15 (an owner-approved change of this spec; it replaces the
// many-to-one rows of 2026-09-19 that sent every killed URL to /quizzes or to a group
// hub): "a 301 to the exact page that replaces it, else 410; an unknown URL answers a
// real 404, never a redirect to the home page." Nothing replaces the games, rankings,
// tier lists, battle or the personality index, so their URLs answer 410. The
// per-group personality URLs were not part of that decision and keep their permanent
// redirect to the group hub: Next's `permanent: true` emits 308 (the method-preserving
// sibling of 301; Google treats them identically for SEO).
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

// Killed hubs, mini games, maker surfaces and group-scoped pages: no successor, 410.
const GONE = [
  '/games',
  '/games/sort-it',
  '/games/match-up',
  '/games/name-them-all',
  '/games/this-or-that',
  '/pt/games',
  '/rankings',
  '/rankings/bts/best-song',
  '/tier-list',
  '/tier-list/new',
  '/tier-list/create',
  '/tier-list/share',
  '/tier-list/subject/bts/visual',
  '/tier-list/l/does-not-exist-xyz',
  '/battle',
  '/battle-preview',
  '/personality',
];

// Per-group personality URLs (not in the 2026-10-15 decision) -> the group's hub.
const GROUP_SCOPED: Array<[string, string]> = [
  ['/personality/bts', '/bts-quiz'],
  ['/personality/bts/r/jimin', '/bts-quiz'],
  ['/which-bts-member-are-you', '/bts-quiz'],
  ['/which-le-sserafim-member-are-you', '/le-sserafim-quiz'],
];

// Owner rule, 2026-10-14 (SEO Mission 1, rulebook 9.4): a retired /games/name-all/* URL
// answers its exact successor (301 to /<group>-name-all-members, V12 only) or a real 410,
// never a generic page. These two have no successor in either flag state.
const NAME_ALL_GONE = ['/games/name-all/bts-members', '/games/name-all/name-top-10-bts-songs'];

test.describe('Retired /games/name-all/* without a successor answer 410', () => {
  for (const path of NAME_ALL_GONE) {
    test(`${path} -> 410`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `${path} status`).toBe(410);
    });
  }
});

test.describe('REFONTE P1 kill: retired URLs without a successor answer 410', () => {
  for (const path of GONE) {
    test(`${path} -> 410 (noindex)`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `${path} status`).toBe(410);
      expect(res.headers()['location'], `${path} location`).toBeUndefined();
      expect(res.headers()['x-robots-tag'], `${path} x-robots-tag`).toBe('noindex');
    });
  }
});

test.describe('REFONTE P1 kill: 301/308 redirect matrix', () => {
  for (const [path, dest] of GROUP_SCOPED) {
    test(`${path} -> ${dest} (permanent, group intent)`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(PERMANENT, `${path} status`).toContain(res.status());
      expect(locationPath(res.headers()['location'])).toBe(dest);
    });
  }
});

test.describe('Unknown URLs answer a real 404 (owner, 2026-10-15)', () => {
  for (const path of ['/zzz-totally-removed-xyz', '/random/deep/path']) {
    test(`${path} -> 404, never a redirect`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `${path} status`).toBe(404);
      expect(res.headers()['location'], `${path} location`).toBeUndefined();
    });
  }
});
