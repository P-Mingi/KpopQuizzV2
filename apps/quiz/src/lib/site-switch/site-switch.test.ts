// Site switcher: every destination shows only while its site is open (the gate the site itself uses), the current site is marked, a build with no
// open sister gets nothing (the shell's props carry no key: today's HTML), the markup is a labelled nav of links with nofollow, no dash in the copy.
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 });

vi.mock('@/lib/verse/visibility', () => ({ verseHidden: () => true }));
vi.mock('@/lib/site/registry', async (original) => {
  const real = await original<typeof import('@/lib/site/registry')>();
  const id = (): 'kpop' | 'hub' | 'anime' => (process.env.NEXT_PUBLIC_SITE_ID || 'kpop') as 'kpop' | 'hub' | 'anime';
  return { ...real, get SITE_ID() { return id(); }, get SITE() { return real.REGISTRY[id()]; } };
});

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
type Site = 'kpop' | 'hub' | 'anime';
function env(site: Site, vars: Record<string, string> = {}): void {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
}
const ON = { NET_CARDS: '1', NET_CARDS_BRIDGES: '1' };
const CLOSED_ANIME = { NET_CARDS_BRIDGES: '1', PRIVATE_LAUNCH: '1', PRIVATE_LAUNCH_KEY: 'a'.repeat(64), PRIVATE_LAUNCH_ALLOW: '11111111-1111-1111-1111-111111111111' };

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('which destinations are open', () => {
  it('kpopquiz.org: nothing with the flags off, half on, or NET_CARDS_BRIDGES alone (today\'s HTML)', async () => {
    for (const vars of [{}, { NET_CARDS: '1' }, { NET_CARDS_BRIDGES: '1' }, { NET_CARDS: '0', NET_CARDS_BRIDGES: '1' }]) {
      env('kpop', vars);
      expect((await import('./model')).siteSwitch(), JSON.stringify(vars)).toBeNull();
    }
  });
  it('kpopquiz.org: KpopQuiz (current), OtakuQuiz and Bunnyverse once the hub is open, both through the signed-in jump', async () => {
    env('kpop', ON);
    const m = (await import('./model')).siteSwitch()!;
    expect(m.current).toBe('kpop');
    expect(m.items.map((i) => [i.id, i.label])).toEqual([['kpop', 'KpopQuiz'], ['anime', 'OtakuQuiz'], ['hub', 'Bunnyverse']]);
    expect(m.items[0]!.href).toBeNull();
    expect(m.items[1]!.href).toBe('/auth/passport/out?to=anime&next=%2F&via=k.pp');
    expect(m.items[2]!.href).toBe('/auth/passport/out?to=hub&next=%2F&via=k.pp');
  });
  // Owner, 2026-11-22: OtakuQuiz always shows the switcher (this case replaces "nothing while its gate is on or NET_CARDS_BRIDGES is off").
  it('OtakuQuiz: always the switcher; behind its private launch gate the hub too (same gate, same cookie)', async () => {
    for (const vars of [CLOSED_ANIME, { PRIVATE_LAUNCH: '1', PRIVATE_LAUNCH_KEY: 'a'.repeat(64), PRIVATE_LAUNCH_ALLOW: '11111111-1111-1111-1111-111111111111' }]) {
      env('anime', vars);
      expect((await import('./model')).siteSwitch()!.items.map((i) => i.id), JSON.stringify(vars)).toEqual(['kpop', 'anime', 'hub']);
    }
  });
  it('OtakuQuiz in public with NET_CARDS_BRIDGES off: KpopQuiz and OtakuQuiz only, never a link to the closed hub', async () => {
    for (const vars of [{ PRIVATE_LAUNCH: '0' }, {}, { PRIVATE_LAUNCH: '0', NET_CARDS_BRIDGES: '0' }]) {
      env('anime', vars);
      const m = (await import('./model')).siteSwitch()!;
      expect(m.items.map((i) => i.id), JSON.stringify(vars)).toEqual(['kpop', 'anime']);
      expect(m.items[0]!.href).toBe('/auth/passport/out?to=kpop&next=%2F&via=a.pp');
    }
  });
  it('OtakuQuiz: KpopQuiz (jump), OtakuQuiz (current) and Bunnyverse (same origin) once its gate is off', async () => {
    env('anime', { NET_CARDS_BRIDGES: '1', PRIVATE_LAUNCH: '0' });
    const m = (await import('./model')).siteSwitch()!;
    expect(m.current).toBe('anime');
    expect(m.items.map((i) => i.id)).toEqual(['kpop', 'anime', 'hub']);
    expect(m.items[0]!.href).toBe('/auth/passport/out?to=kpop&next=%2F&via=a.pp');
    expect(m.items[1]!.href).toBeNull();
    expect(m.items[2]!.href).toMatch(/^https:\/\/[^/]+\/$/);
  });
  it('the hub draws none', async () => {
    env('hub', ON);
    expect((await import('./model')).siteSwitch()).toBeNull();
  });
  it('the shell passes the model only when open: the prop is absent while closed', async () => {
    env('kpop');
    const closed = (await import('@/components/layout/ux-v1/ux-shell')).UxShell({ children: null });
    expect(Object.keys(closed.props as object)).not.toContain('siteSwitch');
    env('kpop', ON);
    const open = (await import('@/components/layout/ux-v1/ux-shell')).UxShell({ children: null });
    expect((open.props as { siteSwitch: { items: unknown[] } }).siteSwitch.items).toHaveLength(3);
  });
});

describe('the markup', () => {
  async function render(site: Site, vars: Record<string, string>): Promise<string> {
    env(site, vars);
    const model = (await import('./model')).siteSwitch()!;
    const { SiteSwitch } = await import('@/components/site-switch/site-switch');
    return renderToStaticMarkup(h(SiteSwitch, { model }));
  }
  // Changed 2026-11-23 (redesign): the current row is a span with aria-current="page" (was "true"), carries a check instead of "You are here",
  // the blurbs and the one trigger button are the new ones; the nav label, the nofollow links, the visible names and no absolute href stay.
  it('a labelled nav, the current site as aria-current page text, the others as nofollow links with visible names', async () => {
    const html = await render('kpop', ON);
    expect(html).toContain('<nav class="ux-sw-menu"');
    expect(html).toContain('aria-label="Switch site"');
    expect(html).toMatch(/<span class="ux-sw-i" aria-current="page" data-site="kpop">.*<b>KpopQuiz<\/b>/);
    expect(html).toMatch(/<a class="ux-sw-i" href="\/auth\/passport\/out\?to=anime[^"]*" rel="nofollow" data-site="anime">.*<b>OtakuQuiz<\/b>/);
    expect(html).toMatch(/rel="nofollow" data-site="hub">.*<b>Bunnyverse<\/b>/);
    expect(html).not.toContain('You are here');
    expect(html).toContain('@media (max-width:760px)');
    expect(html).not.toMatch(/href="https?:/);
  });
  it('one button holds the logo, the site name and the chevron, with aria-haspopup and aria-expanded', async () => {
    const html = await render('kpop', ON);
    expect((html.match(/<button/g) ?? []).length).toBe(1);
    const btn = html.match(/<button[^>]*>.*?<\/button>/)![0];
    expect(btn).toContain('aria-haspopup="true"');
    expect(btn).toContain('aria-expanded="false"');
    expect(btn).toContain('ux-brand-rabbit');
    expect(btn).toMatch(/Kpop<b[^>]*>Quiz<\/b>/);
    expect(btn).toContain('ux-sw-chev');
    expect(html).not.toContain('title="Switch site"');
  });
  it('the rows: label, one line and an initial chip per site, the Bunnyverse row after a separator with a black chip and an arrow', async () => {
    const html = await render('kpop', ON);
    expect(html).toContain('>Switch site</p>');
    expect(html).toMatch(/data-chip="kpop"[^>]*>K<\/span><span class="ux-sw-t"><b>KpopQuiz<\/b><small>K-pop quizzes<\/small>/);
    expect(html).toMatch(/data-chip="anime"[^>]*>O<\/span><span class="ux-sw-t"><b>OtakuQuiz<\/b><small>Anime quizzes<\/small>/);
    expect(html).toMatch(/data-chip="hub"[^>]*>B<\/span><span class="ux-sw-t"><b>Bunnyverse<\/b><small>Every site, one passport<\/small>/);
    expect(html.indexOf('role="separator"')).toBeGreaterThan(html.indexOf('data-site="anime"'));
    expect(html.indexOf('role="separator"')).toBeLessThan(html.indexOf('data-site="hub"'));
    expect(html).toMatch(/data-site="hub".*data-end="arrow"/);
    expect(html).toContain('font-size:11px');
    expect(html).toContain('width:340px');
    expect(html).toContain('border-radius:20px');
    expect(html).toContain('#E6E0D7');
    expect(html).toContain('min-height:60px');
    expect(html).toContain('min-height:64px');
  });
  it('the current row is not a link and carries the check; the other rows are links', async () => {
    const html = await render('kpop', ON);
    expect((html.match(/aria-current="page"/g) ?? []).length).toBe(1);
    expect(html).toMatch(/aria-current="page" data-site="kpop">.*data-end="check"/);
    expect((html.match(/data-end="check"/g) ?? []).length).toBe(1);
    expect((html.match(/<a class="ux-sw-i"/g) ?? []).length).toBe(2);
  });
  it('OtakuQuiz marks itself current and brands the button with its own name', async () => {
    const html = await render('anime', { NET_CARDS_BRIDGES: '1', PRIVATE_LAUNCH: '0' });
    expect(html).toMatch(/aria-current="page" data-site="anime">.*<b>OtakuQuiz</);
    expect((html.match(/aria-current="page"/g) ?? []).length).toBe(1);
    expect(html.match(/<button[^>]*>.*?<\/button>/)![0]).toMatch(/Otaku<b[^>]*>Quiz<\/b>/);
  });
  it('without the hub (OtakuQuiz in public, bridges off): two rows and no separator', async () => {
    const html = await render('anime', { PRIVATE_LAUNCH: '0' });
    expect(html).not.toContain('role="separator"');
    expect(html).not.toContain('data-site="hub"');
  });
  it('the chip fills keep 4.5:1 with a white initial', async () => {
    const { CHIP_FILL } = await import('@/components/site-switch/site-switch');
    const lum = (hex: string): number => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    for (const id of ['kpop', 'anime', 'hub']) expect(1.05 / (lum(CHIP_FILL[id]!) + 0.05), id).toBeGreaterThanOrEqual(4.5);
  });
  it('no switcher: the brand is today\'s link, byte for byte', async () => {
    env('kpop');
    const { UxBrand, UxBrandMark } = await import('@/components/ux-v1/brand');
    // React hoists the image preload hint ahead of the link: compare without it.
    const noPreload = (x: string): string => x.replace(/<link[^>]*\/>/, '');
    const html = noPreload(renderToStaticMarkup(h(UxBrand, {})));
    const mark = noPreload(renderToStaticMarkup(h(UxBrandMark, {})));
    expect(html).toBe(`<a class="ux-brand" aria-label="KpopQuiz home" href="/">${mark}</a>`);
    expect(html).toContain('ux-brand-rabbit');
    expect(html).not.toContain('ux-sw');
  });
  it('no en or em dash in what this feature wrote', () => {
    for (const f of ['lib/site-switch/model.ts', 'components/site-switch/site-switch.tsx', 'lib/cards-bridge/nav.ts']) {
      expect(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'), f).not.toMatch(DASH);
    }
  });
});
