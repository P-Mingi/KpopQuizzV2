// The A to Z of kpopquiz.org/groups in the style of OtakuQuiz's /series (owner, 2026-10-31, CR-015): the bar of letters, two columns of cards with
// a square image and the number of quizzes, every hub a real link in the served HTML, the anchors and the e2e hooks kept.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { GroupsBrowser } from './groups-browser';

import type { IndexGroup } from '@/lib/ux-v1/p3/model';

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string, width: p.width as number, height: p.height as number }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => h('a', { href, ...rest }, children) }));

const g = (slug: string, name: string, quizzes: number, photo: string | null = null): IndexGroup => ({ slug, name, quizzes, plays: quizzes * 10, photo });
const GROUPS = [g('bts', 'BTS', 12, '/idols/BTS.jpg'), g('aespa', 'aespa', 1), g('2ne1', '2NE1', 3), g('blackpink', 'BLACKPINK', 2000), g('chungha', 'Chungha', 0)];
const html = renderToStaticMarkup(h(GroupsBrowser, { groups: GROUPS, top: [GROUPS[0]!] }));
const az = html.slice(html.indexOf('p3-az kpop-az'));
const hrefs = (s: string): string[] => [...s.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]!);

describe('the A to Z', () => {
  it('opens with a bar of the letters that have a group, in the order of the blocks, as real anchors', () => {
    expect(az).toContain('<nav class="kpop-az-jump" aria-label="Jump to letter">');
    const bar = az.slice(az.indexOf('<nav'), az.indexOf('</nav>'));
    expect(hrefs(bar)).toEqual(['#letter-other', '#letter-A', '#letter-B', '#letter-C']);
    expect(az.indexOf('</nav>')).toBeLessThan(az.indexOf('id="letter-other"'));
  });

  it('keeps every hub as a real link in the served HTML, with the letter anchors and their self-links', () => {
    const cards = hrefs(az).filter((x) => x.endsWith('-quiz'));
    expect(cards.sort()).toEqual(['/2ne1-quiz', '/aespa-quiz', '/blackpink-quiz', '/bts-quiz', '/chungha-quiz']);
    for (const id of ['letter-other', 'letter-A', 'letter-B', 'letter-C']) expect(az).toContain(`<h3 id="${id}"><a href="#${id}">`);
    // Most played stays too, with its own link.
    expect(html.slice(0, html.indexOf('p3-az kpop-az'))).toContain('class="p3-gitem"');
  });

  it('prints the number of quizzes on each card, muted with "No quiz yet" when there is none', () => {
    expect(az).toMatch(/<span class="p3-azr-n">BTS<\/span><small class="ux-num">12 quizzes<\/small>/);
    expect(az).toMatch(/<span class="p3-azr-n">aespa<\/span><small class="ux-num">1 quiz<\/small>/);
    expect(az).toMatch(/<span class="p3-azr-n">BLACKPINK<\/span><small class="ux-num">2,000 quizzes<\/small>/);
    expect(az).toMatch(/class="p3-azr is-zero"[^>]*>[\s\S]*?Chungha<\/span><small class="ux-num">No quiz yet<\/small>/);
  });

  it('shows the group photo at 44 px with an empty alt, the name being printed beside it', () => {
    expect(az).toMatch(/<span class="p3-gav" style="width:44px;height:44px" aria-hidden="true"><img src="\/idols\/BTS\.jpg" alt="" width="44" height="44"\/>/);
  });

  it('has one heading level for the letters and no h1', () => {
    expect(html).not.toContain('<h1');
    expect(az).not.toContain('<h2');
  });
});

describe('its sheet', () => {
  const sheet = readFileSync(fileURLToPath(new URL('../../../styles/kpop/groups-az.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const page = readFileSync(fileURLToPath(new URL('../../../app/(site)/groups/page.tsx', import.meta.url)), 'utf8');

  it('is imported by the page, gives two columns, one on phones, and a square image', () => {
    expect(page).toContain("import '@/styles/kpop/groups-az.css'");
    expect(sheet).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(sheet).toMatch(/@media \(max-width: 560px\) \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(sheet).toMatch(/\.kpop-az \.p3-gav \{ border-radius: 12px/);
  });

  it('routes every colour through a UX token', () => {
    expect(sheet).not.toMatch(/:\s*#[0-9a-f]{3,8}\b/i);
    expect(sheet).not.toMatch(/rgba?\(/);
  });
});
