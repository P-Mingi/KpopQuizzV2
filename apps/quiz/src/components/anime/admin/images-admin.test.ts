// Run O1 (ADM front): the Images tab as it is first drawn (the list is given, so no network): the counter, the search, the filter, the
// series list, the cover slot and one portrait slot for each character, in the order the tab key walks them.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ImagesAdmin } from './images-admin';

import type { AdminImage, AdminSeries } from '@/lib/anime/entity-images-rules';

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));

// Typed with the answer of GET /api/admin/images/list itself (part 1): a field the routes do not send fails tsc here.
const BUCKET = 'https://proj.supabase.co/storage/v1/object/public/entity-images';
const img = (kind: 'series' | 'character', slug: string, over: Partial<AdminImage> = {}): AdminImage => ({
  kind, slug, url: `${BUCKET}/anime/${kind}/${slug}/0123456789abcdef.webp`, url2x: `${BUCKET}/anime/${kind}/${slug}/0123456789abcdef-2x.webp`,
  width: 736, height: 981, focalX: 30, focalY: 60, license: 'cc_by_sa', author: 'Ana', sourceUrl: 'https://example.org/p', licenseNote: null, updatedAt: '2026-10-26T10:00:00.000Z', ...over,
});
const LIST: AdminSeries[] = [
  {
    slug: 'death-note', name: 'Death Note', published: true, image: img('series', 'death-note'), bundled: { url: '/series/death-note.webp', alt: 'A notebook' }, source: 'upload',
    characterCount: 2, characterImageCount: 1,
    characters: [
      { slug: 'death-note/light', name: 'Light Yagami', role: 'main', status: 'published', image: img('character', 'death-note/light') },
      { slug: 'death-note/l', name: 'L', role: 'main', status: 'published', image: null },
    ],
  },
  {
    slug: 'naruto', name: 'Naruto', published: true, image: null, bundled: { url: '/series/naruto.webp', alt: 'A leaf' }, source: 'bundled', characterCount: 1, characterImageCount: 0,
    characters: [{ slug: 'naruto/naruto', name: 'Naruto Uzumaki', role: 'main', status: 'published', image: null }],
  },
  { slug: 'zzz', name: 'Zzz', published: true, image: null, bundled: null, source: 'none', characterCount: 0, characterImageCount: 0, characters: [] },
];
const out = renderToStaticMarkup(h(ImagesAdmin, { initial: LIST }));

describe('the Images tab', () => {
  it('prints the counter: series and characters that have an image of the owner', () => {
    expect(out).toContain('1/3 series, 1/3 characters');
  });

  it('puts the search, the filter and the list before the series, in reading order', () => {
    const order = ['anime-adm-counts', 'Search series or characters', 'aria-label="Filter by image"', 'data-testid="series-list"', 'Cover', 'data-testid="characters-grid"'].map((s) => out.indexOf(s));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('offers All, With image and Without image, and labels the search', () => {
    for (const s of ['>All<', '>With image<', '>Without image<']) expect(out).toContain(s);
    expect(out).toMatch(/<label for="anime-adm-q"[^>]*>Search series or characters<\/label>/);
    expect(out).toContain('id="anime-adm-q"');
  });

  it('lists every series as a real button, the chosen one marked', () => {
    expect(out.match(/<button type="button" class="anime-adm-series"/g)).toHaveLength(3);
    expect(out).toMatch(/<button type="button" class="anime-adm-series" aria-current="true" data-slug="death-note">/);
    expect(out).toContain('Cover set');
    expect(out).toContain('No cover');
    expect(out).toContain('1/2 characters');
  });

  it('opens on the first series: its cover slot, then a portrait slot for each character', () => {
    expect(out).toContain('data-testid="slot-death-note"');
    expect(out).toContain('data-testid="slot-death-note/light"');
    expect(out).toContain('data-testid="slot-death-note/l"');
    expect(out).not.toContain('slot-naruto');
    expect(out).toContain('Characters (1/2)');
  });

  it('shows the owner image where there is one, with Replace, Set focal point and Remove, and the bundled photo or the placeholder where there is none', () => {
    const cover = out.slice(out.indexOf('data-testid="slot-death-note"'), out.indexOf('data-testid="slot-death-note/light"'));
    expect(cover).toContain('data-state="owner"');
    expect(cover).toContain('entity-images/anime/series/death-note/0123456789abcdef.webp');
    expect(cover).toContain('object-position:30% 60%');
    for (const s of ['>Replace<', '>Set focal point<', '>Remove<', 'Preview in place', 'Quiz card', 'Series header']) expect(cover, s).toContain(s);
    const empty = out.slice(out.indexOf('data-testid="slot-death-note/l"'));
    expect(empty).toContain('data-state="empty"');
    expect(empty).toContain('Neutral placeholder: no image');
    expect(empty).toContain('>Add image<');
    expect(empty).not.toContain('>Remove<');
  });

  it('shows the credit of the current image: source, author, licence', () => {
    expect(out).toContain('href="https://example.org/p"');
    expect(out).toContain('Ana</a>, CC BY-SA');
  });

  it('keeps the edit panel closed until Replace or Add image is pressed', () => {
    expect(out).not.toContain('slot-edit');
    expect(out).not.toContain('type="file"');
  });

  it('prints no dash and no emoji, and no K-pop word', () => {
    expect(out).not.toMatch(/[\u2013\u2014]|\p{Extended_Pictographic}|k-?pop/iu);
  });
});

describe('a series without a bundled photo or an image', () => {
  it('shows the neutral placeholder', () => {
    const zzz = renderToStaticMarkup(h(ImagesAdmin, { initial: [LIST[2]!] }));
    expect(zzz).toContain('data-state="empty"');
    expect(zzz).toContain('This series has no published characters yet.');
    expect(zzz).toContain('0/1 series, 0/0 characters');
  });
});
