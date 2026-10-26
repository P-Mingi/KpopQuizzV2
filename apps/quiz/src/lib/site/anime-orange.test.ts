// Run O1, owner order of 2026-10-26: OtakuQuiz turns orange and drops the blind test.
//   tokens   styles/sites/anime/tokens.css says what the anime entry of the registry says, in the three theme blocks; the accent family is the
//            design's orange; every text pair passes WCAG AA on the exact values (4.5 text, 3 large text and UI).
//   kpop     the kpop theme keeps every value, byte for byte.
//   no pink  the anime theme, the anime sheets and the anime-only code hold none of the kpop pink hexes, and the stylesheet the anime build
//            serves keeps a pink literal only in the shared kpop rules of features the anime site does not have.
//   no blind test  the feature flags, the route map, the rewrites, the nav, the tab bar, the footer and the home carry no blind test.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildUxStylesheet } from '@/lib/ux-v1/a0/stylesheet';

import { REGISTRY } from './registry';
import { isKnownRouteFor, rewritesFor } from './routing';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(`${SRC}${rel}`, 'utf8');
const ANIME = REGISTRY.anime.theme;
const KPOP = REGISTRY.kpop.theme;
const SC = 'html.ux-v1[data-site="anime"]';
const flags = { v1: true, v12: true } as const;

/** The `--name: value` pairs of the rule whose selector is exactly `selector`. */
function vars(css: string, selector: string): Record<string, string> {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

// ---- tokens

describe('styles/sites/anime/tokens.css', () => {
  const tokens = read('styles/sites/anime/tokens.css');
  const blocks = [
    { name: 'light', selector: SC, theme: ANIME.light, kpop: KPOP.light },
    { name: 'dark class', selector: 'html.ux-v1.dark[data-site="anime"]', theme: ANIME.dark, kpop: KPOP.dark },
    { name: 'dark system', selector: `${SC}:not(.light)`, theme: ANIME.dark, kpop: KPOP.dark },
  ];

  it('declares the values of the anime entry of the registry, and every name that differs from kpop, in all three theme blocks', () => {
    for (const b of blocks) {
      const declared = vars(tokens, b.selector);
      for (const [name, value] of Object.entries(declared)) {
        expect(name.startsWith('ux-'), `${b.name} ${name}`).toBe(true);
        expect(value, `${b.name} ${name}`).toBe((b.theme as Record<string, string>)[name.slice(3)]);
      }
      const t = b.theme as Record<string, string>;
      const k = b.kpop as Record<string, string>;
      const changed = Object.keys(t).filter((n) => t[n] !== k[n]).map((n) => `ux-${n}`).sort();
      expect(Object.keys(declared).sort(), b.name).toEqual(changed);
    }
  });

  it('turns the accent family orange with the values of the design (fill #C2410C, soft #FFF1E6, ink #9A3412)', () => {
    const l = ANIME.light as Record<string, string>;
    expect(l['pink-fill']).toBe('#C2410C');
    expect(l['pink-soft']).toBe('#FFF1E6');
    expect(l['pink-ink']).toBe('#9A3412');
    expect(l['pink-soft-ink']).toBe('#9A3412');
    expect(l['pink-line']).toBe('#F7DCC7');
    const d = ANIME.dark as Record<string, string>;
    expect(d.pink).toBe('#F97316');
    expect(d['pink-ink']).toBe('#FDBA74');
    expect(d['pink-line']).toBe('#5A3820');
    for (const n of ['pink', 'pink-fill', 'pink-fill-h', 'pink-ink', 'pink-soft', 'pink-soft-ink', 'pink-line']) {
      expect(l[n], `light ${n}`).not.toBe((KPOP.light as Record<string, string>)[n]);
      expect(d[n], `dark ${n}`).not.toBe((KPOP.dark as Record<string, string>)[n]);
    }
  });
});

// ---- contrast

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('contrast of the orange accent, light and dark (WCAG 2)', () => {
  const themes = [
    { name: 'light', t: ANIME.light as Record<string, string> },
    { name: 'dark', t: ANIME.dark as Record<string, string> },
  ];
  // [foreground, background, minimum]: text 4.5, large text and UI parts 3 (tokens.md section 6).
  const PAIRS: [string, string, number][] = [
    ['on-accent', 'pink-fill', 4.5], ['on-accent', 'pink-fill-h', 4.5],
    ['pink-ink', 'page', 4.5], ['pink-ink', 'surface', 4.5], ['pink-ink', 'surface-2', 4.5], ['pink-ink', 'raised', 4.5],
    ['pink-soft-ink', 'pink-soft', 4.5], ['pink-ink', 'pink-soft', 4.5],
    ['ink', 'pink-soft', 4.5], ['muted', 'pink-soft', 4.5],
    ['pink', 'page', 3], ['pink', 'raised', 3], ['pink', 'surface', 3],
    ['pink-fill', 'page', 3], ['pink-fill', 'raised', 3], ['pink-fill-h', 'page', 3], ['pink-fill-h', 'raised', 3],
    ['hl', 'page', 3], ['hl', 'raised', 3],
  ];
  for (const { name, t } of themes) {
    it.each(PAIRS)(`${name}: %s on %s is at least %s`, (fg, bg, min) => {
      const f = t[fg];
      const b = t[bg];
      expect(f, fg).toMatch(/^#[0-9A-F]{6}$/);
      expect(b, bg).toMatch(/^#[0-9A-F]{6}$/);
      const ratio = contrast(f!, b!);
      expect(ratio, `${name} ${fg} ${f} on ${bg} ${b}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
    });
  }

  it('records the ratios the hand-back quotes', () => {
    const l = ANIME.light as Record<string, string>;
    const d = ANIME.dark as Record<string, string>;
    expect(contrast(l['on-accent']!, l['pink-fill']!)).toBeCloseTo(5.18, 2);
    expect(contrast(l['pink-ink']!, l.page!)).toBeCloseTo(6.89, 2);
    expect(contrast(l['pink-soft-ink']!, l['pink-soft']!)).toBeCloseTo(6.6, 2);
    expect(contrast(d['on-accent']!, d['pink-fill']!)).toBeCloseTo(5.18, 2);
    expect(contrast(d['on-accent']!, d['pink-fill-h']!)).toBeCloseTo(4.52, 2);
    expect(contrast(d['pink-ink']!, d.page!)).toBeCloseTo(11, 2);
    expect(contrast(d['pink-soft-ink']!, d['pink-soft']!)).toBeCloseTo(8.78, 2);
  });
});

// ---- kpop unchanged

describe('the kpop theme is unchanged', () => {
  it('keeps the accent family, byte for byte', () => {
    expect(KPOP.light).toMatchObject({
      pink: '#E8457A', 'pink-fill': '#D13A6E', 'pink-fill-h': '#BE2F62', 'pink-ink': '#C43565',
      'pink-soft': '#FCE8EF', 'pink-soft-ink': '#B3305C', 'pink-line': '#F2CFDB', 'on-accent': '#FFFFFF',
    });
    expect(KPOP.dark).toMatchObject({
      'pink-ink': '#FF7AA5', 'pink-soft': '#3A2129', 'pink-soft-ink': '#FF9DBC', 'pink-line': '#4A2A37', 'on-accent': '#FFFFFF',
    });
    // The dark block of kpop does not set these three: the light value applies there.
    expect(Object.keys(KPOP.dark)).not.toContain('pink');
    expect(Object.keys(KPOP.dark)).not.toContain('pink-fill');
    expect(Object.keys(KPOP.dark)).not.toContain('pink-fill-h');
    expect(Object.keys(KPOP.light)).toHaveLength(Object.keys(REGISTRY.kpop.theme.light).length);
  });

  it('is not what the anime or the hub entry were built from by reference (a change of one cannot move another)', () => {
    expect(REGISTRY.anime.theme.light).not.toBe(REGISTRY.kpop.theme.light);
    expect(REGISTRY.anime.theme.dark).not.toBe(REGISTRY.kpop.theme.dark);
    expect(REGISTRY.hub.theme.light).not.toBe(REGISTRY.kpop.theme.light);
  });
});

// ---- no pink

/** Every kpop pink value (light and dark) that carries a pink hue; --ux-acc-pink (the "pink" name colour a fan can choose) is a fan's pick, not the site's accent. */
const KPOP_PINKS = [
  '#E8457A', '#D13A6E', '#BE2F62', '#C43565', '#FCE8EF', '#B3305C', '#F2CFDB', '#FF7AA5', '#3A2129', '#FF9DBC', '#4A2A37', '#DB4B7E',
  '#FBE1EA', '#FCEBF1', '#FEF6F8', '#F4D6E1', '#36202B', '#2B1D25', '#221B1F', '#40283A', '#FF8FB4', '#8A2A4C', '#F9A8D4', '#B41758',
];
const hasPink = (text: string): string[] => KPOP_PINKS.filter((p) => text.toUpperCase().includes(p));

function filesUnder(dir: string, test: (f: string) => boolean): string[] {
  const out: string[] = [];
  for (const e of readdirSync(`${SRC}${dir}`)) {
    const rel = `${dir}/${e}`;
    if (statSync(`${SRC}${rel}`).isDirectory()) out.push(...filesUnder(rel, test));
    else if (test(rel)) out.push(rel);
  }
  return out;
}

describe('no pink on otakuquiz.org', () => {
  it('the anime theme holds no kpop pink, in any token, light or dark', () => {
    for (const [mode, t] of [['light', ANIME.light], ['dark', ANIME.dark]] as const) {
      for (const [name, value] of Object.entries(t)) {
        expect(hasPink(String(value)), `${mode} ${name}`).toEqual([]);
      }
    }
  });

  it('the anime sheets use tokens only: no kpop pink and no colour literal in any rule outside tokens.css', () => {
    for (const f of filesUnder('styles/sites/anime', (x) => x.endsWith('.css'))) {
      const css = read(f);
      expect(hasPink(css), f).toEqual([]);
      if (!f.endsWith('/tokens.css')) {
        const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
        expect(body.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/g) ?? [], f).toEqual([]);
        expect(body, f).not.toMatch(/\bpink\b(?!-)/i);
      }
    }
  });

  it('the anime-only code holds no kpop pink', () => {
    const files = [
      ...filesUnder('components/anime', (f) => /\.tsx?$/.test(f) && !/\.test\./.test(f)),
      ...filesUnder('app/sites/[site]/(anime)', (f) => /\.tsx?$/.test(f)),
      ...filesUnder('lib/anime', (f) => /\.tsx?$/.test(f) && !/\.test\./.test(f)),
      'app/sites/[site]/home-anime.tsx',
    ];
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) expect(hasPink(read(f)), f).toEqual([]);
  });

  describe('the stylesheet the anime build serves', () => {
    const sheet = buildUxStylesheet({ v12: true, site: 'anime', stylesDir: `${SRC}styles` });
    const siteTokens = new Set(Object.keys(vars(read('styles/sites/anime/tokens.css'), SC)).map((n) => `--${n}`));

    it('overrides, in the anime sheet, every --ux custom property of the shared sheets that holds a kpop pink', () => {
      const shared = sheet.slice(0, sheet.indexOf('/* sites/anime/'));
      const pinkProps = new Set<string>();
      for (const m of shared.matchAll(/(--ux-[a-z0-9-]+):\s*([^;}]+)[;}]/g)) if (hasPink(m[2]!).length > 0) pinkProps.add(m[1]!);
      // acc-pink is not in the set: no kpop pink hex above is its value.
      expect([...pinkProps].sort().filter((p) => !siteTokens.has(p))).toEqual([]);
    });

    it('keeps a pink literal only in the shared rules of features the anime site does not have', () => {
      const shared = sheet.slice(0, sheet.indexOf('/* sites/anime/'));
      const rules: string[] = [];
      for (const m of shared.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const body = m[2]!.replace(/--ux-[a-z0-9-]+:[^;]*;?/g, '');
        if (hasPink(body).length > 0) rules.push(m[1]!.trim());
      }
      // The live pulse (live is off), the equaliser bars and bars of the blind test band and hero (both gone), the tier list legend
      // (no tier list) and the fallback tint of the passport band (the band always sets --p10-tint inline).
      expect(rules).toEqual(['.p1-pulse', '.p1-eqv i', '.p10-band', '.p6-bars i', '.p6-eq i', '.p7-t-legend']);
    });
  });
});

// ---- no blind test

describe('OtakuQuiz has no blind test', () => {
  const A = REGISTRY.anime;

  it('has the blind test features off, and the opening of the day on', () => {
    expect(A.features.blindTest).toBe(false);
    expect(A.features.dailyBlindTest).toBe(false);
    expect(A.features.openingOfTheDay).toBe(true);
    expect(REGISTRY.kpop.features.blindTest).toBe(true);
    expect(REGISTRY.kpop.features.dailyBlindTest).toBe(true);
  });

  it('lists no /blindtest path in its route allowlist, and keeps the openings quiz and the opening of the day', () => {
    const allow = A.routes.allow;
    expect(Array.isArray(allow)).toBe(true);
    for (const p of allow as string[]) expect(p, p).not.toMatch(/blindtest/);
    expect(allow).toContain('/{series}-openings-quiz');
    expect(allow).toContain('/opening-of-the-day');
    expect(isKnownRouteFor('anime', '/blindtest', flags)).toBe(false);
    expect(isKnownRouteFor('anime', '/blindtest/series-naruto', flags)).toBe(false);
  });

  it('the /blindtest hub page answers 404 on anime and nothing reaches it (the rewrites send the path to the 404 first)', () => {
    const pages = filesUnder('app/sites/[site]/(anime)', (f) => /(?:^|\/)blindtest(?:\/|$)/.test(f)).sort();
    expect(pages).toEqual(['app/sites/[site]/(anime)/blindtest/[mode]/page.tsx', 'app/sites/[site]/(anime)/blindtest/page.tsx']);
    // The hub page stays only to keep the kpop client chunk grouping (e2e/o1/O2/kpop-chunk-count.sh), guarded by the feature flag.
    expect(read('app/sites/[site]/(anime)/blindtest/page.tsx')).toMatch(/if \(!SITE\.features\.blindTest\) notFound\(\);/);
    expect(rewritesFor('anime').map((r) => r.source)).toEqual(expect.arrayContaining(['/sites/anime/blindtest', '/sites/anime/blindtest/:rest*']));
  });

  describe('the doors of the anime build', () => {
    afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
    const hrefsOf = (html: string): string[] => [...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1]!);
    const internal = (hrefs: string[]): string[] => hrefs.filter((u) => u.startsWith('/') && !u.startsWith('//'));
    const known = (u: string): boolean => isKnownRouteFor('anime', u.split(/[?#]/)[0]!, flags);

    async function onAnime<T>(load: () => Promise<T>): Promise<T> {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
      return load();
    }

    it('nav and tab bar: no blind test item, every link a route of the site', async () => {
      const { navItemsFor, tabItemsFor } = await onAnime(() => import('@/lib/ux-v1/a0/nav'));
      const { SITE } = await import('@/lib/site/registry');
      const items = [...navItemsFor(SITE), ...tabItemsFor(SITE)];
      expect(items.length).toBeGreaterThan(5);
      for (const it of items) {
        expect(it.key, it.href).not.toBe('blindtest');
        expect(it.href).not.toMatch(/blindtest/);
        expect(known(it.href), it.href).toBe(true);
      }
    });

    it('footer: no blind test link, every internal link a route of the site', async () => {
      vi.doMock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
      vi.doMock('next/navigation', () => ({ usePathname: () => '/quizzes' }));
      const { UxFooter } = await onAnime(() => import('@/components/layout/ux-v1/ux-footer'));
      const html = renderToString(h(UxFooter, { showFandoms: true, year: 2026 }));
      expect(html).not.toMatch(/blind ?test/i);
      for (const u of internal(hrefsOf(html))) expect(known(u), u).toBe(true);
    });

    it('home: no blind test band, no link to /blindtest, every internal link a route of the site', async () => {
      vi.doMock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
      vi.doMock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => null }));
      vi.doMock('@/components/home/activity-ticker', () => ({ ActivityTicker: () => null }));
      vi.doMock('@/lib/ux-v1/p1/home-data', () => ({
        getHomeQotd: async () => null,
        getHomeGroups: async () => ({ groups: [{ slug: 'one-piece', name: 'One Piece', photo: null, initials: 'OP', quizzes: 3, isNew: false }], visibleGroups: 12 }),
        getHomeCommunity: async () => ({ rows: [], verse: null }),
        getHomeBand: async () => ({ date: '2026-10-26', fans: 5 }),
        getHomeLists: async () => ({ trending: [], best: [], fresh: [] }),
      }));
      const { UxHome } = await onAnime(() => import('@/components/home/ux-v1/ux-home'));
      const html = renderToString(await UxHome({}));
      expect(html).not.toMatch(/blind ?test/i);
      const hrefs = internal(hrefsOf(html));
      expect(hrefs.length).toBeGreaterThan(2);
      for (const u of hrefs) expect(known(u), u).toBe(true);
    });

    it('the default passport theme is the site accent: orange on anime, the kpop values kept on kpop', async () => {
      const anime = await onAnime(() => import('@/lib/ux-v1/p10/passport-model'));
      expect(anime.themeColours(null)).toEqual({ band: '#FFF1E6', bar: '#C2410C' });
      expect(anime.themeColours('purple')).toEqual({ band: '#EEEDFE', bar: '#7F77DD' });
      vi.resetModules();
      vi.unstubAllEnvs();
      const kpop = await import('@/lib/ux-v1/p10/passport-model');
      expect(kpop.themeColours(null)).toEqual({ band: '#FCE8EF', bar: '#E8457A' });
    });

    it('copy: the streak line, the passport stats and the sign-in stats name no blind test', async () => {
      const { personalStats } = await onAnime(() => import('@/lib/ux-v1/p10/passport-model'));
      const stats = personalStats({ quizzesPlayed: 3, averagePct: 50, streak: 2, quizzesMade: 1, blindtestsPlayed: 4 });
      expect(JSON.stringify(stats)).not.toMatch(/blind/i);
      const { streakRow } = await import('@/lib/ux-v1/p11/notifications');
      expect(JSON.stringify(streakRow({ state: 'at_risk', days: 3, left: '2h' }))).not.toMatch(/blind/i);
      const copy = (await import('@/copy/anime/p1')).COPY as Record<string, string>;
      expect(Object.values(copy).join(' ')).not.toMatch(/blind/i);
      const o2 = (await import('@/copy/anime/o2')).COPY as Record<string, string>;
      expect(Object.values(o2).join(' ')).not.toMatch(/blind/i);
    });
  });

  it('the anime-only code links to no /blindtest path (the files of app/.../(anime)/blindtest excepted: the openings quiz file and the guarded hub page)', () => {
    const files = [
      ...filesUnder('components/anime', (f) => /\.tsx?$/.test(f) && !/\.test\./.test(f)),
      ...filesUnder('app/sites/[site]', (f) => /\.tsx?$/.test(f) && !/\.test\./.test(f) && !f.includes('/(hub)/') && !/home-hub|\/hub\//.test(f)),
      ...filesUnder('lib/anime', (f) => /\.tsx?$/.test(f) && !/\.test\./.test(f)),
      ...filesUnder('copy/anime', (f) => f.endsWith('.ts')),
    ].filter((f) => !f.startsWith('app/sites/[site]/(anime)/blindtest/'));
    // The slot of the shared series hub the prop of the shared name-all block and the field of the shared personality page are named after the blind test; anime fills them with nothing or renames them.
    for (const f of files) expect(read(f).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '').replace(/\bblindtest: null|\bblindtestSlugs=\{\[\]\}|\bblindtestSongs: openingSongs/g, ''), f).not.toMatch(/\/blindtest|blind ?test/i);
  });
});
