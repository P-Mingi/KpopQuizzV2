// Daily games step 2: /credits of the hub. Every verified picture and live banner with its author, licence and source, a locked character
// without its name or picture, the empty page honest and noindex, one h1, the route of the hub only.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { LiveAsset, PublicPicture } from '@/lib/photos/public-read';

const reads = vi.hoisted(() => ({ pictures: [] as unknown[], assets: [] as unknown[], site: null as string | null }));
vi.mock('@/lib/photos/public-read', () => ({ getPublicPictures: async () => reads.pictures, getLiveAssets: async () => reads.assets }));
// The /credits file serves OtakuQuiz and the hub and chooses by SITE_ID: these tests read it as the hub build does.
vi.mock('@/lib/site/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return reads.site ?? real.SITE_ID; } };
});
vi.mock('@/lib/anime/entity-images-read', () => ({ getCreditNames: async () => ({ series: { 'one-piece': 'One Piece' }, character: { 'one-piece/luffy': 'Monkey D. Luffy' } }) }));

import { robotsFor } from '@/lib/site/indexing';

import { CREDITS_DESCRIPTION, HubCreditsPage, creditSections, namesCharacter } from './hub-credits';

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

describe('a character under a spoiler', () => {
  /** Every React key of an element tree (the keys travel in the RSC payload of a server component, so they are page data too). */
  const keysOf = (node: unknown): string[] => {
    if (Array.isArray(node)) return node.flatMap(keysOf);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const el = node as { key: string | null; props: { children?: unknown } };
    return [...(el.key === null ? [] : [String(el.key)]), ...keysOf(el.props.children)];
  };

  it('is listed with its credit, never its slug, picture or name: no data-key, keyed by position', () => {
    const hidden = pic('character', 'one-piece/nico-robin', null, { sourceUrl: 'https://example.org/gallery/4471', licenseNote: 'Cropped', author: 'Jane Doe' });
    const s = creditSections([hidden], [], {}, { 'one-piece': 'One Piece' });
    expect(s[0]!.items[0]).toMatchObject({ key: null, name: 'A character of One Piece', thumb: null, author: 'Jane Doe', license: 'cc_by_sa', sourceUrl: 'https://example.org/gallery/4471', note: 'Cropped' });
    const page = HubCreditsPage({ sections: s });
    const html = renderToStaticMarkup(page);
    expect(html).not.toMatch(/nico|robin|data-key/i);
    expect(keysOf(page).join(' ')).not.toMatch(/nico|robin/i);
    expect(html).toContain('A character of One Piece');
    expect(html).toContain('<a href="https://example.org/gallery/4471" rel="noopener noreferrer nofollow" target="_blank">Jane Doe</a>');
    expect(html).toContain('>CC BY-SA<');
  });

  it('keeps the author and the licence but drops the source link and the note when they name the character', () => {
    const named = pic('character', 'one-piece/nico-robin', null, { sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nico_Robin_cosplay.jpg', licenseNote: 'Robin at a convention', author: 'Jane Doe' });
    const s = creditSections([named], [], {}, { 'one-piece': 'One Piece' });
    expect(s[0]!.items[0]).toMatchObject({ key: null, sourceUrl: null, note: null, author: 'Jane Doe', license: 'cc_by_sa' });
    const html = renderToStaticMarkup(HubCreditsPage({ sections: s }));
    expect(html).not.toMatch(/nico|robin|Source page/i);
    expect(html).toContain('Photo: Jane Doe, <a href="https://creativecommons.org/share-your-work/cclicenses/"');
    // An unlocked character keeps its key and its link.
    const open = creditSections([pic('character', 'one-piece/luffy', null)], [], { 'one-piece/luffy': 'Monkey D. Luffy' }, {})[0]!.items[0]!;
    expect(open).toMatchObject({ key: 'character:one-piece/luffy', sourceUrl: 'https://commons.wikimedia.org/wiki/File:one-piece/luffy.jpg' });
  });

  it('knows when an address or a note names the character (the whole slug or a word of it, any case, separators or escapes)', () => {
    expect(namesCharacter('https://commons.wikimedia.org/wiki/File:Monkey_D._Luffy.jpg', 'one-piece/monkey-d-luffy')).toBe(true);
    expect(namesCharacter('https://x.org/LUFFY%20photo', 'one-piece/monkey-d-luffy')).toBe(true);
    expect(namesCharacter('https://x.org/p/4471', 'one-piece/monkey-d-luffy')).toBe(false);
    expect(namesCharacter('https://x.org/d/', 'one-piece/monkey-d-luffy')).toBe(false);
    expect(namesCharacter(null, 'one-piece/monkey-d-luffy')).toBe(false);
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
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });

  it('says so when nothing is listed yet', () => {
    const html = renderToStaticMarkup(h(HubCreditsPage, { sections: [] }));
    expect(html).toContain('data-testid="credits-empty"');
    expect(html).toContain('No licensed photo is shown on Bunnyverse yet.');
  });

  it('is noindex while it lists nothing, and asks for indexing (closed until NET_INDEXING) once it lists a photo', async () => {
    const page = await import('@/app/sites/[site]/credits/page');
    reads.site = 'hub';
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
    expect(html).toContain('class="ux-page ux-col ux-pg hub-credits"');
    reads.site = null;
  });
});
