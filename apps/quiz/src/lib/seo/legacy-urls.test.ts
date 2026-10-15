import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it } from 'vitest';

import nextConfig from '../../../next.config';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { prettyPath } from '@/lib/name-all/round';
import { isKnownRouteWith } from '@/lib/route-allowlist';
import {
  LEGACY_GROUP_ALIASES, LEGACY_NAME_ALL_PREFIX, battleQuizSlug, legacyNameAllAnswer,
} from './legacy-urls';

// SEO (owner, 2026-10-14): the retired URLs Bing reported (docs/seo/bing-2026-10-14,
// FailingUrls.csv) get a 301 to their exact successor or a 410, never /quizzes.

const LIVE = true; // the V12 pretty URLs are served (production, flags on)
const BOTH = { v1: true, v12: true };

/** The 16 /games/name-all URLs of Bing's FailingUrls.csv (2026-10-14), with their answer. */
const BING_FAILING: Array<[string, string | 410]> = [
  ['name-all-aespa', '/aespa-name-all-members'],
  ['name-all-gidle', '/g-i-dle-name-all-members'],
  ['name-all-nmixx', 410], // NMIXX has no Name them all page
  ['name-top-10-blackpink-songs', 410],
  ['name-top-10-skz-songs', 410],
  ['name-top-10-bts-songs', 410],
  ['name-top-10-4th-gen-bg-songs', 410],
  ['name-all-4th-gen-gg', 410],
  ['name-all-4th-gen-bg', 410],
  ['name-all-4th-gen-groups', 410],
  ['name-all-3rd-gen-groups', 410],
  ['name-all-2nd-gen-groups', 410],
  ['name-songs-born-pink', 410],
  ['name-songs-the-album-bp', 410],
  ['name-songs-fml', 410],
  ['name-songs-oddinary', 410],
];

/** Every slug the two removed seed scripts created (git 1c46be8 and 526364d^). */
const SEEDED_GROUP_GAMES: Array<[string, string | 410]> = [
  ['name-all-bts', '/bts-name-all-members'],
  ['name-all-blackpink', '/blackpink-name-all-members'],
  ['name-all-twice', '/twice-name-all-members'],
  ['name-all-stray-kids', '/stray-kids-name-all-members'],
  ['name-all-seventeen', '/seventeen-name-all-members'],
  ['name-all-aespa', '/aespa-name-all-members'],
  ['name-all-newjeans', '/newjeans-name-all-members'],
  ['name-all-ive', '/ive-name-all-members'],
  ['name-all-le-sserafim', '/le-sserafim-name-all-members'],
  ['name-all-exo', '/exo-name-all-members'],
  ['name-all-enhypen', '/enhypen-name-all-members'],
  ['name-all-txt', '/txt-name-all-members'],
  ['name-all-ateez', '/ateez-name-all-members'],
  ['name-all-red-velvet', '/red-velvet-name-all-members'],
  ['name-all-itzy', '/itzy-name-all-members'],
  ['name-all-gidle', '/g-i-dle-name-all-members'],
  ['name-all-shinee', '/shinee-name-all-members'],
  // No page: NCT has none (owner decision, lib/name-all/spellings.ts), the others never had one.
  ['name-all-nct-127', 410],
  ['name-all-nct-dream', 410],
  ['name-all-nmixx', 410],
  ['name-all-got7', 410],
  ['name-all-mamamoo', 410],
  ['name-all-treasure', 410],
  ['name-all-babymonster', 410],
];
const SEEDED_OTHER_GAMES = [
  'name-all-4th-gen-groups', 'name-all-3rd-gen-groups', 'name-all-2nd-gen-groups', 'name-all-4th-gen-gg',
  'name-all-4th-gen-bg', 'name-20-gg-idols', 'name-30-bg-idols', 'name-15-4th-gen-gg-idols',
  'name-15-4th-gen-bg-idols', 'name-songs-mots7', 'name-songs-the-album-bp', 'name-songs-born-pink',
  'name-songs-oddinary', 'name-songs-fml', 'name-songs-my-world-aespa', 'name-songs-ive-ive',
  'name-songs-maxident', 'name-top-10-blackpink-songs', 'name-top-10-bts-songs', 'name-top-5-aespa-songs',
  'name-top-10-skz-songs', 'name-top-10-twice-songs', 'name-top-5-newjeans-songs', 'name-top-10-svt-songs',
  'name-top-10-4th-gen-gg-songs', 'name-top-10-4th-gen-bg-songs',
];

const answer = (slug: string, live = LIVE) => legacyNameAllAnswer(`${LEGACY_NAME_ALL_PREFIX}/${slug}`, live);
const expected = (to: string | 410) => (to === 410 ? { status: 410 } : { status: 301, location: to });

describe('/games/name-all: exact successor or 410', () => {
  it.each(BING_FAILING)('Bing URL %s', (slug, to) => {
    expect(answer(slug)).toEqual(expected(to));
  });

  it.each(SEEDED_GROUP_GAMES)('seeded group game %s', (slug, to) => {
    expect(answer(slug)).toEqual(expected(to));
  });

  it.each(SEEDED_OTHER_GAMES)('generation, song and idol game %s is gone', (slug) => {
    expect(answer(slug)).toEqual({ status: 410 });
  });

  it('every group with a Name them all page is reached from name-all-<group>', () => {
    for (const g of NAME_ALL_GROUPS) expect(answer(`name-all-${g}`)).toEqual({ status: 301, location: prettyPath(g) });
  });

  it('every alias lands on a real Name them all group, and only through name-all-<alias>', () => {
    for (const [alias, group] of Object.entries(LEGACY_GROUP_ALIASES)) {
      expect(NAME_ALL_GROUPS as readonly string[], alias).toContain(group);
      expect(answer(`name-all-${alias}`)).toEqual({ status: 301, location: prettyPath(group) });
    }
  });

  it('the old hub, unknown slugs and deeper paths are gone, never sent to a generic page', () => {
    expect(legacyNameAllAnswer(LEGACY_NAME_ALL_PREFIX, LIVE)).toEqual({ status: 410 });
    for (const slug of ['', 'bts', 'name-all-', 'name-all-made-up-group', 'name-all-aespa/x', 'name-all-Aespa', 'name-all-bts-members']) {
      expect(answer(slug), slug).toEqual({ status: 410 });
    }
  });

  it('with the V12 flags off the pretty pages do not exist, so every URL is 410', () => {
    for (const [slug] of [...BING_FAILING, ...SEEDED_GROUP_GAMES]) expect(answer(slug, false)).toEqual({ status: 410 });
  });

  it('leaves every other path alone', () => {
    for (const p of ['/', '/games', '/games/sort-it', '/games/name-allx', '/games/name-them-all/name-all-kpop-groups',
      '/name-all/bts', '/bts-name-all-members', '/q/name-all-aespa']) {
      expect(legacyNameAllAnswer(p, LIVE), p).toBeNull();
    }
  });

  it('no chain: every target is a served URL that no redirect touches', async () => {
    const redirects = await nextConfig.redirects!();
    for (const g of NAME_ALL_GROUPS) {
      const to = prettyPath(g);
      expect(isKnownRouteWith(to, BOTH), to).toBe(true);
      expect(legacyNameAllAnswer(to, LIVE), to).toBeNull();
      expect(redirects.some((r) => getPathMatch(r.source)(to) !== false), to).toBe(false);
    }
  });
});

/** The first next.config redirect that applies, as Next picks it (source, then has/missing on the query). */
async function firstRedirect(pathname: string, query: Record<string, string> = {}) {
  const redirects = await nextConfig.redirects!();
  return redirects.find((r) => {
    if (getPathMatch(r.source)(pathname) === false) return false;
    const queryKey = (c: { type: string; key?: string | undefined }) => c.type === 'query' && c.key !== undefined && c.key in query;
    if (r.has && !r.has.every(queryKey)) return false;
    if (r.missing && r.missing.some(queryKey)) return false;
    return true;
  });
}

describe('next.config hands the legacy URLs to the middleware', () => {
  it('no redirect catches /games/name-all or anything under it', async () => {
    for (const slug of ['', ...BING_FAILING.map(([s]) => s)]) {
      const p = slug ? `${LEGACY_NAME_ALL_PREFIX}/${slug}` : LEGACY_NAME_ALL_PREFIX;
      expect(await firstRedirect(p), p).toBeUndefined();
    }
  });

  it('the other retired /games URLs keep their redirect', async () => {
    for (const p of ['/games', '/games/sort-it', '/games/this-or-that/all', '/games/name-them-all/name-all-kpop-groups', '/games/name-allx']) {
      expect((await firstRedirect(p))?.destination, p).toBe('/quizzes');
    }
  });

  it('/battle?quiz= reaches the middleware; a bare /battle keeps its redirect', async () => {
    expect(await firstRedirect('/battle', { quiz: 'illit-quiz' })).toBeUndefined();
    expect((await firstRedirect('/battle'))?.destination).toBe('/quizzes');
    expect((await firstRedirect('/battle/abc'))?.destination).toBe('/quizzes');
  });
});

describe('/battle?quiz=: the slug worth a database read', () => {
  it('takes a live slug as it is', () => {
    for (const s of ['illit-quiz', 'stray-kids-know-each-member', 'can-you-guess-the-ive-song-from-3-clues-', '-nct-find-the-intruder']) {
      expect(battleQuizSlug(s)).toBe(s);
    }
    expect(battleQuizSlug(' illit-quiz ')).toBe('illit-quiz');
  });

  it('refuses what no published slug looks like', () => {
    for (const s of [null, '', '-', '---', '../admin', 'a/b', 'Illit-Quiz', 'illit quiz', 'x'.repeat(121), 'quiz?x=1']) {
      expect(battleQuizSlug(s), String(s)).toBeNull();
    }
  });
});
