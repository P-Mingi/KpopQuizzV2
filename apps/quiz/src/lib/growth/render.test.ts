// Server-free render of the two V12 page components with their reads mocked.
//
// Why: two themed playlists (K-pop hits 2026, KPop Demon Hunters) are hidden on the
// real catalogue until the owner applies G2's SQL files, so their pages answer 404
// on a dev server and cannot be opened in a browser yet. This renders the SAME
// component the route renders, fed the shapes the reads will return after the
// apply, and checks the HTML: H1, lead, tracks, the bridge card on KPDH only, no
// Challenge on a KPDH run, no picture anywhere.
// What it does NOT prove: CSS, hydration, the real rows (see reports/G3.md).

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_UX_V1 = '1';
  process.env.NEXT_PUBLIC_UX_V12 = '1';
});

const data = vi.hoisted(() => ({
  state: { playable: new Set<string>(), counts: {} as Record<string, number> },
  tracks: [] as Array<{ title: string; artist: string }>,
  numbers: { songs: null as number | null, groups: null as number | null, fansToday: null as number | null },
}));

vi.mock('@/lib/growth/bt-data', () => ({
  getThemeState: async () => data.state,
  getThemeTracks: async () => data.tracks,
  getLandingNumbers: async () => data.numbers,
}));

vi.mock('next/link', async () => {
  const { createElement: h } = await import('react');
  return { default: ({ href, children, prefetch: _p, ...rest }: { href: string; children?: React.ReactNode; prefetch?: boolean }) => h('a', { href, ...rest }, children) };
});

// The islands are next/dynamic loaders in the app; here they print what they were given.
vi.mock('@/components/blindtest/ux-v1/mode-loader', async () => {
  const { createElement: h } = await import('react');
  return {
    BtModeControllerLoader: (p: { preset: { pick: { playlist: string }; count: number }; shareUrl: string; challengeLink?: boolean; children: React.ReactNode }) =>
      h('div', { 'data-controller': 'mode', 'data-playlist': p.preset.pick.playlist, 'data-count': p.preset.count, 'data-share': p.shareUrl, 'data-challenge': String(p.challengeLink ?? true) }, p.children),
    BtThemePlayLoader: (p: { label: string }) => h('button', { type: 'button', 'data-g3': 'play' }, p.label),
    BtModeErrorLoader: () => null,
    BtLandingControllerLoader: (p: { lang: string; shareUrl: string; children: React.ReactNode }) => h('div', { 'data-controller': 'landing', 'data-lang': p.lang, 'data-share': p.shareUrl }, p.children),
    BtLandingStartLoader: (p: { label: string }) => h('button', { type: 'button', 'data-g3': 'start' }, p.label),
    BtLandingErrorLoader: () => null,
  };
});

import { BlindtestLanding, landingMetadata } from '@/components/blindtest/ux-v1/landing';
import { BlindtestThemeV12, themeMetadata } from '@/components/blindtest/ux-v1/theme-page';

import { LANDING_LANGS } from './bt-landing';
import { KPDH_ID, themeById } from './bt-themes';

const ALL = new Set(['kpop-hits-2026', 'kpop-hits-2025', '5th-gen', 'tiktok-viral', KPDH_ID, '4th-gen']);

async function theme(id: string): Promise<string> {
  return renderToStaticMarkup(await BlindtestThemeV12({ theme: themeById(id)! }));
}
const count = (html: string, re: RegExp): number => (html.match(re) ?? []).length;

beforeEach(() => {
  data.state = { playable: new Set(ALL), counts: { 'kpop-hits-2026': 60, 'kpop-hits-2025': 60, '5th-gen': 346, '4th-gen': 1097, [KPDH_ID]: 12, 'tiktok-viral': 26 } };
  data.tracks = [];
  data.numbers = { songs: null, groups: null, fansToday: null };
});

describe('theme page: KPop Demon Hunters (after v12-g2-07 is applied)', () => {
  it('H1, lead, the songs, the bridge card, and no Challenge on the run', async () => {
    data.tracks = [{ title: 'Golden', artist: 'HUNTR/X' }, { title: 'Soda Pop', artist: 'Saja Boys' }, { title: 'Strategy', artist: 'TWICE' }];
    const html = await theme(KPDH_ID);
    expect(count(html, /<h1[ >]/g)).toBe(1);
    expect(html).toContain('<h1 id="g3-h1">KPop Demon Hunters songs blind test</h1>');
    expect(html).toContain('Audio clips only, no images from the film.');
    expect(html).toContain('data-playlist="kpop-demon-hunters"');
    expect(html).toContain('data-challenge="false"');
    expect(html).toContain('data-share="https://kpopquiz.org/blindtest/kpop-demon-hunters"');
    expect(html).toContain('Loved HUNTR/X? Find your real K-pop girl group');
    expect(html).toContain('href="/kpop-demon-hunters-quiz"');
    expect(html).toContain('Play this playlist');
    expect(html).toContain('href="/live"');
    expect(count(html, /class="g3-tr"/g)).toBe(3);
    expect(html).toContain('<b>Golden</b> <span>· HUNTR/X</span>');
    expect(html).toContain('12 songs');
    // text and audio only: no picture of any kind on the page
    expect(count(html, /<img|<picture|background-image|url\(/g)).toBe(0);
    // the page does not list itself under More playlists
    expect(count(html, /href="\/blindtest\/kpop-demon-hunters"/g)).toBe(0);
    expect(count(html, /class="ux-thm"/g)).toBe(5);
  });

  it('BreadcrumbList JSON-LD and metadata', async () => {
    const html = await theme(KPDH_ID);
    const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]!) as { '@type': string; itemListElement: Array<{ name: string; item: string }> };
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.map((i) => i.item)).toEqual(['https://kpopquiz.org/', 'https://kpopquiz.org/blindtest', 'https://kpopquiz.org/blindtest/kpop-demon-hunters']);
    const meta = themeMetadata(themeById(KPDH_ID)!);
    expect(meta.title).toBe('KPop Demon Hunters songs blind test');
    expect(meta.alternates?.canonical).toBe('/blindtest/kpop-demon-hunters');
  });
});

describe('theme page: K-pop hits 2026 (after v12-g2-03 is applied)', () => {
  it('no bridge card, Challenge kept, the real count on the cover', async () => {
    data.tracks = Array.from({ length: 10 }, (_, i) => ({ title: `Song ${i + 1}`, artist: `Act ${i + 1}` }));
    const html = await theme('kpop-hits-2026');
    expect(html).toContain('<h1 id="g3-h1">K-pop hits 2026 blind test</h1>');
    expect(html).toContain('data-playlist="kpop-hits-2026"');
    expect(html).toContain('data-challenge="true"');
    expect(html).not.toContain('HUNTR/X');
    expect(html).not.toContain('/kpop-demon-hunters-quiz');
    expect(count(html, /class="g3-tr"/g)).toBe(10);
    expect(html).toContain('<small>Updated every week</small>');
    expect(html).toContain('60 songs');
  });

  it('a section without data is not rendered (no empty list, no count of zero)', async () => {
    data.state = { playable: new Set(['kpop-hits-2026']), counts: {} };
    const html = await theme('kpop-hits-2026');
    expect(html).not.toContain('Songs in this playlist');
    expect(count(html, /\d+ songs/g)).toBe(0);
    // the v11 4th gen card is always there
    expect(count(html, /class="ux-thm"/g)).toBe(1);
  });
});

describe('landing', () => {
  it('each language: one H1, its lang, the switch, the steps, the FAQ and its JSON-LD', async () => {
    data.numbers = { songs: 4120, groups: 79, fansToday: null };
    for (const lang of LANDING_LANGS) {
      const html = renderToStaticMarkup(await BlindtestLanding({ lang }));
      expect(count(html, /<h1[ >]/g), lang).toBe(1);
      expect(html).toContain(`data-controller="landing" data-lang="${lang}"`);
      expect(count(html, /hrefLang="(en|fr|es|id)"/gi)).toBeGreaterThanOrEqual(7); // 4 in the switch, 3 in the foot row
      expect(count(html, /aria-current="page"/g)).toBe(1);
      expect(count(html, /class="ux-steps3-t"/g)).toBe(3);
      expect(count(html, /<details/g)).toBe(3);
      expect(html.includes("document.documentElement.lang='")).toBe(lang !== 'en');
      if (lang !== 'en') expect(html).toContain(`document.documentElement.lang='${lang}';`);
      // no "fans playing today" without a real count from bt_runs
      expect(html).not.toContain('p6-eyebrow');
      const lds = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!) as { '@type': string; mainEntity?: Array<{ name: string; acceptedAnswer: { text: string } }> });
      expect(lds.map((l) => l['@type'])).toEqual(['BreadcrumbList', 'FAQPage']);
      const visible = [...html.matchAll(/<summary>(.*?)<svg[\s\S]*?<p class="p6-ab">(.*?)<\/p>/g)].map((m) => [m[1], m[2]]);
      const unescape = (s: string): string => s.replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      expect(visible.map(([q, a]) => [unescape(q!), unescape(a!)])).toEqual(lds[1]!.mainEntity!.map((q) => [q.name, q.acceptedAnswer.text]));
    }
  });

  it('the eyebrow appears with a real count, and the numbers of the lead are the real ones', async () => {
    data.numbers = { songs: 4296, groups: 83, fansToday: 312 };
    const html = renderToStaticMarkup(await BlindtestLanding({ lang: 'en' }));
    expect(html).toContain('312 fans playing today');
    expect(html).toContain('4,296 songs, 83 group playlists,');
    expect(html).not.toContain('4,120');
    expect(html).not.toContain('1,204');
  });

  it('a hidden themed playlist has no card', async () => {
    data.state = { playable: new Set(['5th-gen', 'kpop-hits-2025', 'tiktok-viral']), counts: { '5th-gen': 284 } };
    const html = renderToStaticMarkup(await BlindtestLanding({ lang: 'fr' }));
    expect(count(html, /class="ux-thm"/g)).toBe(4);
    expect(html).not.toContain('/blindtest/kpop-demon-hunters');
    expect(html).not.toContain('/blindtest/kpop-hits-2026');
    expect(html).toContain('284 chansons');
  });

  it('metadata: title, self canonical, the four-page cluster with x-default English, indexable', () => {
    const m = landingMetadata('id');
    expect(m.title).toBe('Tebak lagu K-pop gratis');
    expect(m.alternates?.canonical).toBe('/id/tebak-lagu-kpop');
    expect(m.alternates?.languages).toEqual({ en: '/guess-the-kpop-song', fr: '/fr/blind-test-kpop', es: '/es/adivina-la-cancion-kpop', id: '/id/tebak-lagu-kpop', 'x-default': '/guess-the-kpop-song' });
    expect(m.robots).toEqual({ index: true, follow: true });
    expect(landingMetadata('en').title).toBe('Guess the K-pop song: free K-pop blind test');
  });
});
