// KpopCards (lot SEO-LAUNCH-1, lane B): what Google reads on the three indexable pages of bunnyverse.org/kpopcards: /kpopcards, /kpopcards/odds and
// /kpopcards/help. One file holds the titles, the descriptions, the answer blocks, the metadata (canonical, robots, share image), the JSON-LD and the
// sitemap rows, so the text, the meta and the markup read the same values (kpopquiz-seo SKILL.md sections 2, 3, 4, 7 and 9). Pure: the catalog and
// the flags arrive as arguments. Every number comes from the contract (KC), lib/cards/rules.ts or the catalog, and a count passes through `atLeast`.
// Every other KpopCards page stays noindex for good (/c, /idol, /collection, /open, /missions, /ranking, /u, /report) and /kpopcards/credits is a
// noindex duplicate of /credits: none of them is in this file.
import { adsPerDay, timerPerDay } from '@/lib/cards/flags';
import { economySentences } from '@/lib/cards/economy';
import { kcPath } from '@/lib/cards/kc-paths';
import { CARDS_PRIVACY_FACTS } from '@/lib/cards/privacy-facts';
import { PACK_SIZE, PERIOD_S, RARITY_LABEL } from '@/lib/cards/rules';
import { cardsOn } from '@/lib/cards/ui-flag';
import { oddsView } from '@/lib/cards/ui-model';
import { KC as CONTRACT } from '@/lib/kpopcards/contract';
import { dupBiasPct } from '@/lib/kpopcards/dup-text';
import { indexingOpenFor, robotsFor } from '@/lib/site/indexing';
import { NETWORK, REGISTRY } from '@/lib/site/registry';
import { atLeast } from '@/lib/stats/site-stats';

import type { UiCatalog } from '@/lib/cards/ui-types';
import type { CatalogOdds } from '@/lib/cards/types';
import type { Metadata } from 'next';

export const CARDS_BRAND = 'KpopCards';

/** The day the copy of the three pages was last written (a material change; never the build date). The sitemap lastmod of /kpopcards and /kpopcards/help. */
export const CARDS_COPY_DATE = '2026-11-23';

/**
 * The day the odds last changed: the owner's duplicate rule of 2026-11-23 (126-dup-bias.sql, texts in lib/kpopcards/dup-text.ts). The odds page prints it as
 * "Updated" and the sitemap says it in lastmod. Move it only when a rate or a guarantee really changes, never to look fresh (rule 3.5).
 */
export const CARDS_ODDS_CHANGED = '2026-11-23';

export type CardsPageKey = 'landing' | 'odds' | 'help';

export const CARDS_PATH: Readonly<Record<CardsPageKey, string>> = { landing: kcPath.lobby, odds: kcPath.odds, help: kcPath.help };

const abs = (path: string): string => `${NETWORK.url}${path}`;

/** The absolute address of one of the three pages, on bunnyverse.org. */
export const cardsUrl = (page: CardsPageKey): string => abs(CARDS_PATH[page]);

/** The suffix the hub layout adds to a title (the hub's seo.titleTemplate is "%s | Bunnyverse"), for the share cards. */
const withBrand = (title: string): string => REGISTRY.hub.seo.titleTemplate.replace('%s', title);

export const CARDS_TITLE: Readonly<Record<CardsPageKey, string>> = {
  landing: 'KpopCards: Free K-pop Photocard Game',
  odds: 'KpopCards Odds: Drop Rates of Every Pack',
  help: 'How KpopCards Works: Packs, Shards, Rules',
};

/** The H1 of /kpopcards and /kpopcards/odds (the help page keeps its own, "How KpopCards works"). */
export const CARDS_H1 = {
  landing: 'KpopCards: free K-pop photocard game',
  odds: 'KpopCards odds and drop rates',
  help: 'How KpopCards works',
} as const;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'] as const;
/** 6 as "six" (small counts only; a larger one stays a digit). */
export const numberWord = (n: number): string => WORDS[n] ?? String(n);

/** How many editions an idol can have: one per rarity of the game (RARITY_LABEL). */
export const editionCount = (): number => Object.keys(RARITY_LABEL).length;

/** Minutes between two free packs, read from the contract. */
export const packPeriodMin = (): number => CONTRACT.PERIOD_MIN;

export const CARDS_DESCRIPTION: Readonly<Record<CardsPageKey, string>> = {
  landing: `KpopCards is a free K-pop photocard game: open a free pack every ${packPeriodMin()} minutes, fill a binder for each group and check the odds. No money, no market.`,
  odds: 'KpopCards odds for every pack: the chance of each edition for cards 1 to 4 and card 5, the Gold guarantee and the duplicate rule. The same for everyone.',
  help: `How KpopCards works: free packs on a timer, up to ${numberWord(editionCount())} editions per idol, shards and crafting, missions, and where every card photo comes from.`,
};

export const DISCLAIMER = 'Unofficial fan game, not affiliated with the artists or their agencies.';

/* ------------------------------------------------------------------ the numbers of the catalog */

export interface CardsStats {
  /** Cards that are in packs now (retired cards are not counted). */
  readonly cards: number;
  /** Idols with at least one card in packs. */
  readonly idols: number;
  /** Groups with at least one card in packs (a group card, or an idol card of that group). */
  readonly groups: number;
  /** The same counts, rounded down by `atLeast` ("1,050+"): the only form a page prints. */
  readonly shown: { readonly cards: string; readonly idols: string; readonly groups: string };
  /** "November 2026": the month the catalog was read (its own generatedAt), or null when it carries no real date. */
  readonly asOf: string | null;
}

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function monthYear(iso: string | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? null : MONTH.format(t);
}

/**
 * The counts of the real catalog the pages already read (loadCatalog), or null when it cannot be read or holds no card: a page then writes its sentence
 * without a number, never a typed one. Every count goes through `atLeast`, so the text, the meta and the JSON-LD print the same value.
 */
export function cardsStats(cat: UiCatalog | null): CardsStats | null {
  if (!cat || cat.cards.length === 0) return null;
  const idols = new Set<string>();
  const groups = new Set<string>();
  for (const c of cat.cards) {
    if (c.kind === 'idol') idols.add(c.entity);
    if (c.kind === 'group') groups.add(c.name);
    else if (c.kind === 'idol' && c.group) groups.add(c.group);
  }
  const cards = cat.cards.length;
  return {
    cards, idols: idols.size, groups: groups.size,
    shown: { cards: atLeast(cards), idols: atLeast(idols.size), groups: atLeast(groups.size) },
    asOf: monthYear(cat.generatedAt),
  };
}

/* ------------------------------------------------------------------ the answer blocks (rule 3.1: 40 to 60 words, server HTML) */

/**
 * The answer block of /kpopcards, the text of agent 3 (section 5). The last sentence carries the count and its month; it is dropped whole when the
 * catalog cannot be read (never a typed number) and loses only its date when the catalog carries none.
 */
export function landingAnswer(stats: CardsStats | null): string {
  const base = `${CARDS_BRAND} is a free K-pop photocard game on Bunnyverse. A free pack of ${PACK_SIZE} cards lands every ${packPeriodMin()} minutes. Open it, fill a binder for each group, and finish sets for more packs. Packs are never sold and cards have no money value.`;
  if (!stats) return base;
  return `${base} ${stats.shown.cards} cards are in the packs${stats.asOf ? ` as of ${stats.asOf}` : ''}, each from a credited free-licence photo.`;
}

const pct = (v: number | undefined): string => `${(v ?? 0).toFixed(2)}%`;

/**
 * The answer block of /kpopcards/odds, computed from the catalog odds (oddsView) and KC.GOLD_BY_PACK: the chance of each edition for cards 1 to 4, the
 * floor of the fifth card, the Gold guarantee and the duplicate rule. Without odds it states the rules only.
 */
export function oddsAnswer(odds: CatalogOdds | null): string {
  const t = oddsView(odds);
  const gold = RARITY_LABEL.UR;
  const guarantee = `Pack ${CONTRACT.GOLD_BY_PACK} brings a sure ${gold} if the ${CONTRACT.GOLD_BY_PACK - 1} before had no ${gold} or ${RARITY_LABEL.L}.`;
  const dup = `A drawn rarity has a ${dupBiasPct()} chance to be a card you own.`;
  if (t.present.length === 0) return `${CARDS_BRAND} odds are the same for everyone. ${guarantee} ${dup}`;
  const rates = t.present.map((r) => `${RARITY_LABEL[r]} ${pct(t.each[r])}`).join(', ');
  const fifth = t.fifthFloor ? ` Card 5 is ${RARITY_LABEL[t.fifthFloor]} or better.` : '';
  return `${CARDS_BRAND} odds are the same for everyone. Cards 1 to 4: ${rates}.${fifth} ${t.present.includes('UR') ? guarantee : ''} ${dup}`.replace(/ {2,}/g, ' ');
}

/** The words of a text, as the answer-block rule counts them. */
export const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/* ------------------------------------------------------------------ the question sections of the landing */

export interface LandingQuestion { readonly id: string; readonly q: string; readonly lead: string; readonly more: readonly string[] }

/** The H2 questions of /kpopcards, each answered in its first sentence (`lead`), then the detail. The links (odds, help, credits) are drawn by the component. */
export function landingQuestions(): readonly LandingQuestion[] {
  const adsLine = `A few ads on bunnyverse.org pay for the game, and a rewarded ad (up to ${adsPerDay()} a day) is only watched if you choose.`;
  const econ = economySentences(timerPerDay(), undefined, adsPerDay());
  return [
    {
      id: 'how', q: 'How do you play KpopCards?',
      lead: 'You open a free pack, keep the cards you draw and complete sets for more packs.',
      more: [
        `Open: a free pack of ${PACK_SIZE} cards every ${PERIOD_S / 60} minutes, up to ${CONTRACT.STACK_CAP} waiting. The stack fills up again at midnight, Paris time.`,
        `Collect: every idol has up to ${numberWord(editionCount())} editions, from ${RARITY_LABEL.C} to ${RARITY_LABEL.L}, and each edition uses its own photo.`,
        'Complete: sets and the weekly list give packs. Extra copies turn into shards, and shards craft the cards you miss.',
      ],
    },
    {
      id: 'free', q: 'Is KpopCards free?',
      lead: 'Yes, KpopCards is free to play: packs are never sold, and cards cannot be sold or turned into money.',
      more: ['Sign in with your free Bunnyverse passport to keep your cards.', adsLine],
    },
    {
      id: 'gacha', q: 'Is it a gacha game?',
      lead: 'It uses random packs, but nothing is for sale. Packs come from a timer, missions and optional ads, and the odds are public.',
      more: [econ.timer, 'There is no market and no auction. Every rate, guarantee and rule is on the odds page.'],
    },
    {
      id: 'photos', q: 'Where do the photos come from?',
      lead: 'Every card uses a photo under a free licence, mostly from Wikimedia Commons, credited with its author, licence and source.',
      more: [
        'The credit is on each card and on the credits page, and a card made from a CC BY-SA photo is shared under CC BY-SA too.',
        `A reported photo leaves the game within ${CARDS_PRIVACY_FACTS.removalHours} hours.`,
      ],
    },
  ];
}

/* ------------------------------------------------------------------ metadata */

/** The share image of the three pages: the Bunnyverse rabbit card of the hub (never an idol, rule 6.5 and the personality rights of the photos). */
export const cardsShareImage = (): string => abs(REGISTRY.hub.brand.ogTemplate);

/**
 * The metadata of one of the three pages: its title (the layout adds " | Bunnyverse"), the description, the self canonical on bunnyverse.org, the share
 * cards, and `robotsFor(true)` (the indexing gate of lib/site/indexing.ts: noindex until NET_INDEXING opens the site, then index, follow).
 */
export function cardsMetadata(page: CardsPageKey): Metadata {
  const title = CARDS_TITLE[page];
  const description = CARDS_DESCRIPTION[page];
  const url = cardsUrl(page);
  const image = cardsShareImage();
  return {
    title, description,
    alternates: { canonical: url },
    robots: robotsFor(true),
    openGraph: { type: 'website', siteName: NETWORK.name, title: withBrand(title), description, url, images: [{ url: image, width: 1200, height: 630, alt: NETWORK.name }], locale: 'en_US' },
    twitter: { card: 'summary_large_image', title: withBrand(title), description, images: [image] },
  };
}

/* ------------------------------------------------------------------ JSON-LD (values equal to the visible text) */

/** The BreadcrumbList of a page: Bunnyverse, KpopCards, and the page itself when it is not the landing. */
export function cardsBreadcrumb(page: CardsPageKey): Record<string, unknown> {
  const items = [
    { name: NETWORK.name, url: abs('/') },
    { name: CARDS_BRAND, url: cardsUrl('landing') },
    ...(page === 'landing' ? [] : [{ name: page === 'odds' ? 'Odds' : 'Help', url: cardsUrl(page) }]),
  ];
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.url })),
  };
}

/**
 * WebApplication and VideoGame of the landing (the pattern of gameJsonLd in lib/dle/seo.ts): free, in the browser, no rating, no review, no offer
 * beyond "free". Its description is the visible answer block, so the count is the one of the page.
 */
export function cardsGameJsonLd(stats: CardsStats | null): Record<string, unknown> {
  return {
    '@context': 'https://schema.org', '@type': ['WebApplication', 'VideoGame'],
    name: CARDS_BRAND,
    alternateName: `${CARDS_BRAND} by Bunnyverse`,
    description: landingAnswer(stats),
    url: cardsUrl('landing'),
    inLanguage: 'en',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    genre: 'Card collecting',
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: NETWORK.name, url: NETWORK.url },
  };
}

/** The JSON-LD blocks of a page, in the order they are written. */
export function cardsJsonLd(page: CardsPageKey, stats: CardsStats | null = null): readonly Record<string, unknown>[] {
  return page === 'landing' ? [cardsGameJsonLd(stats), cardsBreadcrumb('landing')] : [cardsBreadcrumb(page)];
}

/* ------------------------------------------------------------------ sitemap */

export interface CardsSitemapRow { readonly path: string; readonly lastModified: Date; readonly changeFrequency: 'monthly'; readonly priority: number }

const at = (day: string): Date => new Date(`${day}T00:00:00Z`);

/**
 * The rows of the hub sitemap for the three pages (rule 9.6): none unless KpopCards is on AND the hub is open to search engines, with a real lastmod:
 * the date of the copy, and for the odds the day they really changed. Never the build date, never a play count. root-files.ts spreads this.
 */
export function cardsSitemapRows(on: boolean = cardsOn(), open: boolean = indexingOpenFor('hub')): readonly CardsSitemapRow[] {
  if (!on || !open) return [];
  return [
    { path: CARDS_PATH.landing, lastModified: at(CARDS_COPY_DATE), changeFrequency: 'monthly', priority: 0.8 },
    { path: CARDS_PATH.odds, lastModified: at(CARDS_ODDS_CHANGED), changeFrequency: 'monthly', priority: 0.6 },
    { path: CARDS_PATH.help, lastModified: at(CARDS_COPY_DATE), changeFrequency: 'monthly', priority: 0.6 },
  ];
}

/** "23 November 2026", the form the odds page prints after "Updated". */
export function longDate(day: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at(day));
}
