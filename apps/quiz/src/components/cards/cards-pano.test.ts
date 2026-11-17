// Bunnyverse Cards, lot 7 (UI): a group photo in 3 cards and its panorama in the pages. A part shows "1/3"; the panorama pocket hangs under its parts; the
// Panoramas section has its own count; the panorama card is the landscape frame; the fixture and the copy.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CardFront, PanoFront } from './card-art';
import { buildFixtureCatalog, placeholderGroupPicture } from '@/lib/cards/ui-fixture';
import { binderUnits, buildSlim, filterPanos, paginate, panoCount, partLabel, partWord } from '@/lib/cards/ui-model';

import type { SlimCard } from '@/lib/cards/ui-types';

const cat = buildFixtureCatalog({ pairs: true, pano: true });
const slim = buildSlim(cat);
const trio = slim.items.filter((i) => !i.locked && i.card.entity.startsWith('group:') && i.card.parts === 3);

describe('the fixture: a photo in 3 cards and the panoramas', () => {
  it('has one photo in 3 cards, three consecutive numbers with parts, setNs and pano', () => {
    const t = cat.cards.filter((c) => c.parts === 3);
    expect(t.map((c) => c.part)).toEqual([1, 2, 3]);
    expect(t[2]!.n - t[0]!.n).toBe(2);
    expect(new Set(t.map((c) => c.pano)).size).toBe(1);
    expect(t[0]!.setNs).toEqual(t.map((c) => c.n));
  });
  it('has a panorama for every group photo, 2 and 3 parts, its own P numbers and the numbers of its parts', () => {
    const ps = cat.panoramas ?? [];
    expect(ps.length).toBe(cat.cards.filter((c) => c.part === 1).length);
    expect(ps.map((p) => p.num)).toEqual(ps.map((_, i) => `P-${String(i + 1).padStart(4, '0')}`));
    expect(ps.some((p) => p.parts === 3)).toBe(true);
    expect(ps.some((p) => p.parts === 2)).toBe(true);
    for (const p of ps) expect(p.cards.map((n) => cat.cards.find((c) => c.n === n)!.pano)).toEqual(p.cards.map(() => p.p));
  });
  it('without the option the catalog is the one lots 2 to 6 read: no panorama, no third part', () => {
    const old = buildFixtureCatalog({ pairs: true });
    expect(old.panoramas).toBeUndefined();
    expect(old.cards.some((c) => c.part === 3 || c.parts !== undefined)).toBe(false);
  });
  it('the 3-card picture is wider than the pair picture', () => {
    expect(decodeURIComponent(placeholderGroupPicture('group:x', 3))).toContain('viewBox="0 0 1650 850"');
    expect(decodeURIComponent(placeholderGroupPicture('group:x'))).toContain('viewBox="0 0 1200 675"');
  });
});

describe('a part says its place in the set', () => {
  const c = (part: 1 | 2 | 3, parts?: 2 | 3): SlimCard => ({
    n: part, num: `BV1-000${part}`, entity: 'group:g', kind: 'group', rarity: 'R', edition: 'holo', name: 'Group', group: null, debutYear: 2020, fx: 40, fy: 20, sub: null,
    img: { src: 'https://p.test/g.jpg', srcSet: null, cut: false }, part, ...(parts ? { parts } : {}),
  });
  it('1/3, 2/3 and 3/3 on a photo in 3, 1/2 and 2/2 without parts', () => {
    expect([1, 2, 3].map((p) => partLabel(c(p as 1 | 2 | 3, 3)))).toEqual(['1/3', '2/3', '3/3']);
    expect([1, 2].map((p) => partLabel(c(p as 1 | 2)))).toEqual(['1/2', '2/2']);
    expect(partLabel({ part: 0 })).toBe('');
  });
  it('the words: left, middle and right third; left and right half', () => {
    expect([1, 2, 3].map((p) => partWord(c(p as 1 | 2 | 3, 3)))).toEqual(['left third', 'middle third', 'right third']);
    expect([1, 2].map((p) => partWord(c(p as 1 | 2)))).toEqual(['left half', 'right half']);
  });
  it('the card chip and the picture window: Group 3/3, a window three cards wide, offset two cards for the third', () => {
    const html = renderToStaticMarkup(createElement(CardFront, { card: c(3, 3) }));
    expect(html).toContain('<span class="kh">3/3</span>');
    expect(html).toContain('c-pair c-half3 c-p3');
    expect(html).toContain('h3 half half-3 p3');
    const css = readFileSync(join(__dirname, '../../styles/cards/cards-photo.css'), 'utf8');
    expect(css).toContain('.bvc .c-pair.c-p3{width:300%}');
    expect(css).toContain('.bvc .c-pair.c-p3.c-half3{left:-200%}');
  });
});

describe('the pocket of the panorama hangs under its parts', () => {
  it('rides on the LAST part of its set only, and the three parts are one unit', () => {
    expect(trio.length).toBe(3);
    expect(trio.map((i) => (i.locked ? null : i.pano?.p ?? null))).toEqual([null, null, trio[2]!.locked ? null : trio[2]!.pano!.p]);
    const u = binderUnits(trio);
    expect(u.length).toBe(1);
    expect(u[0]!.length).toBe(3);
  });
  it('a page keeps parts then panorama together: the parts open a row, the panorama has the row under them', () => {
    const [p] = paginate(trio.map((x, i) => ({ ...x, sec: 'x', i })), 9, 3);
    expect(p!.cells.length).toBe(3);
    expect(p!.hung.length).toBe(1);
    expect(p!.hung[0]!.at).toBe(3);
    expect(p!.hung[0]!.pano.parts).toBe(3);
    expect(p!.used).toBe(6);
  });
  it('a pair: the parts, a cell left empty to close the row, then the panorama in the row under', () => {
    const pair = slim.items.filter((i) => !i.locked && i.card.entity === 'group:Q0' && i.card.rarity === 'C');
    expect(pair.length).toBe(2);
    const [p] = paginate(pair.map((x, i) => ({ ...x, sec: 'x', i })), 9, 3);
    expect(p!.cells.map((c) => (c ? 'card' : null))).toEqual(['card', 'card', null]);
    expect(p!.hung[0]!.at).toBe(3);
    expect(p!.hung[0]!.pano.parts).toBe(2);
    expect(p!.used).toBe(6);
  });
  it('never starts a page it cannot finish: parts and their panorama are two rows, so 7 used cells leave the next set to the next page', () => {
    const one = trio.map((x, i) => ({ ...x, sec: 'x', i }));
    const two = trio.map((x, i) => ({ ...x, sec: 'x', i: i + 3 }));
    const pages = paginate([...one, ...two], 9, 3);
    expect(pages.map((p) => p.hung.length)).toEqual([1, 1]);
  });
});

describe('the Panoramas section has its own completion', () => {
  it('is a section after every group, with its own panorama numbers and no card numbers', () => {
    const s = slim.sections[slim.sections.length - 1]!;
    expect(s.id).toBe('panoramas');
    expect(s.ns).toEqual([]);
    expect(s.panos).toEqual(slim.panos.map((p) => p.p));
  });
  it('is never counted in the cards of a group or in its completion', () => {
    const g = slim.sections.find((x) => x.name === 'Cinder Hall')!;
    const own = new Set(g.ns);
    expect(slim.cards.filter((c) => g.ns.includes(c.n)).length).toBe(own.size);
    expect(g.panos).toBeUndefined();
    expect(slim.cards.length).toBe(cat.cards.length);
  });
  it('counts owned over total and filters like a group edition', () => {
    const owned = new Set([slim.panos[0]!.p]);
    expect(panoCount(slim.panos, owned)).toEqual({ own: 1, total: slim.panos.length });
    const f = { q: '', kind: 'all' as const, rar: {}, show: 'owned' as const };
    expect(filterPanos(slim.panos, f, owned).map((p) => p.p)).toEqual([slim.panos[0]!.p]);
    expect(filterPanos(slim.panos, { ...f, show: 'missing' }, owned).length).toBe(slim.panos.length - 1);
    expect(filterPanos(slim.panos, { ...f, show: 'all', kind: 'idol' }, owned)).toEqual([]);
    expect(filterPanos(slim.panos, { ...f, show: 'fav' }, owned)).toEqual([]);
  });
});

describe('the panorama card: landscape, the v6 frame, its P number', () => {
  const three = slim.panos.find((p) => p.parts === 3)!;
  const two = slim.panos.find((p) => p.parts === 2)!;
  it('has the edition finish, the group name, the rarity line and the P number', () => {
    const html = renderToStaticMarkup(createElement(PanoFront, { pano: three }));
    expect(html).toContain(`card pano pano-3 r-${three.rarity} ed-${three.edition}`);
    expect(html).toContain(three.num);
    expect(html).toContain(`>${three.name}</b>`);
    expect(html).toContain('Panorama');
    expect(html).toContain('c-frame');
  });
  it('shows the source photo cropped at the focal point when nothing is cut, the parts side by side, or its own file', () => {
    expect(renderToStaticMarkup(createElement(PanoFront, { pano: two }))).toContain('object-position:50% 50%');
    const parts = renderToStaticMarkup(createElement(PanoFront, { pano: { ...two, img: { kind: 'parts', src: 'a', srcSet: null, parts: ['https://p/a-h1-1x.webp', 'https://p/a-h2-1x.webp'] } } }));
    expect(parts).toContain('c-strip');
    expect(parts.match(/<img/g)?.length).toBe(2);
    const file = renderToStaticMarkup(createElement(PanoFront, { pano: { ...two, img: { kind: 'file', src: 'https://p/a-p2-1x.webp', srcSet: 'https://p/a-p2-1x.webp 1x, https://p/a-p2-2x.webp 2x', parts: [] } } }));
    expect(file).toContain('a-p2-2x.webp 2x');
    expect(file).not.toContain('object-position');
  });
  it('the CSS is the window of the photo (11:8.5 and 16.5:8.5), with every size divided by the number of parts', () => {
    const css = readFileSync(join(__dirname, '../../styles/cards/cards-pano.css'), 'utf8');
    expect(css).toContain('aspect-ratio:11/8.5');
    expect(css).toContain('aspect-ratio:16.5/8.5');
    expect(css).toContain('--cq:calc(1cqi / var(--np))');
  });
});

describe('no dash in the new copy', () => {
  it('the files of the lot hold no em or en dash', () => {
    const files = ['components/cards/pano-reveal.tsx', 'components/cards/pano-pocket.tsx', 'components/cards/cards-pano.test.ts', 'styles/cards/cards-pano.css', 'components/cards/reveal-steps.ts', 'components/cards/card-art.tsx', 'lib/cards/ui-model.ts', 'lib/cards/ui-fixture.ts', 'components/cards/proto-example.ts', 'components/admin/photos/cards-panel.tsx'];
    const bad = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
    for (const f of files) expect(bad.test(readFileSync(join(__dirname, '../..', f), 'utf8')), f).toBe(false);
  });
});

describe('the other pages say 1/3 for a photo in 3 cards, never /2', () => {
  it('the wishlist line', async () => {
    const { wishText } = await import('./friends-panel');
    const c = (part: 0 | 1 | 2 | 3, parts?: 2 | 3) => ({ n: part, num: 'BV1-0001', name: 'TWICE', edition: 'holo' as const, kind: 'group' as const, group: null, part, ...(parts ? { parts } : {}) });
    expect(wishText([c(1, 3), c(3, 3), c(2, 2), c(0)])).toBe('TWICE 1/3, Holo · TWICE 3/3, Holo · TWICE 2/2, Holo · TWICE, Holo');
  });
  it('the group page of the hub: the tile of a missing part, from the group cards', async () => {
    const { CardsGroupGrid } = await import('@/components/cards-bridge/cards-group-grid');
    const base = { name: 'TWICE', rarity: 'R', photoUrl: 'https://p/a.jpg', focalX: 50, focalY: 50, css: true };
    const html = renderToStaticMarkup(createElement(CardsGroupGrid, { cards: [{ ...base, n: 1, num: 'BV1-0001', part: 1, parts: 3 }, { ...base, n: 2, num: 'BV1-0002', part: 3, parts: 3 }, { ...base, n: 3, num: 'BV1-0003', part: 2 }] }));
    expect(html).toContain('BV1-0001 · 1/3');
    expect(html).toContain('BV1-0002 · 3/3');
    expect(html).toContain('BV1-0003 · 2/2');
    expect(html).not.toContain('1/2');
  });
  it('the detail text names the three parts of a photo in 3, keeps the halves for a pair, and says both when mixed', async () => {
    const { splitWords } = await import('./card-detail');
    const rung = (parts?: 2 | 3) => ({ rarity: 'C' as const, reason: null, anchor: 'x', card: { n: 1, parts } as unknown as SlimCard });
    expect(splitWords([rung(3), rung(3)])).toBe('the three parts');
    expect(splitWords([rung(), rung(2)])).toBe('the two halves');
    expect(splitWords([rung(2), rung(3)])).toBe('two or three parts');
  });
});
