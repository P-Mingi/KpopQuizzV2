// Bunnyverse Cards, review 1 finding 17: the Cards layout's fallback (the catalog could not be read) is a page of its own, with its one H1;
// and the design files of the game hold no em or en dash.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cards/ui-catalog', () => ({ loadCatalog: async () => null }));
vi.mock('@/lib/cards/ui-flag', () => ({ cardsOn: () => true, cardsFixtureOn: () => false }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('404'); }, usePathname: () => '/cards' }));

import CardsLayout from '@/app/sites/[site]/(hub)/cards/layout';

describe('the Cards layout without a catalog', () => {
  it('says the cards are not available, under exactly one H1', async () => {
    const html = renderToStaticMarkup(await CardsLayout({ children: createElement('h1', null, 'never drawn') }));
    expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(html).toContain('<h1 class="h1">Bunnyverse Cards</h1>');
    expect(html).toContain('The cards are not available right now.');
    expect(html).not.toContain('never drawn');
  });
});

describe('the design files of the game', () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : [p]; });
  it('hold no em or en dash (the prototype page label was "Pages 3-4")', () => {
    for (const f of files('../../docs/design/cards').filter((p) => /\.(html|md|json)$/.test(p))) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
    }
  });
});
