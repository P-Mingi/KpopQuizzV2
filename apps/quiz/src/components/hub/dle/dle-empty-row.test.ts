// The empty row of the dle grid (owner, 2026-11-22): before the first guess, the real headers of the game and one row of empty cells.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { dleCopy } from '@/lib/dle/copy';
import { DLE_GAMES } from '@/lib/dle/games';
import { gameCopy } from '@/lib/dle/copy';
import type { DleGameId } from '@/lib/dle/games';
import type { DleGuess, DleLocale, DlePool } from '@/lib/dle/types';

import { DleGrid } from './dle-game';

const WORDS = { right: 'Right', near: 'Close', wrong: 'Wrong', unknown: 'n/a', up: 'up', down: 'down' };
const KEYS: Readonly<Record<string, readonly string[]>> = {
  'kpopdle-idol': ['gender', 'debut', 'group'],
};

function poolOf(game: string, keys: readonly string[]): DlePool {
  return { game, universe: 'x', attributes: keys.map((key) => ({ key, kind: 'single' as const, near: null })), entities: [] };
}

function html(game: DleGameId, locale: DleLocale, keys: readonly string[], guesses: readonly DleGuess[] = [], placeholder = true): string {
  return renderToStaticMarkup(createElement(DleGrid, { locale, game, pool: poolOf(game, keys), guesses, byId: new Map(), wonId: null, fresh: null, words: WORDS, placeholder }));
}

describe('the empty row of the grid', () => {
  it('shows one empty row under the headers of Kpopdle, with its own columns', () => {
    const out = html('kpopdle-idol', 'en', KEYS['kpopdle-idol']!);
    const w = gameCopy('kpopdle-idol', 'en');
    for (const k of KEYS['kpopdle-idol']!) expect(out).toContain(`>${w.columns[k]?.label ?? k}</th>`);
    expect(out.match(/data-testid="dle-empty-row"/g)).toHaveLength(1);
    expect(out.match(/hub-dle-t-empty/g)).toHaveLength(3);
  });

  it('follows the columns of each dle game, not one list', () => {
    for (const g of DLE_GAMES.filter((x) => x.built)) {
      const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].slice(0, g.series ? 8 : 6);
      const out = html(g.id, 'fr', keys);
      expect(out.match(/hub-dle-t-empty/g)).toHaveLength(keys.length);
      expect(out.match(/<th scope="col"/g)).toHaveLength(keys.length + 1);
      expect(out).toContain(dleCopy('fr').emptyCells);
    }
  });

  it('has the caption in each language and the empty cells hidden from assistive tech', () => {
    expect(html('kpopdle-idol', 'en', ['gender'])).toContain('Your clues will show here');
    expect(html('kpopdle-idol', 'fr', ['gender'])).toContain('Tes indices apparaîtront ici');
    const out = html('kpopdle-idol', 'en', ['gender']);
    expect(out).toContain('<tr aria-hidden="true" class="hub-dle-emptyrow"');
    expect(out).not.toContain('role="img"');
    expect(out).not.toMatch(/hub-dle-t-(correct|near|wrong|unknown)/);
  });

  it('is absent once a guess exists, and without the placeholder prop (a finished game)', () => {
    const guess = { id: 'x', result: [{ key: 'gender', status: 'wrong', arrow: null }] } as unknown as DleGuess;
    expect(html('kpopdle-idol', 'en', ['gender'], [guess])).not.toContain('dle-empty-row');
    expect(html('kpopdle-idol', 'en', ['gender'], [guess])).not.toContain('Your clues');
    expect(html('kpopdle-idol', 'en', ['gender'], [], false)).not.toContain('dle-empty-row');
  });

  it('is wired to open plays only, with a pool, and the copy has no dash', () => {
    const src = readFileSync(join(__dirname, 'dle-game.tsx'), 'utf8');
    expect(src).toContain('(pool && pool.attributes.length > 0 && !over && !off)');
    for (const l of ['en', 'fr'] as const) for (const code of [0x2013, 0x2014]) expect(dleCopy(l).emptyCells).not.toContain(String.fromCharCode(code));
  });
});
