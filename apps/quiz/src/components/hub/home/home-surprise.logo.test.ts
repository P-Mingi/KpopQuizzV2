// Surprise me, the tile of the pick (owner, 2026-11-04): the picture of the group in place of its initials ("LO" for Loossemble). The initials stay
// when the group has no logo, when the logo is on a host the site cannot serve, and when the picture fails to load. The pick shows after a click and
// renderToStaticMarkup cannot click, so useState is replaced as home-surprise.prefix.test.ts does it: the pick state starts on `forced.pick`, and the
// "picture failed" state of the tile on `forced.failed`. next/image is a plain <img> here so its props can be read.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomeSurprise } from './home-surprise';

import type { SurprisePick } from './home-surprise';

const forced = vi.hoisted(() => ({ pick: null as unknown, failed: false }));
vi.mock('react', async (importOriginal) => {
  const real = await importOriginal<typeof import('react')>();
  const useState = ((init: unknown) => {
    const [v, set] = real.useState(init);
    if (init === null && forced.pick) return [forced.pick, set];
    if (init === false) return [forced.failed, set];
    return [v, set];
  }) as typeof real.useState;
  return { ...real, default: { ...real, useState }, useState };
});
vi.mock('next/image', () => ({
  default: (p: Record<string, unknown>) => h('img', {
    src: p.src as string, alt: p.alt as string, width: p.width as number, height: p.height as number, className: p.className as string,
    'data-sizes': p.sizes as string, 'data-loading': p.loading as string, 'data-unoptimized': p.unoptimized ? 'yes' : undefined,
  }),
}));

afterEach(() => { forced.pick = null; forced.failed = false; });

const LOGO = 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/group-logos/loossemble.jpg';
const pick = (over: Partial<SurprisePick> = {}): SurprisePick => ({ id: 'k1', tile: 'LO', title: 'Loossemble quiz', href: '/q/loossemble-quiz', site: 'kpop', pickLabel: 'Random pick from Loossemble', ...over });
const LABELS = { button: 'Surprise me', play: 'Play', another: 'Another' };
const render = (shown: SurprisePick, prefix: 'hub-h2' | 'anime-h2' | 'kpop-h2' = 'kpop-h2'): string => {
  forced.pick = shown;
  return renderToStaticMarkup(h(HomeSurprise, { pool: [shown], playedIds: [], lede: 'Not sure what to play?', labels: LABELS, prefix }));
};
const tile = (html: string): string => /<span aria-hidden="true" class="[a-z0-9-]+-th [a-z0-9-]+-pick-tile">[\s\S]*?<\/span>(?=<span class="[a-z0-9-]+-pick-body")/.exec(html)![0];

describe('the tile of a pick with a logo', () => {
  it('shows the picture in the square, decorative (the group is named in the line next to it), and not the initials', () => {
    const html = render(pick({ logo: LOGO }));
    expect(tile(html)).toBe(`<span aria-hidden="true" class="kpop-h2-th kpop-h2-pick-tile"><img src="${LOGO}" alt="" width="42" height="42" class="kpop-h2-th-img" data-sizes="42px" data-loading="eager"/></span>`);
    expect(html).not.toContain('>LO<');
    expect(html).toContain('<span class="kpop-h2-pick-k">Random pick from Loossemble</span>');
    // The rest of the row is what it was.
    expect(html).toContain('<a href="/q/loossemble-quiz" class="kpop-h2-pick-play kpop-h2-btn">Play</a>');
    expect(html).toContain('<button type="button" class="kpop-h2-pick-again">Another</button>');
  });

  it('is the same markup under the hub prefix, the picture class being the sheet\'s own', () => {
    const kpop = render(pick({ logo: LOGO }));
    const hub = render(pick({ logo: LOGO }), 'hub-h2');
    expect(hub).toBe(kpop.replace(/\bkpop-h2-/g, 'hub-h2-'));
    expect(hub).toContain('class="hub-h2-th-img"');
  });

  it('is drawn as the other logos of the site are: an svg as it is (next/image does not resize it), a picture of the site itself by its path', () => {
    const html = render(pick({ tile: 'BL', logo: '/logos/blackpink.svg' }));
    expect(html).toContain('src="/logos/blackpink.svg"');
    expect(html).toContain('data-unoptimized="yes"');
    expect(render(pick({ logo: LOGO }))).not.toContain('data-unoptimized');
  });

  it('keeps the initials when the picture failed to load', () => {
    forced.failed = true;
    const html = render(pick({ logo: LOGO }));
    expect(tile(html)).toBe('<span aria-hidden="true" class="kpop-h2-th kpop-h2-pick-tile">LO</span>');
    expect(html).not.toContain('<img');
  });

  it('keeps the initials when the logo is on a host the site cannot serve, or is protocol-relative (next/image would throw at render)', () => {
    for (const logo of ['https://elsewhere.example/x.png', '//rdkgouofytwfdpbxbzio.supabase.co/x.png', 'not a url']) {
      const html = render(pick({ logo }));
      expect(tile(html), logo).toBe('<span aria-hidden="true" class="kpop-h2-th kpop-h2-pick-tile">LO</span>');
      expect(html, logo).not.toContain('<img');
    }
  });
});

describe('the tile of a pick with no logo', () => {
  it('keeps the initials, as before, on every prefix', () => {
    expect(tile(render(pick()))).toBe('<span aria-hidden="true" class="kpop-h2-th kpop-h2-pick-tile">LO</span>');
    expect(tile(render(pick(), 'hub-h2'))).toBe('<span aria-hidden="true" class="hub-h2-th hub-h2-pick-tile">LO</span>');
    expect(tile(render(pick({ site: 'anime', tile: 'NA' }), 'anime-h2'))).toBe('<span aria-hidden="true" class="anime-h2-th anime-h2-pick-tile">NA</span>');
    expect(render(pick())).not.toContain('<img');
  });
});

describe('the kpop sheet', () => {
  const sheet = readFileSync(fileURLToPath(new URL('../../../styles/kpop/home-surprise.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('fills the square with the picture, cover-fit, and has a rule for every class the tile prints', () => {
    expect(sheet).toMatch(/\.kpop-h2-th-img \{[^}]*width: 100%;[^}]*height: 100%;[^}]*object-fit: cover;[^}]*\}/);
    const printed = new Set([...render(pick({ logo: LOGO })).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1]!.split(' ')).filter((c) => c.startsWith('kpop-h2-')));
    for (const c of printed) expect(sheet, c).toContain(`.${c}`);
  });
});
