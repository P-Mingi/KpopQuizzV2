// Bunnyverse Cards, lot 2 (CARDSUI): the pair of a group photo in the pages. Card 1/2 is the left half and 2/2 the right half of one
// window of the photo; in the binder the two halves are one unit that no filter, sort, row or page cuts.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/cards/cards-font', () => ({ cardsFace: { variable: 'bvc-card-var' }, cardsMono: { variable: 'bvc-mono-var' } }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/cards', useRouter: () => ({ replace: () => undefined }), useSearchParams: () => new URLSearchParams(),
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
}));
vi.mock('@/components/ux-v1/sign-in-sheet', () => ({ useSignIn: () => () => undefined }));
vi.mock('@/components/cards-bridge/ads-client', () => ({ BinderBanner: () => null }));

import { BinderView } from './binder-view';
import { CardDetail } from './card-detail';
import { CardFront } from './card-art';
import { CardsProvider } from './cards-provider';
import { CreditBlock } from './credit-block';
import { DropRates } from './drop-rates';
import { EDITIONS, computeOdds } from '@/lib/cards/rules';
import { buildDetail } from '@/lib/cards/ui-detail';
import { NO_FILTERS, binderUnits, buildSlim, filterItems, gridPages, oddsView, paginate, sortItems } from '@/lib/cards/ui-model';

import type { AdsContext } from '@/lib/cards/ads';
import type { OwnedEntry, Rarity } from '@/lib/cards/types';
import type { BinderItem, SlimCard, UiCard, UiCatalog, UiEntity, UiPhoto } from '@/lib/cards/ui-types';

const ADS_OFF = { enabled: false } as unknown as AdsContext;
const RS: Rarity[] = ['C', 'U', 'R', 'UR'];
const photo = (i: number, over: Partial<UiPhoto> = {}): UiPhoto => ({
  id: i, slot: 1, author: 'A', authorUrl: null, licence: 'CC BY 4.0', licenceUrl: 'https://l', source: 'commons', sourcePage: 'https://p', shareAlike: false, modified: 'cropped',
  focalX: 40, focalY: 20, src: `https://p.test/g${i}.jpg`, ...over,
});

/** `idols` people (4 whole cards each), then `groups` groups (4 pairs each, 8 cards). Numbers consecutive, a pair's halves consecutive. */
function pairCatalog(idols: number, groups: number): UiCatalog {
  const entities: UiEntity[] = [];
  const cards: UiCard[] = [];
  let n = 0;
  const push = (e: UiEntity, pairs: boolean): void => {
    entities.push(e);
    for (const r of RS) {
      const base = { entity: e.id, kind: e.kind, rarity: r, edition: EDITIONS[r].edition, name: e.name, group: e.group, debutYear: 2020, photo: photo(n + 1) };
      if (pairs) {
        n += 2;
        cards.push({ ...base, n: n - 1, num: `BV1-${String(n - 1).padStart(4, '0')}`, part: 1, pairN: n });
        cards.push({ ...base, n, num: `BV1-${String(n).padStart(4, '0')}`, part: 2, pairN: n - 1 });
      } else {
        n += 1;
        cards.push({ ...base, n, num: `BV1-${String(n).padStart(4, '0')}` });
      }
    }
  };
  const lock = { SR: 'one', L: 'one' } as UiEntity['lockReasons'];
  for (let g = 0; g < groups; g++) {
    for (let i = 0; i < idols; i++) push({ id: `idol:g${g}i${i}`, kind: 'idol', name: `Idol ${g}${i}`, group: `Group ${g}`, debutYear: 2020, sortKey: `${g}|${i}`, lockReasons: lock }, false);
    push({ id: `group:g${g}`, kind: 'group', name: `Group ${g}`, group: null, debutYear: 2020, sortKey: `${g}|~`, lockReasons: lock }, true);
  }
  return { odds: computeOdds(cards.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity }))), cards, entities };
}

const owned = (...ns: number[]): Map<number, OwnedEntry> => new Map(ns.map((n) => [n, { n, copies: 1, fav: false, at: `2026-11-1${n % 9}T00:00:00Z` }]));
const nums = (xs: readonly BinderItem[]): (number | 'L')[] => xs.map((x) => (x.locked ? 'L' : x.card.n));
/** The part of a pocket: 0 whole, 1 or 2 a half, -1 locked or empty. */
const part = (x: BinderItem | null | undefined): number => (x && !x.locked ? (x.card.part ?? 0) : -1);
const entityOf = (x: BinderItem): string => (x.locked ? x.entity : x.card.entity);
const wrap = (el: React.ReactElement, cat = buildSlim(pairCatalog(2, 2))): string => renderToStaticMarkup(createElement(CardsProvider, { catalog: cat, fixture: false, children: el }));

beforeEach(() => { vi.stubEnv('NET_CARDS', '1'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('buildSlim gives a group two cards a rarity, left half then right half', () => {
  const slim = buildSlim(pairCatalog(1, 1));
  it('has both halves, numbered consecutively, linked by pairN, and the ladder points at the left half', () => {
    const halves = slim.cards.filter((c) => c.kind === 'group');
    expect(halves.map((c) => [c.part, c.pairN])).toEqual([[1, halves[1]!.n], [2, halves[0]!.n], [1, halves[3]!.n], [2, halves[2]!.n], [1, halves[5]!.n], [2, halves[4]!.n], [1, halves[7]!.n], [2, halves[6]!.n]]);
    const gid = 'group:g0';
    expect(slim.editions[gid]).toEqual({ C: halves[0]!.n, U: halves[2]!.n, R: halves[4]!.n, UR: halves[6]!.n });
    const gItems = slim.items.filter((i) => entityOf(i) === gid && !i.locked);
    expect(gItems.map(part)).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
    expect(slim.sections[0]!.ns.length).toBe(slim.cards.length);
  });
  it('keeps the locked Era and Full Art pockets of a group as before', () => {
    const locks = slim.items.filter((i) => i.locked && i.entity === 'group:g0');
    expect(locks.map((i) => i.locked && i.rarity)).toEqual(['SR', 'L']);
  });
});

describe('the pair is one unit', () => {
  const slim = buildSlim(pairCatalog(2, 2));
  it('binderUnits makes a unit of two for each pair and of one for the rest', () => {
    const u = binderUnits(slim.items);
    expect(u.filter((x) => x.length === 2).length).toBe(8);
    expect(u.every((x) => x.length === 1 || (!x[0]!.locked && !x[1]!.locked && x[0]!.card.part === 1 && x[1]!.card.part === 2))).toBe(true);
  });
  it('a page never cuts a pair: both halves are on the same page, in the same row, side by side', () => {
    for (const per of [9]) {
      const pages = paginate(slim.items, per);
      for (const p of pages) {
        p.cells.forEach((c, i) => {
          if (part(c) === 1) {
            expect(part(p.cells[i + 1])).toBe(2);
            expect(Math.floor(i / 3)).toBe(Math.floor((i + 1) / 3));
          }
          if (part(c) === 2) expect(part(p.cells[i - 1])).toBe(1);
        });
        expect(p.cells.length).toBeLessThanOrEqual(9);
      }
      expect(pages.flatMap((p) => p.items).length).toBe(slim.items.length);
    }
  });
  it('leaves a cell empty when a pair would start in the last column of a row', () => {
    const items = slim.items;
    // Take the 2 whole cards before a group (idol C, U), then the group: C 1/2 would start in column 3 of row 1? Build the run explicitly.
    const idol = items.filter((i) => !i.locked && i.card.entity === 'idol:g0i0').slice(0, 2);
    const pair = items.filter((i) => !i.locked && i.card.entity === 'group:g0').slice(0, 2);
    const p = paginate([...idol, ...pair].map((x, i) => ({ ...x, sec: 'x', i })), 9);
    expect(p).toHaveLength(1);
    expect(p[0]!.cells.map((c) => (c ? (c.locked ? 'L' : c.card.part) : null))).toEqual([0, 0, null, 1, 2].map((v) => (v === 0 ? 0 : v)));
  });
  it('a section still gets its own pages', () => {
    const pages = paginate(slim.items);
    for (const p of pages) expect(new Set(p.items.map((i) => i.sec)).size).toBe(1);
    expect(new Set(pages.map((p) => p.sec)).size).toBe(2);
  });
  it('the grid counts a pair as 2 and never cuts it across two pages', () => {
    const big = buildSlim(pairCatalog(3, 5));
    const pages = gridPages(big.items, 36);
    for (const p of pages) {
      expect(p.length).toBeLessThanOrEqual(36);
      expect(binderUnits(p).flat().length).toBe(p.length);
      const firsts = p.filter((i) => !i.locked && i.card.part === 1).length;
      const seconds = p.filter((i) => !i.locked && i.card.part === 2).length;
      expect(firsts).toBe(seconds);
    }
    expect(pages.flat().length).toBe(big.items.length);
    // 35 singles then a pair: the pair does not fit the 36 cells, it opens the next page.
    const single = big.items.find((i) => !i.locked && !i.card.part)!;
    const pr = big.items.filter((i) => !i.locked && i.card.part).slice(0, 2);
    const run = [...Array.from({ length: 35 }, (_, k) => ({ ...single, i: k })), ...pr];
    const g = gridPages(run, 36);
    expect(g.map((x) => x.length)).toEqual([35, 2]);
  });
});

describe('filters and sorts keep the pair together', () => {
  const slim = buildSlim(pairCatalog(2, 1));
  const pairs = binderUnits(slim.items).filter((u) => u.length === 2);
  it('shows a pair when either half matches, and then shows both halves', () => {
    const [first, second] = pairs[0]!;
    const own = owned(first!.locked ? 0 : first!.card.n);
    const out = filterItems(slim.items, { ...NO_FILTERS, show: 'owned' }, own);
    expect(out.map((i) => (i.locked ? 0 : i.card.n))).toEqual([(first as { card: SlimCard }).card.n, (second as { card: SlimCard }).card.n]);
    // missing: the other pairs show, and the pair of which one half is owned still shows (its other half is missing).
    const miss = filterItems(slim.items, { ...NO_FILTERS, show: 'missing' }, own);
    expect(nums(miss)).toContain((second as { card: SlimCard }).card.n);
    expect(binderUnits(miss).filter((u) => u.length === 1 && !u[0]!.locked && u[0]!.card.part).length).toBe(0);
  });
  it('the kind, rarity and search filters keep every pair whole', () => {
    for (const f of [{ ...NO_FILTERS, kind: 'group' as const }, { ...NO_FILTERS, rar: { U: true } }, { ...NO_FILTERS, q: 'group 0' }]) {
      const out = filterItems(slim.items, f, new Map());
      expect(out.filter((i) => !i.locked && i.card.part === 1).length).toBe(out.filter((i) => !i.locked && i.card.part === 2).length);
      expect(binderUnits(out).every((u) => u.length === 2 || u[0]!.locked || !u[0]!.card.part)).toBe(true);
    }
  });
  it('every sort leaves each pair adjacent, and a pair sorts as one unit (owned when either half is)', () => {
    const [a, b] = pairs[3]!;
    const own = owned((b as { card: SlimCard }).card.n);
    for (const sort of ['rarity', 'number', 'newest'] as const) {
      const out = sortItems(slim.items, sort, own);
      expect(out.length).toBe(slim.items.length);
      expect(binderUnits(out).filter((u) => u.length === 2).length).toBe(pairs.length);
    }
    const byRarity = sortItems(slim.items, 'rarity', own);
    expect(nums(byRarity.slice(0, 2))).toEqual([(a as { card: SlimCard }).card.n, (b as { card: SlimCard }).card.n]);
  });
});

describe('a half renders its side and its 1/2 label', () => {
  const half = (part: 1 | 2, over: Partial<SlimCard> = {}): SlimCard => ({
    n: part, num: `BV1-000${part}`, entity: 'group:g', kind: 'group', rarity: 'C', edition: 'std', name: 'Group', group: 'Group', debutYear: 2020, fx: 40, fy: 20, sub: null,
    img: { src: 'https://p.test/g.jpg', srcSet: null, cut: false }, part, pairN: part === 1 ? 2 : 1, ...over,
  });
  it('from the source photo: a box twice the card wide, offset to the side, cropped at the focal point', () => {
    const l = renderToStaticMarkup(createElement(CardFront, { card: half(1) }));
    const r = renderToStaticMarkup(createElement(CardFront, { card: half(2) }));
    expect(l).toContain('c-pair c-half1');
    expect(r).toContain('c-pair c-half2');
    expect(l).toContain('object-position:40% 20%');
    expect(l).toContain('Group · 1/2');
    expect(r).toContain('Group · 2/2');
    expect(l).toContain('half-1');
  });
  it('a cut half is its own file and shows as is', () => {
    const html = renderToStaticMarkup(createElement(CardFront, { card: half(2, { img: { src: 'https://p.test/g-h2-1x.webp', srcSet: null, cut: true } }) }));
    expect(html).not.toContain('c-pair');
    expect(html).toContain('g-h2-1x.webp');
    expect(html).toContain('Group · 2/2');
  });
  it('a whole group card keeps its plain tag and no pair box', () => {
    const html = renderToStaticMarkup(createElement(CardFront, { card: half(1, { part: 0, pairN: null }) }));
    expect(html).toContain('>Group<');
    expect(html).not.toContain('c-pair');
  });
  it('the binder prints a pair as one two-cell item with both halves', () => {
    const html = wrap(createElement(BinderView, { ads: ADS_OFF }));
    expect((html.match(/pocket-li pair/g) ?? []).length).toBeGreaterThan(0);
    const m = html.match(/<li class="pocket-li pair"[^>]*>.*?<\/li>/);
    expect(m![0]).toContain('left half of the group photo');
    expect(m![0]).toContain('right half of the group photo');
  });
});

describe('the card page of a half links its other half', () => {
  const cat = pairCatalog(1, 1);
  const g1 = cat.cards.find((c) => c.kind === 'group' && c.part === 1)!;
  const g2 = cat.cards.find((c) => c.n === g1.pairN)!;
  const render = (num: string): string => {
    const d = buildDetail(cat, num, null)!;
    return wrap(createElement(CardDetail, { ...d.props, credit: createElement(CreditBlock, { photo: d.photo, num, kind: 'group' }) }), buildSlim(cat));
  };
  it('says which half it is and links the other by number', () => {
    const d1 = buildDetail(cat, g1.num, null)!;
    expect(d1.props.pair).toMatchObject({ side: 'left', mate: { n: g2.n, num: g2.num } });
    expect(d1.props.facts.find(([k]) => k === 'Part')).toEqual(['Part', 'Left half, 1 of 2']);
    const h1 = render(g1.num);
    expect(h1).toContain('This card is the left half of the group photo.');
    expect(h1).toContain(`href="/cards/c/${g2.num}"`);
    const h2 = render(g2.num);
    expect(h2).toContain('This card is the right half of the group photo.');
    expect(h2).toContain(`href="/cards/c/${g1.num}"`);
  });
  it('shows both halves side by side, and a person card has none of it', () => {
    expect(render(g1.num)).toContain('class="d-pair"');
    const idol = cat.cards.find((c) => c.kind === 'idol')!;
    const d = buildDetail(cat, idol.num, null)!;
    expect(d.props.pair).toBeNull();
    expect(render(idol.num)).not.toContain('d-pair');
  });
  it('the ladder of a group shows each rung as a pair', () => {
    const d = buildDetail(cat, g1.num, null)!;
    expect(d.props.ladder.filter((r) => r.card).every((r) => r.card!.part === 1 && r.mate?.part === 2)).toBe(true);
  });
});

describe('the drop rates of a pool with one idol subject and one group pair', () => {
  const pool = (rar: Rarity) => [
    { n: 1, kind: 'idol' as const, rarity: rar, entity: 'idol:a' },
    { n: 2, kind: 'group' as const, rarity: rar, entity: 'group:g' },
    { n: 3, kind: 'group' as const, rarity: rar, entity: 'group:g' },
  ];
  const odds = computeOdds([...pool('C'), ...pool('U')]);
  it('takes every number from the odds: a half is half the chance of the group subject', () => {
    const t = oddsView(odds);
    const g = t.cardChance.find((x) => x.r === 'C' && x.kind === 'group')!;
    const i = t.cardChance.find((x) => x.r === 'C' && x.kind === 'idol')!;
    const groupSubject = odds.card.C * (odds.kinds.C.group as number) / 100;
    expect(g.subjects).toBe(1);
    expect(g.cards).toBe(2);
    expect(g.pct).toBeCloseTo(groupSubject / 2, 9);
    expect(i.pct).toBeCloseTo(odds.card.C * (odds.kinds.C.idol as number) / 100, 9);
  });
  it('prints the order of the draw, the type split and the chance of one card', () => {
    const html = renderToStaticMarkup(createElement(DropRates, { odds }));
    expect(html).toContain('First its rarity');
    expect(html).toContain('one of its two halves at random, so a pair never makes a group come out more often');
    expect(html).toContain(`soloists and members ${Number((odds.kinds.C.idol as number).toFixed(2))}%`);
    const g = oddsView(odds).cardChance.find((x) => x.r === 'C' && x.kind === 'group')!;
    expect(html).toContain(`Common, groups: ${g.pct.toFixed(2)}% for each of the 2 cards.`);
  });
  it('hides the new lines for an older payload without subjects and cards', () => {
    const { subjects: _s, cards: _c, ...old } = odds;
    const t = oddsView(old);
    expect(t.drawSteps).toEqual([]);
    expect(t.cardChance).toEqual([]);
    const html = renderToStaticMarkup(createElement(DropRates, { odds: old }));
    expect(html).not.toContain('How a card is drawn');
    expect(html).toContain('Each card');
  });
  it('without a pair the half sentence is left out', () => {
    const o = computeOdds([{ n: 1, kind: 'idol', rarity: 'C', entity: 'idol:a' }, { n: 2, kind: 'group', rarity: 'C', entity: 'group:g' }]);
    expect(oddsView(o).drawSteps.join(' ')).not.toContain('halves');
  });
});
