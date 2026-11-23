// The four small things of the owner on the Kpopdle page (2026-11-17): the answer block folded in a toggle (text kept in the server HTML),
// the name of yesterday's idol in the game's pink, a thin line under the head of the guesses, more room above the guide.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { gameAnswerBlock } from '@/lib/dle/seo';
import { dleCopy } from '@/lib/dle/copy';

const SRC = join(__dirname, '../../..');
const read = (p: string): string => readFileSync(join(SRC, p), 'utf8');
const css = read('styles/sites/hub/dle.css');
const rule = (sel: string): string => new RegExp(`${sel.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`).exec(css)![1]!;

// SEO-LAUNCH-1 lane D (owner, 2026-11-23, rule 3.1): this block used to be folded in a toggle after the how-to (owner, 2026-11-17). It now opens the page, under the H1, visible without a click,
// so the test pins the new place and keeps the words of the block.
describe('the answer block under the H1', () => {
  it('is passed to the game as `intro`, shown by the game right after the H1, and no longer in a toggle of the guide', () => {
    const page = read('components/hub/dle/dle-game-page.tsx');
    expect(page).toContain('intro={intro}');
    expect(page).toContain('gameAnswerBlock(game, locale, pool.entities.length, day.date');
    expect(page).not.toContain('hub-dle-about');
    const game = read('components/hub/dle/dle-game.tsx');
    expect(game.indexOf('<h1 id="dle-h1">{w.h1}</h1>')).toBeGreaterThan(0);
    expect(game.indexOf('className="hub-dle-answer hub-dle-intro"')).toBeGreaterThan(game.indexOf('<h1 id="dle-h1">'));
  });

  it('has a title in both languages and the block keeps its words', () => {
    expect(dleCopy('fr').whatIsTitle('Kpopdle')).toBe('Qu’est-ce que Kpopdle ?');
    expect(dleCopy('en').whatIsTitle('Kpopdle')).toBe('What is Kpopdle?');
    expect(gameAnswerBlock('kpopdle-idol', 'fr', 216, '2026-11-16')).toContain('Le jeu compte 216 idols au 16 novembre 2026.');
  });
});

describe('the line of yesterday and the head of the guesses', () => {
  it('names the idol in the game pink (the token of the page), apart from the sentence, and brings the line closer to the box', () => {
    expect(read('components/hub/dle/dle-game.tsx')).toContain('<strong className="hub-dle-ylast">{yesterday}</strong>');
    expect(rule('.hub-dle-ylast')).toContain('color: var(--hub-dle-c)');
    expect(rule('.hub-dle-yline')).toMatch(/margin: -10px 0 0;/);
  });

  it('has a thin divider under the "Tes essais" head, and room above the guide', () => {
    const head = rule('.hub-dle-gridhead');
    expect(head).toContain('border-bottom: 1px solid var(--hub-dle-line-2)');
    expect(head).toContain('padding-bottom: 14px');
    expect(rule('.hub-dle-guide')).toContain('margin: 28px auto 0');
  });
});
