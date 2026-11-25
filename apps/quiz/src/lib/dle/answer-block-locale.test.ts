// Coordinator, 2026-11-25: the answer block under the H1 is written in the language of the page, with the same numbers, for every built game. The French pages pass locale 'fr'.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DLE_GAMES } from './games';
import { gameAnswerBlock } from './seo';

const ENGLISH = /\b(is a free daily|Everyone gets|a new one starts|Each guess|The game holds)\b/;
const FRENCH = /\b(est un jeu quotidien gratuit|Tout le monde|commence à minuit UTC|Le jeu compte)\b/;

describe('the answer block of each game, in each language', () => {
  for (const g of DLE_GAMES.filter((x) => x.built)) {
    it(`${g.id}: French is French, English is English, the numbers are the same`, () => {
      const fr = gameAnswerBlock(g.id, 'fr', 216, '2026-11-16', g.series ? undefined : 9);
      const en = gameAnswerBlock(g.id, 'en', 216, '2026-11-16', g.series ? undefined : 9);
      expect(fr).toMatch(FRENCH);
      expect(fr).not.toMatch(ENGLISH);
      expect(en).toMatch(/is a free daily/);
      expect(en).not.toMatch(FRENCH);
      expect(fr).toContain('216');
      expect(en).toContain('216');
      expect(fr.match(/\d+/g)!.filter((n) => n !== '2026' && n !== '16')).toEqual(en.match(/\d+/g)!.filter((n) => n !== '2026' && n !== '16'));
      expect(fr).toContain('16 novembre 2026');
    });
  }

  it('every French page passes the French locale to the page, every English page the English one', () => {
    const root = join(__dirname, '../../app/sites/[site]/(hub)');
    for (const g of DLE_GAMES.filter((x) => x.built)) {
      const dir = g.path.slice(1);
      expect(readFileSync(join(root, 'fr', dir, 'page.tsx'), 'utf8')).toContain(`DleGamePage({ game: '${g.id}', locale: 'fr' })`);
      expect(readFileSync(join(root, dir, 'page.tsx'), 'utf8')).toContain(`DleGamePage({ game: '${g.id}', locale: 'en' })`);
    }
  });
});
