// Bunnyverse Cards, lane BRIDGES (lot LAUNCH-PREP): every new bridge is hidden while its gate is closed and shown when it is open; the live feed
// of pulls keeps Holo and above, public fans only and no Team account; kpopquiz.org and OtakuQuiz carry no new link with the launch flags as
// they are today (the flags off, or only half of them on, or the private launch gate on). No database: the reads are faked.
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Each test resets the module graph and loads the site registry again: about 5 s on this loaded machine (measured 2026-11-17), so the default 5 s is raised.
vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 });

const rpc = vi.fn();
const teamIds = vi.fn();

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({ rpc }) }));
vi.mock('@/lib/editorial/accounts', () => ({ getTeamIds: (...a: unknown[]) => teamIds(...a) }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
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

beforeEach(() => { rpc.mockReset(); teamIds.mockReset(); teamIds.mockResolvedValue(new Set<string>()); vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.restoreAllMocks(); });

describe('the nav button (kpopquiz.org)', () => {
  it('kpopquiz.org: closed with the flags off, with NET_CARDS alone and with NET_CARDS_BRIDGES alone', async () => {
    for (const vars of [{}, { NET_CARDS: '1' }, { NET_CARDS_BRIDGES: '1' }, { NET_CARDS: '0', NET_CARDS_BRIDGES: '1' }]) {
      env('kpop', vars);
      expect((await import('./nav')).navBridges(), JSON.stringify(vars)).toBeNull();
      expect((await import('./flags')).hubHomeLinkOn()).toBe(false);
    }
  });
  it('kpopquiz.org: the KpopCards button through the signed-in jump with both flags on (the Bunnyverse button is now an entry of the site switcher)', async () => {
    env('kpop', ON);
    const items = (await import('./nav')).navBridges()!;
    expect(items.map((i) => i.key)).toEqual(['cards']);
    expect(items[0]!.href).toBe('/auth/passport/out?to=hub&next=%2Fkpopcards&via=k.pp');
  });
  it('OtakuQuiz carries no bridge button of this kind, whatever the gate says (its Bunnyverse link is in the site switcher)', async () => {
    env('anime', { NET_CARDS_BRIDGES: '1', PRIVATE_LAUNCH: '0' });
    expect((await import('./nav')).navBridges()).toBeNull();
    expect((await import('./flags')).hubHomeLinkOn()).toBe(true);
  });
  it('the hub build draws no nav button of this kind (its own nav has the KpopCards entry)', async () => {
    env('hub', ON);
    expect((await import('./nav')).navBridges()).toBeNull();
  });
  it('the buttons render as nofollow links, and nothing for an empty list', async () => {
    const { NavBridgeLinks } = await import('@/components/cards-bridge/nav-bridges');
    expect(renderToStaticMarkup(h(NavBridgeLinks, { items: [] }))).toBe('');
    const html = renderToStaticMarkup(h(NavBridgeLinks, { items: [{ key: 'cards', label: 'KpopCards', href: '/x' }] }));
    expect(html).toContain('href="/x"');
    expect(html).toContain('rel="nofollow"');
    expect(html).toContain('KpopCards</a>');
  });
  it('the shell gets the list only when open: the prop is absent while off', async () => {
    env('kpop');
    const { UxShell } = await import('@/components/layout/ux-v1/ux-shell');
    const off = UxShell({ children: null });
    expect(Object.keys(off.props as object)).not.toContain('navBridges');
    env('kpop', ON);
    const m = await import('@/components/layout/ux-v1/ux-shell');
    expect((m.UxShell({ children: null }).props as { navBridges: unknown[] }).navBridges).toHaveLength(1);
  });
});

describe('after a quiz result', () => {
  it('hidden while closed (kpop flags off or half on, anime, hub), shown with both flags on kpop', async () => {
    for (const [site, vars] of [['kpop', {}], ['kpop', { NET_CARDS: '1' }], ['kpop', { NET_CARDS_BRIDGES: '1' }], ['anime', ON], ['hub', ON]] as const) {
      env(site, vars);
      expect((await import('./quiz-end')).cardsEndBridge(), `${site} ${JSON.stringify(vars)}`).toBeNull();
    }
    env('kpop', ON);
    expect((await import('./quiz-end')).cardsEndBridge()).toEqual({ href: '/auth/passport/out?to=hub&next=%2Fkpopcards&via=k.pp' });
  });
  it('the row renders a plain nofollow link', async () => {
    const { QuizEndCards } = await import('@/components/quiz/ux-v1/quiz-end-bridge');
    const html = renderToStaticMarkup(h(QuizEndCards, { href: '/go' }));
    expect(html).toContain('href="/go"');
    expect(html).toContain('KpopCards');
  });
});

describe('the hub bridges', () => {
  it('home band and tab: absent without the prop, present with it; the home page sets it only with both flags on the hub build', async () => {
    const { HomeCards } = await import('@/components/hub/home/home-cards');
    const html = renderToStaticMarkup(h(HomeCards));
    expect(html).toContain('href="/kpopcards"');
    expect(html).not.toMatch(DASH);
    for (const [site, vars, want] of [['hub', {}, false], ['hub', { NET_CARDS: '1' }, false], ['hub', ON, true], ['kpop', ON, true], ['anime', ON, false]] as const) {
      env(site, vars);
      const f = await import('./flags');
      expect(site === 'hub' ? f.cardsBridgesHubOn() : site === 'kpop' ? f.cardsBridgesKpopOn() : f.cardsBridgesOn(), `${site} ${JSON.stringify(vars)}`).toBe(want);
    }
    const src = readFileSync(new URL('../../app/sites/[site]/home-hub.tsx', import.meta.url), 'utf8');
    expect(src).toContain('...(cardsBridgesHubOn() ? { cards: true } : {})');
  });
  it('the end of a Kpopdle or Otakudle game: the link is drawn only from the cardsHref prop, which the page sets only with the hub gate open', () => {
    const game = readFileSync(new URL('../../components/hub/dle/dle-game.tsx', import.meta.url), 'utf8');
    expect(game).toContain('{cardsHref ? <p');
    const page = readFileSync(new URL('../../components/hub/dle/dle-game-page.tsx', import.meta.url), 'utf8');
    expect(page).toContain('...(cardsBridgesHubOn() ? { cardsHref: CARDS_PATH } : {})');
  });
});

describe('the live feed of pulls', () => {
  const row = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
    user_id: 'u1', handle: 'mina', num: 'BV1-0001', rarity: 'R', name: 'Karina', group: 'aespa', at: new Date(Date.now() - 60_000).toISOString(), ...o,
  });
  it('visiblePulls: Holo and above only, no Team account, no row without a nickname, user ids never leave', async () => {
    const { visiblePulls } = await import('./pulls');
    const rows = [
      row(), row({ user_id: 'team1', handle: 'kpopquizz' }), row({ user_id: 'u2', rarity: 'C' }), row({ user_id: 'u3', rarity: 'U' }),
      row({ user_id: 'u4', handle: '  ' }), row({ user_id: '', handle: 'ghost' }), row({ user_id: 'u5', rarity: 'L', num: 'bad' }),
      row({ user_id: 'u6', rarity: 'SR', handle: 'jo', num: 'BV1-0042', group: null }), row({ user_id: 'u7', rarity: 'UR', handle: 'li', num: 'BV1-0043' }),
    ];
    const out = visiblePulls(rows, new Set(['team1']));
    expect(out.map((p) => p.handle)).toEqual(['mina', 'jo', 'li']);
    expect(out.map((p) => p.label)).toEqual(['Holo', 'Era', 'Gold']);
    expect(JSON.stringify(out)).not.toContain('user_id');
    expect(JSON.stringify(out)).not.toContain('u1');
    expect(visiblePulls('nope', new Set())).toEqual([]);
  });
  const many = [row(), row({ user_id: 'u2', handle: 'jo', num: 'BV1-0002' }), row({ user_id: 'u3', handle: 'li', num: 'BV1-0003', rarity: 'SR' }), row({ user_id: 'team1', handle: 'kpopquizz', num: 'BV1-0004' })];
  it('off: no read at all, on any build', async () => {
    for (const [site, vars] of [['kpop', {}], ['kpop', { NET_CARDS: '1' }], ['kpop', { NET_CARDS_BRIDGES: '1' }], ['anime', ON], ['hub', ON]] as const) {
      env(site, vars);
      expect(await (await import('./pulls')).loadCardsPulls(), `${site} ${JSON.stringify(vars)}`).toBeNull();
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(teamIds).not.toHaveBeenCalled();
  });
  it('on: the panel lists the pulls, Team left out, links to the card through the jump, no picture', async () => {
    env('kpop', ON);
    rpc.mockResolvedValue({ data: many, error: null });
    teamIds.mockResolvedValue(new Set(['team1']));
    const el = await (await import('./pulls')).loadCardsPulls();
    expect(rpc).toHaveBeenCalledWith('cards_pulls_recent', expect.any(Object));
    const html = renderToStaticMarkup(el!);
    expect(html).toContain('mina');
    expect(html).toContain('pulled a Holo card');
    expect(html).toContain('pulled a Era card');
    expect(html).not.toContain('kpopquizz');
    expect(html).not.toContain('<img');
    expect(html).toContain('/auth/passport/out?to=hub');
  });
  it('hides below the floor, on a read error and when the Team list cannot be read', async () => {
    env('kpop', ON);
    rpc.mockResolvedValue({ data: many.slice(0, 2), error: null });
    expect(await (await import('./pulls')).loadCardsPulls()).toBeNull();
    rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    expect(await (await import('./pulls')).loadCardsPulls()).toBeNull();
    rpc.mockResolvedValue({ data: many, error: null });
    teamIds.mockRejectedValue(new Error('x'));
    expect(await (await import('./pulls')).loadCardsPulls()).toBeNull();
  });
  it('the SQL function holds the privacy rules and a rollback exists', () => {
    const dir = new URL('../../../../../docs/pending-migrations/cards/', import.meta.url);
    const sql = readFileSync(new URL('122-pulls-feed.sql', dir), 'utf8');
    expect(sql).toContain("c.rarity in ('R', 'SR', 'UR', 'L')");
    expect(sql).toContain('m.show_elsewhere');
    expect(sql).toContain('editorial_accounts');
    expect(sql).toContain('-- Verify:');
    expect(sql.match(/^do \$/gm)).toHaveLength(1);
    expect(readFileSync(new URL('122-pulls-feed.rollback.sql', dir), 'utf8')).toContain('drop function if exists public.cards_pulls_recent');
  });
});

describe('no dash in what this lot wrote', () => {
  it('files', () => {
    const files = [
      'lib/cards-bridge/nav.ts', 'lib/cards-bridge/quiz-end.ts', 'lib/cards-bridge/pulls.ts', 'lib/cards-bridge/flags.ts',
      'components/cards-bridge/nav-bridges.tsx', 'components/quiz/ux-v1/quiz-end-bridge.tsx', 'components/cards-bridge/pulls-feed.tsx', 'components/hub/home/home-cards.tsx',
    ];
    for (const f of files) expect(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'), f).not.toMatch(DASH);
  });
});
