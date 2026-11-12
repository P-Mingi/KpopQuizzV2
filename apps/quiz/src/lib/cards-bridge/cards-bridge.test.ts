// Bunnyverse Cards, lane B: the bridges. Each one absent with its flag off (no read, no module), present with it on (fake data); the bonus line hidden at
// an allowance of 0; the API route 404 while off; the Collection and the group reads; copy without dashes.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const useMe = vi.fn();
const useBonus = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ rpc }),
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock('@/components/cards-bridge/use-cards-me', () => ({ useCardsMe: (...a: unknown[]) => useMe(...a) }));
vi.mock('@/components/cards-bridge/use-cards-bonus', () => ({ useCardsBonus: (...a: unknown[]) => useBonus(...a) }));
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

beforeEach(() => { rpc.mockReset(); useMe.mockReset(); useBonus.mockReset(); vi.spyOn(console, 'error').mockImplementation(() => undefined); });
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
  const render = async (answer: unknown): Promise<string> => {
    env('1');
    useBonus.mockReturnValue(answer);
    const { BonusPackLine } = await import('@/components/cards-bridge/bonus-pack-line');
    return renderToStaticMarkup(h(BonusPackLine));
  };
  it('shown once the server recorded an earned bonus pack and the allowance is above 0', async () => {
    const html = await render({ signedIn: true, earned: 1, bonusLeft: 1 });
    expect(html).toContain('+1 pack, open it on Bunnyverse');
  });
  it('hidden at 0, for a guest and while loading', async () => {
    expect(await render({ signedIn: true, earned: 1, bonusLeft: 0 })).toBe('');
    expect(await render({ signedIn: false })).toBe('');
    expect(await render(null)).toBe('');
  });
  it('review 1 finding 1: hidden while the server recorded nothing, whatever the wallet says', async () => {
    useMe.mockReturnValue({ signedIn: true, wallet: { stock: 0, cap: 5, nextAt: null, midnightAt: null, bonusLeft: 3 } });
    expect(await render({ signedIn: true, earned: 0, bonusLeft: 3 })).toBe('');
    expect(await render({ signedIn: true, bonusLeft: 3 })).toBe('');
  });
  it('the line grants nothing: it is a link and no code of it posts', () => {
    const src = readFileSync('src/components/cards-bridge/bonus-pack-line.tsx', 'utf8');
    expect(src).not.toMatch(/fetch\(|POST/);
  });
});

describe('POST /api/cards-bridge/bonus (review 1 finding 1)', () => {
  const ORIGIN = 'https://bunnyverse.test';
  const post = (body: unknown, headers: Record<string, string> = {}): Request => new Request(`${ORIGIN}/api/cards-bridge/bonus`, {
    method: 'POST', headers: { host: 'bunnyverse.test', origin: ORIGIN, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  const src = (over: Partial<import('./bonus').BonusSource> = {}): import('./bonus').BonusSource => ({
    userId: async () => 'u1', isTeam: async () => false, record: vi.fn(async () => 1),
    wallet: async () => ({ stock: 5, next_at: null, midnight_at: '2026-11-12T23:00:00Z', bonus_left: 1 }), ...over,
  });
  it('404 while the bridges are off, nothing read or recorded', async () => {
    env(null);
    const s = src();
    expect((await (await import('./bonus')).handleBonus(post({ source: 'kpopdle' }), s)).status).toBe(404);
    expect(s.record).not.toHaveBeenCalled();
  });
  it('a cross-site call is 403 and a source other than kpopdle is 400 (a quiz earns nothing), before any record', async () => {
    env('1', 'hub');
    const { handleBonus } = await import('./bonus');
    const s = src();
    expect((await handleBonus(post({ source: 'kpopdle' }, { origin: 'https://evil.example' }), s)).status).toBe(403);
    for (const b of [{ source: 'quiz' }, {}, { source: 'kpopdle-idol' }]) expect((await handleBonus(post(b), s)).status).toBe(400);
    expect(s.record).not.toHaveBeenCalled();
  });
  it('records for the session user, then answers what was earned and what is left', async () => {
    env('1', 'hub');
    const { handleBonus } = await import('./bonus');
    const s = src();
    const res = await handleBonus(post({ source: 'kpopdle', user: 'someone-else' }), s, new Date('2026-11-12T10:00:00Z'));
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({ signedIn: true, earned: 1, bonusLeft: 1 });
    expect(s.record).toHaveBeenCalledWith('u1', new Date('2026-11-12T10:00:00Z'));
  });
  it('a guest and a Team account record nothing; a failed record says signedIn false', async () => {
    env('1', 'hub');
    const { handleBonus } = await import('./bonus');
    for (const s of [src({ userId: async () => null }), src({ isTeam: async () => true })]) {
      expect(await (await handleBonus(post({ source: 'kpopdle' }), s)).json()).toEqual({ signedIn: false });
      expect(s.record).not.toHaveBeenCalled();
    }
    expect(await (await handleBonus(post({ source: 'kpopdle' }), src({ record: async () => null }))).json()).toEqual({ signedIn: false });
  });
  it('a bonus cap of 0 records nothing', async () => {
    env('1', 'hub');
    vi.stubEnv('CARDS_BONUS_PER_DAY', '0');
    const s = src({ wallet: async () => ({ stock: 5, bonus_left: 0 }) });
    expect(await (await (await import('./bonus')).handleBonus(post({ source: 'kpopdle' }), s)).json()).toEqual({ signedIn: true, earned: 0, bonusLeft: 0 });
    expect(s.record).not.toHaveBeenCalled();
  });
  it('the default source calls cards_bonus_record with the session user and the wallet with the capped settings', async () => {
    env('1', 'hub');
    vi.stubEnv('CARDS_BONUS_PER_DAY', '50');
    rpc.mockResolvedValue({ data: 2, error: null });
    const d = (await import('./bonus')).defaultBonusSource();
    expect(await d.record('u1', new Date('2026-11-12T10:00:00Z'))).toBe(2);
    expect(rpc.mock.calls[0]).toEqual(['cards_bonus_record', { p_user: 'u1', p_now: '2026-11-12T10:00:00.000Z' }]);
    await d.wallet('u1', new Date('2026-11-12T10:00:00Z'));
    expect(rpc.mock.calls[1]![1]).toMatchObject({ p_bonus_cap: 20 });
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await d.record('u1', new Date())).toBeNull();
  });
});

describe('review 1 finding 10: the bridge routes on the hub follow its private launch; kpopquiz.org never has one', () => {
  const ALLOWED = 'aaaaaaaa-1111-2222-3333-444444444444';
  const gate = (): void => {
    vi.stubEnv('PRIVATE_LAUNCH', '1');
    vi.stubEnv('PRIVATE_LAUNCH_ALLOW', ALLOWED);
    vi.stubEnv('PRIVATE_LAUNCH_KEY', 'ab'.repeat(32));
  };
  const me = (id: string | null): import('./me').MeSource => ({ userId: async () => id, isTeam: async () => false, wallet: async () => ({ stock: 1 }), owned: async () => [] });
  const bonus = (id: string | null): import('./bonus').BonusSource => ({ userId: async () => id, isTeam: async () => false, record: vi.fn(async () => 1), wallet: async () => ({ stock: 1, bonus_left: 1 }) });
  const post = (): Request => new Request('https://b.test/api/cards-bridge/bonus', { method: 'POST', headers: { host: 'b.test', origin: 'https://b.test', 'content-type': 'application/json' }, body: '{"source":"kpopdle"}' });
  it('hub: a guest or an account not allowed gets 404 from me and bonus, nothing recorded; an allowed account is answered', async () => {
    env('1', 'hub');
    gate();
    const { handleMe } = await import('./me');
    const { handleBonus } = await import('./bonus');
    for (const id of [null, 'bbbbbbbb-1111-2222-3333-444444444444']) {
      expect((await handleMe(new Request('https://b.test/api/cards-bridge/me'), me(id))).status).toBe(404);
      const s = bonus(id);
      expect((await handleBonus(post(), s)).status).toBe(404);
      expect(s.record).not.toHaveBeenCalled();
    }
    expect((await handleMe(new Request('https://b.test/api/cards-bridge/me'), me(ALLOWED))).status).toBe(200);
    expect(await (await handleBonus(post(), bonus(ALLOWED))).json()).toEqual({ signedIn: true, earned: 1, bonusLeft: 1 });
  });
  it('kpopquiz.org: the same variables change nothing', async () => {
    env('1', 'kpop');
    gate();
    const { handleMe } = await import('./me');
    expect(await (await handleMe(new Request('https://k.test/api/cards-bridge/me'), me('u1'))).json()).toMatchObject({ signedIn: true });
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
  // Review 1 finding 3: a stand-in that honours the filters it receives (eq, or, in, order, limit), so a read by the wrong key finds nothing.
  type Row = Record<string, unknown>;
  const TABLES: Record<string, Row[]> = {
    cards_entities: [
      { id: 'group:blackpink', name: 'BLACKPINK', group_id: null, active: true },
      { id: 'idol:jennie', name: 'Jennie', group_id: 'group:blackpink', active: true },
      { id: 'idol:rose', name: 'Rose', group_id: 'group:blackpink', active: true },
      { id: 'idol:lisa-old', name: 'Lisa', group_id: 'group:blackpink', active: false },
      { id: 'group:btob', name: 'BTOB', group_id: null, active: true },
      { id: 'idol:iu', name: 'IU', group_id: null, active: true },
    ],
    cards_catalog: [
      { card_no: 1, num: 'BV1-0001', entity_id: 'idol:jennie', rarity: 'C', photo_id: 10, in_packs: true },
      { card_no: 2, num: 'BV1-0002', entity_id: 'idol:jennie', rarity: 'U', photo_id: 10, in_packs: true },
      { card_no: 5, num: 'BV1-0005', entity_id: 'idol:rose', rarity: 'C', photo_id: 11, in_packs: true },
      { card_no: 6, num: 'BV1-0006', entity_id: 'idol:rose', rarity: 'U', photo_id: 11, in_packs: false },
      { card_no: 9, num: 'BV1-0009', entity_id: 'group:btob', rarity: 'C', photo_id: 12, in_packs: true },
      { card_no: 13, num: 'BV1-0013', entity_id: 'idol:iu', rarity: 'C', photo_id: 13, in_packs: true },
      { card_no: 20, num: 'BV1-0020', entity_id: 'idol:lisa-old', rarity: 'C', photo_id: 14, in_packs: true },
    ],
    cards_photos: [
      // cut at the current focal point: the card file
      { id: 10, status: 'approved', focal_x: 50, focal_y: 30, storage_path: 'jennie-50-30', source_path: 'images/group-photos/jennie.jpg', file_focal_x: 50, file_focal_y: 30, small_2x: false },
      // no file yet: the source photo, cropped in CSS at the focal point
      { id: 11, status: 'approved', focal_x: 40, focal_y: 20, storage_path: null, source_path: 'images/group-photos/rose.jpg', file_focal_x: null, file_focal_y: null, small_2x: false },
      { id: 12, status: 'removed', focal_x: 50, focal_y: 50, storage_path: null, source_path: 'images/group-photos/btob.jpg', file_focal_x: null, file_focal_y: null, small_2x: true },
      { id: 13, status: 'approved', focal_x: 50, focal_y: 30, storage_path: null, source_path: 'images/group-photos/iu.jpg', file_focal_x: null, file_focal_y: null, small_2x: false },
      { id: 14, status: 'approved', focal_x: 50, focal_y: 30, storage_path: null, source_path: 'images/group-photos/lisa.jpg', file_focal_x: null, file_focal_y: null, small_2x: false },
    ],
  };
  const fakeDb = (): never => ({
    from: (t: string) => {
      let rows = [...(TABLES[t] ?? [])];
      const o: Record<string, unknown> = {};
      o.select = () => o;
      o.eq = (k: string, v: unknown) => { rows = rows.filter((r) => r[k] === v); return o; };
      o.in = (k: string, vs: unknown[]) => { rows = rows.filter((r) => vs.includes(r[k])); return o; };
      o.or = (expr: string) => {
        const alts = expr.split(',').map((x) => { const m = /^(\w+)\.eq\.(.+)$/.exec(x); if (!m) throw new Error(`bad or: ${x}`); return [m[1]!, m[2]!] as const; });
        rows = rows.filter((r) => alts.some(([k, v]) => r[k] === v));
        return o;
      };
      o.order = (k: string) => { rows.sort((a, b) => Number(a[k]) - Number(b[k])); return o; };
      o.limit = (n: number) => { rows = rows.slice(0, n); return o; };
      o.then = (res: (v: unknown) => void) => res({ data: rows, error: null });
      return o;
    },
  }) as never;
  it('review 1 finding 3: the cards of the group and of the people whose group line it is, by slug, with the art of cardImage()', async () => {
    env('1');
    const { readGroupCards } = await import('./group');
    const cards = await readGroupCards('blackpink', fakeDb(), 'https://p.supabase.co');
    expect(cards).toEqual([
      { n: 1, num: 'BV1-0001', name: 'Jennie', rarity: 'C', photoUrl: 'https://p.supabase.co/storage/v1/object/public/cards/jennie-50-30-1x.webp', focalX: 50, focalY: 30 },
      { n: 2, num: 'BV1-0002', name: 'Jennie', rarity: 'U', photoUrl: 'https://p.supabase.co/storage/v1/object/public/cards/jennie-50-30-1x.webp', focalX: 50, focalY: 30 },
      { n: 5, num: 'BV1-0005', name: 'Rose', rarity: 'C', photoUrl: 'https://p.supabase.co/storage/v1/object/public/images/group-photos/rose.jpg', focalX: 40, focalY: 20 },
    ]);
  });
  it("a soloist's own page has the soloist's cards; a card whose photo was removed is retired", async () => {
    env('1');
    const { readGroupCards } = await import('./group');
    expect((await readGroupCards('iu', fakeDb(), 'https://p.supabase.co')).map((c) => c.num)).toEqual(['BV1-0013']);
    expect(await readGroupCards('btob', fakeDb(), 'https://p.supabase.co')).toEqual([]);
  });
  it('a slug with no card, or that is not a slug, has no cards', async () => {
    env('1');
    const { readGroupCards, photoPublicUrl } = await import('./group');
    expect(await readGroupCards('no-such-group', fakeDb())).toEqual([]);
    expect(await readGroupCards('x,id.neq.0', fakeDb())).toEqual([]);
    expect(photoPublicUrl('https://p.co', '../x')).toBeNull();
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
    const cards = [{ n: 1, num: 'BV1-0001', name: 'Lisa', rarity: 'C', photoUrl: 'https://p/x.webp', focalX: 50, focalY: 30 }, { n: 2, num: 'BV1-0002', name: 'Rose', rarity: 'U', photoUrl: 'https://p/y.webp', focalX: 50, focalY: 30 }];
    useMe.mockReturnValue(null);
    let html = renderToStaticMarkup(h(CardsGroupGrid, { cards }));
    expect(html).toContain('2 cards');
    expect(html).not.toContain('<img');
    useMe.mockReturnValue({ signedIn: true, owned: [1] });
    html = renderToStaticMarkup(h(CardsGroupGrid, { cards }));
    expect(html).toContain('1 of 2 owned');
    expect(html.match(/<img/g)?.length).toBe(1);
    expect(html).toContain('https://p/x.webp');
    expect(html).toContain('object-position:50% 30%');
    expect(html).not.toContain('https://p/y.webp');
  });
});

describe('review 1 finding 16: the Collection counts owned cards among the catalog cards only', () => {
  it('both counts join the catalog (in packs) and its entity (active)', async () => {
    env('1');
    const { readCollection } = await import('./collection');
    const calls: Array<{ table: string; cols: string; filters: Array<[string, unknown]> }> = [];
    const db = { from: (table: string) => {
      const rec = { table, cols: '', filters: [] as Array<[string, unknown]> };
      calls.push(rec);
      const o: Record<string, unknown> = {};
      o.select = (cols: string) => { rec.cols = cols; return o; };
      for (const k of ['eq', 'gt']) o[k] = (c: string, v: unknown) => { rec.filters.push([c, v]); return o; };
      o.then = (r: (v: unknown) => void) => r({ count: table === 'cards_owned' ? 3 : 10, error: null });
      return o;
    } } as never;
    expect(await readCollection('u1', db)).toEqual({ owned: 3, total: 10 });
    const [own, all] = calls;
    expect(own).toMatchObject({ table: 'cards_owned', cols: 'card_no, cards_catalog!inner(in_packs, cards_entities!inner(active))' });
    expect(own!.filters).toEqual([['user_id', 'u1'], ['copies', 0], ['cards_catalog.in_packs', true], ['cards_catalog.cards_entities.active', true]]);
    expect(all).toMatchObject({ table: 'cards_catalog', cols: 'card_no, cards_entities!inner(active)' });
    expect(all!.filters).toEqual([['in_packs', true], ['cards_entities.active', true]]);
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
    for (const f of ['src/components/hub/dle/dle-game.tsx', 'src/components/layout/ux-v1/ux-client-shell.tsx']) {
      expect(readFileSync(f, 'utf8')).toContain('NEXT_PUBLIC_NET_CARDS_BRIDGES');
    }
  });
  it('review 1 finding 1: the end of a kpopquiz.org quiz ships no Cards code (a quiz completion earns no bonus pack)', () => {
    expect(readFileSync('src/components/quiz/ux-v1/results.tsx', 'utf8')).not.toMatch(/cards-bridge|NET_CARDS|BonusPackLine/);
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
