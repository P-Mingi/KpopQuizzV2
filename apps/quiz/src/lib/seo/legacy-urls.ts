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
  '<h1>This page was removed</h1><p>This game is no longer on KpopQuiz.</p>' +
  '<p><a href="/">Play a K-pop quiz</a></p></body></html>';
