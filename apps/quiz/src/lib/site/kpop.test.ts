// Run O1, lane B1: the kpop side of the wiring. Every literal B1 moved behind the registry is compared with
// what the file held before, so the kpop build renders the same bytes (parity proves the pages; this proves
// the values and the shape). The anime and hub roots are checked for the one thing that matters at this
// point: they carry no kpop string.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { brandWordmark, domainWordmark, siteUrl, splitAtQuiz } from './brand';
import { siteNavigationJsonLd } from './jsonld';
import { KPOP_THEME_COLOR } from './kpop';
import { siteRootMetadata, siteViewport } from './metadata';
import { REGISTRY } from './registry';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string): string => readFileSync(`${SRC}${p}`, 'utf8');

describe('viewport (app/layout.tsx before B1)', () => {
  it('kpop keeps its two literals', () => {
    expect(KPOP_THEME_COLOR).toEqual({ light: '#FAF8F5', dark: '#141210' });
    expect(siteViewport(REGISTRY.kpop)).toEqual({
      colorScheme: 'light dark',
      themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#FAF8F5' },
        { media: '(prefers-color-scheme: dark)', color: '#141210' },
      ],
    });
  });

  it('anime and hub read the page token of their theme (tokens.md 7)', () => {
    for (const id of ['anime', 'hub'] as const) {
      const v = siteViewport(REGISTRY[id]);
      expect(v.themeColor).toEqual([
        { media: '(prefers-color-scheme: light)', color: REGISTRY[id].theme.light.page },
        { media: '(prefers-color-scheme: dark)', color: REGISTRY[id].theme.dark.page },
      ]);
    }
  });
});

describe('root metadata', () => {
  it('kpop gets the object of the root layout back, untouched', () => {
    const mine = { title: 'x' };
    expect(siteRootMetadata(mine, REGISTRY.kpop)).toBe(mine);
  });

  it('anime and hub get their own brand and nothing of kpop', () => {
    for (const id of ['anime', 'hub'] as const) {
      const site = REGISTRY[id];
      const m = siteRootMetadata({ title: 'kpop object' }, site);
      const text = JSON.stringify(m);
      expect(text, id).not.toMatch(/kpop|k-pop|p:domain_verify|pinterest/i);
      expect(String(m.metadataBase)).toBe(`${site.url}/`);
      expect(m.title).toEqual({ default: site.brand.name, template: site.seo.titleTemplate });
      expect(m.openGraph?.siteName).toBe(site.brand.name);
      expect(JSON.stringify(m.openGraph?.images)).toContain(site.brand.ogTemplate);
      expect(m.manifest).toBe('/site.webmanifest');
    }
  });

  it('the root layout reads these builders, and a kpop page carries no data-site attribute', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toContain('export const viewport: Viewport = siteViewport();');
    expect(layout).toContain('export const metadata: Metadata = siteRootMetadata(KPOP_METADATA);');
    // The prop is absent on kpop (an undefined prop would reach the RSC payload).
    expect(layout).toContain("const HTML_SITE_ATTR: { 'data-site'?: string } = SITE_ID === 'kpop' ? {} : { 'data-site': SITE_ID };");
    expect(layout.match(/suppressHydrationWarning \{\.\.\.HTML_SITE_ATTR\}/g)).toHaveLength(2);
  });
});

describe('site navigation JSON-LD (app/(site)/layout.tsx before B1)', () => {
  it('kpop: the same four links, the same keys in the same order', () => {
    expect(JSON.stringify(siteNavigationJsonLd(REGISTRY.kpop))).toBe(JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SiteNavigationElement',
      name: 'Main Navigation',
      hasPart: [
        { '@type': 'WebPage', name: 'Quizzes', url: 'https://kpopquiz.org/quizzes' },
        { '@type': 'WebPage', name: 'Blind Test', url: 'https://kpopquiz.org/blindtest' },
        { '@type': 'WebPage', name: 'Leaderboard', url: 'https://kpopquiz.org/leaderboard' },
        { '@type': 'WebPage', name: 'Trivia', url: 'https://kpopquiz.org/trivia' },
      ],
    }));
  });

  it('other sites list the links of their own features, on their own origin', () => {
    const anime = siteNavigationJsonLd(REGISTRY.anime).hasPart as { url: string }[];
    expect(anime.map((p) => p.url)).toEqual(['/quizzes', '/leaderboard', '/trivia'].map((p) => `https://otakuquiz.org${p}`));
    expect(siteNavigationJsonLd(REGISTRY.hub).hasPart).toEqual([]);
  });
});

describe('brand helpers', () => {
  it('splits a name or a domain at its Quiz part', () => {
    expect(splitAtQuiz('KpopQuiz')).toEqual({ head: 'Kpop', tail: 'Quiz' });
    expect(splitAtQuiz('kpopquiz.org')).toEqual({ head: 'kpop', tail: 'quiz.org' });
    expect(splitAtQuiz('Plain')).toEqual({ head: 'Plain', tail: '' });
  });

  it('kpop: the wordmarks the components rendered as literals', () => {
    expect(brandWordmark(REGISTRY.kpop)).toEqual({ head: 'Kpop', tail: 'Quiz' });
    expect(domainWordmark(REGISTRY.kpop)).toEqual({ head: 'kpop', tail: 'quiz.org' });
    expect(`${brandWordmark(REGISTRY.kpop).head}${brandWordmark(REGISTRY.kpop).tail}`).toBe(REGISTRY.kpop.brand.name);
    expect(siteUrl('/sitemap.xml', REGISTRY.kpop)).toBe('https://kpopquiz.org/sitemap.xml');
    expect(siteUrl('', REGISTRY.kpop)).toBe('https://kpopquiz.org');
  });

  it('anime and hub split on their own names', () => {
    expect(brandWordmark(REGISTRY.anime)).toEqual({ head: 'Otaku', tail: 'Quiz' });
    expect(domainWordmark(REGISTRY.anime)).toEqual({ head: 'otaku', tail: 'quiz.org' });
    expect(brandWordmark(REGISTRY.hub)).toEqual({ head: 'Fan', tail: 'Quiz' });
  });
});

describe('--ux-on-accent (tokens.md 2): the kpop change, and nothing else', () => {
  const css = read('styles/ux-v1/a0.css');

  it('is declared white in the light, dark and system dark blocks', () => {
    expect(css.match(/--ux-on-accent: #FFFFFF;/g)).toHaveLength(3);
  });

  it('replaces the white literal of the four rules that put text on pink-fill', () => {
    for (const selector of [
      '.ux-btn-primary {', '.ux-brand-mk {', '.ux-links a[aria-current="page"] {',
      '.ux-langsw > a[aria-current="page"], .ux-langsw > button[aria-pressed="true"] {',
    ]) {
      const at = css.indexOf(selector);
      expect(at, selector).toBeGreaterThan(-1);
      const rule = css.slice(at, css.indexOf('}', at));
      expect(rule, selector).toContain('color: var(--ux-on-accent)');
      expect(rule, selector).not.toMatch(/#fff\b/i);
    }
  });

  it('leaves every other white literal alone (photos, avatars, the story card, chips)', () => {
    expect(css).toContain('.ux-thm-cv.is-dark { color: #fff; }');
    expect(css).toContain('.ux-story { position: relative;');
    expect(css.match(/color: #fff;/g)!.length).toBeGreaterThanOrEqual(4);
  });

  it('never declares or reads a token only the site sheets use', () => {
    for (const name of ['on-no', 'accent2', 'font-display']) expect(css.includes(`--ux-${name}`), name).toBe(false);
  });
});

describe('the files B1 rewired hold no brand literal', () => {
  // The output of apps/quiz/scripts/o1/b1/codemod.mts, for the files no HOT branch touches today.
  const FILES = [
    'app/robots.ts', 'components/layout/logo.tsx', 'components/layout/mobile-top-bar.tsx', 'components/ux-v1/brand.tsx',
    'components/ux-v1/story-image.ts', 'lib/share.ts', 'lib/seo/og.ts', 'app/api/og/group/[slug]/route.tsx',
    'app/api/og/level-up/route.tsx', 'app/api/og/page/route.tsx', 'app/api/og/[slug]/route.tsx',
    'app/api/og/passport/[username]/route.tsx', 'app/api/og/verse/route.tsx', 'app/api/og/verse/[slug]/route.tsx',
    'app/(site)/layout.tsx',
  ];

  it.each(FILES)('%s', (file) => {
    expect(read(file)).not.toMatch(/kpopquiz\.org|KpopQuiz/);
  });
});
