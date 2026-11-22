// Owner, 2026-11-22: "on the hints, add a small icon for both (each game) and make the boxes less wide". Every hint of every dle game has
// its own icon, drawn once per box beside the words (decorative), and the hints are narrower than the 760 px they had.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DLE_GAMES } from '@/lib/dle/games';

import { HINT_ICONS, hintIcon } from './dle-icons';

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/components/hub/dle/dle-font', () => ({ dleMarquee: { variable: 'marquee-var' } }));

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const css = readFileSync(new URL('../../../styles/sites/hub/dle.css', import.meta.url), 'utf8');
const POOL = { game: 'otakudle', universe: 'anime', attributes: [], entities: [] };

describe('the icons of the hints', () => {
  it('every hint key of every game, and every key a slot may serve, has its own icon', () => {
    const keys = new Set(DLE_GAMES.flatMap((g) => g.hints.flatMap((h) => [h.key, ...(h.or ?? [])])));
    expect(keys.size).toBeGreaterThanOrEqual(5);
    for (const k of keys) expect(HINT_ICONS[k], k).toBeTruthy();
    expect(new Set([...keys].map((k) => hintIcon(k))).size).toBe(keys.size);
  });

  it('each hint box draws one hidden icon before its words, in English and French, for every game with hints', async () => {
    const { DleGame } = await import('./dle-game');
    for (const g of DLE_GAMES.filter((x) => x.hints.length > 0 && x.built)) {
      for (const locale of ['en', 'fr'] as const) {
        const html = renderToStaticMarkup(createElement(DleGame, { locale, game: g.id, gameNo: 4, stats: null, pool: { ...POOL, game: g.id, universe: g.universe }, pictures: {}, quizLinks: {}, kpopName: 'KpopQuiz' }));
        const boxes = [...html.matchAll(/<div class="hub-dle-hint(?: [^"]*)?">(.*?)<\/div><\/div>/g)].map((m) => m[1]!);
        expect(boxes, `${g.id} ${locale}`).toHaveLength(g.hints.length);
        for (const b of boxes) expect(b).toMatch(/^<span aria-hidden="true" class="hub-dle-hint-ic"><svg [^>]*><path d="[^"]+"><\/path><\/svg><\/span><div class="hub-dle-hint-body"><span class="hub-dle-hint-label">/);
        expect(html).not.toMatch(DASH);
      }
    }
  });

  it('the hints are narrower (540 px, was 760) and the icon has its tile', () => {
    expect(css).toMatch(/\.hub-dle-hints \{ width: 100%; max-width: 540px;/);
    expect(css).toMatch(/\.hub-dle-hint-ic \{ flex: none; width: 34px; height: 34px;/);
    expect(css).toMatch(/\.hub-dle-hint-body \{/);
  });
});
