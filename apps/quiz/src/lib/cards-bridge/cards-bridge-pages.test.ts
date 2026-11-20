// Bunnyverse Cards, lane B: the bridges from a group page and an idol page of kpopquiz.org to THEIR cards. Hidden with the flags off (no new link, no
// new HTML, nothing read), shown with them on, the right target for the group and for the idol.
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useMe = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({ from }) }));
vi.mock('@/components/cards-bridge/use-cards-me', () => ({ useCardsMe: (...a: unknown[]) => useMe(...a) }));
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

type Row = Record<string, unknown>;
const TABLES: Record<string, Row[]> = {
  cards_entities: [
    { id: 'group:blackpink', name: 'BLACKPINK', group_id: null, active: true },
    { id: 'idol:jennie', name: 'Jennie', group_id: 'group:blackpink', active: true },
    { id: 'idol:rose', name: 'Rosé', group_id: 'group:blackpink', active: true },
    { id: 'idol:lisa', name: 'Lisa', group_id: 'group:blackpink', active: true },
    { id: 'idol:iu', name: 'IU', group_id: null, active: true },
    { id: 'group:g-idle', name: '(G)I-DLE', group_id: null, active: true },
    { id: 'idol:soyeon', name: 'Soyeon', group_id: 'group:g-idle', active: true },
  ],
  cards_catalog: [
    { card_no: 1, num: 'BV1-0001', entity_id: 'idol:jennie', rarity: 'C', photo_id: 10, in_packs: true },
    { card_no: 2, num: 'BV1-0002', entity_id: 'idol:jennie', rarity: 'U', photo_id: 10, in_packs: true },
    { card_no: 5, num: 'BV1-0005', entity_id: 'idol:rose', rarity: 'C', photo_id: 11, in_packs: true },
    { card_no: 7, num: 'BV1-0007', entity_id: 'idol:lisa', rarity: 'C', photo_id: 12, in_packs: true },
    { card_no: 13, num: 'BV1-0013', entity_id: 'idol:iu', rarity: 'C', photo_id: 13, in_packs: true },
    { card_no: 20, num: 'BV1-0020', entity_id: 'group:g-idle', rarity: 'C', photo_id: 13, in_packs: true },
  ],
  cards_photos: [
    { id: 10, status: 'approved', focal_x: 50, focal_y: 30, storage_path: 'jennie-50-30', source_path: 'images/group-photos/jennie.jpg', file_focal_x: 50, file_focal_y: 30, small_2x: false },
    { id: 11, status: 'approved', focal_x: 40, focal_y: 20, storage_path: null, source_path: 'images/group-photos/rose.jpg', file_focal_x: null, file_focal_y: null, small_2x: false },
    { id: 12, status: 'removed', focal_x: 50, focal_y: 50, storage_path: null, source_path: 'images/group-photos/lisa.jpg', file_focal_x: null, file_focal_y: null, small_2x: false },
    { id: 13, status: 'approved', focal_x: 50, focal_y: 30, storage_path: null, source_path: 'images/group-photos/x.jpg', file_focal_x: null, file_focal_y: null, small_2x: false },
  ],
};
const reads: string[] = [];
function fake(t: string): unknown {
  reads.push(t);
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
}

beforeEach(() => { reads.length = 0; useMe.mockReset(); useMe.mockReturnValue(null); from.mockReset(); from.mockImplementation(fake); vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.restoreAllMocks(); });

const jump = (path: string): string => `/auth/passport/out?to=hub&next=${encodeURIComponent(path)}&via=k.pp`;

describe('the group block links to the group\'s own cards', () => {
  it('on: "<Group> cards on Bunnyverse" goes to the group\'s collection through the jump, nofollow; the whole binder stays', async () => {
    env('1');
    const { loadCardsGroup } = await import('./group');
    const html = renderToStaticMarkup((await loadCardsGroup({ name: 'BLACKPINK', slug: 'blackpink' })) as React.ReactElement);
    expect(html).toContain(`href="${jump('/kpopcards/collection/blackpink').replace(/&/g, '&amp;')}" rel="nofollow">BLACKPINK cards on Bunnyverse</a>`);
    expect(html).toContain('Open your binder on Bunnyverse');
  });
  it('the section slug is the binder\'s: a name with symbols, a soloist under soloists', async () => {
    env('1');
    const { readGroupCollection } = await import('./group');
    expect(await readGroupCollection('g-idle', { from: fake } as never)).toBe('g-i-dle');
    expect(await readGroupCollection('iu', { from: fake } as never)).toBe('soloists');
  });
  it('an unknown page or a bad slug has no section: the block keeps only the link to the whole binder (never a path that could 404)', async () => {
    env('1');
    const { readGroupCollection } = await import('./group');
    expect(await readGroupCollection('no-such', { from: fake } as never)).toBeNull();
    expect(await readGroupCollection('x,id.neq.0', { from: fake } as never)).toBeNull();
    const { cardsGroup } = await import('@/components/cards-bridge/cards-group');
    const calls = from.getMockImplementation();
    from.mockImplementation((t: string) => (t === 'cards_entities' ? { select: () => ({ eq: () => ({ or: () => ({ limit: async () => ({ data: null, error: { message: 'x' } }) }) }) }) } : (calls as (t: string) => unknown)(t)));
    const html = renderToStaticMarkup((await cardsGroup('BLACKPINK', 'blackpink')) as never);
    expect(html).not.toContain('/kpopcards/collection/');
    expect(html).not.toContain('collection%2F');
  });
  it('off (either flag, or the hub build): null, no read, no module', async () => {
    for (const [flag, site, cards] of [[null, 'kpop', true], ['0', 'kpop', true], ['1', 'kpop', false], ['1', 'hub', true]] as const) {
      env(flag, site, cards);
      const moduleLoaded = vi.fn();
      vi.doMock('@/components/cards-bridge/cards-group', () => { moduleLoaded(); throw new Error('loaded'); });
      vi.doMock('@/components/cards-bridge/cards-idol', () => { moduleLoaded(); throw new Error('loaded'); });
      const m = await import('./group');
      expect(await m.loadCardsGroup({ name: 'BLACKPINK', slug: 'blackpink' })).toBeNull();
      expect(await m.loadCardsIdol({ slug: 'blackpink' }, { name: 'Jennie', slug: 'jennie' })).toBeNull();
      expect(moduleLoaded).not.toHaveBeenCalled();
      expect(reads).toEqual([]);
      vi.doUnmock('@/components/cards-bridge/cards-group');
      vi.doUnmock('@/components/cards-bridge/cards-idol');
    }
  });
});

describe('the idol page links to the idol\'s cards', () => {
  it('on: "<Idol> cards" goes to the hub idol page through the jump, nofollow, with the real count', async () => {
    env('1');
    const { loadCardsIdol } = await import('./group');
    const html = renderToStaticMarkup((await loadCardsIdol({ slug: 'blackpink' }, { name: 'Jennie', slug: 'jennie' })) as React.ReactElement);
    expect(html).toContain(`href="${jump('/kpopcards/idol/jennie').replace(/&/g, '&amp;')}"`);
    expect(html).toContain('rel="nofollow"');
    expect(html).toContain('>Jennie cards</a>');
    expect(html).toContain('2 cards on Bunnyverse');
    expect(html).not.toContain('<img');
  });
  it('the address is the slug of the stage name, as the hub finds it (accents folded)', async () => {
    env('1');
    const { loadCardsIdol, slugOf } = await import('./group');
    const { slugOf: hubSlugOf } = await import('@/lib/cards/kc-idol');
    for (const n of ['Rosé', 'Jennie', 'G.Soyeon', '(G)I-DLE', 'IU']) expect(slugOf(n)).toBe(hubSlugOf(n));
    const html = renderToStaticMarkup((await loadCardsIdol({ slug: 'blackpink' }, { name: 'Rosé', slug: 'rose' })) as React.ReactElement);
    expect(html).toContain(encodeURIComponent('/kpopcards/idol/rose'));
    expect(html).toContain('1 card on Bunnyverse');
  });
  it('an idol with no card, or whose only photo was removed, or of another group, gets no link', async () => {
    env('1');
    const { loadCardsIdol } = await import('./group');
    expect(await loadCardsIdol({ slug: 'blackpink' }, { name: 'Lisa', slug: 'lisa' })).toBeNull();
    expect(await loadCardsIdol({ slug: 'blackpink' }, { name: 'Soyeon', slug: 'soyeon' })).toBeNull();
    expect(await loadCardsIdol({ slug: 'g-idle' }, { name: 'Soyeon', slug: 'soyeon' })).toBeNull();
    expect(await loadCardsIdol({ slug: 'blackpink' }, { name: 'Nobody', slug: 'nobody' })).toBeNull();
    expect(await loadCardsIdol({ slug: 'x,id.neq.0' }, { name: 'Jennie', slug: 'jennie' })).toBeNull();
  });
  it('a read that fails hides the link and never throws', async () => {
    env('1');
    from.mockImplementation(() => { throw new Error('db down'); });
    const { loadCardsIdol } = await import('./group');
    expect(await loadCardsIdol({ slug: 'blackpink' }, { name: 'Jennie', slug: 'jennie' })).toBeNull();
  });
  it('the idol page calls the loader and puts its result in the page; the group hub still does for the group', () => {
    const page = readFileSync(new URL('../../app/(site)/verse/[slug]/members/[idol]/page.tsx', import.meta.url), 'utf8');
    expect(page).toContain("loadCardsIdol(d.group, { name: d.name, slug: idol })");
    expect(page).toContain('{cardsLink}');
  });
  it('no dash in the new copy and the new component', async () => {
    const copy = await import('./copy');
    const text = [copy.groupCollectionLink('X'), copy.idolCardsLink('X'), copy.idolCardsCount(1), copy.idolCardsCount(3), readFileSync(new URL('../../components/cards-bridge/cards-idol.tsx', import.meta.url), 'utf8')].join('\n');
    expect(text).not.toContain(String.fromCharCode(0x2013));
    expect(text).not.toContain(String.fromCharCode(0x2014));
  });
});
