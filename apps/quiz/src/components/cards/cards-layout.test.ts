// Bunnyverse Cards, review 1 finding 17: the Cards layout's fallback (the catalog could not be read) is a page of its own, with its one H1;
// and the design files of the game hold no em or en dash.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cards/ui-catalog', () => ({ loadCatalog: async () => null }));
// next/font only runs inside the Next compiler: the font module is replaced by the one field the layout reads (owner go 2026-11-12).
vi.mock('@/components/cards/cards-font', () => ({ cardsFace: { variable: 'bvc-card-var' }, cardsMono: { variable: 'bvc-mono-var' } }));
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

describe('the card faces (owner go 2026-11-12: Archivo and Martian Mono through next/font/google)', () => {
  const read = (p: string): string => readFileSync(p, 'utf8');
  it('loads both faces with their width axis from next/font/google, and adds no font file by hand', () => {
    const src = read('src/components/cards/cards-font.ts');
    expect(src).toMatch(/import \{ Archivo, Martian_Mono \} from 'next\/font\/google';/);
    expect(src).toMatch(/Archivo\(\{[^}]*variable: '--font-bvc-card'[^}]*axes: \['wdth'\]/);
    expect(src).toMatch(/Martian_Mono\(\{[^}]*variable: '--font-bvc-mono'[^}]*axes: \['wdth'\]/);
    for (const dir of ['public', 'public/fonts']) {
      expect(readdirSync(dir).filter((n) => /archivo|martian/i.test(n)), dir).toEqual([]);
    }
  });
  it('puts both variables on the root of the Cards pages, the root that defines the card tokens', async () => {
    const html = renderToStaticMarkup(await CardsLayout({ children: null }));
    expect(html).toMatch(/class="[^"]*\bbvc bvc-card-var bvc-mono-var"/);
    const tokens = read('src/styles/cards/cards-tokens.css');
    expect(tokens).toContain('--f-card:var(--font-bvc-card,"Archivo")');
    expect(tokens).toContain('--f-mono:var(--font-bvc-mono,"Martian Mono")');
  });
  it('is imported by the Cards layout only, so no other page of any site loads the two faces', () => {
    // git grep: the tracked sources, read in one pass (a walk of every file of src is too slow for the full suite).
    const hits = execFileSync('git', ['grep', '-l', '-F', 'cards/cards-font', '--', 'src'], { encoding: 'utf8' }).split('\n').filter(Boolean);
    expect(hits.filter((f) => !/\.test\.tsx?$/.test(f))).toEqual(['src/app/sites/[site]/(hub)/cards/layout.tsx']);
  });
});
