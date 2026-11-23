// KpopCards SEO (lot SEO-LAUNCH-1, lane B): the copy, the numbers, the metadata, the JSON-LD and the sitemap rows of the three indexable pages.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { robotsFor } from '@/lib/site/indexing';

import { buildFixtureCatalog } from '@/lib/cards/ui-fixture';
import { KC } from '@/lib/kpopcards/contract';
import { dupBiasRule } from '@/lib/kpopcards/dup-text';
import { atLeast } from '@/lib/stats/site-stats';

import {
  CARDS_COPY_DATE, CARDS_DESCRIPTION, CARDS_H1, CARDS_ODDS_CHANGED, CARDS_TITLE, DISCLAIMER, cardsJsonLd, cardsMetadata, cardsSitemapRows, cardsStats,
  cardsUrl, editionCount, landingAnswer, landingQuestions, numberWord, oddsAnswer, wordCount,
} from './seo';

import type { UiCatalog, UiCard } from '@/lib/cards/ui-types';

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const cat = (generatedAt?: string): UiCatalog => ({ ...buildFixtureCatalog(), ...(generatedAt ? { generatedAt } : {}) });

/** A catalog of n idol cards of g groups, for the rounding. */
function big(n: number): UiCatalog {
  const cards = Array.from({ length: n }, (_, i): UiCard => ({
    n: i + 1, num: `BV1-${i}`, entity: `idol:Q${i % 400}`, kind: 'idol', rarity: 'C', edition: 'std', name: `Idol ${i % 400}`, group: `Group ${i % 60}`, debutYear: 2020, photo: null,
  }));
  return { odds: null, cards, entities: [], generatedAt: '2026-11-23T10:00:00Z' };
}

describe('cardsStats', () => {
  it('is null when the catalog cannot be read or holds no card', () => {
    expect(cardsStats(null)).toBeNull();
    expect(cardsStats({ odds: null, cards: [], entities: [] })).toBeNull();
  });
  it('counts the cards in packs, the idols and the groups, and rounds every count through atLeast', () => {
    const s = cardsStats(big(1263))!;
    expect(s.cards).toBe(1263);
    expect(s.idols).toBe(400);
    expect(s.groups).toBe(60);
    expect(s.shown).toEqual({ cards: atLeast(1263), idols: atLeast(400), groups: atLeast(60) });
    expect(s.shown.cards).toBe('1,200+');
    expect(s.shown.groups).toBe('60');
  });
  it('dates the count with the month the catalog was read, and only from a real date', () => {
    expect(cardsStats(big(10))!.asOf).toBe('November 2026');
    expect(cardsStats(cat())!.asOf).toBeNull();
    expect(cardsStats(cat('x'))!.asOf).toBeNull();
  });
});

describe('the answer block of /kpopcards', () => {
  it('is 40 to 60 words, built from the contract and the helper, with the month', () => {
    const s = cardsStats(big(1263))!;
    const a = landingAnswer(s);
    expect(a).toContain(`A free pack of 5 cards lands every ${KC.PERIOD_MIN} minutes.`);
    expect(a).toContain(`${atLeast(1263)} cards are in the packs as of November 2026, each from a credited free-licence photo.`);
    expect(wordCount(a)).toBeGreaterThanOrEqual(40);
    expect(wordCount(a)).toBeLessThanOrEqual(60);
  });
  it('fails soft: without the catalog the sentence with the number is dropped, no number is typed', () => {
    const a = landingAnswer(null);
    expect(a).not.toMatch(/cards are in the packs/);
    expect(a).not.toMatch(/\d{3,}/);
    expect(a.endsWith('cards have no money value.')).toBe(true);
    expect(wordCount(a)).toBeGreaterThanOrEqual(40);
  });
  it('drops only the date when the catalog has none', () => {
    expect(landingAnswer(cardsStats(cat())!)).toMatch(/cards are in the packs, each from a credited/);
  });
});

describe('the question H2s', () => {
  const qs = landingQuestions();
  it('are the four questions, each answered in its first sentence', () => {
    expect(qs.map((x) => x.q)).toEqual(['How do you play KpopCards?', 'Is KpopCards free?', 'Is it a gacha game?', 'Where do the photos come from?']);
    expect(qs[2]!.lead).toBe('It uses random packs, but nothing is for sale. Packs come from a timer, missions and optional ads, and the odds are public.');
    expect(qs[3]!.lead).toMatch(/free licence, mostly from Wikimedia Commons, credited with its author, licence and source/);
  });
  it('take every number from the code', () => {
    const how = qs[0]!.more.join(' ');
    expect(how).toContain(`up to ${numberWord(editionCount())} editions, from Standard to Full Art`);
    expect(how).toContain(`every ${KC.PERIOD_MIN} minutes, up to ${KC.STACK_CAP} waiting`);
    expect(editionCount()).toBe(6);
  });
});

describe('titles, descriptions and headings', () => {
  it('keep the owner strings, titles within 60 characters with the suffix', () => {
    expect(CARDS_TITLE).toEqual({ landing: 'KpopCards: Free K-pop Photocard Game', odds: 'KpopCards Odds: Drop Rates of Every Pack', help: 'How KpopCards Works: Packs, Shards, Rules' });
    for (const t of Object.values(CARDS_TITLE)) expect(`${t} | Bunnyverse`.length).toBeLessThanOrEqual(60);
    expect(`${CARDS_TITLE.landing} | Bunnyverse`).toHaveLength(49);
    expect(CARDS_H1.landing).toBe('KpopCards: free K-pop photocard game');
    expect(CARDS_H1.odds).toBe('KpopCards odds and drop rates');
  });
  it('have descriptions of 120 to 160 characters, the six editions fixed, no dash', () => {
    for (const d of Object.values(CARDS_DESCRIPTION)) { expect(d.length).toBeGreaterThanOrEqual(120); expect(d.length).toBeLessThanOrEqual(160); expect(d).not.toMatch(DASH); }
    expect(CARDS_DESCRIPTION.landing).toContain(`every ${KC.PERIOD_MIN} minutes`);
    expect(CARDS_DESCRIPTION.help).toContain('up to six editions per idol');
    for (const d of Object.values(CARDS_DESCRIPTION)) expect(d).not.toMatch(/six editions of every idol/i);
  });
  it('write the disclaimer once, without a dash', () => {
    expect(DISCLAIMER).toBe('Unofficial fan game, not affiliated with the artists or their agencies.');
  });
});

describe('the answer block of /kpopcards/odds', () => {
  const odds = buildFixtureCatalog({ full: true }).odds;
  it('is computed from the odds, the Gold guarantee of the contract and the duplicate rule', () => {
    expect(odds).not.toBeNull();
    const a = oddsAnswer(odds);
    expect(a).toMatch(/Cards 1 to 4: Standard \d+\.\d\d%, Stage \d+\.\d\d%/);
    // Review fix 8: the answer block reuses the words of dupBiasRule ("when you own one") and names the two exempt cards; the guarantee is one short sentence.
    expect(a).toContain(`A Gold card is sure by pack ${KC.GOLD_BY_PACK}.`);
    expect(a).toContain(`${Math.round(KC.DUP_BIAS * 100)}% chance to be a card you already own, when you own one, except the Gold guarantee and the golden fifth card`);
    expect(dupBiasRule()).toContain('when you own one');
    expect(wordCount(a)).toBeGreaterThanOrEqual(40);
    expect(wordCount(a)).toBeLessThanOrEqual(60);
    expect(a).not.toMatch(DASH);
  });
  it('with no odds it states the rules only, no percentage', () => {
    const a = oddsAnswer(null);
    expect(a).not.toMatch(/%.*%/);
    expect(a).toContain(`by pack ${KC.GOLD_BY_PACK}`);
  });
});

describe('metadata: self canonical, robots, share image', () => {
  it.each(['landing', 'odds', 'help'] as const)('%s', (page) => {
    const m = cardsMetadata(page);
    expect(m.title).toBe(CARDS_TITLE[page]);
    expect(m.description).toBe(CARDS_DESCRIPTION[page]);
    const path = page === 'landing' ? '/kpopcards' : `/kpopcards/${page}`;
    expect(m.alternates?.canonical).toBe(`https://bunnyverse.org${path}`);
    expect(cardsUrl(page)).toBe(`https://bunnyverse.org${path}`);
    // through the indexing gate of lib/site/indexing.ts (the open and closed cases are the next test)
    expect(m.robots).toEqual(robotsFor(true));
    const og = m.openGraph as { url: string; images: { url: string }[] };
    expect(og.url).toBe(`https://bunnyverse.org${path}`);
    // never a photo of a person: the Bunnyverse rabbit card of the hub
    expect(og.images[0]!.url).toBe('https://bunnyverse.org/brand/hub/og-default.png');
    expect(JSON.stringify(m)).not.toMatch(DASH);
  });
});

describe('the indexing gate', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it.each([['1', { index: true, follow: true }], ['0', { index: false, follow: false }]] as const)('hub build, NET_INDEXING=%s', async (flag, robots) => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    vi.stubEnv('NET_INDEXING', flag);
    const { cardsMetadata: meta } = await import('./seo');
    for (const page of ['landing', 'odds', 'help'] as const) expect(meta(page).robots).toEqual(robots);
  });
});

describe('JSON-LD', () => {
  const stats = cardsStats(big(1263));
  it('the landing: WebApplication and VideoGame, free, no rating, no review, the visible answer block; a breadcrumb; no FAQPage', () => {
    const blocks = JSON.parse(JSON.stringify(cardsJsonLd('landing', stats)));
    expect(blocks).toHaveLength(2);
    const [game, crumbs] = blocks;
    expect(game['@type']).toEqual(['WebApplication', 'VideoGame']);
    expect(game.isAccessibleForFree).toBe(true);
    expect(game.description).toBe(landingAnswer(stats));
    expect(game.description).toContain(atLeast(1263));
    expect(game.url).toBe('https://bunnyverse.org/kpopcards');
    expect(game.operatingSystem).toBe('Any');
    expect(JSON.stringify(blocks)).not.toMatch(/aggregateRating|"review"|FAQPage|Flashcard|offers/);
    expect(crumbs.itemListElement.map((x: { name: string }) => x.name)).toEqual(['Bunnyverse', 'KpopCards']);
  });
  it('odds and help: a three-item breadcrumb only', () => {
    for (const [page, name] of [['odds', 'Odds'], ['help', 'Help']] as const) {
      const blocks = JSON.parse(JSON.stringify(cardsJsonLd(page)));
      expect(blocks).toHaveLength(1);
      expect(blocks[0]['@type']).toBe('BreadcrumbList');
      expect(blocks[0].itemListElement.map((x: { name: string }) => x.name)).toEqual(['Bunnyverse', 'KpopCards', name]);
      expect(blocks[0].itemListElement.at(-1).item).toBe(cardsUrl(page));
    }
  });
  it('without the catalog the description loses the number sentence, as the page does', () => {
    const g = cardsJsonLd('landing', null)[0] as { description: string };
    expect(g.description).toBe(landingAnswer(null));
  });
});

describe('sitemap rows', () => {
  it('are on only when KpopCards is on AND the hub is open', () => {
    expect(cardsSitemapRows(false, false)).toEqual([]);
    expect(cardsSitemapRows(true, false)).toEqual([]);
    expect(cardsSitemapRows(false, true)).toEqual([]);
    expect(cardsSitemapRows(true, true).map((r) => r.path)).toEqual(['/kpopcards', '/kpopcards/odds', '/kpopcards/help']);
  });
  it('carry a real lastmod: the copy date, the odds date for the odds; never today', () => {
    const rows = cardsSitemapRows(true, true);
    expect(rows[0]!.lastModified.toISOString()).toBe(`${CARDS_COPY_DATE}T00:00:00.000Z`);
    expect(rows[1]!.lastModified.toISOString()).toBe(`${CARDS_ODDS_CHANGED}T00:00:00.000Z`);
    expect(rows[2]!.lastModified.toISOString()).toBe(`${CARDS_COPY_DATE}T00:00:00.000Z`);
  });
  it('never list a noindex route', () => {
    const paths = cardsSitemapRows(true, true).map((r) => r.path).join(' ');
    for (const never of ['/c/', '/idol', '/collection', '/open', '/missions', '/ranking', '/u/', '/report', '/credits']) expect(paths).not.toContain(never);
  });
});
