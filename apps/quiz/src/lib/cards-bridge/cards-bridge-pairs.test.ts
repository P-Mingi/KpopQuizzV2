// Bunnyverse Cards, lot 2 (CARDSUI): the kpopquiz.org bridge reads the part of a card and its tiles show a half as a half.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const useMe = vi.fn();
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('@/components/cards-bridge/use-cards-me', () => ({ useCardsMe: (...a: unknown[]) => useMe(...a) }));

type Row = Record<string, unknown>;
const TABLES: Record<string, Row[]> = {
  cards_entities: [{ id: 'group:btob', name: 'BTOB', group_id: null, active: true }],
  cards_catalog: [
    { card_no: 9, num: 'BV1-0009', entity_id: 'group:btob', rarity: 'C', photo_id: 12, in_packs: true, part: 1, small_2x: false },
    { card_no: 10, num: 'BV1-0010', entity_id: 'group:btob', rarity: 'C', photo_id: 12, in_packs: true, part: 2, small_2x: false },
    { card_no: 11, num: 'BV1-0011', entity_id: 'group:btob', rarity: 'U', photo_id: 13, in_packs: true, part: 1, small_2x: false },
  ],
  cards_photos: [
    { id: 12, status: 'approved', focal_x: 50, focal_y: 30, storage_path: 'btob-50-30', source_path: 'images/group-photos/btob.jpg', file_focal_x: 50, file_focal_y: 30, small_2x: false },
    { id: 13, status: 'approved', focal_x: 40, focal_y: 20, storage_path: null, source_path: 'images/group-photos/btob2.jpg', file_focal_x: null, file_focal_y: null, small_2x: false },
  ],
};
const selects: string[] = [];
const fakeDb = (): never => ({
  from: (t: string) => {
    let rows = [...(TABLES[t] ?? [])];
    const o: Record<string, unknown> = {};
    o.select = (cols: string) => { if (t === 'cards_catalog') selects.push(cols); return o; };
    o.eq = (k: string, v: unknown) => { rows = rows.filter((r) => r[k] === v); return o; };
    o.in = (k: string, vs: unknown[]) => { rows = rows.filter((r) => vs.includes(r[k])); return o; };
    o.or = () => o;
    o.order = (k: string) => { rows.sort((a, b) => Number(a[k]) - Number(b[k])); return o; };
    o.limit = (n: number) => { rows = rows.slice(0, n); return o; };
    o.then = (res: (v: unknown) => void) => res({ data: rows, error: null });
    return o;
  },
}) as never;

describe('the group block reads the part of a card', () => {
  it('reads every column of cards_catalog (part comes with file 102) and gives a half its file, or its source photo to cut in CSS', async () => {
    const { readGroupCards } = await import('./group');
    const cards = await readGroupCards('btob', fakeDb(), 'https://p.supabase.co');
    expect(selects).toEqual(['*']);
    const base = 'https://p.supabase.co/storage/v1/object/public';
    expect(cards).toEqual([
      { n: 9, num: 'BV1-0009', name: 'BTOB', rarity: 'C', photoUrl: `${base}/cards/btob-50-30-h1-1x.webp`, focalX: 50, focalY: 30, part: 1, css: false },
      { n: 10, num: 'BV1-0010', name: 'BTOB', rarity: 'C', photoUrl: `${base}/cards/btob-50-30-h2-1x.webp`, focalX: 50, focalY: 30, part: 2, css: false },
      { n: 11, num: 'BV1-0011', name: 'BTOB', rarity: 'U', photoUrl: `${base}/images/group-photos/btob2.jpg`, focalX: 40, focalY: 20, part: 1, css: true },
    ]);
  });
});

describe('the tiles of the group block render a half as a half', () => {
  it('an owned half from the source photo sits in a box twice the tile wide, offset to its side; a cut half is shown as is; a missing half says its number and 1/2', async () => {
    const { CardsGroupGrid } = await import('@/components/cards-bridge/cards-group-grid');
    useMe.mockReturnValue({ signedIn: true, owned: [9, 11, 12] });
    const cards = [
      { n: 9, num: 'BV1-0009', name: 'BTOB', rarity: 'C', photoUrl: 'https://p/h1.webp', focalX: 50, focalY: 30, part: 1 as const, css: false },
      { n: 10, num: 'BV1-0010', name: 'BTOB', rarity: 'C', photoUrl: 'https://p/h2.webp', focalX: 50, focalY: 30, part: 2 as const, css: false },
      { n: 11, num: 'BV1-0011', name: 'BTOB', rarity: 'U', photoUrl: 'https://p/src.jpg', focalX: 40, focalY: 20, part: 1 as const, css: true },
      { n: 12, num: 'BV1-0012', name: 'BTOB', rarity: 'U', photoUrl: 'https://p/src.jpg', focalX: 40, focalY: 20, part: 2 as const, css: true },
    ];
    const html = renderToStaticMarkup(h(CardsGroupGrid, { cards }));
    expect(html).toContain('BTOB, card BV1-0009, left half');
    expect(html).not.toContain('cb-pair" data-part="1" style="left:0"><img src="https://p/h1.webp"');
    expect(html).toContain('<span class="cb-pair" data-part="1" style="left:0"><img src="https://p/src.jpg"');
    expect(html).toContain('<span class="cb-pair" data-part="2" style="left:-100%"><img src="https://p/src.jpg"');
    expect(html).toContain('BV1-0010 · 2/2');
  });
});
