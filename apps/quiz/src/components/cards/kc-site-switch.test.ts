// KpopCards bar (owner, 2026-11-23: "from kpopcard on the nav a button to go back to kpopquiz or bunnyverse"): the bar carries the site switcher of the
// other sites. The button holds the KpopCards brand; the menu lists KpopQuiz (signed-in jump), OtakuQuiz (plain link), Bunnyverse (a link to the hub
// home) and KpopCards as the current row. The lobby stays reachable through the Lobby tab and the phone tab bar.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 });
const site = vi.hoisted(() => ({ id: 'hub' as string }));
vi.mock('@/lib/verse/visibility', () => ({ verseHidden: () => true }));
vi.mock('@/lib/site/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return site.id; }, get SITE() { return real.REGISTRY[site.id as 'kpop' | 'hub' | 'anime']; } };
});
vi.mock('next/navigation', () => ({ usePathname: () => '/kpopcards/collection', useRouter: () => ({ replace: () => undefined, push: () => undefined }), useSearchParams: () => new URLSearchParams() }));

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); site.id = 'hub'; });

async function bar(switcher: boolean): Promise<string> {
  vi.resetModules();
  vi.stubEnv('NET_CARDS', '1');
  vi.stubEnv('CARDS_UI_FIXTURE', '1');
  const { KcShell } = await import('./kc-shell');
  const { CardsProvider } = await import('./cards-provider');
  const { buildFixtureCatalog } = await import('@/lib/cards/ui-fixture');
  const { buildSlim } = await import('@/lib/cards/ui-model');
  const { siteSwitchCards } = await import('@/lib/site-switch/model');
  const model = switcher ? siteSwitchCards() : null;
  const html = renderToStaticMarkup(createElement(CardsProvider, { catalog: buildSlim(buildFixtureCatalog()), fixture: false, children: createElement(KcShell, { switcher: model, children: null }) }));
  return html.slice(html.indexOf('<header class="top"'), html.indexOf('</header>'));
}

describe('the model of the KpopCards bar', () => {
  it('lists KpopQuiz and OtakuQuiz as links, Bunnyverse as a link to the hub home, KpopCards as the current row', async () => {
    vi.resetModules();
    const m = (await import('@/lib/site-switch/model')).siteSwitchCards()!;
    expect(m.current).toBe('cards');
    expect(m.items).toEqual([
      { id: 'kpop', label: 'KpopQuiz', href: '/auth/passport/out?to=kpop&next=%2F&via=f.pp' },
      { id: 'anime', label: 'OtakuQuiz', href: 'https://bunnyverse.org/anime/' },
      { id: 'hub', label: 'Bunnyverse', href: '/' },
      { id: 'cards', label: 'KpopCards', href: null },
    ]);
  });
  it('is null on the builds that do not serve KpopCards', async () => {
    site.id = 'kpop';
    vi.resetModules();
    expect((await import('@/lib/site-switch/model')).siteSwitchCards()).toBeNull();
  });
});

describe('the bar', () => {
  it('puts the KpopCards brand (rabbit and wordmark) inside the switcher button, with the chevron', async () => {
    const html = await bar(true);
    expect(html).toContain('data-testid="site-switch"');
    expect(html).toMatch(/<button[^>]*class="ux-sw-btn"[^>]*>.*<span class="brand kc kc-brand"><img class="kc-ico"[^>]*\/><span class="kc-word">Kpop<b>Cards<\/b><\/span><\/span>.*ux-sw-chev/);
    expect(html).not.toContain('aria-label="KpopCards lobby"');
  });
  it('has the four rows: KpopQuiz and OtakuQuiz links, Bunnyverse a link to "/", KpopCards current with the check and no link', async () => {
    const html = await bar(true);
    expect(html).toMatch(/<a class="ux-sw-i" href="\/auth\/passport\/out\?to=kpop&amp;next=%2F&amp;via=f\.pp" rel="nofollow" data-site="kpop">/);
    expect(html).toMatch(/<a class="ux-sw-i" href="https:\/\/bunnyverse\.org\/anime\/" rel="nofollow" data-site="anime">/);
    expect(html).toMatch(/<a class="ux-sw-i" href="\/" rel="nofollow" data-site="hub">.*<b>Bunnyverse<\/b>.*data-end="arrow"/);
    expect(html).toMatch(/<span class="ux-sw-i" aria-current="page" data-site="cards">.*<b>KpopCards<\/b>.*data-end="check"/);
    expect([...html.matchAll(/data-site="(\w+)"/g)].map((m) => m[1])).toEqual(['kpop', 'anime', 'hub', 'cards']);
    expect([...html.matchAll(/<small>([^<]*)<\/small>/g)].map((m) => m[1]).slice(0, 4)).toEqual(['K-pop quizzes', 'Anime quizzes', 'Every site, one passport', 'Collect idol cards']);
  });
  it('keeps the five tabs, so the lobby stays reachable, and the phone tab bar', async () => {
    const html = await bar(true);
    expect(html).toContain('aria-label="KpopCards"');
    expect(html).toContain('href="/kpopcards"');
    expect(html).toContain('href="/kpopcards/help"');
  });
  it('without a model keeps today\'s brand link to the lobby, no switcher', async () => {
    const html = await bar(false);
    expect(html).not.toContain('site-switch');
    expect(html).toMatch(/<a class="brand kc" aria-label="KpopCards lobby" href="\/kpopcards"><img class="kc-ico"/);
  });
  it('prints no dash', async () => {
    expect(await bar(true)).not.toMatch(DASH);
  });
});

describe('the styles', () => {
  it('pin the switcher to the light Cards tokens, also in a dark theme, and tighten the button on a phone', () => {
    const css = readFileSync(new URL('../../styles/cards/kpopcards.css', import.meta.url), 'utf8');
    expect(css).toContain('html.ux-v1 .bvc .ux-sw.ux-sw{--ux-ink:var(--txt1)');
    expect(css).toMatch(/@media \(max-width:420px\)\{\s*\.bvc \.ux-sw-btn\{/);
    expect(css).not.toMatch(DASH);
  });
});
