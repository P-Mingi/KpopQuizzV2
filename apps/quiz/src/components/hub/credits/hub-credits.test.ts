// Daily games step 2: /credits of the hub. Every verified picture and live banner with its author, licence and source, a locked character
// without its name or picture, the empty page honest and noindex, one h1, the route of the hub only.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { LiveAsset, PublicPicture } from '@/lib/photos/public-read';

const reads = vi.hoisted(() => ({ pictures: [] as unknown[], assets: [] as unknown[] }));
vi.mock('@/lib/photos/public-read', () => ({ getPublicPictures: async () => reads.pictures, getLiveAssets: async () => reads.assets }));
vi.mock('@/lib/anime/entity-images-read', () => ({ getCreditNames: async () => ({ series: { 'one-piece': 'One Piece' }, character: { 'one-piece/luffy': 'Monkey D. Luffy' } }) }));

import { robotsFor } from '@/lib/site/indexing';

import { CREDITS_DESCRIPTION, HubCreditsPage, creditSections } from './hub-credits';

const pic = (kind: string, slug: string, name: string | null, over: Partial<PublicPicture> = {}): PublicPicture => ({
  site: kind === 'series' || kind === 'character' ? 'anime' : 'kpop', kind, slug, url: `https://s/${slug}.webp`, thumb: `https://s/${slug}-96.webp`, position: '50% 40%',
  name, sourceUrl: `https://commons.wikimedia.org/wiki/File:${slug}.jpg`, author: `Author ${slug}`, license: 'cc_by_sa', licenseNote: null, updatedAt: '2026-10-30T00:00:00Z', ...over,
});
const banner: LiveAsset = {
  key: 'banner:kpopdle', type: 'banner', page: 'kpopdle', settings: {}, large: 'https://s/b-1920.webp', mid: 'https://s/b-400.webp', thumb: 'https://s/b-96.webp',
  width: 1920, height: 600, sourceUrl: 'https://commons.wikimedia.org/wiki/File:B.jpg', author: 'Banner author', license: 'cc_by', licenseNote: null, publishedAt: '2026-10-30T00:00:00Z',
};

describe('the sections', () => {
  it('lists idols, groups, agencies, series, characters and the images of the site, each sorted, empty sections left out', () => {
    const s = creditSections(
      [pic('idol', '2', 'Zoe'), pic('idol', '1', 'Ana'), pic('series', 'one-piece', 'One Piece'), pic('character', 'one-piece/luffy', null), pic('character', 'one-piece/hidden', null)],
      [banner, { ...banner, key: 'icon:k-idol', type: 'icon', large: null }, { ...banner, key: 'banner:unknown' }],
      { 'one-piece/luffy': 'Monkey D. Luffy' }, { 'one-piece': 'One Piece' },
    );
    expect(s.map((x) => x.id)).toEqual(['idols', 'series', 'characters', 'images']);
    expect(s[0]!.items.map((i) => i.name)).toEqual(['Ana', 'Zoe']);
    expect(s[2]!.items).toEqual([
      expect.objectContaining({ name: 'A character of One Piece', thumb: null }),
      expect.objectContaining({ name: 'Monkey D. Luffy (One Piece)', thumb: 'https://s/one-piece/luffy-96.webp' }),
    ]);
    expect(s[3]!.items).toEqual([expect.objectContaining({ name: 'Kpopdle banner', author: 'Banner author' })]);
  });
});

describe('the page', () => {
  it('prints each credit with its author linked to the source and its licence linked to its text, one h1', () => {
    const html = renderToStaticMarkup(h(HubCreditsPage, { sections: creditSections([pic('idol', '1', 'Ana', { licenseNote: 'Cropped' })], [], {}, {}) }));
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('<h2 id="cr-idols" class="hub-credits-h2">Idols</h2>');
    expect(html).toContain('Photo: <a href="https://commons.wikimedia.org/wiki/File:1.jpg" rel="noopener noreferrer nofollow" target="_blank">Author 1</a>');
    expect(html).toContain('href="https://creativecommons.org/share-your-work/cclicenses/"');
    expect(html).toContain('>CC BY-SA<');
    expect(html).toContain('Cropped');
    expect(html).not.toMatch(/[–—]/);
  });

  it('says so when nothing is listed yet', () => {
    const html = renderToStaticMarkup(h(HubCreditsPage, { sections: [] }));
    expect(html).toContain('data-testid="credits-empty"');
    expect(html).toContain('No licensed photo is shown on Bunnyverse yet.');
  });

  it('is noindex while it lists nothing, and asks for indexing (closed until NET_INDEXING) once it lists a photo', async () => {
    const page = await import('@/app/sites/[site]/(hub)/credits/page');
    reads.pictures = [];
    reads.assets = [];
    const empty = await page.generateMetadata();
    expect((empty.robots as { index: boolean }).index).toBe(false);
    expect(empty.alternates).toEqual({ canonical: '/credits' });
    expect(empty.description).toBe(CREDITS_DESCRIPTION);
    expect(CREDITS_DESCRIPTION.length).toBeGreaterThanOrEqual(120);
    expect(CREDITS_DESCRIPTION.length).toBeLessThanOrEqual(160);
    reads.pictures = [pic('series', 'one-piece', 'One Piece')];
    // On a closed build (NET_INDEXING off) robotsFor closes every page anyway; open (kpop in tests), the listed page asks for index.
    expect((await page.generateMetadata()).robots).toEqual(robotsFor(true));
    const html = renderToStaticMarkup(await page.default());
    expect(html).toContain('One Piece');
  });
});
