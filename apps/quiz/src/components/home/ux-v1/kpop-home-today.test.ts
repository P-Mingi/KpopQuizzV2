// Owner, 2026-11-23, the kpopquiz.org home: (1) "correct the space here": the KpopCards banner no longer touches the quiz of the day; (2) "Put the daily
// game and daily quiz side by side": the Kpopdle card sits next to the quiz of the day; (3) its picture is set in the admin's Icônes du jeu, Accueil,
// jeux du jour, Kpopdle ("je le veux ici"); (4) "Make this button pink (and beautiful)": the KpopCards button of the top bar.
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DleDay } from '@/lib/dle/types';
import type { LiveAsset } from '@/lib/photos/public-read';

const src = (f: string): string => readFileSync(new URL(f, import.meta.url), 'utf8');
const kd = { on: true };
const live = { rows: [] as unknown[] };

describe('1 and 2. the quiz of the day and the Kpopdle card side by side, a gap above the KpopCards banner', () => {
  const anime = vi.fn();
  beforeEach(() => {
    anime.mockReset();
    vi.doMock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
    vi.doMock('@/components/home/activity-ticker', () => ({ ActivityTicker: () => null }));
    vi.doMock('@/components/home/ux-v1/islands', () => ({ HomeHeader: () => h('header', { className: 'p1-hhead' }), ContinuePlaying: () => h('div', { className: 'p1-cont' }), BlindtestBand: () => null, QotdNote: () => null }));
    vi.doMock('@/components/home/ux-v1/qotd-row', () => ({ QotdRow: () => h('section', { className: 'p1-qotd' }) }));
    vi.doMock('@/lib/ux-v1/p1/kpopdle-home', () => ({ loadKpopdleHome: async () => (kd.on ? h('section', { className: 'p1-kd' }) : null) }));
    vi.doMock('@/lib/ux-v1/p1/anime-daily-home', () => ({ loadAnimeDailyHome: async () => { anime(); return null; } }));
    vi.doMock('@/lib/cards-bridge/home', () => ({ loadCardsHome: async () => h('section', { id: 'kpopcards' }) }));
    vi.doMock('@/lib/ux-v1/p1/home-data', () => ({
      getHomeQotd: async () => ({ id: 'qotd-1', slug: 'the-quiz', title: 'The quiz' }),
      getHomeGroups: async () => ({ groups: [], visibleGroups: 0 }),
      getHomeCommunity: async () => ({ rows: [], verse: null }),
      getHomeBand: async () => ({ date: '2026-11-23', fans: 0 }),
      getHomeLists: async () => ({ trending: [], best: [], fresh: [] }),
    }));
  });
  afterEach(() => {
    for (const m of ['next/image', '@/components/home/activity-ticker', '@/components/home/ux-v1/islands', '@/components/home/ux-v1/qotd-row', '@/lib/ux-v1/p1/kpopdle-home',
      '@/lib/ux-v1/p1/anime-daily-home', '@/lib/cards-bridge/home', '@/lib/ux-v1/p1/home-data']) vi.doUnmock(m);
    vi.resetModules();
    kd.on = true;
  });

  const render = async (): Promise<string> => {
    vi.resetModules();
    const { UxHome } = await import('./ux-home');
    return renderToStaticMarkup(await UxHome({ afterHeader: h('div', { className: 'kpop-h2-surprise' }) }));
  };

  it('Surprise me, then one row with the quiz of the day and the Kpopdle card, then the banner in its own gap, then Continue playing', async () => {
    const html = await render();
    expect(html).toContain('<div class="kpop-h2-surprise"></div><div class="p1-today"><section class="p1-qotd"></section><section class="p1-kd"></section></div><div class="p1-cards"><section id="kpopcards"></section></div><div class="p1-cont"></div>');
    // The OtakuQuiz module is not even asked for when Kpopdle is there.
    expect(anime).not.toHaveBeenCalled();
  });

  it('without the Kpopdle card the row is the quiz of the day alone, as before', async () => {
    kd.on = false;
    const html = await render();
    expect(html).not.toContain('p1-today');
    expect(html).toContain('<div class="kpop-h2-surprise"></div><section class="p1-qotd"></section><div class="p1-cards"><section id="kpopcards"></section></div>');
    expect(anime).toHaveBeenCalledTimes(1);
  });

  it('the styles: two equal columns from 761px ("both in the same row side by side"), the 24px gaps; a narrow Kpopdle card stacks its picture', () => {
    const css = src('../../../styles/ux-v1/p1.css');
    expect(css).toContain('.p1-today { display: grid; gap: 24px; }');
    expect(css).toContain('.p1-cards { margin-top: 24px; }');
    const wide = css.slice(css.indexOf('@media (min-width: 761px)'));
    expect(wide).toContain('.p1-today { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }');
    expect(wide).toContain('.p1-today .p1-qotd { flex-direction: column;');
    expect(css).not.toContain('961px');
    const kd = src('./kpopdle-home.tsx');
    expect(kd).toContain('.p1-kd { height: 100%; container: p1kd / inline-size; }');
    expect(kd).toContain('@container p1kd (max-width: 440px) {\n  .p1-kd-card { flex-direction: column; gap: 14px; }');
  });
});

describe('3. the picture of the Kpopdle card comes from the Icônes du jeu (Accueil, jeux du jour, Kpopdle)', () => {
  const DAY: DleDay = { game: 'kpopdle-idol', now: '2026-11-23T10:00:00Z', date: '2026-11-23', game_no: 17, seconds_left: 50_400, yesterday: null, stats: null, play: null } as unknown as DleDay;
  const rpc = vi.fn();
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: DAY, error: null });
    live.rows = [];
    vi.doMock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn }));
    vi.doMock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({ rpc }) }));
    vi.doMock('@/lib/photos/public-read', () => ({ assetPosition: () => '50% 50%', getLiveAssets: async () => live.rows, getPublicPictures: async () => [], safePath: (p: unknown) => p }));
  });
  afterEach(() => {
    for (const m of ['next/cache', '@/lib/supabase/server', '@/lib/photos/public-read']) vi.doUnmock(m);
    vi.resetModules();
  });

  const asset = (o: Partial<LiveAsset>): LiveAsset => ({
    key: 'x', type: 'icon', page: 'home', settings: {}, large: null, mid: null, thumb: null, width: null, height: null, sourceUrl: null, author: null, license: null, licenseNote: null, publishedAt: null, ...o,
  });
  const card = async (): Promise<string> => {
    vi.resetModules();
    const { kpopdleHome } = await import('./kpopdle-home');
    return renderToStaticMarkup((await kpopdleHome())!);
  };

  it('nothing saved: the grid of squares, as before (the defaults of the slot never replace it)', async () => {
    const html = await card();
    expect(html).toContain('<span class="p1-kd-tiles" aria-hidden="true"><span class="p1-kd-t"></span>');
    expect(html).not.toContain('data-slot-icon');
  });

  it('an icon of the library saved there: drawn as on the bunnyverse.org home (IconMark), in place of the grid', async () => {
    live.rows = [asset({ key: 'icon:today-kpopdle', settings: { mode: 'icon', icon: 'star', circle: true, color: 'ink' } })];
    const html = await card();
    expect(html).toContain('data-slot-icon="today-kpopdle" data-slot-mode="icon"');
    expect(html).not.toContain('<span class="p1-kd-tiles"');
  });

  it('a PNG saved there wins over the picture of Bannières et images', async () => {
    live.rows = [
      asset({ key: 'icon:today-kpopdle', settings: { mode: 'png', icon: 'idol', circle: true, color: 'k' }, thumb: 'https://cdn.test/kd-96.png', large: 'https://cdn.test/kd-400.png' }),
      asset({ key: 'icon:kpopdle-idol', type: 'card_image', mid: 'https://cdn.test/banner-400.webp', large: 'https://cdn.test/banner.webp' }),
    ];
    const html = await card();
    expect(html).toContain('data-slot-icon="today-kpopdle" data-slot-mode="png"');
    expect(html).toContain('src="https://cdn.test/kd-96.png"');
    expect(html).not.toContain('banner-400.webp');
  });

  it('with nothing saved there, the picture of Bannières et images still shows', async () => {
    live.rows = [asset({ key: 'icon:kpopdle-idol', type: 'card_image', mid: 'https://cdn.test/banner-400.webp', large: 'https://cdn.test/banner.webp' })];
    const html = await card();
    expect(html).toContain('src="https://cdn.test/banner-400.webp"');
    expect(html).not.toContain('data-slot-icon');
  });

  it('the admin names both homes on the slot', () => {
    expect(src('../../../lib/photos/slots.ts')).toContain("{ id: 'today-kpopdle', name: 'Kpopdle', where: 'Accueil bunnyverse.org et kpopquiz.org, carte Kpopdle', page: 'home'");
  });
});

describe('4. the KpopCards button of the top bar: a pink pill', () => {
  const lum = (hex: string): number => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
  };
  const onWhite = (hex: string): number => 1.05 / (lum(hex) + 0.05);

  it('a pink pill with the photocard icon before the label, still a nofollow link', async () => {
    const { NavBridgeLinks } = await import('@/components/cards-bridge/nav-bridges');
    const html = renderToStaticMarkup(h(NavBridgeLinks, { items: [{ key: 'cards', label: 'KpopCards', href: '/x' }] }));
    expect(html).toContain('<a class="ux-bridge ux-bridge-cards" href="/x" rel="nofollow" data-bridge="cards"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">');
    expect(html).toContain('</svg>KpopCards</a>');
    expect(html).not.toContain('ux-btn-ghost');
  });

  it('every stop of the pink is AA with its white label (4.5:1), and the pill is still hidden under 1100px', () => {
    const file = src('../../cards-bridge/nav-bridges.tsx');
    const grad = /\.ux-bridge\{[^}]*background:linear-gradient\(135deg,([^)]*)\)/.exec(file)?.[1] ?? '';
    const stops = grad.match(/#[0-9A-Fa-f]{6}/g) ?? [];
    expect(stops.length).toBeGreaterThanOrEqual(2);
    for (const s of stops) expect(onWhite(s), s).toBeGreaterThanOrEqual(4.5);
    expect(file).toContain('@media (max-width:1100px){.ux-bridges{display:none}}');
    expect(file).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('no dash in what this change wrote', () => {
    for (const f of ['../../cards-bridge/nav-bridges.tsx', './kpopdle-home.tsx', './ux-home.tsx', '../../../styles/ux-v1/p1.css', './kpop-home-today.test.ts']) {
      expect(src(f), f).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
