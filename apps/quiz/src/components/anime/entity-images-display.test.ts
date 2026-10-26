// Run O1 (ADM front): where the owner's images are drawn. The order is the owner's image, then the bundled photo, then the neutral
// placeholder (the title card); the focal point is the object-position; CC BY and CC BY-SA print a credit line under the image and the
// other licences do not; /credits lists every image; a locked character never gets a portrait or a name.
import { createElement as h } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ownerSeriesPicture, setOwnerSeriesPictures } from '@/lib/anime/entity-images-store';
import { characterImageSlug, ownerCreditRows, ownerPictureOf } from '@/lib/anime/entity-images-rules';
import { seriesPhotoOf } from '@/lib/anime/series-images';
import { splitCharacters, withPortraits } from '@/lib/anime/series-model';
import { hubFromFixture } from '@/lib/anime/test-support';

import { CharacterTiles } from './character-tiles';
import { CreditsPage } from './credits-page';
import { PhotoCredit } from './photo-credit';
import { OwnerPictures } from './owner-pictures';
import { PortraitCredits, portraitCreditItems } from './portrait-credits';
import { PHOTO_SIZES, SeriesArt } from './series-art';

import type { EntityImage } from '@/lib/anime/entity-images-rules';

const BASE = 'https://proj.supabase.co';
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE);

const html = (el: React.ReactElement): string => renderToStaticMarkup(el);
const row = (over: Partial<EntityImage> = {}): EntityImage => ({
  kind: 'series', slug: 'death-note', path: 'series/death-note.webp', width: 736, height: 981, focal_x: 40, focal_y: 25,
  source_url: 'https://commons.wikimedia.org/wiki/File:X.jpg', author: 'A. Author', license: 'cc_by', license_note: null, updated_at: '2026-10-26T10:00:00.000Z', ...over,
});

afterEach(() => { setOwnerSeriesPictures({}); });

describe('a series: the owner image, then the bundled photo, then the placeholder', () => {
  it('draws the owner image with its focal point and the series name as its alt', () => {
    setOwnerSeriesPictures({ 'death-note': ownerPictureOf(row(), BASE) });
    const out = html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size: 'hub' }));
    expect(out).toContain('anime-o2-photo');
    expect(out).toContain(`src="${BASE}/storage/v1/object/public/entity-images/series/death-note.webp?v=`);
    expect(out).toContain('object-position:40% 25%');
    expect(out).toContain('alt="Death Note"');
    expect(out).not.toContain('<svg');
  });

  it('offers the 2x file as a srcset by width, so a sharp screen gets the large one and a small box the small one', () => {
    setOwnerSeriesPictures({ 'death-note': ownerPictureOf(row(), BASE) });
    for (const size of ['avatar', 'card', 'hub'] as const) {
      const out = html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size }));
      expect(out, size).toContain('736w');
      expect(out, size).toContain('entity-images/series/death-note-2x.webp?v=');
      expect(out, size).toContain('1472w');
      expect(out, size).toContain(`sizes="${PHOTO_SIZES[size]}"`);
      expect(out, size).toContain('width="736"');
      expect(out, size).toContain('height="981"');
    }
  });

  it('draws the hub header image eagerly and the others lazily', () => {
    setOwnerSeriesPictures({ 'death-note': ownerPictureOf(row(), BASE) });
    expect(html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size: 'hub' }))).toContain('loading="eager"');
    expect(html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size: 'card' }))).toContain('loading="lazy"');
  });

  it('sends no srcset for an image that has no 2x file to name, and still draws it', () => {
    setOwnerSeriesPictures({ 'death-note': ownerPictureOf(row({ path: 'https://cdn.example/x.png' }), BASE) });
    const out = html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size: 'card' }));
    expect(out).toContain('src="https://cdn.example/x.png?v=');
    expect(out).not.toContain('srcSet');
    expect(out).not.toContain('srcset');
  });

  it('draws the owner image in each size and for a series that has no bundled photo', () => {
    setOwnerSeriesPictures({ 'zzz-new': ownerPictureOf(row({ slug: 'zzz-new', focal_x: 10, focal_y: 90 }), BASE) });
    for (const size of ['avatar', 'card', 'hub'] as const) {
      const out = html(h(SeriesArt, { slug: 'zzz-new', title: 'Zzz New', size }));
      expect(out, size).toContain('object-position:10% 90%');
      expect(out, size).not.toContain('<svg');
    }
  });

  it('draws the bundled photo when the owner has set none, and the title card when there is no photo either', () => {
    const bundled = html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size: 'hub' }));
    expect(bundled).toContain('anime-o2-photo');
    expect(bundled).not.toContain('object-position');
    expect(bundled).toContain(encodeURIComponent('/series/death-note.webp'));
    const card = html(h(SeriesArt, { slug: 'zzz-unknown', title: 'Zzz Unknown', size: 'hub' }));
    expect(card).toContain('<svg');
    expect(card).not.toContain('<img');
  });

  it('puts the owner image back behind the bundled photo once it is removed', () => {
    setOwnerSeriesPictures({ 'death-note': ownerPictureOf(row(), BASE) });
    expect(seriesPhotoOf('death-note', 'Death Note')?.owner?.position).toBe('40% 25%');
    setOwnerSeriesPictures({});
    expect(seriesPhotoOf('death-note', 'Death Note')).toMatchObject({ file: '/series/death-note.webp' });
    expect(seriesPhotoOf('death-note', 'Death Note')?.owner).toBeUndefined();
    expect(seriesPhotoOf('zzz-unknown', 'x')).toBeNull();
    expect(seriesPhotoOf(null)).toBeNull();
  });
});

describe('the attribution line', () => {
  it('is printed under a CC BY or CC BY-SA image of the owner, with the author and the licence linked', () => {
    for (const [license, label] of [['cc_by', 'CC BY'], ['cc_by_sa', 'CC BY-SA']] as const) {
      setOwnerSeriesPictures({ 'death-note': ownerPictureOf(row({ license }), BASE) });
      const out = html(h(PhotoCredit, { slug: 'death-note' }));
      expect(out).toContain('data-testid="photo-credit"');
      expect(out).toContain('href="https://commons.wikimedia.org/wiki/File:X.jpg"');
      expect(out).toContain('>A. Author</a>');
      expect(out).toContain(`>${label}</a>`);
    }
  });

  it('is not printed for the other licences (those images are listed on /credits)', () => {
    for (const license of ['cc0', 'public_domain', 'own_photo', 'licensed', 'other'] as const) {
      setOwnerSeriesPictures({ 'death-note': ownerPictureOf(row({ license }), BASE) });
      expect(html(h(PhotoCredit, { slug: 'death-note' })), license).toBe('');
    }
  });

  it('is the one of the owner image, not the one of the bundled photo it covers', () => {
    setOwnerSeriesPictures({ 'death-note': ownerPictureOf(row({ license: 'cc0' }), BASE) });
    expect(html(h(PhotoCredit, { slug: 'death-note', map: { 'death-note': { file: '/series/death-note.webp', alt: 'x', fallback: null, attribution: { author: 'Old', license: 'CC BY 2.0', licenseUrl: 'https://l', sourceUrl: 'https://s' } } } }))).toBe('');
  });
});

describe('the characters row', () => {
  const hub = hubFromFixture('death-note');
  const split = splitCharacters(hub.characters, hub.oshiCounts);
  const first = split.open[0]!;
  const render = (open: typeof split.open) => renderToString(h(CharacterTiles, { seriesSlug: hub.group.slug, groupId: hub.group.id, name: hub.group.name, open, lockedCount: split.lockedCount }));

  it('lays a portrait over the monogram of a character that has one, with its focal point', () => {
    const pics = { [first.slug]: ownerPictureOf(row({ kind: 'character', slug: characterImageSlug('death-note', first.slug), focal_x: 30, focal_y: 15 }), BASE) };
    const out = render(withPortraits(split.open, pics));
    expect(out.split('data-testid="character-portrait"')).toHaveLength(2);
    expect(out).toContain('object-position:30% 15%');
    expect(out).toContain('anime-adm-portrait-img');
    expect(out).toContain(first.name);
  });

  it('prints the credit line of a CC BY portrait and none for a CC0 one', () => {
    const by = render(withPortraits(split.open, { [first.slug]: ownerPictureOf(row({ kind: 'character', slug: 'x/y', license: 'cc_by' }), BASE) }));
    expect(by).toContain('data-testid="portrait-credit"');
    expect(by).toContain('A. Author');
    expect(by).toContain('CC BY</a>');
    const zero = render(withPortraits(split.open, { [first.slug]: ownerPictureOf(row({ kind: 'character', slug: 'x/y', license: 'cc0' }), BASE) }));
    expect(zero).not.toContain('portrait-credit');
    expect(zero).toContain('character-portrait');
  });

  it('shows the monogram only, as before, for a character without a portrait', () => {
    const out = render(withPortraits(split.open, {}));
    expect(out).not.toContain('<img');
    expect(out).not.toContain('character-portrait');
  });

  it('leaves a tile as it is when the portraits are about other characters', () => {
    expect(withPortraits(split.open, { 'nobody': ownerPictureOf(row({ kind: 'character', slug: 'a/nobody' }), BASE) })).toEqual(split.open);
  });

  it('never gives a locked character a portrait or a name: only the open tiles are looked up', () => {
    const lockedSlugs = hub.characters.filter((c) => c.spoiler_level > 0).map((c) => c.slug);
    expect(lockedSlugs.length).toBeGreaterThan(0);
    const pics = Object.fromEntries(lockedSlugs.map((s) => [s, ownerPictureOf(row({ kind: 'character', slug: `death-note/${s}` }), BASE)]));
    const tiles = withPortraits(split.open, pics);
    expect(tiles).toEqual(split.open);
    const out = render(tiles);
    for (const c of hub.characters.filter((x) => x.spoiler_level > 0)) expect(out).not.toContain(c.name);
    expect(out).not.toContain('character-portrait');
  });
});

describe('the island that carries the pictures to the client graph', () => {
  it('sets the store before the nodes after it render, and draws nothing itself', () => {
    expect(ownerSeriesPicture('death-note')).toBeNull();
    expect(renderToStaticMarkup(h(OwnerPictures, { owner: { 'death-note': ownerPictureOf(row(), BASE) } }))).toBe('');
    expect(ownerSeriesPicture('death-note')?.position).toBe('40% 25%');
  });
});

describe('the credit lines of the portraits of a result page', () => {
  it('picks the results whose portrait asks for a credit', () => {
    const pics = { ryuk: ownerPictureOf(row({ license: 'cc_by' }), BASE), l: ownerPictureOf(row({ license: 'cc0' }), BASE) };
    expect(portraitCreditItems([{ id: 'ryuk', name: 'Ryuk' }, { id: 'l', name: 'L' }, { id: 'x', name: 'X' }], pics).map((i) => i.name)).toEqual(['Ryuk']);
    expect(portraitCreditItems(undefined, pics)).toEqual([]);
    expect(portraitCreditItems([{ id: 'constructor', name: 'C' }], pics)).toEqual([]);
  });

  it('lists the portraits that ask for a credit, and nothing else', () => {
    const credit = ownerPictureOf(row({ license: 'cc_by_sa' }), BASE).credit!;
    const out = html(h(PortraitCredits, { items: [{ name: 'Light Yagami', credit }] }));
    expect(out).toContain('Light Yagami');
    expect(out).toContain('CC BY-SA');
    expect(html(h(PortraitCredits, { items: [] }))).toBe('');
  });
});

describe('/credits lists every image', () => {
  const rows = ownerCreditRows([
    row(),
    row({ slug: 'bleach', license: 'cc0', author: 'Bo' }),
    row({ kind: 'character', slug: 'death-note/light', license: 'own_photo', author: 'Me' }),
    row({ kind: 'character', slug: 'death-note/ryuk', license: 'other', license_note: 'By email', author: 'Cy' }),
  ], { series: { 'death-note': 'Death Note', bleach: 'Bleach' }, character: { 'death-note/light': 'Light Yagami' } }, BASE);
  const out = html(h(CreditsPage, { credits: {}, owner: rows }));

  it('prints the source, the author and the licence of each, whatever the licence', () => {
    expect(out).toContain('data-testid="credits-owner-list"');
    expect(out.split('data-kind=').length - 1).toBe(4);
    for (const s of ['A. Author', 'Bo', 'Me', 'Cy', 'CC BY', 'CC0', 'My photo', 'By email', 'Source page']) expect(out, s).toContain(s);
    expect(out).toContain('href="/bleach-quiz"');
    expect(out).toContain('Light Yagami (Death Note)');
  });

  it('lists a locked character without its name or its picture', () => {
    expect(out).toContain('A character of Death Note');
    expect(out).not.toMatch(/ryuk/i);
    expect(out.split('<img').length - 1).toBe(3);
  });

  it('no longer lists the bundled photo that an owner image replaced', () => {
    const bundled = { 'death-note': { name: 'Death Note', file: '/series/death-note.webp', alt: 'x', sourceUrl: 'https://s', author: 'Old', license: 'CC0', licenseUrl: 'https://l', retrieved: '2026-10-20', attributionRequired: false }, naruto: { name: 'Naruto', file: '/series/naruto.webp', alt: 'y', sourceUrl: 'https://s2', author: 'Other', license: 'CC0', licenseUrl: 'https://l', retrieved: '2026-10-20', attributionRequired: false } };
    const both = html(h(CreditsPage, { credits: bundled, owner: rows }));
    expect(both).not.toContain('Old');
    expect(both).toContain('Naruto');
    expect(both).toContain('Pictures added by the team');
  });

  it('is the page it was when the owner has uploaded nothing', () => {
    const none = html(h(CreditsPage, { credits: {}, owner: [] }));
    expect(none).toContain('credits-empty');
    expect(none).not.toContain('Pictures added by the team');
  });

  it('prints no dash and no emoji', () => {
    expect(out).not.toMatch(/[\u2013\u2014]|\p{Extended_Pictographic}/u);
  });
});
