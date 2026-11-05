// Surprise me, the tile of the pick (owner, 2026-11-04): the picture of the group in place of its initials ("LO" for Loossemble). The picture is the
// one the site shows everywhere, groupPhotoUrl(slug) (the photos of public/idols, else the Commons photo in Storage), and for General K-pop, which has
// no group photo, its fallback cover. The initials stay for a group with neither, when the picture is on a host the site cannot serve, and when it fails
// to load. The pick shows after a click and renderToStaticMarkup cannot click, so useState is replaced as home-surprise.prefix.test.ts does it: the
// pick state starts on `forced.pick`, and the "picture failed" state of the tile on `forced.failed`. next/image is a plain <img> so its props can be read.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GENERAL_KPOP_FALLBACK_COVER } from '@/lib/ux-v1/a0/general-kpop-cover';

import { HomeSurprise } from './home-surprise';

import type { SurprisePick } from './home-surprise';
import type { HubSurpriseCard } from '@/lib/site/hub/data/types';

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
    'data-sizes': p.sizes as string, 'data-loading': p.loading as string,
  }),
}));
// The pool the picks come from is read on the server; only the mapping of a card to a pick (toKpopPick) is used here.
vi.mock('@/lib/site/hub/data/surprise-kpop', () => ({ getKpopSurprisePool: async () => null }));

const STORAGE = 'https://rdkgouofytwfdpbxbzio.supabase.co';
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', STORAGE); });
afterEach(() => { forced.pick = null; forced.failed = false; vi.unstubAllEnvs(); });

const pick = (over: Partial<SurprisePick> = {}): SurprisePick => ({ id: 'k1', tile: 'LO', title: 'A quiz', href: '/q/a-quiz', site: 'kpop', pickLabel: 'Random pick from Loossemble', ...over });
const card = (group: string, groupSlug: string): HubSurpriseCard => ({
  id: `q-${groupSlug}`, site: 'kpop', siteName: 'KpopQuiz', tile: group.slice(0, 2).toUpperCase(), title: `Quiz of ${group}`, group, groupSlug, href: `https://kpopquiz.org/q/${groupSlug}-quiz`,
});
const LABELS = { button: 'Surprise me', play: 'Play', another: 'Another' };
const render = (shown: SurprisePick, prefix: 'hub-h2' | 'anime-h2' | 'kpop-h2' = 'kpop-h2'): string => {
  forced.pick = shown;
  return renderToStaticMarkup(h(HomeSurprise, { pool: [shown], playedIds: [], lede: 'Not sure what to play?', labels: LABELS, prefix }));
};
const tile = (html: string): string => /<span aria-hidden="true" class="[a-z0-9-]+-th [a-z0-9-]+-pick-tile">[\s\S]*?<\/span>(?=<span class="[a-z0-9-]+-pick-body")/.exec(html)![0];
const IMG = (src: string): string => `<span aria-hidden="true" class="kpop-h2-th kpop-h2-pick-tile"><img src="${src}" alt="" width="42" height="42" class="kpop-h2-th-img" data-sizes="42px" data-loading="eager"/></span>`;
const INITIALS = (t: string): string => `<span aria-hidden="true" class="kpop-h2-th kpop-h2-pick-tile">${t}</span>`;

/** The tile a card of the pool gets, as the site builds it: the card, its pick (toKpopPick), the component after a click. */
async function tileOf(c: HubSurpriseCard, prefix: 'hub-h2' | 'anime-h2' | 'kpop-h2' = 'kpop-h2'): Promise<string> {
  const { toKpopPick } = await import('@/lib/ux-v1/p1/home-surprise');
  return tile(render(toKpopPick(c), prefix));
}

describe('the tile of a pick of a group with a picture', () => {
  it('shows the photo of a group of public/idols, in the square, decorative, and not the initials', async () => {
    expect(await tileOf(card('BTS', 'bts'))).toBe(IMG('/idols/BTS.jpg'));
  });

  it('shows the photo in Storage of a group that has none in public/idols (Loossemble)', async () => {
    expect(await tileOf(card('Loossemble', 'loossemble'))).toBe(IMG(`${STORAGE}/storage/v1/object/public/images/group-photos/loossemble.jpg`));
  });

  it('shows the fallback cover for General K-pop, which has no group photo', async () => {
    expect(await tileOf(card('General K-pop', 'general-kpop'))).toBe(IMG(GENERAL_KPOP_FALLBACK_COVER));
  });

  it('keeps the rest of the row as it was: the group in the line, the link to the quiz, Another', async () => {
    const { toKpopPick } = await import('@/lib/ux-v1/p1/home-surprise');
    const html = render(toKpopPick(card('Loossemble', 'loossemble')));
    expect(html).toContain('<span class="kpop-h2-pick-k">Random pick from Loossemble</span>');
    expect(html).toContain('<a href="/q/loossemble-quiz" class="kpop-h2-pick-play kpop-h2-btn">Play</a>');
    expect(html).toContain('<button type="button" class="kpop-h2-pick-again">Another</button>');
    expect(html).not.toContain('>LO<');
  });

  it('is the same markup under the hub prefix, the picture class being the sheet\'s own', () => {
    const kpop = render(pick({ photo: '/idols/BTS.jpg' }));
    const hub = render(pick({ photo: '/idols/BTS.jpg' }), 'hub-h2');
    expect(hub).toBe(kpop.replace(/\bkpop-h2-/g, 'hub-h2-'));
    expect(hub).toContain('class="hub-h2-th-img"');
  });
});

describe('the initials stay', () => {
  it('for a group with neither a photo nor the General K-pop fallback', async () => {
    const html = await tileOf(card('An Unknown Group', 'an-unknown-group'));
    expect(html).toBe(INITIALS('AN'));
    expect(html).not.toContain('<img');
  });

  it('when the picture failed to load', async () => {
    forced.failed = true;
    expect(await tileOf(card('Loossemble', 'loossemble'))).toBe(INITIALS('LO'));
    expect(await tileOf(card('BTS', 'bts'))).toBe(INITIALS('BT'));
    expect(await tileOf(card('General K-pop', 'general-kpop'))).toBe(INITIALS('GE'));
  });

  it('when the picture is on a host the site cannot serve, or is protocol-relative (next/image would throw at render)', () => {
    for (const photo of ['https://elsewhere.example/x.png', `//${STORAGE.slice(8)}/x.png`, 'not a url']) {
      const html = render(pick({ photo }));
      expect(tile(html), photo).toBe(INITIALS('LO'));
      expect(html, photo).not.toContain('<img');
    }
  });

  it('on the hub and the OtakuQuiz home, which pass no picture: the markup is what it was, on every prefix', () => {
    expect(tile(render(pick()))).toBe(INITIALS('LO'));
    expect(tile(render(pick(), 'hub-h2'))).toBe('<span aria-hidden="true" class="hub-h2-th hub-h2-pick-tile">LO</span>');
    expect(tile(render(pick({ site: 'anime', tile: 'NA' }), 'anime-h2'))).toBe('<span aria-hidden="true" class="anime-h2-th anime-h2-pick-tile">NA</span>');
    expect(render(pick())).not.toContain('<img');
  });
});

describe('the kpop sheet', () => {
  const sheet = readFileSync(fileURLToPath(new URL('../../../styles/kpop/home-surprise.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('fills the square with the picture, cover-fit, and has a rule for every class the tile prints', () => {
    expect(sheet).toMatch(/\.kpop-h2-th-img \{[^}]*width: 100%;[^}]*height: 100%;[^}]*object-fit: cover;[^}]*\}/);
    const printed = new Set([...render(pick({ photo: '/idols/BTS.jpg' })).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1]!.split(' ')).filter((c) => c.startsWith('kpop-h2-')));
    for (const c of printed) expect(sheet, c).toContain(`.${c}`);
  });
});
