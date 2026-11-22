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
  it('OtakuQuiz: nothing while its private launch gate is on or NET_CARDS_BRIDGES is off', async () => {
    for (const vars of [CLOSED_ANIME, { PRIVATE_LAUNCH: '0' }, {}]) {
      env('anime', vars);
      expect((await import('./model')).siteSwitch(), JSON.stringify(vars)).toBeNull();
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
  it('a labelled nav, the current site as aria-current text, the others as nofollow links with visible names, the one trigger button', async () => {
    env('kpop', ON);
    const model = (await import('./model')).siteSwitch()!;
    const { SiteSwitch } = await import('@/components/site-switch/site-switch');
    const html = renderToStaticMarkup(h(SiteSwitch, { model }));
    expect(html).toContain('<nav aria-label="Switch site"');
    expect(html).toMatch(/<span class="ux-sw-i" aria-current="true" data-site="kpop">.*<b>KpopQuiz<\/b>.*You are here/);
    expect(html).toMatch(/<a class="ux-sw-i" href="\/auth\/passport\/out\?to=anime[^"]*" rel="nofollow" data-site="anime">.*<b>OtakuQuiz<\/b>/);
    expect(html).toMatch(/rel="nofollow" data-site="hub">.*<b>Bunnyverse<\/b>/);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('>Switch site<');
    expect(html).toContain('@media (max-width:760px)');
    expect(html).not.toMatch(/href="https?:/);
  });
  it('OtakuQuiz marks itself current', async () => {
    env('anime', { NET_CARDS_BRIDGES: '1', PRIVATE_LAUNCH: '0' });
    const model = (await import('./model')).siteSwitch()!;
    const { SiteSwitch } = await import('@/components/site-switch/site-switch');
    const html = renderToStaticMarkup(h(SiteSwitch, { model }));
    expect(html).toMatch(/aria-current="true" data-site="anime">.*<b>OtakuQuiz</);
    expect((html.match(/aria-current="true"/g) ?? []).length).toBe(1);
  });
  it('no en or em dash in what this feature wrote', () => {
    for (const f of ['lib/site-switch/model.ts', 'components/site-switch/site-switch.tsx', 'lib/cards-bridge/nav.ts']) {
      expect(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'), f).not.toMatch(DASH);
    }
  });
});
