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

// The answer block opened the page under the H1 since SEO-LAUNCH-1 (owner, 2026-11-23, rule 3.1). The owner removed it on 2026-11-26 ("too much"):
// the game page no longer shows it, under the H1 or in a toggle. The words of the block are still pinned below (lib/dle/seo.ts keeps the function).
describe('the answer block of the game page', () => {
  it('is no longer on the game page: not passed to the game, not drawn under the H1, not in a toggle of the guide (owner, 2026-11-26)', () => {
    const page = read('components/hub/dle/dle-game-page.tsx');
    expect(page).not.toContain('intro={intro}');
    expect(page).not.toContain('gameAnswerBlock(');
    expect(page).not.toContain('hub-dle-about');
    const game = read('components/hub/dle/dle-game.tsx');
    expect(game.indexOf('<h1 id="dle-h1">{w.h1}</h1>')).toBeGreaterThan(0);
    expect(game).not.toContain('hub-dle-intro');
  });

  it('has a title in both languages and the block keeps its words', () => {
    expect(dleCopy('fr').whatIsTitle('Kpopdle')).toBe('Qu’est-ce que Kpopdle ?');
    expect(dleCopy('en').whatIsTitle('Kpopdle')).toBe('What is Kpopdle?');
    expect(gameAnswerBlock('kpopdle-idol', 'fr', 216, '2026-11-16')).toContain('Le jeu compte 216 idols au 16 novembre 2026.');
  });
});

describe('the line of yesterday and the head of the guesses', () => {
  it('names the idol in the game pink (the token of the page), apart from the sentence, and is a small muted line of the box (DLE2-A)', () => {
    expect(read('components/hub/dle/dle-game.tsx')).toContain('<strong className="hub-dle-ylast">{yesterday}</strong>');
    expect(rule('.hub-dle-ylast')).toContain('color: var(--hub-dle-c)');
    expect(rule('.hub-dle-yline')).toMatch(/margin: 0;/);
  });

  it('has a thin divider under the "Tes essais" head, and room above the guide', () => {
    const head = rule('.hub-dle-gridhead');
    expect(head).toContain('border-bottom: 1px solid var(--hub-dle-line-2)');
    expect(head).toContain('padding-bottom: 14px');
    expect(rule('.hub-dle-guide')).toContain('margin: 28px auto 0');
  });
});
