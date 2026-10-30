import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HUB_WORDMARK_TAIL, wordmarkTailClass, wordmarkTailColour } from '@/lib/site/brand';
import { REGISTRY } from '@/lib/site/registry';

// Owner decision 2026-10-29: "verse" of the hub's wordmark is the pink of every validated mockup (#D13A6E), "Bunny" stays in ink, on every
// surface that draws the hub's wordmark, from one value: the token --hub-brand-tail (styles/sites/hub/h2.css) for the pages, the same value
// for the brand files and for the images drawn without CSS, all equal to HUB_WORDMARK_TAIL of lib/site/brand.ts.

const QUIZ = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (rel: string): string => readFileSync(`${QUIZ}${rel}`, 'utf8');
const h2 = read('src/styles/sites/hub/h2.css');

afterEach(() => { vi.unstubAllEnvs(); });

/** The `--name: value` pairs of the rule whose selector is exactly `selector`. */
function vars(css: string, selector: string): Record<string, string> {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

describe('the one value of the hub wordmark\'s second colour', () => {
  it('is the pink of the mockups', () => {
    expect(HUB_WORDMARK_TAIL).toBe('#D13A6E');
  });

  it('is the token --hub-brand-tail, declared once on the hub scope (both themes read it), and the tail class reads only it', () => {
    expect(vars(h2, 'html.ux-v1[data-site="hub"]')['hub-brand-tail']).toBe(HUB_WORDMARK_TAIL);
    expect(h2.match(/--hub-brand-tail:/g) ?? []).toHaveLength(1);
    const rules = h2.split('\n').filter((l) => l.includes('.hub-h2-brand-tail'));
    expect(rules).toEqual(['html.ux-v1[data-site="hub"] .hub-h2-brand-tail { color: var(--hub-brand-tail); }']);
  });

  it('gives the tail that class on the hub only, and the colour to images on the hub only', () => {
    expect(wordmarkTailClass(REGISTRY.hub)).toBe('hub-h2-brand-tail');
    expect(wordmarkTailClass(REGISTRY.kpop)).toBeUndefined();
    expect(wordmarkTailClass(REGISTRY.anime)).toBeUndefined();
    expect(wordmarkTailColour(REGISTRY.hub)).toBe(HUB_WORDMARK_TAIL);
    expect(wordmarkTailColour(REGISTRY.kpop)).toBeNull();
    expect(wordmarkTailColour(REGISTRY.anime)).toBeNull();
  });
});

describe('every wordmark of the hub reads it', () => {
  async function shellBrand(site: 'kpop' | 'anime' | 'hub'): Promise<string> {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
    const { UxBrand } = await import('@/components/ux-v1/brand');
    return renderToStaticMarkup(createElement(UxBrand));
  }

  it('the shared shell (the header and the footer of every other hub page): the tail carries the class on the hub', async () => {
    expect(await shellBrand('hub')).toContain('<span>Bunny<b class="hub-h2-brand-tail">verse</b></span>');
  });

  it('the shared shell of kpop and anime keeps the markup it had (no class on the tail)', async () => {
    expect(await shellBrand('kpop')).toContain('<span>Kpop<b>Quiz</b></span>');
    expect(await shellBrand('anime')).toContain('<span>Otaku<b>Quiz</b></span>');
  });

  it('the home (its bar and its footer): the tail carries the same class', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    const { HubWordmark } = await import('@/components/hub/home/home-ui');
    expect(renderToStaticMarkup(createElement(HubWordmark, { className: 'x' }))).toBe('<span class="x">Bunny<span class="hub-h2-brand-tail">verse</span></span>');
  });

  it('the passport card (an image drawn without CSS): the tail of both wordmarks takes the colour from lib/site/brand.ts, BRAND elsewhere', () => {
    const route = read('src/app/api/og/passport/[username]/route.tsx');
    expect(route).toContain('const TAIL = wordmarkTailColour() ?? BRAND;');
    expect(route).toContain("<span style={{ display: 'flex', color: TAIL }}>{brandWordmark().tail.toLowerCase()}</span>");
    expect(route).toContain("<span style={{ display: 'flex', color: TAIL }}>{domainWordmark().tail}</span>");
    expect(route).not.toMatch(/color: BRAND \}\}>\{(brandWordmark|domainWordmark)\(\)\.tail/);
  });
});

describe('the brand files of the hub', () => {
  it('logo-primary.svg: "Bunny" in the ink, "verse" in the wordmark colour, no other fill (the old accent #6B655E is gone)', () => {
    const svg = read('public/brand/hub/logo-primary.svg');
    expect([...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1])).toEqual(['#1F1B17', HUB_WORDMARK_TAIL]);
    expect(svg).not.toContain('#6B655E');
  });

  it('og-default.png is drawn by e2e/o1/H1/H2a/brand-marks.mjs with the wordmark colour as the hub accent (its --check compares the file)', () => {
    const script = read('e2e/o1/H1/H2a/brand-marks.mjs');
    const hub = /hub: \{\s*head: 'Bunny', tail: 'verse', ink: '#1F1B17', accent: '(#[0-9A-Fa-f]{6})'/.exec(script);
    expect(hub?.[1]).toBe(HUB_WORDMARK_TAIL);
  });
});

// ---- contrast (reported to the owner; a logo is exempt from the 4.5 text rule of WCAG 1.4.3)

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('the wordmark colour on the hub grounds', () => {
  it('keeps at least 3:1 (the graphics floor of WCAG 1.4.11) on the light page, on white and on the dark page', () => {
    // 4.36 on the cream page, 4.62 on white (the share image and the raised cards), 4.01 on the dark page.
    const grounds: Record<string, string | undefined> = { light: REGISTRY.hub.theme.light.page, white: REGISTRY.hub.theme.light.raised, dark: REGISTRY.hub.theme.dark.page };
    expect(grounds).toEqual({ light: '#FAF8F5', white: '#FFFFFF', dark: '#141312' });
    const ratios = Object.fromEntries(Object.entries(grounds).map(([k, g]) => [k, Math.round(contrast(HUB_WORDMARK_TAIL, g ?? '') * 100) / 100]));
    expect(ratios).toEqual({ light: 4.36, white: 4.62, dark: 4.01 });
    for (const r of Object.values(ratios)) expect(r).toBeGreaterThanOrEqual(3);
  });
});
