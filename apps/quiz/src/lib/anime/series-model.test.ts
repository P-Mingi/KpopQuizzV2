import { describe, expect, it } from 'vitest';

import { COPY as O2 } from '@/copy/anime/o2';
import { COPY as O3 } from '@/copy/anime/o3';

import { fill, t, tPlural } from './copy';
import {
  HUB_FACT_LIMIT, MIN_PUBLISHED_FOR_INDEX, SERIES_TRIVIA_MIN, airingRecord, groupQuizzesByArc, hasTriviaPage, headerFacts,
  hubEyebrow, hubIndexable, hubIntro, lengthText, mixHubMetadata, openingRows, openingsQuizHref, playableThemeCount, quizLevels, quizSpoilerLevel,
  safeUrl, seriesFaqs, seriesHubMetadata, seriesTriviaMetadata, shieldArcs, sourceLinks, splitCharacters, storyMap, uniqueFacts,
} from './series-model';
import { FIXTURE_SLUGS, hubFromFixture, readFixture } from './test-support';
import { TITLE_CARD_ACCENTS, hashTitle, monogramOf, titleCardSpec, wrapTitle } from './title-card';
import { MIN_OSHI_PICKS, MIN_PLAYABLE_THEMES } from './types';

import type { SeriesHub } from './series';
import type { ArcRow } from './types';

const ORIGIN = 'https://otakuquiz.org';
const BRAND = 'OtakuQuiz';

describe('A1 header facts', () => {
  it('prints the known facts of Death Note, in the order of the hub', () => {
    const facts = headerFacts(hubFromFixture('death-note').series);
    expect(facts.map((f) => f.key)).toEqual(['native', 'romaji', 'studios', 'authors', 'years', 'status', 'episodes', 'chapters', 'volumes']);
    const by = Object.fromEntries(facts.map((f) => [f.key, f.value]));
    expect(by).toMatchObject({ romaji: 'Desu Noto', studios: 'Madhouse', authors: 'Tsugumi Ohba, Takeshi Obata', years: '2006-2007', status: 'Finished', episodes: '37', chapters: '108', volumes: '12' });
  });

  it('says "since" for a running series and leaves out what is unknown', () => {
    for (const slug of ['one-piece', 'spy-x-family'] as const) {
      const hub = hubFromFixture(slug);
      const years = headerFacts(hub.series).find((f) => f.key === 'years');
      expect(years?.value, slug).toMatch(/^since \d{4}$|^\d{4}-\d{4}$|^\d{4}$/);
      expect(headerFacts(hub.series).find((f) => f.key === 'status')?.value).toBe('Ongoing');
    }
    const bare = { ...hubFromFixture('death-note').series, title_native: null, title_romaji: null, studios: [], authors: [], anime_start_year: null, anime_end_year: null, manga_start_year: null, manga_end_year: null, episodes: null, chapters: null, volumes: null };
    expect(headerFacts(bare).map((f) => f.key)).toEqual(['status']);
    // the English title is listed only when the page does not already print it
    expect(headerFacts(bare, 'Death Note').map((f) => f.key)).toEqual(['status']);
    expect(headerFacts(bare, 'DN').map((f) => f.key)).toEqual(['english', 'status']);
  });

  it('marks an approximate chapter count', () => {
    const s = { ...hubFromFixture('one-piece').series, chapters: 1100, chapters_approx: true };
    expect(headerFacts(s).find((f) => f.key === 'chapters')?.value).toBe('about 1,100');
    expect(lengthText({ episodes: 37, chapters: 108, seasons: 1 })).toBe('1 season, 37 episodes, 108 chapters');
    expect(lengthText({ episodes: null, chapters: null, seasons: null })).toBeNull();
  });

  it('shows "Now airing" only when series.airing holds a record', () => {
    expect(airingRecord(null)).toBeNull();
    expect(airingRecord({})).toBeNull();
    expect(airingRecord([1])).toBeNull();
    expect(airingRecord('airing')).toBeNull();
    expect(airingRecord({ episode: 12, next_air_date: '2026-10-25', source_url: 'https://example.org/a' })).toEqual({ episode: 12, nextDate: '2026-10-25', sourceUrl: 'https://example.org/a' });
    expect(airingRecord({ episode: 'x', next_air_date: 'soon', source_url: 'javascript:alert(1)' })).toEqual({ episode: null, nextDate: null, sourceUrl: null });
  });

  it('builds the Sources list from entity_sources and the official URL, with valid links only', () => {
    const hub = hubFromFixture('death-note');
    const links = sourceLinks(
      [
        { field: 'studios', source: 'wikipedia', source_ref: '123', source_url: 'https://en.wikipedia.org/wiki/Death_Note', fetched_at: '2026-10-01' },
        { field: 'episodes', source: 'wikipedia', source_ref: '123', source_url: 'https://en.wikipedia.org/wiki/Death_Note', fetched_at: '2026-10-01' },
        { field: 'title_native', source: 'wikidata', source_ref: null, source_url: 'javascript:alert(1)', fetched_at: '2026-10-01' },
      ],
      { official_url: 'https://www.example.org/' },
    );
    expect(links).toHaveLength(3);
    expect(links[0]).toMatchObject({ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Death_Note', fields: ['studios', 'episodes'] });
    expect(links[1]).toMatchObject({ label: 'Wikidata', url: null });
    expect(links[2]).toMatchObject({ label: 'Official site', url: 'https://www.example.org/' });
    expect(sourceLinks(hub.sources, { official_url: null })).toEqual([]);
    expect(safeUrl('/relative')).toBeNull();
  });
});

describe('A2 arcs and quizzes by arc', () => {
  it('groups the five Death Note quizzes by their arc, spoiler-free first', () => {
    const hub = hubFromFixture('death-note');
    const groups = groupQuizzesByArc(hub.quizzes, hub.arcs);
    expect(groups.map((g) => [g.ord, g.title, g.slugs.length])).toEqual([[0, 'Spoiler-free quizzes', 2], [1, 'Part 1', 2], [2, 'Part 2', 1]]);
  });

  for (const slug of FIXTURE_SLUGS) {
    it(`covers every ${slug} quiz exactly once and labels it with its arc`, () => {
      const hub = hubFromFixture(slug);
      const groups = groupQuizzesByArc(hub.quizzes, hub.arcs);
      expect(groups.flatMap((g) => g.slugs).sort()).toEqual(hub.quizzes.map((q) => q.slug).sort());
      const levels = quizLevels(hub.quizzes, hub.arcs);
      for (const q of readFixture(slug).quizzes) {
        expect(levels[q.slug]!.arc).toBe(q.expected_level.arc_ord);
        expect(levels[q.slug]!.scope).toBe(q.expected_level.scope);
        expect(levels[q.slug]!.arcName === '').toBe(q.expected_level.arc_ord === 0);
      }
    });
  }

  it('the story map lists the arcs in order with their quiz counts, and nests arcs in their saga', () => {
    const hub = hubFromFixture('one-piece');
    const nodes = storyMap(hub.arcs, hub.quizzes);
    expect(nodes.map((n) => n.ord)).toEqual(hub.arcs.map((a) => a.ord));
    expect(nodes.find((n) => n.ord === 5)?.quizzes).toBe(1);
    expect(nodes.find((n) => n.ord === 10)?.quizzes).toBe(1);
    const saga = { ...hub.arcs[0]!, id: 50, ord: 1, kind: 'saga' as const, parent_id: null };
    const child = { ...hub.arcs[1]!, id: 51, ord: 2, kind: 'arc' as const, parent_id: 50 };
    const nested = storyMap([saga, child], []);
    expect(nested).toHaveLength(1);
    expect(nested[0]!.children.map((c) => c.ord)).toEqual([2]);
    expect(nested[0]!.kindLabel).toBe('Saga');
  });

  it('the shield takes the arcs with their medium flags', () => {
    const arcs = [{ ...hubFromFixture('death-note').arcs[0]!, manga_only: true } as ArcRow];
    expect(shieldArcs(arcs)).toEqual([{ ord: 1, name: 'Part 1', mangaOnly: true, animeOnly: false }]);
  });
});

describe('A3 characters', () => {
  it('shows only the characters with no spoiler, and counts the others without naming them', () => {
    const hub = hubFromFixture('death-note');
    const split = splitCharacters(hub.characters, {});
    const spoiled = hub.characters.filter((c) => c.spoiler_level > 0);
    expect(spoiled.length).toBeGreaterThan(0);
    expect(split.lockedCount).toBe(spoiled.length);
    expect(split.open).toHaveLength(hub.characters.length - spoiled.length);
    expect(JSON.stringify(split)).not.toContain(spoiled[0]!.name);
  });

  it('a reader with progress sees the characters up to their arc', () => {
    const hub = hubFromFixture('death-note');
    expect(splitCharacters(hub.characters, {}, { arc: 2, scope: 'anime' }).lockedCount).toBe(0);
    expect(splitCharacters(hub.characters, {}, { arc: 1, scope: 'anime' }).lockedCount).toBe(hub.characters.filter((c) => c.spoiler_level > 1).length);
  });

  it('prints a pick count only from 30 picks', () => {
    const hub = hubFromFixture('spy-x-family');
    const [a, b] = hub.characters;
    const split = splitCharacters(hub.characters, { [a!.id]: MIN_OSHI_PICKS - 1, [b!.id]: MIN_OSHI_PICKS });
    expect(split.open.find((c) => c.id === a!.id)!.picks).toBeNull();
    expect(split.open.find((c) => c.id === b!.id)!.picks).toBe(MIN_OSHI_PICKS);
  });
});

describe('A4 openings and endings', () => {
  it('lists the themes with their kind, number, title, artist and season', () => {
    const hub = hubFromFixture('death-note');
    const rows = openingRows(hub.themes);
    expect(rows).toHaveLength(hub.themes.length);
    expect(rows[0]).toMatchObject({ kind: 'op', kindLabel: 'Opening', number: 1, title: 'the WORLD', artist: 'Nightmare' });
  });

  it('links to /{series}-openings-quiz only at 15 playable themes or more, never to the blind test', () => {
    expect(MIN_PLAYABLE_THEMES).toBe(15);
    const hub = hubFromFixture('death-note');
    const many = (n: number) => Array.from({ length: 20 }, (_, i) => ({ deezer_playable: i < n }));
    expect(openingsQuizHref('death-note', many(14))).toBeNull();
    expect(openingsQuizHref('death-note', many(15))).toBe('/death-note-openings-quiz');
    expect(openingsQuizHref('death-note', hub.themes)).toBeNull();
    expect(playableThemeCount(many(15))).toBe(15);
    // unchecked themes (null) are not playable
    expect(playableThemeCount([{ deezer_playable: null }, { deezer_playable: false }])).toBe(0);
  });
});

describe('facts, FAQ and texts', () => {
  it('floors the trivia page at 9 unique facts', () => {
    expect(SERIES_TRIVIA_MIN).toBe(9);
    expect(HUB_FACT_LIMIT).toBe(9);
    expect(hasTriviaPage(hubFromFixture('death-note', { trivia: 8 }).trivia)).toBe(false);
    expect(hasTriviaPage(hubFromFixture('death-note', { trivia: 9 }).trivia)).toBe(true);
    const dup = hubFromFixture('death-note', { trivia: 9 }).trivia;
    expect(uniqueFacts([...dup, ...dup])).toHaveLength(9);
  });

  it('builds the FAQ from real values only', () => {
    const base = hubFromFixture('death-note');
    const full = seriesFaqs({ ...base, themes: Array.from({ length: 15 }, (_, i) => ({ ...base.themes[0]!, id: i, number: i + 1, deezer_playable: true })) }, BRAND);
    expect(full.map((f) => f.q)).toEqual([
      'How many Death Note quizzes are there on OtakuQuiz?',
      'Are the Death Note quizzes safe if I have not finished it?',
      'Are the Death Note quizzes free?',
      'Who made Death Note?',
      'How long is Death Note?',
      'Is there a Death Note openings quiz?',
    ]);
    const hub = hubFromFixture('one-piece');
    const bare: SeriesHub = { ...hub, quizzes: [], themes: [], series: { ...hub.series, studios: [], episodes: null, chapters: null, seasons: null } };
    expect(seriesFaqs(bare, BRAND).map((f) => f.q)).toHaveLength(2);
    for (const f of full) expect(f.text).toBe(f.a);
  });

  it('the intro and the eyebrow follow the real count', () => {
    expect(hubEyebrow(0)).toBe('No quiz yet');
    expect(hubEyebrow(1)).toBe('1 fan-made quiz');
    expect(hubEyebrow(5)).toBe('5 fan-made quizzes');
    expect(hubIntro('Death Note', 5, null)).toContain('5 fan-made quizzes');
    expect(hubIntro('Death Note', 0, null)).toContain('Be the first');
    expect(hubIntro('Death Note', 5, '  Our own intro.  ')).toBe('Our own intro.');
  });
});

describe('metadata and indexing', () => {
  it('is noindex,follow under 3 published quizzes and indexable from 3', () => {
    expect(MIN_PUBLISHED_FOR_INDEX).toBe(3);
    expect(hubIndexable(2)).toBe(false);
    expect(hubIndexable(3)).toBe(true);
    const hub = hubFromFixture('death-note');
    expect(seriesHubMetadata({ ...hub, quizzes: hub.quizzes.slice(0, 2) }, ORIGIN, BRAND).robots).toEqual({ index: false, follow: true });
    expect(seriesHubMetadata(hub, ORIGIN, BRAND).robots).toBeUndefined();
  });

  for (const slug of FIXTURE_SLUGS) {
    it(`the ${slug} hub canonical is the clean URL, every URL is the site's, nothing says K-pop`, () => {
      const hub = hubFromFixture(slug, { trivia: 9 });
      for (const meta of [seriesHubMetadata(hub, ORIGIN, BRAND), seriesTriviaMetadata(hub, 9, ORIGIN, BRAND), mixHubMetadata({ slug: 'anime-mix', name: 'Anime Mix', quiz_count: 40 }, ORIGIN, BRAND)]) {
        const text = JSON.stringify(meta);
        expect(text).not.toMatch(/k-?pop/i);
        expect((meta.alternates as { canonical: string }).canonical).toMatch(/^\/[a-z0-9-]+-(quiz|trivia)$/);
        for (const url of text.match(/https?:\/\/[^"]+/g) ?? []) {
          expect(url.startsWith(ORIGIN), url).toBe(true);
          expect(url).not.toContain('?');
        }
        expect(String(meta.title).length).toBeLessThanOrEqual(60);
      }
    });
  }
});

describe('the spoiler level of a quiz page', () => {
  it('takes the stricter of the stored level and the questions tags', () => {
    const hub = hubFromFixture('death-note');
    const quiz = readFixture('death-note').quizzes.find((q) => q.expected_level.arc_ord === 2)!;
    expect(quizSpoilerLevel(hub, quiz.slug, quiz.questions)).toEqual({ arcOrd: 2, scope: 'both' });
    // nothing stored: the tags decide
    expect(quizSpoilerLevel(null, quiz.slug, quiz.questions)).toEqual({ arcOrd: 2, scope: 'both' });
    // stored higher than the tags: the stored value (computed at publish) wins
    expect(quizSpoilerLevel({ ...hub, quizzes: hub.quizzes.map((q) => (q.slug === quiz.slug ? { ...q, spoiler_arc_ord: 5 } : q)) }, quiz.slug, quiz.questions).arcOrd).toBe(5);
    expect(quizSpoilerLevel(hub, 'unknown', [])).toEqual({ arcOrd: 0, scope: null });
  });
});

describe('copy', () => {
  it('has the frozen keys', () => {
    const o2 = ['hub.start', 'hub.sources', 'hub.quizzesByArc', 'hub.characters', 'hub.openings', 'hub.storyMap', 'hub.facts', 'hub.related', 'hub.faq', 'hub.nowAiring', 'hub.community', 'series.h1', 'series.lede', 'series.filter', 'mix.h1', 'mix.lede', 'trivia.h1', 'trivia.sourcesTitle', 'oshi.button', 'oshi.count'];
    const o3 = ['spoiler.safeForYou', 'spoiler.covers', 'spoiler.gatedQuestion', 'spoiler.interstitialTitle', 'spoiler.interstitialBody', 'spoiler.showAnyway', 'spoiler.setProgress', 'shield.title', 'shield.progressLabel', 'shield.spoilerFree', 'shield.showEverything', 'report.action', 'report.sent', 'report.covered'];
    for (const k of o2) expect(O2, k).toHaveProperty([k]);
    for (const k of o3) expect(O3, k).toHaveProperty([k]);
  });

  it('series, character and oshi words come from the vocabulary, not from the strings', () => {
    for (const [k, v] of Object.entries({ ...O2, ...O3 })) {
      expect(v, k).not.toMatch(/\bseries\b|\bcharacters?\b|\boshi\b/i);
    }
    expect(t('hub.characters')).toBe('Characters');
    expect(t('hub.related')).toBe('Related series');
    expect(t('oshi.button', { name: 'L' })).toBe('Make L my oshi');
    expect(t('series.filter')).toBe('Find a series');
  });

  it('fills placeholders and plurals, and leaves an unknown placeholder as written', () => {
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}');
    expect(tPlural('hub.arcQuizzes', 1)).toBe('1 quiz');
    expect(tPlural('hub.arcQuizzes', 2)).toBe('2 quizzes');
  });

  it('has no K-pop word, dash or emoji anywhere', () => {
    const all = JSON.stringify({ ...O2, ...O3 });
    expect(all).not.toMatch(/k-?pop/i);
    expect(all).not.toMatch(/[\u2013\u2014]/);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('A7 title card spec', () => {
  it('is deterministic: the same title always gives the same card', () => {
    expect(titleCardSpec('Death Note')).toEqual(titleCardSpec('Death Note'));
    expect(titleCardSpec('Death Note')).not.toEqual(titleCardSpec('One Piece'));
    expect(hashTitle('Death Note')).toBe(hashTitle('Death Note'));
  });
  it('uses an accent token and wraps the title in at most three lines', () => {
    for (const slug of FIXTURE_SLUGS) {
      const spec = titleCardSpec(readFixture(slug).group.name);
      expect(TITLE_CARD_ACCENTS).toContain(spec.accent);
      expect(spec.lines.length).toBeLessThanOrEqual(3);
    }
    expect(titleCardSpec('X', 'acc-teal').accent).toBe('acc-teal');
    expect(wrapTitle('Spy x Family')).toEqual(['Spy x Family']);
    expect(wrapTitle('A very long title that keeps going and going and going on')).toHaveLength(3);
    expect(monogramOf('Spy x Family')).toBe('SXF');
  });
});
