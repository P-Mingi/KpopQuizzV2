// Daily games step 4: the SEO of the pages of the Terrier (RAPPORT-JEUX-DU-JOUR-v2.md section 11). Titles, descriptions, answer blocks, hreflang, robots, JSON-LD, sitemap rows. Pure: every
// number arrives as an argument. The answer of the day is never here: only the pool and yesterday's name are ever on a page, and only in the HTML.
import { indexingOpenFor, robotsFor } from '../site/indexing';
import { HUB_ORGANIZATION_ID } from '../site/jsonld';
import { NETWORK } from '../site/registry';

import { DAILY_PATH, FR_CREDITS_PATH, builtGames, dleGame, localePath } from './games';

import type { DleGameId } from './games';
import type { DleLocale } from './types';
import type { Metadata } from 'next';

/**
 * Rule 10.3 of the rulebook: a French page is indexed once its native reviewer approved it, recorded as who and when (reviewed_by, reviewed_at), like every review of the repo.
 * Owner, 2026-11-23: he read the French pages of the hub (/fr/daily, /fr/kpopdle, /fr/otakudle and its series, /fr/credits) and approved them. The review lives here, in code, not in
 * the database: nothing to apply. Set `reviewed_by` to null to take every /fr page back to noindex, out of the sitemap and out of the hreflang of the English pages.
 */
export const DLE_FR_REVIEW: { readonly reviewed_by: string | null; readonly reviewed_at: string | null } = { reviewed_by: 'owner', reviewed_at: '2026-11-23' };
export const DLE_FR_REVIEWED: boolean = DLE_FR_REVIEW.reviewed_by !== null && DLE_FR_REVIEW.reviewed_at !== null;

type L10n = Readonly<Record<DleLocale, string>>;

export const BURROW_SEO: { readonly title: L10n; readonly description: L10n } = {
  title: { en: 'Daily K-pop and Anime Games: Kpopdle, Otakudle', fr: 'Jeux du jour K-pop et anime : Kpopdle, Otakudle' },
  description: {
    en: 'Play the daily K-pop and anime games of Bunnyverse: Kpopdle, the idol of the day, and Otakudle, the anime character of the day. New at midnight UTC.',
    fr: 'Joue aux jeux du jour K-pop et anime de Bunnyverse : Kpopdle, l’idol du jour, et Otakudle, le personnage d’anime du jour. Nouveau à minuit UTC.',
  },
};

export const GAME_SEO: Readonly<Partial<Record<DleGameId, { readonly title: L10n; readonly description: L10n; readonly app: L10n }>>> = {
  'kpopdle-idol': {
    title: { en: 'Kpopdle: Guess the K-pop Idol of the Day', fr: 'Kpopdle : devine l’idol K-pop du jour' },
    description: {
      en: 'Kpopdle is a free daily game: guess the K-pop idol of the day from the group, agency, birth year and more. Unlimited guesses, a new idol at midnight UTC.',
      fr: 'Kpopdle est un jeu gratuit : devine l’idol K-pop du jour grâce au groupe, à l’agence, à l’année de naissance. Essais illimités, nouvelle idol à minuit UTC.',
    },
    app: { en: 'Kpopdle by Bunnyverse, a free daily K-pop idol guessing game', fr: 'Kpopdle by Bunnyverse, un jeu gratuit pour deviner l’idol K-pop du jour' },
  },
  otakudle: {
    title: { en: 'Otakudle: Guess the Anime Character of the Day', fr: 'Otakudle : devine le perso d’anime du jour' },
    description: {
      en: 'Otakudle is a free daily game in two steps: find the anime of the day, then its character, with clues on series, genres, year and studio. No spoilers.',
      fr: 'Otakudle est un jeu gratuit en deux étapes : trouve l’anime du jour, puis son personnage, avec la série, les thèmes, l’année et le studio. Sans spoiler.',
    },
    app: { en: 'Otakudle by Bunnyverse, a free daily anime character guessing game', fr: 'Otakudle by Bunnyverse, un jeu gratuit pour deviner le personnage d’anime du jour' },
  },
  'otakudle-one-piece': {
    title: { en: 'One Piece Character Guessing Game: Otakudle', fr: 'Jeu du personnage One Piece : Otakudle' },
    description: {
      en: 'Play the One Piece character guessing game of the day: guess from crew, Devil Fruit, Haki, bounty and debut arc. Free, with a new character at midnight UTC.',
      fr: 'Joue au jeu du personnage One Piece du jour : équipage, fruit du démon, Haki, prime et arc de début. Gratuit, avec un nouveau personnage à minuit UTC.',
    },
    app: { en: 'Otakudle One Piece by Bunnyverse, a free daily One Piece character guessing game', fr: 'Otakudle One Piece by Bunnyverse, un jeu gratuit pour deviner le personnage One Piece du jour' },
  },
  'otakudle-dragon-ball': {
    title: { en: 'Dragon Ball Character Guessing Game: Otakudle', fr: 'Jeu du personnage Dragon Ball : Otakudle' },
    description: {
      en: 'Play the Dragon Ball character guessing game of the day: guess from race, planet, universe and saga. Free and daily, with a new character at midnight UTC.',
      fr: 'Joue au jeu du personnage Dragon Ball du jour : race, planète, univers et saga. Gratuit et quotidien, avec un nouveau personnage à minuit UTC.',
    },
    app: { en: 'Otakudle Dragon Ball by Bunnyverse, a free daily Dragon Ball character guessing game', fr: 'Otakudle Dragon Ball by Bunnyverse, un jeu gratuit pour deviner le personnage Dragon Ball du jour' },
  },
};

/**
 * The self-contained block under the H1 of a game (rule 3.1, 40 to 60 words): what it is, one real number with its date. The brand is always written "{Game} by Bunnyverse" (owner,
 * 2026-11-23). `seriesCount` (Otakudle across all series): the number of series of the pool, counted by the page from the pool itself.
 */
export function gameAnswerBlock(game: DleGameId, locale: DleLocale, poolSize: number, date: string, seriesCount?: number): string {
  const day = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  if (game === 'kpopdle-idol') {
    return locale === 'fr'
      ? `Kpopdle by Bunnyverse est un jeu quotidien gratuit pour deviner une idol K-pop. Tout le monde a la même idol, et une nouvelle commence à minuit UTC. Tape une idol : chaque case compare le genre, le groupe, l’agence, la nationalité, la naissance, le début, la génération et le rôle. Le jeu compte ${poolSize} idols au ${day}.`
      : `Kpopdle by Bunnyverse is a free daily K-pop idol guessing game. Everyone gets the same idol, and a new one starts at midnight UTC. Type any idol: each cell compares gender, group, agency, nationality, birth year, debut, generation and role with the answer. The game holds ${poolSize} idols on ${day}.`;
  }
  if (game === 'otakudle') {
    const fromEn = seriesCount ? ` from ${seriesCount} series` : '';
    const fromFr = seriesCount ? ` de ${seriesCount} séries` : '';
    return locale === 'fr'
      ? `Otakudle by Bunnyverse est un jeu quotidien gratuit en deux étapes pour deviner un personnage d’anime. Tout le monde a le même, et un nouveau commence à minuit UTC. Trouve d’abord l’anime, puis son personnage, avec des indices propres à chaque anime et aucun qui dise qui vit ou meurt. Le jeu compte ${poolSize} personnages${fromFr} au ${day}.`
      : `Otakudle by Bunnyverse is a free daily anime character guessing game in two steps. Everyone gets the same character, and a new one starts at midnight UTC. Find the anime first, then its character, with clues of their own for each anime and none that spoils who lives or dies. The game holds ${poolSize} characters${fromEn} on ${day}.`;
  }
  if (game === 'otakudle-one-piece') {
    return locale === 'fr'
      ? `Otakudle One Piece by Bunnyverse est un jeu quotidien gratuit pour deviner un personnage de One Piece. Tout le monde a le même personnage, et un nouveau commence à minuit UTC. Chaque essai compare l’affiliation, le fruit du démon, le Haki, la prime, la taille et l’arc de début. Le jeu compte ${poolSize} personnages au ${day}.`
      : `Otakudle One Piece by Bunnyverse is a free daily One Piece character guessing game. Everyone gets the same character, and a new one starts at midnight UTC. Each guess compares affiliation, Devil Fruit, Haki, bounty, height and debut arc with the answer. The game holds ${poolSize} characters on ${day}.`;
  }
  if (game === 'otakudle-dragon-ball') {
    return locale === 'fr'
      ? `Otakudle Dragon Ball by Bunnyverse est un jeu quotidien gratuit pour deviner un personnage de Dragon Ball. Tout le monde a le même personnage, et un nouveau commence à minuit UTC. Chaque essai compare la race, l’affiliation, la planète d’origine, l’univers, la série et la saga de début. Le jeu compte ${poolSize} personnages au ${day}.`
      : `Otakudle Dragon Ball by Bunnyverse is a free daily Dragon Ball character guessing game. Everyone gets the same character, and a new one starts at midnight UTC. Each guess compares race, affiliation, home planet, universe, debut series and debut saga with the answer. The game holds ${poolSize} characters on ${day}.`;
  }
  return GAME_SEO[game]?.description[locale] ?? '';
}

/**
 * The answer block of /daily and /fr/daily (rule 3.1, 40 to 60 words), the paragraph right under the H1. Everything comes from the code: the number and the names of the games from
 * `builtGames()`, the date from the day the page already prints (`dateLabel`). It never names a character or an idol: the answer of the day is not on any page.
 */
export function burrowAnswerBlock(locale: DleLocale, dateLabel: string): string {
  const built = builtGames();
  const fr = locale === 'fr';
  const brands = built.filter((g) => !g.series).filter((g, i, all) => all.findIndex((x) => x.brand === g.brand) === i);
  const base = brands.map((g) => `${g.brand} by Bunnyverse ${fr ? (g.universe === 'kpop' ? 'pour les idols K-pop' : 'pour les personnages d’anime') : (g.universe === 'kpop' ? 'for K-pop idols' : 'for anime characters')}`);
  const series = built.filter((g) => g.series).map((g) => gameLabel(g.id));
  const seriesText = series.length ? `${fr ? ', et ses jeux par série' : ', and its series games'} ${series.length > 1 ? `${series.slice(0, -1).join(', ')} ${fr ? 'et' : 'and'} ${series[series.length - 1]}` : series[0]}` : '';
  const list = `${base.join(', ')}${seriesText}`;
  const day = fr ? `${dateLabel.charAt(0).toLowerCase()}${dateLabel.slice(1)}` : dateLabel;
  return fr
    ? `Aujourd’hui, ${day}, ${built.length} jeux du jour sont ouverts : ${list}. Chacun a une énigme, la même pour tout le monde, et les nouvelles énigmes arrivent à minuit UTC.`
    : `Today, ${day}, ${built.length} daily games are open: ${list}. Each has one puzzle, the same for everyone, and new puzzles start at midnight UTC.`;
}

/**
 * Canonical on the clean address of the page; hreflang reciprocal between the two locales, x-default on English (rule 10.5), only between true equivalents that are both indexable:
 * never an hreflang to a noindex page, so with `hreflang` false (French not reviewed, or the page has no content and says noindex) the page carries its canonical alone.
 */
export function dleAlternates(enPath: string, locale: DleLocale, hreflang: boolean = DLE_FR_REVIEWED): NonNullable<Metadata['alternates']> {
  const fr = localePath(enPath, 'fr');
  const canonical = locale === 'fr' ? fr : enPath;
  return hreflang ? { canonical, languages: { en: enPath, fr, 'x-default': enPath } } : { canonical };
}

/** A page says index only when it has its content and, in French, once the owner reviewed it. */
export function dleRobots(locale: DleLocale, hasContent: boolean): NonNullable<Metadata['robots']> {
  return robotsFor(hasContent && (locale === 'en' || DLE_FR_REVIEWED));
}

export function dleMetadata(enPath: string, locale: DleLocale, seo: { readonly title: L10n; readonly description: L10n }, hasContent: boolean, image: string): Metadata {
  const title = seo.title[locale];
  const description = seo.description[locale];
  const alternates = dleAlternates(enPath, locale, hasContent && DLE_FR_REVIEWED);
  return {
    title, description, alternates, robots: dleRobots(locale, hasContent),
    openGraph: { type: 'website', siteName: 'Bunnyverse', title: `${title} | Bunnyverse`, description, url: `${NETWORK.url}${String(alternates.canonical)}`, images: [{ url: image, width: 1200, height: 630, alt: 'Bunnyverse' }], locale: locale === 'fr' ? 'fr_FR' : 'en_US' },
    twitter: { card: 'summary_large_image', title: `${title} | Bunnyverse`, description, images: [image] },
  };
}

const abs = (path: string): string => `${NETWORK.url}${path}`;

export function breadcrumbJsonLd(items: readonly { readonly name: string; readonly path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: abs(x.path) })),
  };
}

/** "Kpopdle", "Otakudle", "Otakudle One Piece": the game's name before " by Bunnyverse". */
export function gameLabel(game: DleGameId): string {
  const g = dleGame(game);
  return g.series ? `${g.brand} ${g.series.name}` : g.brand;
}

/** WebApplication and VideoGame (v2 section 11.11): no rating, no count, never the answer. */
export function gameJsonLd(game: DleGameId, locale: DleLocale): Record<string, unknown> {
  const g = dleGame(game);
  const seo = GAME_SEO[game];
  return {
    '@context': 'https://schema.org', '@type': ['WebApplication', 'VideoGame'],
    // The owner always writes "Kpopdle by Bunnyverse" / "Otakudle by Bunnyverse" (2026-11-23): the name is the brand with its network, the alternate names are the short brand and the game's own name.
    name: `${gameLabel(game)} by Bunnyverse`,
    alternateName: [gameLabel(game), `${g.brand} ${g.guess[locale]}`],
    description: seo?.app[locale],
    url: abs(localePath(g.path, locale)),
    inLanguage: locale,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    genre: 'Puzzle',
    isAccessibleForFree: true,
    publisher: { '@id': HUB_ORGANIZATION_ID },
  };
}

export function itemListJsonLd(name: string, items: readonly { readonly name: string; readonly url?: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: items.length,
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, ...(x.url ? { url: x.url } : {}) })),
  };
}

/** The games of /daily, for its ItemList. */
export function burrowGamesJsonLd(locale: DleLocale): Record<string, unknown> {
  return itemListJsonLd(BURROW_SEO.title[locale], builtGames().map((g) => ({ name: `${g.brand} ${g.guess[locale]}`, url: abs(localePath(g.path, locale)) })));
}

export interface DleSitemapRow { readonly path: string; readonly lastModified?: Date; readonly changeFrequency: 'daily'; readonly priority: number }

/**
 * The rows of the hub's sitemap (rule 9.6, v2 section 11.5): nothing with the flag off or the site closed, and the French pages once reviewed. /credits stays out, like OtakuQuiz's.
 * lastmod is the date of the day: yesterday's answer on the page really changes each day. Play counts never touch it.
 * `live` (rule 9.6, only indexable URLs): the games that answer today. A built game that does not answer (switched off, a pool under its minimum, a failed read) says noindex on its own page
 * (lib/dle/page-meta.ts), so it stays out of the sitemap too, and so does the Burrow when no game answers. Left out, every built game counts as live.
 */
export function dleSitemapRows(
  flag: boolean, date: string | null, reviewed: boolean = DLE_FR_REVIEWED, open: boolean = indexingOpenFor('hub'), live?: readonly DleGameId[],
): readonly DleSitemapRow[] {
  if (!flag || !open) return [];
  const games = builtGames().filter((g) => !live || live.includes(g.id));
  if (games.length === 0) return [];
  const en = [DAILY_PATH, ...games.map((g) => g.path)];
  const paths = reviewed ? [...en, ...en.map((p) => localePath(p, 'fr'))] : en;
  return paths.map((path) => ({
    path,
    ...(date ? { lastModified: new Date(`${date}T00:05:00Z`) } : {}),
    changeFrequency: 'daily' as const,
    priority: path === DAILY_PATH ? 0.9 : 0.8,
  }));
}

export const CREDITS_FR = {
  path: FR_CREDITS_PATH,
  title: 'Crédits photos',
  description: 'Toutes les photos sous licence affichées sur Bunnyverse, avec leur auteur, leur licence et un lien vers leur source : idols, groupes, séries et bannières.',
};
