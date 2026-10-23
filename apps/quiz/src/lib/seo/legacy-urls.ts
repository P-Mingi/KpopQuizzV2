// SEO (owner, 2026-10-14): the answers for URLs of retired features that Bing still
// crawls. Pure, unit tested (legacy-urls.test.ts); the middleware applies them.
//
// Rulebook section 9: a removed page goes 301 to its exact successor, or 410 when it has
// none. Never many URLs to one generic page (they all went 308 to /quizzes since REFONTE P1),
// never a chain.
//
// /games/name-all/<slug> was the old Name them all game, one database row per slug (seeded
// by scripts/seed-name-all-games.ts and scripts/seed-expanded-games.ts, both removed):
//   - name-all-<group>: name the members of one group. Its successor is the V12 page
//     /<group>-name-all-members, which exists only for NAME_ALL_GROUPS and only with the V12
//     flags on (the pretty URL is a next.config rewrite; with a flag off it 301s to /).
//   - name-all-<generation>, name-songs-<album>, name-top-N-<group>-songs, name-N-<kind>-idols:
//     generation, album, top songs and idol lists. No page plays them today: 410.

import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { prettyPath } from '@/lib/name-all/round';

export type LegacyAnswer = { status: 301; location: string } | { status: 410 };

export const LEGACY_NAME_ALL_PREFIX = '/games/name-all';

/**
 * Old slugs that wrote a group differently from groups.slug: "gidle" is the only one used
 * by a name-all-<group> game; "skz", "svt" and "bp" are the abbreviations of the old song
 * games. Every target is a NAME_ALL_GROUPS slug (asserted by the test).
 */
export const LEGACY_GROUP_ALIASES: Readonly<Record<string, string>> = {
  gidle: 'g-i-dle',
  skz: 'stray-kids',
  svt: 'seventeen',
  bp: 'blackpink',
};

const NAME_ALL_GROUP_RE = /^name-all-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * The answer for a /games/name-all URL, or null when the path is not one.
 * `prettyUrlsLive` is true when the V12 pretty URLs are served (both UX flags on).
 */
export function legacyNameAllAnswer(pathname: string, prettyUrlsLive: boolean): LegacyAnswer | null {
  if (pathname !== LEGACY_NAME_ALL_PREFIX && !pathname.startsWith(`${LEGACY_NAME_ALL_PREFIX}/`)) return null;
  const slug = pathname.slice(LEGACY_NAME_ALL_PREFIX.length + 1);
  const named = NAME_ALL_GROUP_RE.exec(slug)?.[1];
  if (named && prettyUrlsLive) {
    const group = LEGACY_GROUP_ALIASES[named] ?? named;
    if ((NAME_ALL_GROUPS as readonly string[]).includes(group)) return { status: 301, location: prettyPath(group) };
  }
  return { status: 410 };
}

/** The body of a 410: a plain page with a way back, never indexed. */
export const GONE_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<meta name="robots" content="noindex"><title>This page was removed</title></head>' +
  '<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem">' +
  '<h1>This page was removed</h1><p>This feature is no longer on KpopQuiz.</p>' +
  '<p><a href="/">Play a K-pop quiz</a></p></body></html>';

/** The body of a 404 for a legacy URL that points at no published quiz. */
export const NOT_FOUND_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<meta name="robots" content="noindex"><title>Quiz not found</title></head>' +
  '<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem">' +
  '<h1>Quiz not found</h1><p>No published quiz has this address.</p>' +
  '<p><a href="/quizzes">Browse K-pop quizzes</a></p></body></html>';

// /battle?quiz=<slug> was the 1v1 duel on one quiz (REFONTE P1 removed it). Its exact
// successor is the quiz itself, /q/<slug>, when a published quiz has that slug; otherwise
// 404. The middleware hands these to /api/legacy/battle, which reads the database (the
// middleware never does). A bare /battle, and anything under it, is 410 (below).
export const LEGACY_BATTLE_PATH = '/battle';
export const LEGACY_BATTLE_HANDLER = '/api/legacy/battle';

/** Live slugs are lowercase letters, digits and hyphens (some start or end with one). */
const QUIZ_SLUG_RE = /^[a-z0-9-]{1,120}$/;

/** The quiz slug of a /battle?quiz= value worth a database read, or null (a plain 404). */
export function battleQuizSlug(raw: string | null): string | null {
  if (raw === null) return null;
  const slug = raw.trim();
  return QUIZ_SLUG_RE.test(slug) && /[a-z0-9]/.test(slug) ? slug : null;
}

// SEO (owner, 2026-10-15): "a 301 to the exact page that replaces it, else 410". REFONTE P1
// (526364d) removed the features below and next.config sent every one of their URLs to
// /quizzes or to a group hub: many specific URLs to one generic page (rulebook 9.4). No
// page serves their intent today, so every URL of these families answers 410:
//   /games, /games/*          the games hub and its mini games: sort-it, match-up,
//                             name-them-all (hub and playlists), this-or-that (and /all).
//                             No games hub and no generic Name them all page exist.
//                             /games/name-all/* is answered first, slug by slug (above).
//   /pt/games                 the Portuguese games hub.
//   /rankings, /rankings/*    the this-or-that verdicts (/rankings/<group>/<type>). No
//                             ranking page exists, and a group hub is not a ranking.
//   /tier-list, /tier-list/*  the maker (new, create, share), saved lists (mine/<slug>),
//                             subject pages (subject/<group>/<kind>) and shared lists
//                             (l/<slug>, once resolved to the group hub). No tier lists today.
//   /battle, /battle/*        the 1v1 duel and its rooms. Only /battle?quiz=<slug> has a
//                             successor, the quiz (above); the middleware checks it first.
//   /battle-preview, /*       the duel's prototype.
//   /personality              the "which member are you" index. No index exists; the
//                             per-group URLs keep their next.config redirect.
export const RETIRED_FAMILIES = ['/games', '/pt/games', '/rankings', '/tier-list', '/battle', '/battle-preview'] as const;
export const RETIRED_PAGES = ['/personality'] as const;

/** 410 for a URL of a retired feature with no successor, or null when the path is not one. */
export function retiredFeatureAnswer(pathname: string): LegacyAnswer | null {
  if ((RETIRED_PAGES as readonly string[]).includes(pathname)) return { status: 410 };
  return RETIRED_FAMILIES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? { status: 410 } : null;
}

/**
 * The middleware's answer for a retired URL (the /battle?quiz= read aside), or null when the
 * path is not one. `prettyUrlsLive` as in legacyNameAllAnswer.
 */
// The Portuguese mirror (/pt, retired 2026-10-23 at the owner's request): each of its pages
// was a translation of an English page, which is its exact successor (301). Any other /pt
// path was never a page: it answers 404 like an unknown URL; /pt/games stays 410 above.
export const PORTUGUESE_PAGES = [
  '/', '/about', '/articles', '/blindtest', '/easy-kpop-quizzes', '/faq', '/guess-the-kpop-idol',
  '/hard-kpop-quizzes', '/kpop-quiz-2026', '/kpop-true-or-false', '/leaderboard', '/quizzes', '/stats',
] as const;

/** 301 from a page of the retired Portuguese mirror to its English page, or null. */
export function portugueseAnswer(pathname: string): LegacyAnswer | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/pt') return { status: 301, location: '/' };
  if (!path.startsWith('/pt/')) return null;
  const english = path.slice(3);
  return (PORTUGUESE_PAGES as readonly string[]).includes(english) && english !== '/' ? { status: 301, location: english } : null;
}

export function legacyAnswer(pathname: string, prettyUrlsLive: boolean): LegacyAnswer | null {
  return legacyNameAllAnswer(pathname, prettyUrlsLive) ?? retiredFeatureAnswer(pathname) ?? portugueseAnswer(pathname);
}
