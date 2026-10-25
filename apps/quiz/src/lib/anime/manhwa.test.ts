// Run O1, lot (manhwa): the "Manhwa" label comes from series.type = webtoon in the series data, on the three Korean webtoons
// and on no other series, and only a manhwa that has an anime says the anime adapts it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => { throw new Error('no network in a unit test'); } }));

import { buildSeriesSlots } from '@/components/anime/series-hub-slots';
import { ManhwaTag } from '@/components/anime/manhwa-tag';
import { SeriesFacts } from '@/components/anime/series-facts';
import { COPY as O2 } from '@/copy/anime/o2';

import { loadSeriesDirectory } from './directory';
import { MANHWA_TYPE, adaptationLine, hasAnime, isManhwaType, kindEyebrow, kindName, manhwaLabel } from './manhwa';
import { loadRelatedSeries } from './series';
import { FIXTURE_SLUGS, fakeDb, hubFromFixture } from './test-support';

import type { SeriesRow } from './types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const DATA = path.join(ROOT, 'docs/anime/data/series');

interface DataFile { readonly group: { readonly slug: string; readonly name: string }; readonly series: Record<string, unknown> }
const all: DataFile[] = fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')) as DataFile);
const row = (f: DataFile): SeriesRow => f.series as unknown as SeriesRow;
const bySlug = (slug: string): DataFile => all.find((f) => f.group.slug === slug)!;

const MANHWA = ['omniscient-readers-viewpoint', 'solo-leveling', 'tower-of-god'];
const WITH_ANIME = ['solo-leveling', 'tower-of-god'];
const SITE = { origin: 'https://otakuquiz.org', brand: 'OtakuQuiz' };

describe('the label is derived from series.type', () => {
  it('reads the data files of every series, the three webtoons among them', () => {
    expect(all.length).toBeGreaterThan(20);
    expect(MANHWA.every((slug) => bySlug(slug).series.type === MANHWA_TYPE)).toBe(true);
  });

  it('labels the three webtoons "Manhwa" and no other series', () => {
    const labelled = all.filter((f) => manhwaLabel(row(f).type) === 'Manhwa').map((f) => f.group.slug).sort();
    expect(labelled).toEqual(MANHWA);
    for (const f of all) expect(isManhwaType(row(f).type), f.group.slug).toBe(MANHWA.includes(f.group.slug));
    for (const type of ['manga', 'anime_manga', 'anime_original', 'franchise', '', null, undefined]) expect(manhwaLabel(type)).toBeNull();
  });

  it('says the anime adapts the manhwa on Solo Leveling and Tower of God only', () => {
    const lines = all.flatMap((f) => { const l = adaptationLine(row(f)); return l ? [[f.group.slug, l] as const] : []; });
    expect(lines.map(([slug]) => slug).sort()).toEqual(WITH_ANIME);
    expect(Object.fromEntries(lines)).toEqual({
      'solo-leveling': 'The anime adapts the manhwa (Korean webtoon) Solo Leveling.',
      'tower-of-god': 'The anime adapts the manhwa (Korean webtoon) Tower of God.',
    });
    expect(hasAnime(row(bySlug('omniscient-readers-viewpoint')))).toBe(false);
    expect(adaptationLine(row(bySlug('omniscient-readers-viewpoint')))).toBeNull();
  });

  it('keeps the words in the copy file, with no dash and no series word in them', () => {
    expect(O2['series.manhwa']).toBe('Manhwa');
    expect(O2['series.manhwaAdapts']).toContain('{title}');
    expect(`${O2['series.manhwa']}${O2['series.manhwaAdapts']}`).not.toMatch(/[–—]|\bseries\b|\p{Extended_Pictographic}/u);
  });

  it('puts the label in front of an eyebrow and after a name', () => {
    expect(kindEyebrow('webtoon', '3 fan-made quizzes')).toBe('Manhwa · 3 fan-made quizzes');
    expect(kindEyebrow('manga', '3 fan-made quizzes')).toBe('3 fan-made quizzes');
    expect(kindName('webtoon', 'Solo Leveling')).toBe('Solo Leveling (Manhwa)');
    expect(kindName(undefined, 'One Piece')).toBe('One Piece');
  });
});

describe('the series page', () => {
  const hubOf = (slug: (typeof FIXTURE_SLUGS)[number], file: DataFile) => {
    const hub = hubFromFixture(slug);
    // the columns a data file leaves out are null, as the loader writes them (not the fixture's)
    const blank = { anime_start_year: null, anime_end_year: null, seasons: null, episodes: null };
    return { ...hub, series: { ...hub.series, ...blank, ...(file.series as object) } as SeriesRow };
  };

  it('prints Manhwa in the eyebrow of the header of each webtoon, and nothing on the other series', () => {
    for (const f of all) {
      const hub = hubOf('death-note', f);
      const eyebrow = buildSeriesSlots(hub, [], SITE).eyebrow;
      expect(eyebrow.startsWith('Manhwa'), f.group.slug).toBe(MANHWA.includes(f.group.slug));
    }
    for (const slug of FIXTURE_SLUGS) expect(buildSeriesSlots(hubFromFixture(slug), [], SITE).eyebrow).not.toMatch(/Manhwa/);
  });

  it('prints the adaptation line under the header of Solo Leveling and Tower of God only', () => {
    const found = all.filter((f) => {
      const hub = hubOf('death-note', f);
      const out = renderToStaticMarkup(h('div', null, buildSeriesSlots(hub, [], SITE).heroFacts));
      return out.includes('data-testid="manhwa-adaptation"');
    }).map((f) => f.group.slug).sort();
    expect(found).toEqual(WITH_ANIME);
    const out = renderToStaticMarkup(h(SeriesFacts, { series: row(bySlug('tower-of-god')), sources: [], name: 'Tower of God' }));
    expect(out).toContain('The anime adapts the manhwa (Korean webtoon) Tower of God.');
    expect(renderToStaticMarkup(h(SeriesFacts, { series: row(bySlug('omniscient-readers-viewpoint')), sources: [], name: 'ORV' }))).not.toContain('adapts');
  });

  it('names a related manhwa with the label and leaves the other related series as they were', () => {
    const related = [
      { slug: 'solo-leveling', name: 'Solo Leveling', quizzes: 4, type: 'webtoon' as const },
      { slug: 'one-piece', name: 'One Piece', quizzes: 9, type: 'anime_manga' as const },
      { slug: 'bleach', name: 'Bleach', quizzes: 2 },
    ];
    expect(buildSeriesSlots(hubFromFixture('death-note'), related, SITE).related.map((r) => r.name))
      .toEqual(['Solo Leveling (Manhwa)', 'One Piece', 'Bleach']);
  });
});

describe('the cards and the list', () => {
  it('draws the chip for a webtoon and nothing for another type', () => {
    expect(renderToStaticMarkup(h(ManhwaTag, { type: 'webtoon' }))).toBe('<span class="anime-o2-kind" data-testid="manhwa-tag">Manhwa</span>');
    for (const type of ['manga', 'anime_manga', undefined, null]) expect(renderToStaticMarkup(h(ManhwaTag, { type }))).toBe('');
  });

  it('carries series.type from the directory read to every row, so the list labels the three webtoons only', async () => {
    const groups = all.map((f, i) => ({ id: i + 1, slug: f.group.slug, name: f.group.name }));
    const db = fakeDb({
      series: { data: all.map((f, i) => ({ group_id: i + 1, type: f.series.type })) },
      groups: { data: groups },
      quizzes: { data: groups.map((g) => ({ group_id: g.id })) },
    });
    const rows = await loadSeriesDirectory(db);
    const list = rows.filter((r) => manhwaLabel(r.seriesType) === 'Manhwa').map((r) => r.group.slug).sort();
    expect(list).toEqual(MANHWA);
    expect(rows).toHaveLength(all.length);
    const html = rows.map((r) => renderToStaticMarkup(h(ManhwaTag, { type: r.seriesType }))).join('');
    expect(html.match(/Manhwa/g)).toHaveLength(3);
  });

  it('carries series.type to the related series of a page', async () => {
    const db = fakeDb({
      series: { data: [{ group_id: 1, type: 'anime_manga' }, { group_id: 2, type: 'webtoon' }, { group_id: 3, type: 'manga' }] },
      groups: { data: [{ id: 2, slug: 'solo-leveling', name: 'Solo Leveling', quiz_count: 9 }, { id: 3, slug: 'berserk', name: 'Berserk', quiz_count: 5 }] },
    });
    const related = await loadRelatedSeries(db, 1);
    expect(related.map((r) => [r.slug, manhwaLabel(r.type)])).toEqual([['solo-leveling', 'Manhwa'], ['berserk', null]]);
  });
});
