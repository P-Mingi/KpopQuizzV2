// KpopCards SEO (lot SEO-LAUNCH-1, lane B): the server HTML of /kpopcards, /kpopcards/odds and /kpopcards/help as a guest or Googlebot reads it
// (one H1, the answer block, the question H2s, the disclaimer, the links, no idol photo, JSON-LD equal to the text), the lobby H2, the metadata of the
// pages, the robots of every page that stays out of Google, and the hub sitemap rows.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildFixtureCatalog } from '@/lib/cards/ui-fixture';
import { buildSlim } from '@/lib/cards/ui-model';
import { KC } from '@/lib/kpopcards/contract';
import { CARDS_H1, cardsStats, landingAnswer, oddsAnswer } from '@/lib/kpopcards/seo';
import { atLeast } from '@/lib/stats/site-stats';

const slim = buildSlim(buildFixtureCatalog());
const ctx = {
  status: 'guest', now: null, catalog: slim, owned: new Map(), lastPack: null, byN: new Map(slim.cards.map((c) => [c.n, c])), toast: vi.fn(), kc: null, lobby: null,
  state: null, fixture: false, demo: true, protoExample: false, refresh: vi.fn(), applyResult: vi.fn(), clearNew: vi.fn(), toggleFav: vi.fn(), recycle: vi.fn(), api: null, newSet: new Set(),
};
vi.mock('./cards-provider', () => ({ useCards: () => ctx }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams(), usePathname: () => '/kpopcards' }));
vi.mock('@/components/ux-v1/sign-in-sheet', () => ({ useSignIn: () => vi.fn() }));
vi.mock('@/lib/cards/ads-server', () => ({ readAdsContext: async () => ({ enabled: false, client: null, bannerSlot: null, country: null, knownMinor: false, consentRequired: true, test: false }) }));

beforeEach(() => { vi.stubEnv('CARDS_UI_FIXTURE', '1'); });
afterEach(() => { vi.unstubAllEnvs(); });

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const decode = (s: string): string => s.replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&rsquo;/g, '’');
const count = (html: string, re: RegExp): number => (html.match(re) ?? []).length;
const ldBlocks = (html: string): Record<string, unknown>[] => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!) as Record<string, unknown>);

async function landing(): Promise<string> {
  const { default: Page } = await import('@/app/sites/[site]/(hub)/kpopcards/page');
  return renderToStaticMarkup(await Page());
}

describe('/kpopcards server HTML (a guest, Googlebot)', () => {
  it('has exactly one H1, the owner string, before the lobby', async () => {
    const html = await landing();
    expect(count(html, /<h1[ >]/g)).toBe(1);
    expect(html).toContain(`<h1 class="h1" id="t-kpopcards">${CARDS_H1.landing}</h1>`);
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('id="pack"'));
  });
  it('writes the answer block right under the H1, with the values of the helpers (fixture catalog)', async () => {
    const html = await landing();
    const stats = cardsStats(buildFixtureCatalog())!;
    const answer = landingAnswer(stats);
    expect(decode(html)).toMatch(new RegExp(`<p class="lede" id="kc-answer"[^>]*>${answer.replace(/[.+*?^$()[\]{}|\\]/g, '\\$&')}</p>`));
    expect(html.indexOf('id="kc-answer"')).toBeLessThan(html.indexOf('id="pack"'));
    expect(answer).toContain(`every ${KC.PERIOD_MIN} minutes`);
    expect(answer).toContain(`${atLeast(stats.cards)} cards are in the packs`);
  });
  it('has the four question H2s, the disclaimer and the links to the odds, the help and the credits', async () => {
    const html = decode(await landing());
    for (const q of ['How do you play KpopCards?', 'Is KpopCards free?', 'Is it a gacha game?', 'Where do the photos come from?']) expect(html).toContain(`<h2>${q}</h2>`);
    expect(html).toContain('It uses random packs, but nothing is for sale. Packs come from a timer, missions and optional ads, and the odds are public.');
    expect(html).toContain('Unofficial fan game, not affiliated with the artists or their agencies.');
    for (const href of ['/kpopcards/odds', '/kpopcards/help', '/credits']) expect(html).toContain(`href="${href}"`);
    expect(html).not.toMatch(DASH);
  });
  it('shows "Your packs" as an H2 (the lobby stays), and no other H1', async () => {
    const html = await landing();
    expect(html).toContain('<h2 class="h1" id="t-lobby">Your packs</h2>');
    expect(html).toContain('id="guest"');
    expect(html).toContain(`A free pack every ${KC.PERIOD_MIN} minutes`);
  });
  it('shows no idol photo above the fold: no image before the lobby, and no photo of a card face in the server text', async () => {
    const html = await landing();
    const top = html.slice(0, html.indexOf('id="kc-questions"'));
    expect(top).not.toMatch(/<img/);
    expect(html).not.toMatch(/<img[^>]+(cards|group-photos|commons)/i);
  });
  it('carries the JSON-LD: WebApplication and VideoGame with the visible answer block, a breadcrumb, nothing else', async () => {
    const html = await landing();
    const blocks = ldBlocks(html);
    expect(blocks.map((b) => b['@type'])).toEqual([['WebApplication', 'VideoGame'], 'BreadcrumbList']);
    const answer = landingAnswer(cardsStats(buildFixtureCatalog()));
    expect(blocks[0]!.description).toBe(answer);
    expect(decode(html)).toContain(answer);
    expect(JSON.stringify(blocks)).not.toMatch(/FAQPage|aggregateRating|review/);
  });
  it('still renders when the catalog cannot be read: no number sentence, one H1', async () => {
    vi.stubEnv('CARDS_UI_FIXTURE', '');
    vi.doMock('@/lib/cards/ui-catalog', () => ({ loadCatalog: async () => null }));
    vi.resetModules();
    const { default: Page } = await import('@/app/sites/[site]/(hub)/kpopcards/page');
    const html = decode(renderToStaticMarkup(await Page()));
    vi.doUnmock('@/lib/cards/ui-catalog');
    expect(count(html, /<h1[ >]/g)).toBe(1);
    expect(html).toContain(landingAnswer(null));
    expect(html).not.toContain('cards are in the packs');
    expect(html).toContain('<h2>Is KpopCards free?</h2>');
  });
});

describe('the lobby alone', () => {
  it('has no H1 and one H2 "Your packs"', async () => {
    const { LobbyView } = await import('./lobby-view');
    const html = renderToStaticMarkup(createElement(LobbyView, { odds: null, ads: { enabled: false, client: null, bannerSlot: null, country: null, knownMinor: false, consentRequired: true, test: false }, dailyGuest: null }));
    expect(count(html, /<h1[ >]/g)).toBe(0);
    expect(html).toContain('<h2 class="h1" id="t-lobby">Your packs</h2>');
  });
});

describe('/kpopcards/odds server HTML', () => {
  it('has one H1, the answer block from the odds, the update date and the links', async () => {
    const { default: Page } = await import('@/app/sites/[site]/(hub)/kpopcards/odds/page');
    const html = decode(renderToStaticMarkup(await Page()));
    expect(count(html, /<h1[ >]/g)).toBe(1);
    expect(html).toContain(`<h1 class="h1" id="t-odds">${CARDS_H1.odds}</h1>`);
    expect(html).toContain(oddsAnswer(buildFixtureCatalog().odds));
    expect(html).toContain('Updated 23 November 2026');
    expect(html).toContain('id="rates-table"');
    for (const href of ['/kpopcards', '/kpopcards/help', '/credits']) expect(html).toContain(`href="${href}"`);
    expect(ldBlocks(html).map((b) => b['@type'])).toEqual(['BreadcrumbList']);
    expect(html).not.toMatch(DASH);
  });
});

describe('/kpopcards/help server HTML', () => {
  it('keeps its H1 once, says six editions from the code, and carries a breadcrumb', async () => {
    const { default: Page } = await import('@/app/sites/[site]/(hub)/kpopcards/help/page');
    const html = decode(renderToStaticMarkup(createElement(Page)));
    expect(count(html, /<h1[ >]/g)).toBe(1);
    expect(html).toContain('>How KpopCards works</h1>');
    expect(html).toContain('Every idol has up to 6 editions, from Standard to Full Art');
    expect(ldBlocks(html).map((b) => b['@type'])).toEqual(['BreadcrumbList']);
  });
});

describe('metadata of the three pages and the pages that stay out of Google', () => {
  it('the three say index through the indexing gate, with their own canonical', async () => {
    const { robotsFor } = await import('@/lib/site/indexing');
    const pages = { landing: await import('@/app/sites/[site]/(hub)/kpopcards/page'), odds: await import('@/app/sites/[site]/(hub)/kpopcards/odds/page'), help: await import('@/app/sites/[site]/(hub)/kpopcards/help/page') };
    expect(pages.landing.metadata.title).toBe('KpopCards: Free K-pop Photocard Game');
    expect(pages.odds.metadata.title).toBe('KpopCards Odds: Drop Rates of Every Pack');
    expect(pages.help.metadata.title).toBe('How KpopCards Works: Packs, Shards, Rules');
    expect(pages.landing.metadata.alternates?.canonical).toBe('https://bunnyverse.org/kpopcards');
    expect(pages.odds.metadata.alternates?.canonical).toBe('https://bunnyverse.org/kpopcards/odds');
    expect(pages.help.metadata.alternates?.canonical).toBe('https://bunnyverse.org/kpopcards/help');
    for (const p of Object.values(pages)) expect(p.metadata.robots).toEqual(robotsFor(true));
  });
  it('every other KpopCards page keeps robotsFor(false) and never asks to be indexed', () => {
    const root = join(__dirname, '../../app/sites/[site]/(hub)/kpopcards');
    const files: string[] = [];
    const walk = (d: string): void => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === 'page.tsx') files.push(p); } };
    walk(root);
    const inGoogle = new Set(['page.tsx', 'odds/page.tsx', 'help/page.tsx']);
    const out = files.filter((f) => !inGoogle.has(f.slice(root.length + 1)));
    // c, collection, collection/{group}, credits, idol, missions, open/{theme}, open/focus/{group}, ranking, report, u
    expect(out).toHaveLength(11);
    for (const f of out) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toContain('robotsFor(false)');
      expect(src, f).not.toContain('robotsFor(true)');
      expect(src, f).not.toMatch(/index:\s*true/);
    }
  });
  it('the card page comment says what robotsFor(false) really does', () => {
    const src = readFileSync(join(__dirname, '../../app/sites/[site]/(hub)/kpopcards/c/[num]/page.tsx'), 'utf8');
    expect(src).not.toContain('nofollow on every build');
    expect(src).toContain('noindex, follow once it is open');
  });
});

describe('the hub sitemap', () => {
  afterEach(() => { vi.resetModules(); });
  const hubPaths = async (cards: string, indexing: string): Promise<string[]> => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    vi.stubEnv('NET_CARDS', cards);
    vi.stubEnv('NET_INDEXING', indexing);
    vi.stubEnv('NET_LAUNCH_DATE', '2026-11-23');
    vi.doMock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));
    const { sitemapEntriesFor } = await import('@/lib/site/root-files');
    const { REGISTRY } = await import('@/lib/site/registry');
    const hub = { ...REGISTRY.hub, features: { ...REGISTRY.hub.features, dailyGuess: false } };
    return (await sitemapEntriesFor(hub, {} as never)).map((e) => e.path);
  };
  it('lists the three pages only when KpopCards is on and the hub is open', async () => {
    expect(await hubPaths('1', '1')).toEqual(expect.arrayContaining(['/kpopcards', '/kpopcards/odds', '/kpopcards/help']));
    expect(await hubPaths('0', '1')).not.toContain('/kpopcards');
    expect(await hubPaths('1', '0')).toEqual(['/']);
  });
});
