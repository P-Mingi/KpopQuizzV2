import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  P2_DEFAULT_SORT, P2_PAGE_SIZE, P2_TYPES,
  avgPct, p2Concat, p2Facets, p2FilterKey, p2Href, p2Languages, p2PageCount, p2PageIds, p2Query, p2ShownPages,
  parsePage, parseP2Filters, quizCountLabel, toBrowseSort,
} from './filters';

import type { P2FacetRow, P2Filters } from './filters';

// P2 unit tests: the /quizzes URL contract (the live page's keys + level), the facet
// counts (each option counted with the other facets applied), the Level ordering
// (the live sort semantics), the cumulative ?page=N rule and the em / en dash ban.

const VALID = { groupSlugs: new Set(['bts', 'blackpink', 'general-kpop', 'chungha']), languages: new Set(['en', 'tr']) };
const F = (patch: Partial<P2Filters> = {}): P2Filters => ({ sort: 'most_played', type: null, level: null, group: null, lang: null, page: 1, ...patch });
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-26T12:00:00Z');

let n = 0;
function row(p: Partial<P2FacetRow> = {}): P2FacetRow {
  n += 1;
  return {
    id: `q${String(n).padStart(3, '0')}`, type: 'multiple_choice', difficulty: 'medium', language: 'en',
    groupSlug: 'bts', groupName: 'BTS', created: NOW - 100 * DAY, plays: 10, scoreSum: 50, completions: 10, questions: 10,
    ...p,
  };
}

describe('URL contract (the live page keys + level)', () => {
  it('reads the live keys; no sort, `all` or junk = the live default (most played)', () => {
    expect(parseP2Filters({}, VALID)).toEqual(F());
    expect(parseP2Filters({ sort: 'all' }, VALID).sort).toBe('most_played');
    expect(parseP2Filters({ sort: 'nope' }, VALID).sort).toBe(P2_DEFAULT_SORT);
    expect(parseP2Filters({ sort: 'newest', type: 'tf', level: 'hard', group: 'bts', lang: 'tr', page: '3' }, VALID))
      .toEqual(F({ sort: 'newest', type: 'tf', level: 'hard', group: 'bts', lang: 'tr', page: 3 }));
  });

  it('ignores an unknown type, level, group or language (as the live page does)', () => {
    expect(parseP2Filters({ type: 'x', level: 'extreme', group: 'nope', lang: 'ko' }, VALID)).toEqual(F());
    expect(parseP2Filters({ tab: 'trending' }, VALID)).toEqual(F());
    expect(parseP2Filters({ sort: ['trending', 'newest'] }, VALID).sort).toBe('trending');
  });

  it('pages like the live page: an integer >= 1, anything else is page 1', () => {
    expect(['2', '0', '-3', 'abc', '', '7.9'].map((s) => parsePage(s))).toEqual([2, 1, 1, 1, 1, 7]);
    expect(parsePage(undefined)).toBe(1);
  });

  it('builds canonical links: one param order, no default value, the default view is /quizzes', () => {
    expect(p2Href(F())).toBe('/quizzes');
    expect(p2Href(F({ sort: 'most_played', page: 1 }))).toBe('/quizzes');
    expect(p2Href(F({ page: 2 }))).toBe('/quizzes?page=2');
    expect(p2Href(F({ sort: 'top_rated', type: 'clue', level: 'easy', group: 'bts', lang: 'tr', page: 4 })))
      .toBe('/quizzes?group=bts&type=clue&level=easy&lang=tr&sort=top_rated&page=4');
    expect(p2Href(F({ group: 'bts', page: 3 }), { group: null, page: 1 })).toBe('/quizzes');
  });

  it('page links match the live page pagination links (group, type, lang, sort, page)', () => {
    const live = (g: string | null, t: string | null, l: string | null, s: string, page: number): string => {
      const p = new URLSearchParams();
      if (g) p.set('group', g); if (t) p.set('type', t); if (l) p.set('lang', l);
      if (s !== 'all') p.set('sort', s); if (page > 1) p.set('page', String(page));
      const qs = p.toString(); return qs ? `/quizzes?${qs}` : '/quizzes';
    };
    for (const s of ['trending', 'newest', 'top_rated'] as const) {
      expect(p2Href(F({ sort: s, group: 'bts', type: 'image', lang: 'tr', page: 2 }))).toBe(live('bts', 'image', 'tr', s, 2));
    }
    expect(p2Href(F({ group: 'bts', page: 3 }))).toBe(live('bts', null, null, 'all', 3));
    expect(p2Query(F({ type: 'tf' }), 2)).toBe('type=tf&page=2');
  });

  it('maps sorts and types exactly as the live page', () => {
    expect((['trending', 'newest', 'most_played', 'top_rated'] as const).map(toBrowseSort)).toEqual(['trending', 'new', 'most_played', 'top_rated']);
    expect(Object.fromEntries(P2_TYPES.map((t) => [t.key, t.db]))).toEqual({
      classic: 'multiple_choice', tf: 'true_false', clue: 'guess_from_clues', image: 'image', intruder: 'intruder',
    });
    expect(p2FilterKey(F({ page: 5 }))).toBe(p2FilterKey(F({ page: 1 })));
  });
});

describe('facet counts (real counts, every option with the other facets applied)', () => {
  const rows = [
    row({ type: 'multiple_choice', difficulty: 'easy', groupSlug: 'bts', groupName: 'BTS' }),
    row({ type: 'multiple_choice', difficulty: 'hard', groupSlug: 'bts', groupName: 'BTS' }),
    row({ type: 'true_false', difficulty: 'easy', groupSlug: 'blackpink', groupName: 'BLACKPINK', created: NOW - 2 * DAY }),
    row({ type: 'image', difficulty: 'medium', groupSlug: 'general-kpop', groupName: 'General K-pop' }),
    row({ type: 'image', difficulty: 'medium', groupSlug: 'general-kpop', groupName: 'General K-pop' }),
    row({ type: 'image', difficulty: 'medium', groupSlug: 'general-kpop', groupName: 'General K-pop', language: 'tr' }),
  ];

  it('counts the result and each option', () => {
    const f = p2Facets(rows, F(), NOW);
    expect(f.total).toBe(6);
    expect(f.types).toEqual({ classic: 2, tf: 1, clue: 0, image: 3, intruder: 0 });
    expect(f.levels).toEqual({ easy: 2, medium: 3, hard: 1 });
    expect(f.catalogue).toEqual({ quizzes: 6, groups: 3 });
  });

  it('applies the other facets to each facet (Level counts inside the chosen Type)', () => {
    const f = p2Facets(rows, F({ type: 'classic' }), NOW);
    expect(f.total).toBe(2);
    expect(f.levels).toEqual({ easy: 1, medium: 0, hard: 1 });
    expect(f.types.image).toBe(3); // the Type menu itself ignores the chosen type
    expect(f.groups).toEqual([{ slug: 'bts', name: 'BTS', count: 2 }]);
  });

  it('lists groups by count, the catch-all bucket last', () => {
    expect(p2Facets(rows, F(), NOW).groups.map((g) => g.slug)).toEqual(['bts', 'blackpink', 'general-kpop']);
  });

  it('trending counts only the last 30 days; a language filter matches the column exactly', () => {
    expect(p2Facets(rows, F({ sort: 'trending' }), NOW).total).toBe(1);
    expect(p2Facets(rows, F({ lang: 'tr' }), NOW).total).toBe(1);
    expect([...p2Languages([...rows, row({ language: '' })])].sort()).toEqual(['en', 'tr']);
  });
});

describe('Level pages (ordered with the live sort semantics)', () => {
  const rows = [
    row({ id: 'a', difficulty: 'hard', plays: 50, created: NOW - 40 * DAY, scoreSum: 10, completions: 10, questions: 10 }),
    row({ id: 'b', difficulty: 'hard', plays: 90, created: NOW - 50 * DAY, scoreSum: 90, completions: 10, questions: 10 }),
    row({ id: 'c', difficulty: 'hard', plays: 90, created: NOW - 5 * DAY, scoreSum: 30, completions: 10, questions: 10 }),
    row({ id: 'd', difficulty: 'easy', plays: 999, created: NOW - 1 * DAY }),
    row({ id: 'e', difficulty: 'hard', plays: 5, created: NOW - 2 * DAY, completions: 0 }),
  ];
  const hard = (p: Partial<P2Filters> = {}): P2Filters => F({ level: 'hard', ...p });

  it('most played: plays desc, ties by newest', () => {
    expect(p2PageIds(rows, hard(), NOW)).toEqual(['c', 'b', 'a', 'e']);
  });
  it('newest: created_at desc', () => {
    expect(p2PageIds(rows, hard({ sort: 'newest' }), NOW)).toEqual(['e', 'c', 'a', 'b']);
  });
  it('trending: last 30 days only, most played first', () => {
    expect(p2PageIds(rows, hard({ sort: 'trending' }), NOW)).toEqual(['c', 'e']);
  });
  it('top rated: the most played slice re-ranked by average score (the live rule)', () => {
    expect(avgPct({ scoreSum: 90, completions: 10, questions: 10 })).toBe(90);
    expect(p2PageIds(rows, hard({ sort: 'top_rated' }), NOW)).toEqual(['b', 'c', 'a', 'e']);
    expect(p2PageIds(rows, hard({ sort: 'top_rated' }), NOW, 2)).toEqual(['b', 'c']);
    expect(p2PageIds(rows, hard({ sort: 'top_rated', page: 2 }), NOW, 2)).toEqual(['a', 'e']);
  });
});

describe('?page=N shows pages 1..N (the Load more state)', () => {
  it('shows every page up to N, never past the last one', () => {
    expect(p2ShownPages(1, 422)).toEqual({ last: 1, outOfRange: false });
    expect(p2ShownPages(2, 422)).toEqual({ last: 2, outOfRange: false });
    expect(p2ShownPages(9, 422)).toEqual({ last: 9, outOfRange: false });
    expect(p2PageCount(422)).toBe(9);
    expect(p2PageCount(0)).toBe(1);
    expect(p2PageCount(P2_PAGE_SIZE)).toBe(1);
  });
  it('a page past the end shows the first page and says so; an empty result is page 1', () => {
    expect(p2ShownPages(12, 422)).toEqual({ last: 1, outOfRange: true });
    expect(p2ShownPages(3, 0)).toEqual({ last: 1, outOfRange: false });
  });
  it('reads at most 10 pages when the total is unknown', () => {
    expect(p2ShownPages(50, null)).toEqual({ last: 10, outOfRange: false });
  });
  it('concatenates pages without showing a quiz twice', () => {
    expect(p2Concat([[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]]).map((q) => q.id)).toEqual(['a', 'b', 'c']);
  });
  it('says the count in words', () => {
    expect([0, 1, 48, 1234].map(quizCountLabel)).toEqual(['0 quizzes', '1 quiz', '48 quizzes', '1,234 quizzes']);
  });
});

describe('copy rules', () => {
  it('no em or en dash in any P2 source file', () => {
    const src = path.resolve(__dirname, '../../..');
    const files = [
      'lib/ux-v1/p2/filters.ts', 'lib/ux-v1/p2/queries.ts', 'lib/ux-v1/p2/filters.test.ts',
      'app/(site)/quizzes/page.tsx', 'app/(site)/quizzes/ux-page.tsx', 'app/(site)/quizzes/faq.tsx',
      'app/api/ux-v1/p2/quizzes/route.ts', 'styles/ux-v1/p2.css',
      ...fs.readdirSync(path.join(src, 'components/quizzes/ux-v1')).map((f) => `components/quizzes/ux-v1/${f}`),
    ];
    const bad = files.filter((f) => /[\u2013\u2014]/.test(fs.readFileSync(path.join(src, f), 'utf8')));
    expect(bad).toEqual([]);
  });
});
