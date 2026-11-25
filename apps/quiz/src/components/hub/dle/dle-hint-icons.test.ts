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

  // DLE2-A (owner, 2026-11-25): the two hint cards and their bars are gone. One short line under the input: "{hint label} in N guesses" items, the value replacing the words once opened.
  it('each game with hints draws one line of items under the input, in English and French, and no card, icon tile or bar', async () => {
    const { DleGame } = await import('./dle-game');
    for (const g of DLE_GAMES.filter((x) => x.hints.length > 0 && x.built)) {
      for (const locale of ['en', 'fr'] as const) {
        const html = renderToStaticMarkup(createElement(DleGame, { locale, game: g.id, gameNo: 4, stats: null, pool: { ...POOL, game: g.id, universe: g.universe }, pictures: {}, quizLinks: {}, kpopName: 'KpopQuiz' }));
        const list = /<ul aria-label="[^"]*" class="hub-dle-hintlist">(.*?)<\/ul>/.exec(html);
        expect(list, `${g.id} ${locale}`).not.toBeNull();
        const items = [...list![1]!.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((m) => m[1]!);
        expect(items, `${g.id} ${locale}`).toHaveLength(g.hints.length);
        items.forEach((it, i) => expect(it).toContain(locale === 'fr' ? `dans ${g.hints[i]!.after} essais` : `in ${g.hints[i]!.after} guesses`));
        expect(html).not.toMatch(/hub-dle-hint-ic|hub-dle-hint-track|hub-dle-hintgrid/);
        expect(html).not.toMatch(DASH);
      }
    }
  });

  it('the stylesheet has no hint card any more, and the line is small and muted', () => {
    expect(css).not.toMatch(/\.hub-dle-hint-ic|\.hub-dle-hintgrid|\.hub-dle-hint-track/);
    expect(css).toMatch(/\.hub-dle-hintline \{[^}]*font-size: 13px; color: var\(--hub-dle-muted\)/);
  });
});
