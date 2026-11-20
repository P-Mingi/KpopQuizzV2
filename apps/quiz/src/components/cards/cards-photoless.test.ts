// Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK: the owner decision of 2026-11-18. A card the player owns whose photo left (photo_id null, out of
// the packs: 119, the rights, the minors rule) stays in the binder as a "New photo coming" frame (its number, its edition and its name, no image),
// and takes its photo back the day a new one arrives. Render tests as cards-ui.test.ts (renderToStaticMarkup): the binder, the card page, the
// credit, the idol page; and the pure layer under them (withOwnedRetired, the payload, the pool).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const site = vi.hoisted(() => ({ id: 'hub' as string }));
const ctxHolder = vi.hoisted(() => ({ ctx: null as unknown }));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('@/lib/site/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return site.id; } };
});
vi.mock('@/components/cards/cards-font', () => ({ cardsFace: { variable: 'bvc-card-var' }, cardsMono: { variable: 'bvc-mono-var' }, cardsUi: { variable: 'bvc-ui-var' } }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/kpopcards', useRouter: () => ({ replace: () => undefined, push: () => undefined }), useSearchParams: () => new URLSearchParams(),
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
}));
// The pages read the player from the provider's state, which an effect fills (it never runs in a static render): a test hands the context in.
vi.mock('./cards-provider', async (orig) => {
  const real = await orig<typeof import('./cards-provider')>();
  return { ...real, useCards: () => (ctxHolder.ctx ?? real.useCards()) as ReturnType<typeof real.useCards> };
});

import { BinderView } from './binder-view';
import { CardDetail } from './card-detail';
import { CardFront } from './card-art';
import { CardsProvider } from './cards-provider';
import { CreditBlock } from './credit-block';
import { IdolView } from './idol-view';
import { buildCatalog } from '@/lib/cards/catalog';
import { resetPoolCache, drawServerPack } from '@/lib/cards/draw';
import { buildDetail } from '@/lib/cards/ui-detail';
import { buildFixtureCatalog } from '@/lib/cards/ui-fixture';
import { fromPayload } from '@/lib/cards/ui-catalog';
import { computeOdds } from '@/lib/cards/rules';
import { buildSlim, ownedMap, withOwnedRetired } from '@/lib/cards/ui-model';

import type { AdsContext } from '@/lib/cards/ads';
import type { PoolCard } from '@/lib/cards/types';
import type { UiCatalog } from '@/lib/cards/ui-types';

const ADS_OFF: AdsContext = { enabled: false, client: null, bannerSlot: null, country: null, knownMinor: false, consentRequired: true, test: false };

/** The fixture catalog with one idol card taken out of the packs (what 119 does): no photo, listed in `retired`. */
function withRetired(): { cat: UiCatalog; gone: UiCatalog['cards'][number] } {
  const full = buildFixtureCatalog();
  const gone = full.cards.find((c) => c.kind === 'idol' && c.rarity === 'R')!;
  const cat: UiCatalog = { ...full, cards: full.cards.filter((c) => c.n !== gone.n), retired: [{ ...gone, photo: null, retired: true }] };
  return { cat, gone };
}
const OWN = (n: number) => ({ n, copies: 2, fav: false, at: '2026-11-18T10:00:00Z' });

beforeEach(() => { site.id = 'hub'; ctxHolder.ctx = null; vi.stubEnv('NET_CARDS', '1'); vi.stubEnv('CARDS_UI_FIXTURE', '1'); });
afterEach(() => { vi.unstubAllEnvs(); ctxHolder.ctx = null; });

/** Renders a page as a player who owns `ns`: the provider's own context with the player's cards in it (the same catalog view the provider builds). */
function asPlayer(cat: UiCatalog, ns: number[], el: () => React.ReactElement): string {
  const slim = buildSlim(cat);
  const owned = ownedMap(ns.map(OWN));
  const state = { owned: ns.map(OWN), wishlist: [], stock: 3, cap: 10 } as unknown;
  const base = { status: 'ready', state, now: Date.parse('2026-11-18T12:00:00Z'), catalog: withOwnedRetired(slim, owned), byN: new Map([...slim.retired, ...slim.cards].map((c) => [c.n, c])), owned,
    panoByP: new Map(), panoOwned: new Set<number>(), api: null, kc: null, lobby: null, fixture: false, protoExample: false, demo: false, lastPack: null, newSet: new Set<number>(),
    clearNew: () => undefined, applyResult: () => undefined, refresh: async () => undefined, toggleFav: async () => undefined, recycle: async () => ({ error: 'x' }), toast: () => undefined };
  ctxHolder.ctx = base;
  return renderToStaticMarkup(el());
}

describe('the payload: a card out of the packs is listed apart, never drawn', () => {
  const ent = (id: string, kind: 'idol' | 'group', name: string) => ({ id, kind, name, group_id: null, debut_year: 2019, sort_key: id, lock_reasons: null });
  const photo = (id: number) => ({ id, slot: 1, source: 'commons' as const, source_page: 'p', author: 'A', author_url: null, licence: 'CC BY 4.0', licence_url: 'l', share_alike: false, modified: 'm',
    focal_x: 50, focal_y: 30, storage_path: `s${id}`, source_path: null, file_focal_x: 50, file_focal_y: 30, small_2x: false });
  const row = (n: number, rarity: 'C' | 'U' | 'R', photo_id: number | null) => ({ card_no: n, num: `BV1-${String(n).padStart(4, '0')}`, entity_id: 'idol:a', rarity, edition: (rarity === 'C' ? 'std' : rarity === 'U' ? 'stage' : 'holo') as 'std', photo_id });

  it('lists the card with no photo and no image, keeps it out of cards and the odds, and a locked subject keeps none', () => {
    const p = buildCatalog([row(1, 'C', 1)], [ent('idol:a', 'idol', 'Ada') as never, ent('idol:b', 'idol', 'Bea') as never], [photo(1)], '2026-11-18T00:00:00Z', 'https://x.test',
      new Set(['idol:b']), null, [row(2, 'U', null), { ...row(3, 'R', null), entity_id: 'idol:b' }]);
    expect(p.cards.map((c) => c.n)).toEqual([1]);
    expect(p.retired).toHaveLength(1);
    expect(p.retired![0]).toMatchObject({ n: 2, num: 'BV1-0002', name: 'Ada', edition: 'stage', photo: null, image: null, retired: true });
    expect(p.odds).toEqual(computeOdds([{ n: 1, kind: 'idol', rarity: 'C' }]));
  });
  it('a card whose photo is live again is a card of the packs and is not listed as retired', () => {
    const p = buildCatalog([row(1, 'C', 1), row(2, 'U', 2)], [ent('idol:a', 'idol', 'Ada') as never], [photo(1), photo(2)], '2026-11-18T00:00:00Z', 'https://x.test', new Set(), null, [row(2, 'U', 2)]);
    expect(p.retired).toBeUndefined();
    expect(p.cards.find((c) => c.n === 2)?.image?.url).toContain('s2-1x.webp');
  });
  it('a refused photo leaves the card with no picture, still listed (its owner keeps it)', () => {
    const p = buildCatalog([row(1, 'C', 1)], [ent('idol:a', 'idol', 'Ada') as never], [photo(1)], '2026-11-18T00:00:00Z', 'https://x.test', new Set(), null, [row(2, 'U', 9)]);
    expect(p.retired?.[0]).toMatchObject({ n: 2, photo: null, image: null });
  });
  it('reaches the pages: fromPayload keeps the retired cards, buildSlim marks them "soon"', () => {
    const p = buildCatalog([row(1, 'C', 1)], [ent('idol:a', 'idol', 'Ada') as never], [photo(1)], '2026-11-18T00:00:00Z', 'https://x.test', new Set(), null, [row(2, 'U', null)]);
    const slim = buildSlim(fromPayload(p));
    expect(slim.cards.map((c) => c.n)).toEqual([1]);
    expect(slim.retired).toHaveLength(1);
    expect(slim.retired[0]).toMatchObject({ n: 2, soon: true, img: null });
    expect(slim.cards[0]!.soon).toBeUndefined();
  });
  it('a card with no photo that is out of the packs never comes out of a pack: the pool is the cards in packs, and the odds ignore the retired ones', async () => {
    resetPoolCache();
    const pool: PoolCard[] = [{ n: 1, kind: 'idol', rarity: 'C', entity: 'idol:a' }, { n: 5, kind: 'idol', rarity: 'U', entity: 'idol:a' }];
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) for (const n of await drawServerPack({ read: async () => pool, now: i * 1e9 })) seen.add(n);
    expect([...seen].sort()).toEqual([1, 5]);
    expect(seen.has(2)).toBe(false);
    resetPoolCache();
  });
});

describe('the binder keeps an owned card that lost its photo', () => {
  it('a card owned and out of the packs takes its pocket as the "New photo coming" frame: number, edition, name, no image', () => {
    const { cat, gone } = withRetired();
    const slim = buildSlim(cat);
    // nobody owns it: its edition is still the locked pocket, and the counts do not move
    expect(slim.items.some((i) => !i.locked && i.card.n === gone.n)).toBe(false);
    const view = withOwnedRetired(slim, ownedMap([OWN(gone.n)]));
    const it = view.items.find((i) => !i.locked && i.card.n === gone.n)!;
    expect(it).toBeTruthy();
    expect(it.locked ? null : it.card.soon).toBe(true);
    expect(view.items).toHaveLength(slim.items.length);
    expect(view.cards).toBe(slim.cards);
    expect(view.items.map((x) => x.i)).toEqual(view.items.map((_, k) => k));
    expect(slim.items.map((x) => x.i)).toEqual(slim.items.map((_, k) => k));
    expect(withOwnedRetired(slim, ownedMap([]))).toBe(slim);
  });
  it('the page of the binder draws it with its number, its edition and its name and no img, and a card with a photo keeps its img', () => {
    const { cat, gone } = withRetired();
    const html = asPlayer(cat, [gone.n], () => createElement(BinderView, { ads: ADS_OFF }));
    expect(html).toContain('data-soon="true"');
    expect(html).toContain('New photo');
    expect(html).toContain(gone.num.slice(4));
    expect(html).toContain(gone.name);
    expect(html).toMatch(new RegExp(`aria-label="${gone.name}, [^"]*, 2 copies"`));
    const at = html.indexOf('data-soon="true"');
    const card = html.slice(html.lastIndexOf('<a class="pocket"', at), html.indexOf('</a>', at));
    expect(card).not.toContain('<img');
  });
  it('a card that has no pocket for its edition (its subject has no other card) still comes back, in the section of its group', () => {
    const full = buildFixtureCatalog();
    const idol = full.cards.find((c) => c.kind === 'idol')!;
    const mine = full.cards.filter((c) => c.entity === idol.entity);
    const cat: UiCatalog = { ...full, cards: full.cards.filter((c) => c.entity !== idol.entity), retired: mine.map((c) => ({ ...c, photo: null, retired: true as const })) };
    const slim = buildSlim(cat);
    expect(slim.items.some((i) => !i.locked && i.card.entity === idol.entity)).toBe(false);
    const view = withOwnedRetired(slim, ownedMap([OWN(mine[0]!.n)]));
    const got = view.items.filter((i) => !i.locked && i.card.entity === idol.entity);
    expect(got).toHaveLength(1);
    expect(view.sections.some((s) => s.id === got[0]!.sec)).toBe(true);
    expect(view.cards.length).toBe(slim.cards.length);
  });
  it('takes its photo back as soon as one arrives: a card with a live photo is an ordinary card, no frame', () => {
    const { cat, gone } = withRetired();
    const back: UiCatalog = { ...cat, cards: [...cat.cards, gone].sort((a, b) => a.n - b.n), retired: [] };
    const slim = buildSlim(back);
    const view = withOwnedRetired(slim, ownedMap([OWN(gone.n)]));
    const it = view.items.find((i) => !i.locked && i.card.n === gone.n)!;
    expect(it.locked ? null : it.card.img).not.toBeNull();
    expect(it.locked ? null : it.card.soon).toBeUndefined();
    const html = asPlayer(back, [gone.n], () => createElement(BinderView, { ads: ADS_OFF }));
    expect(html).not.toContain('data-soon="true"');
  });
});

describe('the card page of a card with no photo', () => {
  it('is a page, not a 404; the frame, no Commons credit, no craft, no wish heart, no lock', () => {
    const { cat, gone } = withRetired();
    const d = buildDetail(cat, gone.num, null)!;
    expect(d).toBeTruthy();
    expect(d.soon).toBe(true);
    expect(d.photo).toBeNull();
    expect(d.props.card?.soon).toBe(true);
    expect(d.props.backCredit).toBeNull();
    const credit = renderToStaticMarkup(createElement(CreditBlock, { photo: d.photo, num: d.card.num, kind: 'idol', soon: d.soon }));
    expect(credit).toContain('A new photo is coming');
    expect(credit).not.toMatch(/Photo \d|CC BY|Commons|Report a photo/);
    const html = asPlayer(cat, [gone.n], () => createElement(CardDetail, { ...d.props, credit: createElement(CreditBlock, { photo: d.photo, num: d.card.num, soon: d.soon }) }));
    expect(html).toContain('data-soon="true"');
    expect(html).toContain(d.card.num);
    expect(html).toContain('2 copies');
    const front = html.slice(html.indexOf('class="fr"'), html.indexOf('class="bk"'));
    expect(front).not.toContain('<img');
    expect(html).not.toContain('Photo credit');
    expect(html).not.toContain('id="d-lock"');
    expect(html).not.toMatch(/Craft|Add to wishlist/i);
  });
  it('a card with its photo back has its credit and its craft path again', () => {
    const { cat, gone } = withRetired();
    const back: UiCatalog = { ...cat, cards: [...cat.cards, gone].sort((a, b) => a.n - b.n), retired: [] };
    const d = buildDetail(back, gone.num, null)!;
    expect(d.soon).toBe(false);
    expect(d.photo).not.toBeNull();
    expect(d.props.backCredit).not.toBeNull();
  });
  it('an unknown number is still a 404 and a number of no card does not leak', () => {
    const { cat } = withRetired();
    expect(buildDetail(cat, 'BV1-9999', null)).toBeNull();
  });
});

describe('the frame itself', () => {
  it('shows the number, the edition and the name, an accessible text, and no image tag', () => {
    const slim = buildSlim(withRetired().cat);
    const c = slim.retired[0]!;
    const html = renderToStaticMarkup(createElement(CardFront, { card: c }));
    expect(html).toContain('New photo');
    expect(html).toContain('coming');
    expect(html).toContain(`>${c.num.slice(4)}<`);
    expect(html).toContain(c.name);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('alt=');
    expect(html).not.toContain('c-photo');
    expect(html).not.toContain('c-mono');
  });
});

describe('the idol page', () => {
  it('an idol whose only owned cards left the packs is still found, and the card is one of its editions', () => {
    const full = buildFixtureCatalog();
    const idol = full.cards.find((c) => c.kind === 'idol')!;
    const mine = full.cards.filter((c) => c.entity === idol.entity);
    const cat: UiCatalog = { ...full, cards: full.cards.filter((c) => c.entity !== idol.entity), retired: mine.map((c) => ({ ...c, photo: null, retired: true as const })) };
    const html = asPlayer(cat, [mine[0]!.n], () => createElement(IdolView, { slug: idol.name }));
    expect(html).not.toContain('Idol not found');
    expect(html).toContain('data-soon="true"');
    expect(html).toContain(`you have 2`);
  });
});

describe('the provider', () => {
  it('hands the pages the catalog as it was while the player owns nothing out of the packs', () => {
    const { cat } = withRetired();
    const slim = buildSlim(cat);
    const html = renderToStaticMarkup(createElement(CardsProvider, { catalog: slim, fixture: false, children: createElement(BinderView, { ads: ADS_OFF }) }));
    expect(html).not.toContain('data-soon="true"');
  });
});
