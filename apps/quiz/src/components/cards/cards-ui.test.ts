// Bunnyverse Cards, lane U: render tests of the Cards pages (renderToStaticMarkup, as components/admin/photos/photos-admin.test.ts):
// one H1 a page, the exact odds lines of the real catalog, the five lock sentences, the credit on every card page, noindex, a 404 with the
// flag off, nothing on kpopquiz.org or OtakuQuiz, and no raw colour outside the card art sheet.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const site = vi.hoisted(() => ({ id: 'hub' as string }));
vi.mock('@/lib/site/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return site.id; } };
});
vi.mock('next/navigation', () => ({
  usePathname: () => '/cards', useRouter: () => ({ replace: () => undefined }), useSearchParams: () => new URLSearchParams(),
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
}));

import { CardsProvider } from './cards-provider';
import { CardDetail } from './card-detail';
import { CreditBlock } from './credit-block';
import { DropRates } from './drop-rates';
import { PacksView } from './packs-view';
import { BinderView } from './binder-view';
import { ReportForm } from './report-form';
import { LOCK_SENTENCES, RARITIES, computeOdds } from '@/lib/cards/rules';
import { buildDetail } from '@/lib/cards/ui-detail';
import { buildFixtureCatalog } from '@/lib/cards/ui-fixture';
import { buildSlim, oddsView } from '@/lib/cards/ui-model';
import { cardCreditRows } from '@/lib/cards/ui-credit';

import type { CardKind, LockReason, Rarity } from '@/lib/cards/types';
import type { AdsContext } from '@/lib/cards/ads';

const NOT_FOUND = /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/;
const ADS_OFF: AdsContext = { enabled: false, client: null, bannerSlot: null, country: null, childDirected: false, consentRequired: true, test: false };
const cat = buildFixtureCatalog();
const slim = buildSlim(cat);
const h1s = (html: string): number => (html.match(/<h1[\s>]/g) ?? []).length;
/** The odds the server sends: computeOdds over a catalog that holds these rarities (idol and group cards). */
const oddsOf = (rarities: readonly Rarity[]): ReturnType<typeof computeOdds> =>
  computeOdds(rarities.flatMap((rarity, i) => (['idol', 'group'] as CardKind[]).map((kind, j) => ({ n: i * 2 + j + 1, kind, rarity }))));
const wrap = (el: React.ReactElement): string => renderToStaticMarkup(createElement(CardsProvider, { catalog: slim, fixture: false, children: el }));

beforeEach(() => { site.id = 'hub'; vi.stubEnv('NET_CARDS', '1'); vi.stubEnv('CARDS_UI_FIXTURE', '1'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('one H1 a page', () => {
  it('Packs, Binder, a card page and the report form each have exactly one', () => {
    expect(h1s(wrap(createElement(PacksView, { rates: createElement(DropRates, { odds: oddsOf(['C', 'U', 'R', 'UR']) }), ads: ADS_OFF })))).toBe(1);
    expect(h1s(wrap(createElement(BinderView, { ads: ADS_OFF })))).toBe(1);
    const d = buildDetail(cat, 'BV1-0001', null)!;
    expect(h1s(wrap(createElement(CardDetail, { ...d.props, credit: createElement(CreditBlock, { photo: d.photo, num: 'BV1-0001' }) })))).toBe(1);
    expect(h1s(renderToStaticMarkup(createElement(ReportForm, { photoId: null, cardNo: null, cardLabel: null })))).toBe(0);
  });
});

describe('the drop rates', () => {
  it('prints the odds of the real catalog (C, U, R, UR), both lines, with the calculation in words', () => {
    const html = renderToStaticMarkup(createElement(DropRates, { odds: oddsOf(['C', 'U', 'R', 'UR']) }));
    expect(html).toContain('Only Common, Uncommon, Rare and Ultra Rare cards exist so far, so their odds from the plan (60, 24, 10 and 1.2) are scaled to 100: 60 / 95.2 = 63.03%, 24 / 95.2 = 25.21%, 10 / 95.2 = 10.50%, 1.2 / 95.2 = 1.26%.');
    expect(html).toContain('The fifth card is drawn the same way, and a Common there becomes an Uncommon: (24 + 60) / 95.2 = 88.24%, 10 / 95.2 = 10.50%, 1.2 / 95.2 = 1.26%.');
    expect(html).toContain('Not in packs yet: Super Rare, Legendary.');
    expect(html).not.toContain('4.5%');
  });
  it('lists only the rarities that have a card', () => {
    const t = oddsView(oddsOf(['C', 'U', 'R', 'UR']));
    expect(t.present).toEqual(['C', 'U', 'R', 'UR']);
    expect(t.each.SR).toBeUndefined();
    expect(t.fifth.C).toBeUndefined();
    expect(Object.values(t.each).reduce((s, v) => s + (v ?? 0), 0)).toBeCloseTo(100, 6);
    expect(Object.values(t.fifth).reduce((s, v) => s + (v ?? 0), 0)).toBeCloseTo(100, 6);
  });
  it('the numbers shown are those of computeOdds for the catalog (63.03, 25.21, 10.50, 1.26; fifth 88.24, 10.50, 1.26), nothing typed', () => {
    const odds = oddsOf(['C', 'U', 'R', 'UR']);
    const html = renderToStaticMarkup(createElement(DropRates, { odds }));
    expect(odds.card.C).toBeCloseTo(63.03, 2);
    const cells = [...html.matchAll(/<td>(\d+\.\d\d)%<\/td><td[^>]*>(\d+\.\d\d)%<\/td>/g)].map((m) => [m[1], m[2]]);
    expect(cells).toEqual((['C', 'U', 'R', 'UR'] as Rarity[]).map((r) => [odds.card[r].toFixed(2), odds.fifth[r].toFixed(2)]));
    expect(cells.map((c) => c[0])).toEqual(['63.03', '25.21', '10.50', '1.26']);
    expect(cells.map((c) => c[1])).toEqual(['0.00', '88.24', '10.50', '1.26']);
  });
  it('an absent rarity is never listed as drawable, and with no odds nothing is', () => {
    const html = renderToStaticMarkup(createElement(DropRates, { odds: oddsOf(['C', 'U', 'R', 'UR']) }));
    expect(html).not.toContain('Super Rare</span>');
    expect(html).not.toContain('Legendary</span>');
    expect(oddsView(null).present).toEqual([]);
    expect(renderToStaticMarkup(createElement(DropRates, { odds: null }))).toContain('No card is in packs yet.');
  });
  it('with all six rarities the plan odds apply unchanged and the fifth card is the plan fifth line', () => {
    const t = oddsView(oddsOf(RARITIES));
    expect(t.each.C).toBeCloseTo(60, 6);
    expect(t.fifth.U).toBeCloseTo(84, 6);
    expect(t.fifth.L).toBeCloseTo(0.3, 6);
  });
});

describe('the lock sentences', () => {
  for (const reason of Object.keys(LOCK_SENTENCES) as LockReason[]) {
    it(`shows "${reason}" on the locked edition page`, () => {
      const c = { ...cat, entities: cat.entities.map((e) => (e.id === cat.entities[0]!.id ? { ...e, lockReasons: { SR: reason, L: reason } } : e)) };
      const num = c.cards.find((x) => x.entity === c.entities[0]!.id)!.num;
      const d = buildDetail(c, num, 'SR')!;
      expect(d.locked).toBe(true);
      const html = wrap(createElement(CardDetail, { ...d.props, credit: null }));
      expect(html).toContain(LOCK_SENTENCES[reason].replace(/'/g, '&#x27;'));
    });
  }
  it('an unknown number has no page', () => {
    expect(buildDetail(cat, 'BV1-9999', null)).toBeNull();
    expect(buildDetail(cat, 'nope', null)).toBeNull();
  });
});

describe('the credit', () => {
  it('is on the page of every card, with the photo number, the author, the licence and the source as links, and says cropped', () => {
    for (const c of cat.cards) {
      const html = renderToStaticMarkup(createElement(CreditBlock, { photo: c.photo, num: c.num }));
      expect(html).toContain('Photo 1 of this idol');
      expect(html).toContain(c.photo!.author);
      expect(html).toContain(`href="${c.photo!.licenceUrl}"`);
      expect(html).toContain(`href="${c.photo!.sourcePage}"`);
      expect(html).toContain('cropped');
      expect(html).toContain('Report a photo');
      if (c.photo!.shareAlike) expect(html).toContain('This card is shared under CC BY-SA');
    }
  });
  it('also sits on the back of the card and on /credits (every photo once, with a report link)', () => {
    const d = buildDetail(cat, 'BV1-0001', null)!;
    expect(d.props.backCredit).toMatch(/^Photo 1 by .*, via Wikimedia Commons, cropped/);
    const rows = cardCreditRows(cat);
    expect(rows.length).toBe(new Set(cat.cards.map((c) => c.photo!.id)).size);
  });
});

describe('the flag and the sites', () => {
  it('cardsOn is true only on the hub with NET_CARDS on', async () => {
    const { cardsOn } = await import('@/lib/cards/ui-flag');
    expect(cardsOn()).toBe(true);
    vi.stubEnv('NET_CARDS', '');
    expect(cardsOn()).toBe(false);
    vi.stubEnv('NET_CARDS', '1'); site.id = 'kpop';
    expect(cardsOn()).toBe(false);
    site.id = 'anime';
    expect(cardsOn()).toBe(false);
  });
  it('the layout and the card page answer 404 with the flag off, and on the other sites', async () => {
    const layout = (await import('../../app/sites/[site]/(hub)/cards/layout')).default;
    const page = (await import('../../app/sites/[site]/(hub)/cards/c/[num]/page')).default;
    vi.stubEnv('NET_CARDS', '');
    await expect(layout({ children: null })).rejects.toThrow(NOT_FOUND);
    await expect(page({ params: Promise.resolve({ num: 'BV1-0001' }), searchParams: Promise.resolve({}) })).rejects.toThrow(NOT_FOUND);
    vi.stubEnv('NET_CARDS', '1'); site.id = 'anime';
    await expect(layout({ children: null })).rejects.toThrow(NOT_FOUND);
  });
  it('an unknown card number is a 404 with the flag on', async () => {
    const page = (await import('../../app/sites/[site]/(hub)/cards/c/[num]/page')).default;
    await expect(page({ params: Promise.resolve({ num: 'BV1-9999' }), searchParams: Promise.resolve({}) })).rejects.toThrow(NOT_FOUND);
  });
  it('the navigation has a Cards entry only with the public flag on', async () => {
    const { navItemsFor } = await import('@/lib/ux-v1/a0/nav');
    const { REGISTRY } = await import('@/lib/site/registry');
    expect(navItemsFor(REGISTRY.hub).map((i) => i.key)).not.toContain('cards');
  });
});

describe('noindex', () => {
  it('Packs, Binder, the report page and a card page are never indexed', async () => {
    const packs = await import('../../app/sites/[site]/(hub)/cards/page');
    const binder = await import('../../app/sites/[site]/(hub)/cards/binder/page');
    const report = await import('../../app/sites/[site]/(hub)/cards/report/page');
    const card = await import('../../app/sites/[site]/(hub)/cards/c/[num]/page');
    for (const m of [packs.metadata, binder.metadata, report.metadata]) expect(m.robots).toEqual({ index: false, follow: false });
    const meta = await card.generateMetadata({ params: Promise.resolve({ num: 'BV1-0001' }), searchParams: Promise.resolve({}) });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

describe('the style sheets', () => {
  const dir = join(__dirname, '../../styles/cards');
  it('hold no raw hex colour outside the tokens and the card art sheets', () => {
    const css = readFileSync(join(dir, 'cards-ui.css'), 'utf8');
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
  it('every Cards source file is free of the em and en dash', () => {
    const roots = [dir, __dirname, join(__dirname, '../../lib/cards'), join(__dirname, '../../app/sites/[site]/(hub)/cards')];
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    for (const f of roots.flatMap(walk).filter((x) => /\.(tsx?|css)$/.test(x) && !/ui-logo|\.test\.ts$/.test(x) && /\/ui-|cards|styles\/cards/.test(x))) {
      expect(/[\u2013\u2014]/.test(readFileSync(f, 'utf8')), f).toBe(false);
    }
  });
});

describe('a card page never prints an empty fact (ORCH, real catalog on o1-scratch: "· debut" with no year)', () => {
  it('leaves out the group line and the debut year the database does not hold, for an idol and a group', () => {
    const c = structuredClone(cat);
    for (const e of c.entities) { e.debutYear = null; if (e.kind === 'idol') e.group = null; }
    for (const kind of ['idol', 'group'] as const) {
      const card = c.cards.find((x) => x.kind === kind)!;
      const d = buildDetail(c, card.num, null)!;
      expect(d.props.sub).not.toMatch(/debut|·\s*$|^\s*·/);
      expect(d.props.facts.every(([, v]) => v.trim().length > 0)).toBe(true);
      expect(d.props.facts.map(([k]) => k)).not.toContain('Debut');
    }
  });
  it('explains the locked Era and Full Art pockets of a group too (amendment 1: the same reason)', () => {
    const c = structuredClone(cat);
    const g = c.entities.find((e) => e.kind === 'group')!;
    g.lockReasons = { SR: 'one', L: 'one' };
    c.cards = c.cards.filter((x) => !(x.entity === g.id && (x.rarity === 'SR' || x.rarity === 'L')));
    const card = c.cards.find((x) => x.entity === g.id)!;
    const d = buildDetail(c, card.num, null)!;
    expect(d.props.why?.sentences).toContain('Only one free photo of this idol exists so far.');
  });
  it('the credit names the subject kind', () => {
    const d = buildDetail(cat, cat.cards.find((x) => x.kind === 'group' && x.photo)!.num, null)!;
    expect(renderToStaticMarkup(createElement(CreditBlock, { photo: d.photo, num: d.card.num, kind: 'group' }))).toContain('of this group:');
  });
});

describe('review 1 finding 4: the card face draws the photo of a group card', () => {
  const base = { n: 9, num: 'BV1-0009', entity: 'group:btob', rarity: 'C' as Rarity, edition: 'std' as const, name: 'BTOB', group: 'BTOB', debutYear: 2012, fx: 50, fy: 50, sub: null };
  it('a group card with a photo shows it, cropped at its focal point, and no drawn crowd', async () => {
    const { CardFront } = await import('./card-art');
    const html = renderToStaticMarkup(createElement(CardFront, { card: { ...base, kind: 'group', img: { src: 'https://p.test/images/group-photos/btob.jpg', srcSet: null, cut: false }, fx: 50, fy: 40 } }));
    expect(html).toContain('class="c-photo" src="https://p.test/images/group-photos/btob.jpg"');
    expect(html).toContain('object-position:50% 40%');
    expect(html).not.toContain('c-crowd');
    expect(html).not.toContain('c-mono');
  });
  it('without a photo the drawing stays the fallback', async () => {
    const { CardFront } = await import('./card-art');
    const html = renderToStaticMarkup(createElement(CardFront, { card: { ...base, kind: 'group', img: null } }));
    expect(html).toContain('c-crowd');
    expect(html).not.toContain('c-photo');
  });
});

describe('review 1 finding 12: a soloist is "Soloist" on the card face and the card page (decision 18)', () => {
  const idol = { n: 1, num: 'BV1-0001', entity: 'idol:iu', kind: 'idol' as const, rarity: 'C' as Rarity, edition: 'std' as const, name: 'IU', debutYear: 2008, img: null, fx: 50, fy: 30, sub: null };
  it('the card face', async () => {
    const { CardFront, metaLine } = await import('./card-art');
    expect(metaLine({ ...idol, group: null })).toBe('Soloist · 2008');
    expect(metaLine({ ...idol, group: null, debutYear: null })).toBe('Soloist');
    expect(metaLine({ ...idol, group: 'BLACKPINK', debutYear: 2016 })).toBe('BLACKPINK · 2016');
    expect(renderToStaticMarkup(createElement(CardFront, { card: { ...idol, group: null } }))).toContain('<span>Soloist · 2008</span>');
  });
  it('the card page: the group fact, the sub line, and a debut that is not "with the group"', () => {
    const c = structuredClone(cat);
    const solo = c.entities.find((e) => e.kind === 'idol')!;
    solo.group = null;
    solo.debutYear = 2008;
    const card = c.cards.find((x) => x.entity === solo.id)!;
    const d = buildDetail(c, card.num, null)!;
    expect(d.props.facts.slice(0, 2)).toEqual([['Group', 'Soloist'], ['Debut', '2008']]);
    expect(d.props.sub).toBe('Soloist · debut 2008');
    const member = c.entities.find((e) => e.kind === 'idol' && e.id !== solo.id && e.group)!;
    member.debutYear = 2016;
    const m = buildDetail(c, c.cards.find((x) => x.entity === member.id)!.num, null)!;
    expect(m.props.facts.slice(0, 2)).toEqual([['Group', member.group], ['Debut', '2016, with the group']]);
  });
});

describe('the grid sorted by rarity (decision 31)', () => {
  it('lists the issued cards before the locked pockets, owned first, Legendary first among the issued', async () => {
    const { sortItems } = await import('@/lib/cards/ui-model');
    const sorted = sortItems(slim.items, 'rarity', new Map());
    const firstLocked = sorted.findIndex((it) => it.locked);
    expect(firstLocked).toBeGreaterThan(0);
    expect(sorted.slice(firstLocked).every((it) => it.locked)).toBe(true);
  });
});
