// Lot 3 DLE (E3): the designed card of the daily games. A character shows the series photo already in place and its name set in type; an idol
// without a photo shows the colours of the group with a pattern and the name in type; never initials on a big flat block. The owner's private
// preview draws only with a look the owner's session built, and the public markup never holds a trace of it.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { seriesArtOf } from '@/lib/dle/card-art';
import { PREVIEW_INDEX_PATH, isPreviewSlug, makePreview, previewConfigured, previewImageUrl } from '@/lib/dle/preview';

import { Avatar, tintOf } from './dle-avatar';
import { DleCard, nameSize } from './dle-card';

import type { DlePool, DlePoolEntity } from '@/lib/dle/types';

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/components/hub/dle/dle-font', () => ({ dleMarquee: { variable: 'marquee-var' } }));

describe('the card of the result', () => {
  it('sets the name in type on the series photo, with the series above it', () => {
    const html = renderToStaticMarkup(createElement(DleCard, { name: 'Monkey D. Luffy', sub: 'One Piece', tone: 'One Piece', look: { art: '/series/one-piece.webp' } }));
    expect(html).toContain('hub-dle-card-art');
    expect(html).toContain('<img src="/series/one-piece.webp" alt=""');
    expect(html).toContain('<small>One Piece</small>');
    expect(html).toMatch(/<strong style="font-size:\d+px">Monkey D\. Luffy<\/strong>/);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('hub-dle-card-chip');
  });

  it('without a photo draws the colours of the group with a pattern and the whole name, never the initials alone', () => {
    const html = renderToStaticMarkup(createElement(DleCard, { name: 'Karina', sub: 'aespa', tone: 'aespa' }));
    expect(html).toContain('hub-dle-card-pat');
    expect(html).toContain('hub-dle-card-dots');
    expect(html).not.toContain('<img');
    expect(html).toContain('<strong style="font-size:46px">Karina</strong>');
    expect(html).not.toMatch(/>KA</);
    const [a, b] = tintOf('aespa');
    expect(html).toContain(`--dle-a:${a}`);
    expect(html).toContain(`--dle-b:${b}`);
  });

  it('shows the label of the private preview only when a preview picture is given, and the preview wins over the series photo', () => {
    const html = renderToStaticMarkup(createElement(DleCard, { name: 'Zoro', sub: 'One Piece', tone: 'One Piece', look: { art: '/series/one-piece.webp', preview: '/api/admin/dle-preview/img?slug=one-piece%2Fzoro&s=full' } }));
    expect(html).toContain('src="/api/admin/dle-preview/img?slug=one-piece%2Fzoro&amp;s=full"');
    expect(html).not.toContain('/series/one-piece.webp');
    expect(html).toContain('Owner preview');
  });

  it('keeps a long name inside the card: the size falls with the length', () => {
    expect(nameSize('Cha Eun-woo')).toBeGreaterThan(nameSize('Kim Seok-jin Jr'));
    expect(nameSize('Rin')).toBe(46);
    expect(nameSize('x'.repeat(40))).toBe(24);
    expect(nameSize('한국어이름')).toBe(46);
  });

  it('draws no dash of any kind', () => {
    const html = renderToStaticMarkup(createElement(DleCard, { name: 'A', sub: 'B', tone: 'C', look: { preview: '/x' } }));
    expect(html).not.toMatch(/[–—]/);
  });
});

describe('the small tile beside a name', () => {
  const tile = (look?: { art?: string | null; preview?: string | null }, thumb: string | null = null): string =>
    renderToStaticMarkup(createElement(Avatar, { entity: { name: 'Monkey D. Luffy', thumb }, tone: 'One Piece', size: 40, radius: 10, font: 13, look }));

  it('is decorative in every state', () => {
    for (const html of [tile(), tile({ art: '/series/one-piece.webp' }), tile({ preview: '/p' }), tile(undefined, 'https://x.test/t.webp')]) {
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toMatch(/alt="[^"]/);
    }
  });

  it('prefers the licensed file, then the preview, then the series photo, then a pattern with the initials', () => {
    expect(tile({ art: '/a', preview: '/p' }, 'https://x.test/t.webp')).toContain('src="https://x.test/t.webp"');
    expect(tile({ art: '/a', preview: '/p' })).toContain('src="/p"');
    const art = tile({ art: '/series/one-piece.webp' });
    expect(art).toContain('src="/series/one-piece.webp"');
    expect(art).toContain('hub-dle-thumb-art');
    const pat = tile();
    expect(pat).toContain('hub-dle-thumb-pat');
    expect(pat).toContain('>MO<');
    expect(pat).not.toContain('<img');
  });
});

describe('the grid of the guesses', () => {
  const ent = (id: string, name: string, series: string): DlePoolEntity => ({ id, name, thumb: null, search: [name], attrs: { series: { v: [series] }, role: { v: 'main' } } });
  const POOL: DlePool = { game: 'otakudle', universe: 'anime', attributes: [{ key: 'role', kind: 'single', near: null }], entities: [ent('one-piece/luffy', 'Monkey D. Luffy', 'One Piece'), ent('naruto/sasuke', 'Sasuke Uchiha', 'Naruto')] };

  it('gives a tile its series photo, and a character of a series with no photo the pattern', async () => {
    const { DleGrid } = await import('./dle-game');
    const art: Record<string, string> = { 'One Piece': '/series/one-piece.webp' };
    const html = renderToStaticMarkup(createElement(DleGrid, {
      locale: 'en', game: 'otakudle', pool: POOL, byId: new Map(POOL.entities.map((e) => [e.id, e])), wonId: null, fresh: null,
      guesses: [{ id: 'one-piece/luffy', result: [{ key: 'role', status: 'correct', arrow: null }] }, { id: 'naruto/sasuke', result: [{ key: 'role', status: 'wrong', arrow: null }] }],
      words: { right: 'right', near: 'close', wrong: 'wrong', unknown: '?', up: 'higher', down: 'lower' },
      look: (e) => ({ art: art[(e.attrs.series?.v as string[])[0]!] ?? null, preview: null }),
    }));
    expect(html).toContain('src="/series/one-piece.webp"');
    expect(html).toContain('hub-dle-thumb-art');
    expect(html).toContain('hub-dle-thumb-pat');
    expect(html).toContain('>SA<');
  });
});

describe('the public markup of an Otakudle page', () => {
  it('holds a boolean at most: no preview address, no path of the bucket, no id', async () => {
    const { DleGame } = await import('./dle-game');
    const POOL: DlePool = { game: 'otakudle', universe: 'anime', attributes: [{ key: 'role', kind: 'single', near: null }], entities: [{ id: 'one-piece/luffy', name: 'Monkey D. Luffy', thumb: null, search: ['Luffy'], attrs: { series: { v: ['One Piece'] }, role: { v: 'main' } } }] };
    for (const ownerPreview of [true, false]) {
      const html = renderToStaticMarkup(createElement(DleGame, { locale: 'en', game: 'otakudle', gameNo: 4, stats: null, pool: POOL, pictures: {}, quizLinks: {}, kpopName: 'OtakuQuiz', seriesArt: { 'One Piece': '/series/one-piece.webp' }, ownerPreview }));
      expect(html, String(ownerPreview)).not.toMatch(/dle-preview|admin|entity-images|storage\/v1|Owner preview/);
    }
  });
});

describe('the series photos', () => {
  it('maps a series title to its bundled photo, and leaves out a series with none', () => {
    const art = seriesArtOf({ 'One Piece': 'one-piece', 'Death Note': 'death-note', 'Not A Series': 'not-a-series', 'No Slug': '' });
    expect(art['One Piece']).toBe('/series/one-piece.webp');
    expect(art['Death Note']).toBe('/series/death-note.webp');
    expect(art['Not A Series']).toBeUndefined();
    expect(art['No Slug']).toBeUndefined();
  });

  it('reads only the names it is given, and a series that shows its title card gets no photo', () => {
    expect(Object.keys(seriesArtOf({ 'One Piece': 'one-piece', Naruto: 'naruto' }, ['Naruto']))).toEqual(['Naruto']);
    const map = { naruto: { file: null, alt: null, attribution: null, fallback: 'title-card' } } as never;
    expect(seriesArtOf({ Naruto: 'naruto' }, undefined, map)).toEqual({});
  });
});

describe('the rules of the private preview', () => {
  const on = { PRIVATE_LAUNCH: '1' };
  it('is on for the hub with PRIVATE_LAUNCH exactly 1, and nowhere else', () => {
    expect(previewConfigured('hub', on)).toBe(true);
    expect(previewConfigured('hub', { PRIVATE_LAUNCH: ' 1 ' })).toBe(true);
    for (const v of [undefined, '', '0', 'false', 'off', 'no', 'true', 'yes', '2', '11']) expect(previewConfigured('hub', { PRIVATE_LAUNCH: v }), String(v)).toBe(false);
    expect(previewConfigured('kpop', on)).toBe(false);
    expect(previewConfigured('anime', on)).toBe(false);
    // production on Vercel with the variable unset is a closed gate, but the preview still waits for the explicit 1
    expect(previewConfigured('hub', { VERCEL: '1', VERCEL_ENV: 'production' })).toBe(false);
  });

  it('builds addresses of the admin route only, and only for slugs shaped like a character', () => {
    expect(PREVIEW_INDEX_PATH).toBe('/api/admin/dle-preview');
    expect(previewImageUrl('', 'one-piece/luffy', 'tile')).toBe('/api/admin/dle-preview/img?slug=one-piece%2Fluffy&s=tile');
    expect(isPreviewSlug('one-piece/luffy')).toBe(true);
    for (const bad of ['one-piece', 'a/b/c', '../x', 'A/b', 'a/b?x=1', '', null, 5]) expect(isPreviewSlug(bad), String(bad)).toBe(false);
    const pv = makePreview(['one-piece/luffy', '../x', 'bad', 7], '/base');
    expect(pv?.has('one-piece/luffy')).toBe(true);
    expect(pv?.has('../x')).toBe(false);
    expect(pv?.tile('one-piece/luffy')).toBe('/base/api/admin/dle-preview/img?slug=one-piece%2Fluffy&s=tile');
    expect(pv?.full('one-piece/zoro')).toBeNull();
    expect(makePreview([], '')).toBeNull();
    expect(makePreview(null, '')).toBeNull();
    expect(makePreview({ ids: [] }, '')).toBeNull();
  });
});
