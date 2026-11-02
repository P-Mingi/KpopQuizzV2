// CR-021: /credits of OtakuQuiz and of the hub exists only while an image in use needs a credit (CC BY, CC BY-SA); with none it is a 404 like
// any unknown URL, in the metadata and in the page. On OtakuQuiz it lists the owner's uploads that need a credit (and the bundled photos that do
// and that he has not replaced), never the others. The reads are stand-ins; no network.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reads = vi.hoisted(() => ({ site: 'anime' as string, owner: [] as unknown[], bundled: {} as Record<string, unknown> }));
vi.mock('@/lib/site/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return reads.site; } };
});
vi.mock('@/lib/anime/entity-images-read', () => ({ getOwnerCreditRows: async () => reads.owner, getCreditNames: async () => ({ series: {}, character: {} }) }));
vi.mock('@/lib/anime/series-images.generated', () => ({ SERIES_IMAGES: {}, get SERIES_IMAGE_CREDITS() { return reads.bundled; } }));
vi.mock('@/lib/photos/public-read', () => ({ getPublicPictures: async () => [], getLiveAssets: async () => [] }));
vi.mock('next/image', async () => {
  const { createElement } = await import('react');
  return { default: (p: Record<string, unknown>) => createElement('img', { src: p.src as string, alt: p.alt as string }) };
});

import * as page from './page';

const NOT_FOUND = /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/;
const owner = (slug: string, credited: boolean, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  kind: 'series', slug, name: slug, src: `https://s/${slug}.webp`, width: 736, height: 981, position: '50% 50%', sourceUrl: 'https://example.org/p', author: 'Jane Doe',
  license: credited ? 'CC BY' : 'CC0', licenseUrl: 'https://creativecommons.org/share-your-work/cclicenses/', note: null, retrieved: '2026-11-02', credited, href: `/${slug}-quiz`, locked: false, ...over,
});
const bundled = (name: string, required: boolean): Record<string, unknown> => ({
  name, file: `/series/${name}.webp`, alt: name, sourceUrl: 'https://commons.wikimedia.org/wiki/File:B.jpg', author: 'Bea', license: required ? 'CC BY 4.0' : 'CC0', licenseUrl: 'https://l', retrieved: '2026-10-20', attributionRequired: required,
});

beforeEach(() => { reads.site = 'anime'; reads.owner = []; reads.bundled = {}; });

describe('OtakuQuiz /credits', () => {
  it('is a 404 (metadata and page) while no image needs a credit: nothing, or only CC0 and bundled photos that ask for none', async () => {
    await expect(page.default()).rejects.toThrow(NOT_FOUND);
    await expect(page.generateMetadata()).rejects.toThrow(NOT_FOUND);
    reads.owner = [owner('naruto', false)];
    reads.bundled = { 'death-note': bundled('death-note', false) };
    await expect(page.default()).rejects.toThrow(NOT_FOUND);
    await expect(page.generateMetadata()).rejects.toThrow(NOT_FOUND);
  });

  it('lists the uploads that need a credit, with their link, and not the others', async () => {
    reads.owner = [owner('naruto', false, { name: 'Naruto' }), owner('bleach', true, { name: 'Bleach' })];
    const html = renderToStaticMarkup(await page.default());
    expect(html).toContain('Bleach');
    expect(html).not.toContain('Naruto');
    expect(html).toContain('href="https://example.org/p"');
    expect(html).not.toContain('Credit shown');
    expect((await page.generateMetadata()).alternates).toEqual({ canonical: '/credits' });
  });

  it('lists a bundled photo that needs a credit unless the owner replaced it', async () => {
    reads.bundled = { 'death-note': bundled('death-note', true), naruto: bundled('naruto', true) };
    reads.owner = [owner('naruto', false, { name: 'Naruto' })];
    const html = renderToStaticMarkup(await page.default());
    expect(html).toContain('data-slug="death-note"');
    expect(html).not.toContain('data-slug="naruto"');
    // Replaced by an upload that needs none: the bundled photo is no longer shown, so nothing is left to credit.
    reads.bundled = { naruto: bundled('naruto', true) };
    await expect(page.default()).rejects.toThrow(NOT_FOUND);
  });

  it('a build that is neither OtakuQuiz nor the hub has no page here', async () => {
    reads.site = 'kpop';
    await expect(page.default()).rejects.toThrow(NOT_FOUND);
  });
});

describe('the hub /credits', () => {
  it('is a 404 with nothing that needs a credit', async () => {
    reads.site = 'hub';
    await expect(page.default()).rejects.toThrow(NOT_FOUND);
    await expect(page.generateMetadata()).rejects.toThrow(NOT_FOUND);
  });
});
