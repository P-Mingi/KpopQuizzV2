// Bunnyverse Cards, lane B: the bridges. Each one absent with its flag off (no read, no module), present with it on (fake data); the bonus line hidden at
// an allowance of 0; the API route 404 while off; the Collection and the group reads; copy without dashes.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const useMe = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ rpc }),
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock('@/components/cards-bridge/use-cards-me', () => ({ useCardsMe: (...a: unknown[]) => useMe(...a) }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async () => false }));
vi.mock('@/lib/site/registry', async (original) => {
  const real = await original<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return process.env.NEXT_PUBLIC_SITE_ID || 'kpop'; }, get SITE() { return real.REGISTRY[(process.env.NEXT_PUBLIC_SITE_ID || 'kpop') as 'kpop' | 'hub']; } };
});

function env(flag: string | null, site: 'kpop' | 'hub' = 'kpop', cards = true): void {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  if (flag !== null) vi.stubEnv('NET_CARDS_BRIDGES', flag);
  if (flag !== null && cards) vi.stubEnv('NET_CARDS', '1');
}

beforeEach(() => { rpc.mockReset(); useMe.mockReset(); vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.restoreAllMocks(); });

describe('flags', () => {
  it('NET_CARDS off keeps every bridge off even with NET_CARDS_BRIDGES on (the bridges lead to the Cards pages)', async () => {
    env('1', 'kpop', false);
    let f = await import('./flags');
    expect([f.cardsBridgesKpopOn(), f.cardsBridgesHubOn(), f.cardsBridgesOn(), f.cardsAdsOn()]).toEqual([false, false, false, false]);
    env('1', 'hub', false);
    f = await import('./flags');
    expect([f.cardsBridgesKpopOn(), f.cardsBridgesHubOn(), f.cardsBridgesOn(), f.cardsAdsOn()]).toEqual([false, false, false, false]);
  });
  for (const v of [null, '', '0', 'false', 'yes']) {
    it(`NET_CARDS_BRIDGES=${String(v)}: every switch off`, async () => {
      env(v);
      const f = await import('./flags');
      expect([f.cardsBridgesKpopOn(), f.cardsBridgesHubOn(), f.cardsBridgesOn(), f.cardsAdsOn()]).toEqual([false, false, false, false]);
    });
  }
  it('on: kpop build only for the kpop switch, hub build only for the hub switch', async () => {
    env('1');
    let f = await import('./flags');
    expect([f.cardsBridgesKpopOn(), f.cardsBridgesHubOn()]).toEqual([true, false]);
    env('true', 'hub');
    f = await import('./flags');
    expect([f.cardsBridgesKpopOn(), f.cardsBridgesHubOn()]).toEqual([false, true]);
  });
});

describe('home block (bridge 1)', () => {
  it('off: null, the module file is never loaded', async () => {
    env(null);
    const moduleLoaded = vi.fn();
    vi.doMock('@/components/cards-bridge/packs-home', () => { moduleLoaded(); throw new Error('loaded'); });
    expect(await (await import('./home')).loadCardsHome()).toBeNull();
    expect(moduleLoaded).not.toHaveBeenCalled();
    vi.doUnmock('@/components/cards-bridge/packs-home');
  });
  it('on, a guest: the guest line and a link through the signed-in jump', async () => {
    env('1');
    useMe.mockReturnValue(null);
    const el = await (await import('./home')).loadCardsHome();
    expect(el).not.toBeNull();
    const html = renderToStaticMarkup(el!);
    expect(html).toContain('Your packs');
    expect(html).toContain('/auth/passport/out?to=hub&amp;next=%2Fcards');
  });
  it('on, a signed-in fan: the stack of the database and the midnight line', async () => {
    env('1');
    useMe.mockReturnValue({ signedIn: true, wallet: { stock: 3, cap: 5, nextAt: null, midnightAt: null, bonusLeft: 0 } });
    const html = renderToStaticMarkup((await (await import('./home')).loadCardsHome())!);
    expect(html).toContain('3 of 5 packs ready');
    expect(html).toContain('Your stack is full.');
    expect(html).toContain('topped up to 5');
  });
  it('the hub build never draws it', async () => {
    env('1', 'hub');
    expect(await (await import('./home')).loadCardsHome()).toBeNull();
  });
});

describe('bonus line (bridge 3)', () => {
  const render = async (me: unknown): Promise<string> => {
    env('1');
    useMe.mockReturnValue(me);
    const { BonusPackLine } = await import('@/components/cards-bridge/bonus-pack-line');
    return renderToStaticMarkup(h(BonusPackLine));
  };
  it('shown while the allowance is above 0', async () => {
    const html = await render({ signedIn: true, wallet: { stock: 0, cap: 5, nextAt: null, midnightAt: null, bonusLeft: 1 } });
    expect(html).toContain('+1 pack, open it on Bunnyverse');
  });
  it('hidden at 0, for a guest and while loading', async () => {
    expect(await render({ signedIn: true, wallet: { stock: 0, cap: 5, nextAt: null, midnightAt: null, bonusLeft: 0 } })).toBe('');
    expect(await render({ signedIn: false })).toBe('');
    expect(await render(null)).toBe('');
  });
  it('the line grants nothing: it is a link and no code of it posts', () => {
    const src = readFileSync('src/components/cards-bridge/bonus-pack-line.tsx', 'utf8');
    expect(src).not.toMatch(/fetch\(|POST/);
  });
});

describe('the wallet read passes the bonus cap', () => {
  it('p_bonus_cap is 0 with the bridges off and the setting with them on', async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    env(null);
    vi.stubEnv('CARDS_BONUS_PER_DAY', '2');
    await (await import('./me')).defaultSource().wallet('u1', new Date('2026-11-12T10:00:00Z'));
    expect(rpc.mock.calls[0]![1]).toMatchObject({ p_bonus_cap: 0 });
    env('1');
    vi.stubEnv('CARDS_BONUS_PER_DAY', '2');
    await (await import('./me')).defaultSource().wallet('u1', new Date('2026-11-12T10:00:00Z'));
    expect(rpc.mock.calls[1]![1]).toMatchObject({ p_bonus_cap: 2 });
  });
});

describe('API route /api/cards-bridge/me', () => {
  const src = (over: Partial<import('./me').MeSource> = {}): import('./me').MeSource => ({
    userId: async () => 'u1', isTeam: async () => false,
    wallet: async () => ({ stock: 2, next_at: '2026-11-12T10:10:00Z', midnight_at: '2026-11-12T23:00:00Z', bonus_left: 2 }),
    owned: async () => [1, 4], ...over,
  });
  it('404 while the flag is off, nothing read', async () => {
    env(null);
    const userId = vi.fn();
    const r = await (await import('./me')).handleMe(new Request('https://x.test/api/cards-bridge/me'), src({ userId }));
    expect(r.status).toBe(404);
    expect(userId).not.toHaveBeenCalled();
  });
  it('on: the wallet and, when asked, the owned numbers', async () => {
    env('1');
    const { handleMe } = await import('./me');
    const j = await (await handleMe(new Request('https://x.test/api/cards-bridge/me?owned=1'), src())).json();
    expect(j).toEqual({ signedIn: true, wallet: { stock: 2, cap: 5, nextAt: '2026-11-12T10:10:00.000Z', midnightAt: '2026-11-12T23:00:00.000Z', bonusLeft: 2 }, owned: [1, 4] });
    const j2 = await (await handleMe(new Request('https://x.test/api/cards-bridge/me'), src())).json();
    expect(j2.owned).toBeUndefined();
  });
  it('a guest, a Team account and a failed read are all signedIn false', async () => {
    env('1');
    const { handleMe } = await import('./me');
    for (const s of [src({ userId: async () => null }), src({ isTeam: async () => true }), src({ wallet: async () => { throw new Error('db'); } })]) {
      expect(await (await handleMe(new Request('https://x.test/api/cards-bridge/me'), s)).json()).toEqual({ signedIn: false });
    }
  });
  it('an unreadable wallet leaves signedIn true without a wallet (the islands show the guest line)', async () => {
    env('1');
    const { handleMe } = await import('./me');
    expect(await (await handleMe(new Request('https://x.test/api/cards-bridge/me'), src({ wallet: async () => null }))).json()).toEqual({ signedIn: true });
  });
});

describe('wallet call', () => {
  it('passes the bonus cap and ad limit of the environment, defaults otherwise', async () => {
    const { envInt } = await import('./me');
    expect(envInt(undefined, 3)).toBe(3);
    expect(envInt('5', 3)).toBe(5);
    expect(envInt('x', 3)).toBe(3);
    expect(envInt('-1', 3)).toBe(3);
  });
});

describe('group block (bridge 2)', () => {
  const fakeDb = (): never => {
    const q = (rows: unknown): unknown => {
      const o: Record<string, unknown> = {};
      for (const k of ['select', 'eq', 'or', 'in', 'order', 'limit']) o[k] = () => o;
      o.then = (res: (v: unknown) => void) => res({ data: rows, error: null });
      return o;
    };
    return { from: (t: string) => q(t === 'cards_entities' ? [{ id: 'group:Q1', name: 'BLACKPINK' }, { id: 'idol:Q2', name: 'Lisa' }]
      : t === 'cards_catalog' ? [{ card_no: 1, num: 'BV1-0001', entity_id: 'idol:Q2', rarity: 'C', photo_id: 10 }, { card_no: 2, num: 'BV1-0002', entity_id: 'group:Q1', rarity: 'U', photo_id: 11 }]
      : [{ id: 10, storage_path: 'a/b.webp' }]) } as never;
  };
  it('a card whose photo is not approved is retired; the photo URL is the public bucket', async () => {
    env('1');
    const { readGroupCards, photoPublicUrl } = await import('./group');
    const slugs = Object.keys((await import('@/data/wikidata-groups.json') as { default: { groups: Record<string, unknown> } }).default.groups);
    const cards = await readGroupCards(slugs[0]!, fakeDb(), 'https://p.supabase.co');
    expect(cards).toEqual([{ n: 1, num: 'BV1-0001', name: 'Lisa', rarity: 'C', photoUrl: 'https://p.supabase.co/storage/v1/object/public/cards/a/b.webp' }]);
    expect(photoPublicUrl('https://p.co', '../x')).toBeNull();
  });
  it('a group with no Wikidata id has no cards', async () => {
    env('1');
    expect(await (await import('./group')).readGroupCards('no-such-group', fakeDb())).toEqual([]);
  });
  it('off: null, the module file is never loaded', async () => {
    env(null);
    const moduleLoaded = vi.fn();
    vi.doMock('@/components/cards-bridge/cards-group', () => { moduleLoaded(); throw new Error('loaded'); });
    expect(await (await import('./group')).loadCardsGroup({ name: 'BLACKPINK', slug: 'blackpink' })).toBeNull();
    expect(moduleLoaded).not.toHaveBeenCalled();
    vi.doUnmock('@/components/cards-bridge/cards-group');
  });
  it('the grid: guest sees backs and the total, a fan sees owned in colour', async () => {
    env('1');
    const { CardsGroupGrid } = await import('@/components/cards-bridge/cards-group-grid');
    const cards = [{ n: 1, num: 'BV1-0001', name: 'Lisa', rarity: 'C', photoUrl: 'https://p/x.webp' }, { n: 2, num: 'BV1-0002', name: 'Rose', rarity: 'U', photoUrl: 'https://p/y.webp' }];
    useMe.mockReturnValue(null);
    let html = renderToStaticMarkup(h(CardsGroupGrid, { cards }));
    expect(html).toContain('2 cards');
    expect(html).not.toContain('<img');
    useMe.mockReturnValue({ signedIn: true, owned: [1] });
    html = renderToStaticMarkup(h(CardsGroupGrid, { cards }));
    expect(html).toContain('1 of 2 owned');
    expect(html.match(/<img/g)?.length).toBe(1);
    expect(html).toContain('https://p/x.webp');
    expect(html).not.toContain('https://p/y.webp');
  });
});

describe('Collection (bridge 4)', () => {
  it('off: null and no read', async () => {
    env(null);
    const m = await import('./collection');
    expect(await m.loadCollectionKpop('u1')).toBeNull();
    expect(await m.loadCollectionHub('u1')).toBeNull();
  });
  it('counts come from the database; an empty catalog shows nothing', async () => {
    env('1');
    const { readCollection } = await import('./collection');
    const db = (own: number, total: number) => ({ from: (t: string) => { const o: Record<string, unknown> = {}; for (const k of ['select', 'eq', 'gt']) o[k] = () => o; o.then = (r: (v: unknown) => void) => r({ count: t === 'cards_owned' ? own : total, error: null }); return o; } }) as never;
    expect(await readCollection('u1', db(12, 300))).toEqual({ owned: 12, total: 300 });
    expect(await readCollection('u1', db(0, 0))).toBeNull();
    const { collectionSection } = await import('@/components/cards-bridge/collection-section');
    const html = renderToStaticMarkup(collectionSection({ owned: 12, total: 300 }));
    expect(html).toContain('Collection');
    expect(html).toContain('12 of 300 cards');
  });
});

describe('the account menu and the surfaces', () => {
  it('the Binder link goes through the signed-in jump from kpopquiz.org and direct on the hub', async () => {
    env('1');
    const { cardsHref } = await import('./links');
    const real = await import('@/lib/site/registry');
    expect(cardsHref('/cards/binder', real.REGISTRY.kpop)).toContain('/auth/passport/out?to=hub&next=%2Fcards%2Fbinder&via=');
    expect(cardsHref('/cards/binder', real.REGISTRY.hub)).toBe('/cards/binder');
  });
  it('the surfaces read the public twin flag as a build constant, nothing else', () => {
    for (const f of ['src/components/quiz/ux-v1/results.tsx', 'src/components/hub/dle/dle-game.tsx', 'src/components/layout/ux-v1/ux-client-shell.tsx']) {
      expect(readFileSync(f, 'utf8')).toContain('NEXT_PUBLIC_NET_CARDS_BRIDGES');
    }
  });
});

describe('laws', () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = `${dir}/${n}`; return statSync(p).isDirectory() ? files(p) : p.includes('.test.') ? [] : [p]; });
  it('no em or en dash in the files of the lane', () => {
    const own = [...files('src/lib/cards-bridge'), ...files('src/components/cards-bridge'), 'src/lib/cards/ads.ts', 'src/lib/cards/ads-server.ts', 'src/lib/cards/ads.test.ts', 'src/app/api/cards-bridge/me/route.ts'];
    for (const f of own) expect(readFileSync(f, 'utf8'), f).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`));
  });
  it('kpopquiz.org code never touches an ad script', () => {
    for (const f of [...files('src/lib/cards-bridge'), 'src/components/cards-bridge/cards-home.tsx', 'src/components/cards-bridge/cards-group.tsx', 'src/components/cards-bridge/bonus-pack-line.tsx']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/adsbygoogle|googlesyndication|lib\/cards\/ads/);
    }
  });
});
