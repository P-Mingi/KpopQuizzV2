// The owner's stickers (2026-11-15): saved by the admin's Stickers board since step 2 of the daily games, drawn on no page until now.
// This checks the read (the live rows of a page), the placement (the board's numbers in the 1180 px main column), the drawing, and that
// the four pages of the board draw theirs. Also the room under the head of the guesses (owner, same day).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PageStickers } from '@/components/hub/page-stickers';

import { STICKER_PAGES } from './slots';
import { pageStickers, stickerStyle } from './stickers';

import type { LiveAsset } from './public-read';
import type { StickerSettings } from './slots';

const SRC = join(__dirname, '../..');
const read = (p: string): string => readFileSync(join(SRC, p), 'utf8');

const SETTINGS: StickerSettings = { side: 'left', x: 32, y: 117, w: 140, r: -10, o: 100, mirror: false, anim: true };
function asset(over: Partial<LiveAsset> = {}): LiveAsset {
  return {
    key: 'sticker:kpopdle:wed0ntuf', type: 'sticker', page: 'kpopdle', settings: { ...SETTINGS },
    large: 'https://x.supabase.co/storage/v1/object/public/entity-images/hub/sticker/kpopdle/wed0ntuf/a-400.webp',
    mid: null, thumb: 'https://x.supabase.co/storage/v1/object/public/entity-images/hub/sticker/kpopdle/wed0ntuf/a-96.webp',
    width: 400, height: 400, needsCredit: false, sourceUrl: null, author: null, license: null, licenseNote: null, publishedAt: null,
    ...over,
  };
}

describe('the stickers of a page', () => {
  it('reads the live stickers of that page only, with valid settings and a file', () => {
    const live = [
      asset(),
      asset({ key: 'sticker:kpopdle:0k6418tk', settings: { ...SETTINGS, side: 'right', r: 25 } }),
      asset({ key: 'sticker:otakudle:aa', page: 'otakudle' }),
      asset({ key: 'banner:kpopdle', type: 'banner' }),
      asset({ key: 'sticker:kpopdle:bad', settings: { side: 'up' } }),
      asset({ key: 'sticker:kpopdle:nofile', large: null, mid: null, thumb: null }),
      asset({ key: 'sticker:otakudle:wrongpage', page: 'kpopdle' }),
    ];
    expect(pageStickers(live, 'kpopdle').map((s) => s.key)).toEqual(['sticker:kpopdle:wed0ntuf', 'sticker:kpopdle:0k6418tk']);
    expect(pageStickers(live, 'otakudle').map((s) => s.key)).toEqual(['sticker:otakudle:aa']);
    expect(pageStickers(live, 'home')).toEqual([]);
    expect(pageStickers([asset({ large: null })], 'kpopdle')[0]!.src).toMatch(/-96\.webp$/);
  });

  it('the pages of the code are the pages of the admin board', () => {
    expect(STICKER_PAGES.map((p) => p.id).sort()).toEqual(['daily', 'home', 'kpopdle', 'otakudle']);
  });

  it('places a sticker with the numbers of the board: side, x, y, width, opacity, rotation, mirror', () => {
    expect(stickerStyle(SETTINGS)).toEqual({ left: 32, top: 117, width: 140, opacity: 1, transform: 'rotate(-10deg)' });
    expect(stickerStyle({ ...SETTINGS, side: 'right', x: 10, o: 40, r: 25, mirror: true })).toEqual({ right: 10, top: 117, width: 140, opacity: 0.4, transform: 'rotate(25deg) scaleX(-1)' });
  });

  it('draws decoration only: hidden from assistive technology, no alt text, the entrance only when asked, nothing when there is none', () => {
    const html = renderToStaticMarkup(createElement(PageStickers, { stickers: pageStickers([asset(), asset({ key: 'sticker:kpopdle:b', settings: { ...SETTINGS, anim: false } })], 'kpopdle') }));
    expect(html).toMatch(/^<div aria-hidden="true" class="hub-stickers-frame">/);
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html).toContain('alt=""');
    expect(html).toContain('class="hub-stickers-img hub-stickers-enter"');
    expect(html).toContain('class="hub-stickers-img"');
    expect(html).toContain('left:32px;top:117px;width:140px;opacity:1;transform:rotate(-10deg)');
    expect(renderToStaticMarkup(createElement(PageStickers, { stickers: [] }))).toBe('');
  });

  it('Kpopdle, Otakudle, the daily games page and the home draw theirs, at the top of their main column', () => {
    const game = read('components/hub/dle/dle-game-page.tsx');
    expect(game).toContain('const stickers = pageStickers(await getLiveAssets(), world.id);');
    expect(game).toMatch(/<main id="main" tabIndex=\{-1\} className="hub-dle-main">\n\s*<PageStickers stickers=\{stickers\} \/>/);
    expect(read('components/hub/dle/burrow-page.tsx')).toContain("stickers={pageStickers(live, 'daily')}");
    expect(read('components/hub/dle/burrow-board.tsx')).toMatch(/<main id="main" tabIndex=\{-1\} className="hub-dle-burrow">\n\s*<PageStickers stickers=\{stickers\} \/>/);
    expect(read('app/sites/[site]/home-hub.tsx')).toContain("stickers: pageStickers(live, 'home')");
    expect(read('components/hub/home/home-page.tsx')).toMatch(/<main id="main" tabIndex=\{-1\} className="hub-h2-main">\n\s*<PageStickers stickers=\{stickers\} \/>/);
  });

  it('the frame is the column the board draws (1180 px), out of the way, hidden under 1240 px, still for a visitor who asks for less motion', () => {
    const css = read('styles/sites/hub/stickers.css');
    const frame = /\.hub-stickers-frame \{([^}]*)\}/.exec(css)![1]!;
    for (const d of ['position: absolute', 'top: 0', 'left: 0', 'right: 0', 'max-width: 1180px', 'height: 0', 'margin: 0 auto', 'pointer-events: none']) expect(frame).toContain(d);
    expect(read('components/admin/photos/stickers-panel.tsx')).toContain('const S = 600 / 1180;');
    expect(css).toMatch(/@media \(max-width: 1239\.98px\) \{ html\.ux-v1\[data-site="hub"\] \.hub-stickers-frame \{ display: none; \} \}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ html\.ux-v1\[data-site="hub"\] \.hub-stickers-enter \{ animation: none; \} \}/);
    // Each column the frame sits in is positioned and 1180 px wide at most.
    const dle = read('styles/sites/hub/dle.css');
    expect(dle).toMatch(/\.hub-dle-main \{ position: relative; width: 100%; max-width: 1180px;/);
    expect(dle).toMatch(/\.hub-dle-burrow \{ position: relative; width: 100%; max-width: 1180px;/);
    const h2 = read('styles/sites/hub/h2.css');
    expect(h2).toContain('.hub-h2-main { display: block; position: relative; }');
    expect(h2).toMatch(/\.hub-h2-wrap \{ max-width: 1180px;/);
  });
});

describe('the head of the guesses', () => {
  it('leaves room between "Your guesses" and the column titles (owner, 2026-11-15)', () => {
    expect(read('styles/sites/hub/dle.css')).toMatch(/\.hub-dle-gridhead \{[^}]*margin-bottom: 12px;[^}]*\}/);
  });
});
