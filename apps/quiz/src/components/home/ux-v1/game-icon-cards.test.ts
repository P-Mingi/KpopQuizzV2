// o1/adminpics: the daily game cards of the two home pages. With no icon set in the admin the card is today's HTML (the grid of 12 squares);
// with one it shows the owner's picture in the same box and rounding, in place of the grid.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: (p: Record<string, unknown>) => h('a', { href: p.href as string, className: p.className as string }, p.children as React.ReactNode) }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}) }));

import { AnimeDailyCard, AnimeDailyModule } from './anime-daily-home';
import { KpopdleHomeCard } from './kpopdle-home';

const GRID = '<span class="p5-ad-t"></span><span class="p5-ad-t p5-ad-near"></span><span class="p5-ad-t p5-ad-off"></span><span class="p5-ad-t"></span>'
  + '<span class="p5-ad-t p5-ad-off"></span><span class="p5-ad-t"></span><span class="p5-ad-t"></span><span class="p5-ad-t p5-ad-near"></span>'
  + '<span class="p5-ad-t"></span><span class="p5-ad-t"></span><span class="p5-ad-t"></span><span class="p5-ad-t"></span>';
const ICON = { src: 'https://cdn.test/icon-otakudle.webp', position: '30% 60%' };
const view = { game: 'otakudle', gameNo: 16, fansFound: null } as const;

describe('the anime daily card', () => {
  it('with no icon draws the grid of squares exactly as before', () => {
    const out = renderToStaticMarkup(h(AnimeDailyCard, { view }));
    expect(out).toContain(`<span class="p5-ad-tiles" aria-hidden="true">${GRID}</span>`);
    expect(out).not.toContain('<img');
    expect(out).toContain('Otakudle · no. 16');
    expect(renderToStaticMarkup(h(AnimeDailyCard, { view, icon: undefined }))).toBe(out);
  });

  it('with an icon shows it in the box of the grid, in place of the squares', () => {
    const out = renderToStaticMarkup(h(AnimeDailyCard, { view, icon: ICON }));
    expect(out).not.toContain('p5-ad-t"');
    expect(out).toContain('class="p5-ad-tiles"');
    expect(out).toMatch(/<img src="https:\/\/cdn\.test\/icon-otakudle\.webp" alt="" width="100" height="80"/);
    expect(out).toContain('width:100px;height:80px');
    expect(out).toContain('object-position:30% 60%');
    expect(out).toContain('Guess today&#x27;s anime character');
  });

  it('the module gives each game its own icon and leaves the others on the grid', () => {
    const views = [view, { game: 'otakudle-one-piece', gameNo: 5, fansFound: null }] as const;
    const none = renderToStaticMarkup(h(AnimeDailyModule, { views }));
    expect(none).not.toContain('<img');
    expect(renderToStaticMarkup(h(AnimeDailyModule, { views, icons: {} }))).toBe(none);
    const one = renderToStaticMarkup(h(AnimeDailyModule, { views, icons: { otakudle: ICON } }));
    expect(one.match(/<img /g)).toHaveLength(1);
    expect(one.match(/class="p5-ad-t[ "]/g)).toHaveLength(12);
  });
});

describe('the Kpopdle card of the kpopquiz.org home', () => {
  const kview = { gameNo: 214, fansFound: null };
  it('with no icon keeps the grid, with one shows the picture instead', () => {
    const none = renderToStaticMarkup(h(KpopdleHomeCard, { view: kview }));
    expect(none).toContain('<span class="p1-kd-tiles" aria-hidden="true"><span class="p1-kd-t"></span>');
    expect(none.match(/class="p1-kd-t/g)).toHaveLength(13);
    expect(none).not.toContain('<img');
    const set = renderToStaticMarkup(h(KpopdleHomeCard, { view: kview, icon: { src: 'https://cdn.test/k.webp', position: '50% 50%' } }));
    expect(set).toMatch(/<img src="https:\/\/cdn\.test\/k\.webp" alt="" width="100" height="80"/);
    expect(set).not.toContain('p1-kd-t"');
    expect(set).toContain('Kpopdle · Idol no. 214');
  });
});
