// Run O1 (IMG): the free photos of the series. The generated map equals docs/anime/images, a listed file exists in public/series, an entry
// that lacks its source, author or licence is refused, a fallback and a missing entry show the title card, the credit line follows the
// licence, and /credits lists every photo. The photos below are two fixtures (a grey and a brown rectangle), not real data.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { dressQuizCard } from '@/components/anime/dress-quiz-card';
import { UxQuizCard } from '@/components/ux-v1/quiz-card';

import { buildSeriesImages, readImageRows, readSeriesNames, renderSeriesImages } from './series-images-data';
import { creditLine, LICENSE_PATTERN, licenseRequiresAttribution, seriesImageOf } from './series-images';

import type { UxQuizCardData } from '@/components/ux-v1/quiz-card';
import type { ImageRow } from './series-images-data';
import type { SeriesImage } from './series-images';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../../..');
const QUIZ = path.resolve(HERE, '../../..');
const REAL_DATA = path.join(ROOT, 'docs/anime/images');
const REAL_SERIES = path.join(ROOT, 'docs/anime/data/series');
const FIX = path.join(HERE, '__fixtures__/series-images');

const SITE_DIR = path.join(QUIZ, 'src/app/sites/[site]');

/**
 * The page files Next's App Router serves for /sites/<site>/<segment>, with the route-group layouts that wrap each: a group folder (x) adds
 * no segment, a static folder named `segment` wins over a [param] folder, which wins over a [...catch-all]. Paths relative to SITE_DIR.
 */
function pagesFor(segment: string): Array<{ page: string; layouts: string[] }> {
  type Candidate = { dir: string; name: string; layouts: string[] };
  const children = (dir: string, layouts: string[]): Candidate[] => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (/^\(.+\)$/.test(e.name)) return children(full, existsSync(path.join(full, 'layout.tsx')) ? [...layouts, path.join(full, 'layout.tsx')] : layouts);
    return [{ dir: full, name: e.name, layouts }];
  });
  const rank = (name: string): number => (name === segment ? 0 : /^\[\[?\.\.\./.test(name) ? 2 : /^\[[^\]]+\]$/.test(name) ? 1 : 9);
  const pages = children(SITE_DIR, []).filter((c) => existsSync(path.join(c.dir, 'page.tsx')) && rank(c.name) < 9);
  const best = Math.min(...pages.map((c) => rank(c.name)));
  return pages.filter((c) => rank(c.name) === best)
    .map((c) => ({ page: path.relative(SITE_DIR, path.join(c.dir, 'page.tsx')), layouts: c.layouts.map((l) => path.relative(SITE_DIR, l)) }));
}

const realExists = (p: string): boolean => existsSync(path.join(QUIZ, 'public', p));
const fixExists = (p: string): boolean => existsSync(path.join(FIX, 'public', p));
const fixtureRows = (): ImageRow[] => readImageRows(path.join(FIX, 'data'));
const fixtureBuilt = (): ReturnType<typeof buildSeriesImages> => buildSeriesImages(fixtureRows(), { fileExists: fixExists, names: { 'fixture-cc-by': 'Fixture One' } });

// /credits is one file for OtakuQuiz and the hub that chooses by SITE_ID: the resolution test below reads it as each build does, with the
// reads it makes answered here (no database). Every other test of this file keeps the real SITE_ID.
const credits = vi.hoisted(() => ({ site: null as string | null }));
vi.mock('@/lib/site/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return credits.site ?? real.SITE_ID; } };
});
vi.mock('@/lib/anime/entity-images-read', async (orig) => ({
  ...(await orig<typeof import('@/lib/anime/entity-images-read')>()),
  getOwnerCreditRows: async () => [],
  getCreditNames: async () => ({ series: {}, character: {} }),
}));
vi.mock('@/lib/photos/public-read', async (orig) => ({
  ...(await orig<typeof import('@/lib/photos/public-read')>()),
  getPublicPictures: async () => [],
  getLiveAssets: async () => [],
}));

// The components read the generated map; these tests give them the two fixtures in its place.
vi.mock('./series-images.generated', async () => {
  const data = await import('./series-images-data');
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__/series-images');
  const built = data.buildSeriesImages(data.readImageRows(path.join(dir, 'data')), { fileExists: (p) => existsSync(path.join(dir, 'public', p)), names: { 'fixture-cc-by': 'Fixture One' } });
  return { SERIES_IMAGES: built.images, SERIES_IMAGE_CREDITS: built.credits };
});

const html = (el: React.ReactElement): string => renderToStaticMarkup(el);
const row = (over: Record<string, unknown>, name = 'x-series.json'): ImageRow => ({
  name,
  json: { slug: 'x-series', file: '/series/x-series.webp', source_url: 'https://unsplash.com/photos/x', author: 'A. Person', license: 'Unsplash License', license_url: 'https://unsplash.com/license', attribution_required: false, retrieved: '2026-10-26', alt: 'A bowl on a table', why: 'It evokes a meal.', ...over },
});
const build = (rows: ImageRow[], fileExists: (p: string) => boolean = () => true): ReturnType<typeof buildSeriesImages> => buildSeriesImages(rows, { fileExists });

describe('the generated map', () => {
  it('equals what docs/anime/images builds, and every listed file is in public/series', async () => {
    const actual = await vi.importActual<typeof import('./series-images.generated')>('./series-images.generated');
    const built = buildSeriesImages(readImageRows(REAL_DATA), { fileExists: realExists, names: readSeriesNames(REAL_SERIES) });
    expect(actual.SERIES_IMAGES).toEqual(built.images);
    expect(actual.SERIES_IMAGE_CREDITS).toEqual(built.credits);
    const text = renderSeriesImages(built);
    expect(text).toContain('GENERATED by scripts/gen-series-images.mts');
    for (const [slug, e] of Object.entries(built.images)) {
      if (e.file) expect(realExists(e.file), `${slug}: ${e.file}`).toBe(true);
    }
  });

  it('lists a source, an author, a licence, its page and a date for every photo of the data', () => {
    const { credits } = buildSeriesImages(readImageRows(REAL_DATA), { fileExists: realExists, names: readSeriesNames(REAL_SERIES) });
    for (const [slug, c] of Object.entries(credits)) {
      expect(c.sourceUrl, slug).toMatch(/^https:\/\//);
      expect(c.author, slug).not.toBe('');
      expect(c.license, slug).toMatch(LICENSE_PATTERN);
      expect(c.licenseUrl, slug).toMatch(/^https:\/\//);
      expect(c.retrieved, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('is rendered the same way twice, keys sorted, from the two fixtures', () => {
    const a = renderSeriesImages(fixtureBuilt());
    expect(a).toBe(renderSeriesImages(fixtureBuilt()));
    expect(a.indexOf('"fixture-cc-by"')).toBeLessThan(a.indexOf('"fixture-unsplash"'));
    expect(a).toContain('attribution: { author: "Fixture Author", license: "CC BY 4.0"');
    expect(a).toMatch(/"fixture-unsplash": \{ file: "\/series\/fixture-unsplash.webp", alt: "[^"]+", attribution: null, fallback: null \}/);
  });
});

describe('the generator refuses an incomplete entry', () => {
  it('accepts a complete one', () => {
    expect(build([row({})]).images['x-series']).toEqual({ file: '/series/x-series.webp', alt: 'A bowl on a table', attribution: null, fallback: null });
  });

  for (const field of ['source_url', 'author', 'license', 'license_url', 'retrieved']) {
    it(`refuses an entry with no ${field}`, () => {
      expect(() => build([row({ [field]: undefined })])).toThrow(new RegExp(`${field}`));
      expect(() => build([row({ [field]: '  ' })])).toThrow(new RegExp(`${field}`));
    });
  }

  it('refuses a listed file that is not in public/series', () => {
    expect(() => build([row({})], () => false)).toThrow(/\/series\/x-series\.webp is not in public\/series/);
    expect(() => buildSeriesImages(fixtureRows(), { fileExists: () => false })).toThrow(/is not in public\/series/);
  });

  it('refuses a file that is not /series/<slug>.webp, a slug that is not the file name, and a slug listed twice', () => {
    expect(() => build([row({ file: '/series/other.webp' })])).toThrow(/file must be/);
    expect(() => build([row({ slug: 'y-series' })])).toThrow(/does not match the file name/);
    expect(() => build([row({}), row({}, 'x-series.json')])).toThrow(/listed twice/);
  });

  it('refuses a licence that is not allowed, a bad date, a non https link, a missing alt or why', () => {
    expect(() => build([row({ license: 'All rights reserved' })])).toThrow(/not an allowed licence/);
    expect(() => build([row({ license: 'CC BY-NC 4.0' })])).toThrow(/not an allowed licence/);
    expect(() => build([row({ retrieved: '26/10/2026' })])).toThrow(/YYYY-MM-DD/);
    expect(() => build([row({ source_url: 'http://example.org/x' })])).toThrow(/source_url is not an https URL/);
    expect(() => build([row({ license_url: 'javascript:alert(1)' })])).toThrow(/license_url is not an https URL/);
    expect(() => build([row({ alt: '' })])).toThrow(/alt is missing/);
    expect(() => build([row({ why: undefined })])).toThrow(/why is missing/);
  });

  it('refuses an en dash, an em dash or an emoji in a printed field', () => {
    expect(() => build([row({ alt: 'A bowl \u2014 on a table' })])).toThrow(/dash or an emoji/);
    expect(() => build([row({ author: 'A. Person \u2013 Photo' })])).toThrow(/dash or an emoji/);
    expect(() => build([row({ alt: 'A bowl \u{1F35C}' })])).toThrow(/dash or an emoji/);
  });

  it('reports every problem at once', () => {
    expect(() => build([row({ author: '', license_url: '' })])).toThrow(/author is missing[\s\S]*license_url is missing/);
  });

  it('accepts a title card fallback with a reason, and nothing else', () => {
    const fb = { slug: 'x-series', fallback: 'title-card', why: 'Nothing fits without showing the work.' };
    const built = build([{ name: 'x-series.json', json: fb }]);
    expect(built.images['x-series']).toEqual({ file: null, alt: null, attribution: null, fallback: 'title-card' });
    expect(built.credits['x-series']).toBeUndefined();
    expect(() => build([{ name: 'x-series.json', json: { ...fb, file: '/series/x-series.webp' } }])).toThrow(/title-card fallback has no file/);
    expect(() => build([{ name: 'x-series.json', json: { ...fb, fallback: 'poster' } }])).toThrow(/fallback must be/);
    expect(() => build([{ name: 'x-series.json', json: { slug: 'x-series', fallback: 'title-card' } }])).toThrow(/why is missing/);
  });
});

describe('the credit rule by licence', () => {
  const CASES: ReadonlyArray<[string, boolean]> = [
    ['Unsplash License', false], ['Pexels License', false], ['CC0', false], ['CC0 1.0', false], ['Public domain', false],
    ['CC BY 4.0', true], ['CC BY 3.0', true], ['CC BY-SA 4.0', true], ['CC BY-SA 3.0', true],
  ];
  for (const [license, required] of CASES) {
    it(`${license}: credit line ${required ? 'required' : 'not required'}`, () => {
      expect(LICENSE_PATTERN.test(license)).toBe(true);
      expect(licenseRequiresAttribution(license)).toBe(required);
      const flagged = build([row({ license, attribution_required: required })]);
      expect(flagged.images['x-series']!.attribution !== null).toBe(required);
      expect(flagged.credits['x-series']!.attributionRequired).toBe(required);
      // The flag of the data must agree with the licence, in both directions.
      expect(() => build([row({ license, attribution_required: !required })])).toThrow(/attribution_required must be/);
    });
  }

  it('prints "Photo: <author>, <licence>"', () => {
    expect(creditLine({ author: 'Fixture Author', license: 'CC BY 4.0' })).toBe('Photo: Fixture Author, CC BY 4.0');
  });
});

describe('the photo or the title card', () => {
  const MAP: Readonly<Record<string, SeriesImage>> = {
    'with-photo': { file: '/series/with-photo.webp', alt: 'A bowl', attribution: null, fallback: null },
    'plain-card': { file: null, alt: null, attribution: null, fallback: 'title-card' },
  };

  it('seriesImageOf gives a photo only for an entry that has one', () => {
    expect(seriesImageOf('with-photo', MAP)).toEqual({ file: '/series/with-photo.webp', alt: 'A bowl', attribution: null });
    expect(seriesImageOf('plain-card', MAP)).toBeNull();
    expect(seriesImageOf('no-entry', MAP)).toBeNull();
    expect(seriesImageOf('constructor', MAP)).toBeNull();
    expect(seriesImageOf(null, MAP)).toBeNull();
    expect(seriesImageOf('', MAP)).toBeNull();
  });

  it('SeriesArt shows the photo of an entry, in each size, with the alt of the entry and nothing written over it', async () => {
    const { SeriesArt } = await import('@/components/anime/series-art');
    for (const size of ['avatar', 'card', 'hub'] as const) {
      const out = html(h(SeriesArt, { slug: 'fixture-cc-by', title: 'Fixture One', size }));
      expect(out).toContain('<img');
      expect(out).toContain('alt="A flat grey rectangle used by the tests"');
      expect(out).toContain('anime-o2-photo');
      expect(out).toContain(`anime-o2-art-${size}`);
      expect(out).toContain(encodeURIComponent('/series/fixture-cc-by.webp'));
      expect(out).toContain('sizes=');
      expect(out).not.toMatch(/<svg|<text|<tspan|Fixture One/);
    }
    expect(html(h(SeriesArt, { slug: 'fixture-cc-by', title: 'Fixture One', size: 'hub' }))).toContain('(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 50vw, 520px');
  });

  it('SeriesArt keeps the generated title card for a series with no entry', async () => {
    const { SeriesArt } = await import('@/components/anime/series-art');
    for (const size of ['avatar', 'card', 'hub'] as const) {
      const out = html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size }));
      expect(out).toContain('<svg');
      expect(out).toContain('data-art=');
      expect(out).not.toContain('<img');
    }
    expect(html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size: 'card' }))).toContain('Death Note');
  });

  it('a fallback entry gives the same title card as no entry', async () => {
    const data = await import('./series-images-data');
    const built = data.buildSeriesImages([{ name: 'death-note.json', json: { slug: 'death-note', fallback: 'title-card', why: 'No photo fits.' } }], { fileExists: () => true });
    expect(seriesImageOf('death-note', built.images)).toBeNull();
  });

  it('a quiz card of a series with a photo shows it in the cover strip and the square', () => {
    const card: UxQuizCardData = { slug: 'fixture-one-basics', title: 'Fixture One Basics', group_name: 'Fixture One', group_slug: 'fixture-cc-by', quiz_type: 'multiple_choice', difficulty: 'easy', play_count: 20, cover_image_url: null };
    const out = html(dressQuizCard(UxQuizCard({ quiz: card }), card));
    expect(out.match(/<img/g)?.length).toBe(2);
    expect(out).toContain('anime-o2-art-strip');
    expect(out).toContain('Fixture One Basics');
    const other = html(dressQuizCard(UxQuizCard({ quiz: { ...card, group_slug: 'death-note', group_name: 'Death Note' } }), { ...card, group_slug: 'death-note', group_name: 'Death Note' }));
    expect(other).not.toContain('<img');
    expect(other).toContain('<svg');
  });
});

describe('the credit line on the series page', () => {
  it('prints "Photo: <author>, <licence>", linked to the source and the licence, for a CC BY photo', async () => {
    const { PhotoCredit } = await import('@/components/anime/photo-credit');
    const out = html(h(PhotoCredit, { slug: 'fixture-cc-by' }));
    expect(out.replace(/<[^>]+>/g, '')).toBe('Photo: Fixture Author, CC BY 4.0');
    expect(out).toContain('href="https://commons.wikimedia.org/wiki/File:Fixture_one.jpg"');
    expect(out).toContain('href="https://creativecommons.org/licenses/by/4.0/"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('prints nothing for an Unsplash photo, a series without a photo, or a fallback', async () => {
    const { PhotoCredit } = await import('@/components/anime/photo-credit');
    expect(html(h(PhotoCredit, { slug: 'fixture-unsplash' }))).toBe('');
    expect(html(h(PhotoCredit, { slug: 'death-note' }))).toBe('');
    expect(html(h(PhotoCredit, { slug: 'x', map: { x: { file: null, alt: null, attribution: null, fallback: 'title-card' } } }))).toBe('');
  });

  it('is in the header slots of the general mix hub, as for a series, and only when the licence asks for it', async () => {
    const { buildMixSlots } = await import('@/components/anime/series-hub-slots');
    const site = { origin: 'https://bunnyverse.org/anime', brand: 'OtakuQuiz' };
    const group = (slug: string): never => ({ slug, name: 'Fixture', quiz_count: 3 }) as never;
    const withCredit = buildMixSlots(group('fixture-cc-by'), site);
    expect(html(h('div', null, withCredit.heroFacts as React.ReactNode))).toContain('Photo: <a');
    expect(buildMixSlots(group('fixture-unsplash'), site).heroFacts).toBeUndefined();
    expect(buildMixSlots(group('anime-mix'), site).heroFacts).toBeUndefined();
  });
});

describe('/credits', () => {
  it('lists every photo with its source, author, licence, date and series, the CC BY one marked', async () => {
    const { CreditsPage } = await import('@/components/anime/credits-page');
    const out = html(h(CreditsPage, {}));
    expect(out.match(/anime-o2-credits-item/g)?.length).toBe(2);
    expect(out).toContain('data-slug="fixture-cc-by"');
    expect(out).toContain('data-slug="fixture-unsplash"');
    expect(out).toContain('Fixture One');
    expect(out).toContain('href="/fixture-cc-by-quiz"');
    for (const needle of [
      'https://commons.wikimedia.org/wiki/File:Fixture_one.jpg', 'Fixture Author', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/',
      'https://unsplash.com/photos/fixture-two', 'Fixture Photographer', 'Unsplash License', 'https://unsplash.com/license', 'dateTime="2026-10-26"',
    ]) expect(out, needle).toContain(needle);
    expect(out.match(/Credit shown on the series page/g)?.length).toBe(1);
    expect(out.match(/<h1/g)?.length).toBe(1);
    expect(out).not.toMatch(/[\u2013\u2014]|\p{Extended_Pictographic}/u);
  });

  it('says so when no series has a photo yet', async () => {
    const { CreditsPage } = await import('@/components/anime/credits-page');
    const out = html(h(CreditsPage, { credits: {} }));
    expect(out).toContain('data-testid="credits-empty"');
    expect(out).not.toContain('credits-list');
  });

  it('is answered on the anime build by the page file Next resolves for it, OtakuQuiz\'s credits; on the hub by the hub\'s; on kpop by none', async () => {
    // The allowlist below says which site knows the path; this says which FILE Next serves for it. The App Router sorts a static
    // folder above a [param] folder above a [...catch-all], and a route group (x) adds no segment but its layout wraps the page. A
    // static (hub)/credits beside (anime)/[slug] was resolved for /credits on the anime build, and its (hub) layout answered 404.
    const files = pagesFor('credits');
    expect(files).toEqual([{ page: 'credits/page.tsx', layouts: [] }]);
    const page = await import('@/app/sites/[site]/credits/page');
    const { robotsFor } = await import('@/lib/site/indexing');
    const anime = await import('@/components/anime/credits-page');
    const hub = await import('@/components/hub/credits/hub-credits');
    try {
      for (const site of ['anime', 'hub']) {
        credits.site = site;
        // Each route-group layout between [site] and the page renders on this build (no 404).
        for (const l of files[0]!.layouts) {
          const layout = (await import(path.join(SITE_DIR, l))) as { default: (p: { children: unknown }) => unknown };
          expect(() => layout.default({ children: null }), `${site} ${l}`).not.toThrow();
        }
        const out = html(await page.default());
        const meta = await page.generateMetadata();
        if (site === 'anime') {
          expect(out).toContain('anime-o2-credits');
          expect(out).toContain('data-slug="fixture-cc-by"');
          expect(meta).toEqual({ title: anime.CREDITS_TITLE, description: anime.CREDITS_DESCRIPTION, robots: robotsFor(true), alternates: { canonical: '/credits' } });
        } else {
          expect(out).toContain('hub-credits');
          expect(out).not.toContain('anime-o2-credits');
          expect(meta).toMatchObject({ title: hub.CREDITS_TITLE, description: hub.CREDITS_DESCRIPTION, robots: robotsFor(false), alternates: { canonical: '/credits' } });
        }
      }
      credits.site = 'kpop';
      await expect(page.default()).rejects.toThrow('404');
      await expect(page.generateMetadata()).rejects.toThrow('404');
    } finally {
      credits.site = null;
    }
    // The anime [slug] page no longer serves or prerenders credits (two files claimed /sites/anime/credits at build).
    expect(readFileSync(path.join(SITE_DIR, '(anime)/[slug]/page.tsx'), 'utf8')).not.toMatch(/credits-page|CREDITS_/);
  });

  it('is a route of the anime site, linked from its footer, and of no other site', async () => {
    const { isKnownRouteFor } = await import('@/lib/site/routing');
    const flags = { v1: true, v12: true } as const;
    expect(isKnownRouteFor('anime', '/credits', flags)).toBe(true);
    // Daily games step 2: the hub has its own /credits now (twins row H-11, its own page and data, the footer of the hub already linked
    // it); the anime page stays the anime build's. kpopquiz.org still has none.
    expect(isKnownRouteFor('hub', '/credits', flags)).toBe(true);
    expect(isKnownRouteFor('kpop', '/credits', flags)).toBe(false);
  });
});
