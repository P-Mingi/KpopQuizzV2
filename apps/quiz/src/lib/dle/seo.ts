// Daily games step 4: the SEO of the pages of the Terrier (RAPPORT-JEUX-DU-JOUR-v2.md section 11). Titles, descriptions, answer blocks, hreflang, robots, JSON-LD, sitemap rows. Pure: every
// number arrives as an argument. The answer of the day is never here: only the pool and yesterday's name are ever on a page, and only in the HTML.
import { indexingOpenFor, robotsFor } from '../site/indexing';
import { NETWORK } from '../site/registry';

import { DAILY_PATH, FR_CREDITS_PATH, builtGames, dleGame, localePath } from './games';

import type { DleGameId } from './games';
import type { DleLocale } from './types';
import type { Metadata } from 'next';

/**
 * Rule 10 of the rulebook: a French page is indexed once its native reviewer approved it. The owner reads the French at the launch (v2 section 4) and sets this to true. Until
 * then every /fr page says noindex and stays out of the sitemap; hreflang is already reciprocal, the pages being true equivalents.
 */
export const DLE_FR_REVIEWED = false;

type L10n = Readonly<Record<DleLocale, string>>;

export const BURROW_SEO: { readonly title: L10n; readonly description: L10n } = {
  title: { en: 'Daily K-pop and Anime Games: The Burrow', fr: 'Jeux K-pop et anime du jour : le Terrier' },
  description: {
    en: 'The Burrow gathers our daily K-pop and anime games: Kpopdle and Otakudle, one puzzle each, the same for everyone, a new one at midnight UTC.',
    fr: 'Le Terrier réunit nos jeux K-pop et anime du jour : Kpopdle et Otakudle, une énigme chacun, la même pour tout le monde, une nouvelle à minuit UTC.',
  },
};

export const GAME_SEO: Readonly<Partial<Record<DleGameId, { readonly title: L10n; readonly description: L10n; readonly app: L10n }>>> = {
  'kpopdle-idol': {
    title: { en: 'Kpopdle: Guess the K-pop Idol of the Day', fr: 'Kpopdle : devine l’idol K-pop du jour' },
    description: {
      en: 'Kpopdle is a free daily game: guess the K-pop idol of the day from the group, agency, birth year and more. Unlimited guesses, a new idol at midnight UTC.',
      fr: 'Kpopdle est un jeu gratuit : devine l’idol K-pop du jour grâce au groupe, à l’agence, à l’année de naissance. Essais illimités, nouvelle idol à minuit UTC.',
    },
    app: { en: 'Kpopdle by Bunnyverse, a free daily K-pop idol guessing game', fr: 'Kpopdle par Bunnyverse, un jeu gratuit pour deviner l’idol K-pop du jour' },
  },
  otakudle: {
    title: { en: 'Otakudle: Guess the Anime Character Daily', fr: 'Otakudle : devine le perso d’anime du jour' },
    description: {
      en: 'Otakudle is a free daily game: guess the anime character of the day from the series, species, role, year and studio. No spoilers, new character at midnight UTC.',
      fr: 'Otakudle est un jeu gratuit : devine le personnage d’anime du jour grâce à la série, l’espèce, le rôle, l’année et le studio. Sans spoiler, nouveau chaque jour.',
    },
    app: { en: 'Otakudle by Bunnyverse, a free daily anime character guessing game', fr: 'Otakudle par Bunnyverse, un jeu gratuit pour deviner le personnage d’anime du jour' },
  },
  'otakudle-one-piece': {
    title: { en: 'Otakudle One Piece: Guess the Character Daily', fr: 'Otakudle One Piece : le perso du jour' },
    description: {
      en: 'Otakudle One Piece is a free daily game: guess the One Piece character of the day from the crew, Devil Fruit, Haki, bounty and more. New one at midnight UTC.',
      fr: 'Otakudle One Piece est un jeu gratuit : devine le personnage One Piece du jour grâce à l’équipage, au fruit du démon, au Haki, à la prime. Nouveau chaque jour.',
    },
    app: { en: 'Otakudle One Piece by Bunnyverse, a free daily One Piece character guessing game', fr: 'Otakudle One Piece par Bunnyverse, un jeu gratuit pour deviner le personnage One Piece du jour' },
  },
  'otakudle-dragon-ball': {
    title: { en: 'Otakudle Dragon Ball: Guess the Character Daily', fr: 'Otakudle Dragon Ball : le perso du jour' },
    description: {
      en: 'Otakudle Dragon Ball is a free daily game: guess the Dragon Ball character of the day from the race, planet, universe, saga and more. New one at midnight UTC.',
      fr: 'Otakudle Dragon Ball est un jeu gratuit : devine le personnage Dragon Ball du jour grâce à la race, à la planète, à l’univers, à la saga. Nouveau chaque jour.',
    },
    app: { en: 'Otakudle Dragon Ball by Bunnyverse, a free daily Dragon Ball character guessing game', fr: 'Otakudle Dragon Ball par Bunnyverse, un jeu gratuit pour deviner le personnage Dragon Ball du jour' },
  },
};

/** The self-contained block under a game (rule 3.1, 40 to 60 words): what it is, one real number with its date. */
export function gameAnswerBlock(game: DleGameId, locale: DleLocale, poolSize: number, date: string): string {
  const day = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  if (game === 'kpopdle-idol') {
    return locale === 'fr'
      ? `Kpopdle est un jeu quotidien gratuit de Bunnyverse pour deviner une idol K-pop. Tape une idol : chaque case compare un indice avec l’idol du jour, comme le groupe, l’agence, la nationalité, l’année de naissance, le début, la génération et le rôle. Le jeu compte ${poolSize} idols au ${day}. Nouvelle idol à minuit UTC.`
      : `Kpopdle is a free daily K-pop idol guessing game by Bunnyverse. Type an idol, and each cell compares one fact with the idol of the day: group, agency, nationality, birth year, debut, generation and role. The game holds ${poolSize} idols on ${day}. A new idol comes at midnight UTC.`;
  }
  if (game === 'otakudle') {
    return locale === 'fr'
      ? `Otakudle est un jeu quotidien gratuit de Bunnyverse pour deviner un personnage d’anime. Tape un personnage : chaque case compare un indice avec le personnage du jour, comme la série, le genre, l’espèce, le rôle, la démographie, l’année et le studio. Le jeu compte ${poolSize} personnages au ${day}. Nouveau personnage à minuit UTC.`
      : `Otakudle is a free daily anime character guessing game by Bunnyverse. Type a character, and each cell compares one fact with the character of the day: series, gender, species, role, demographic, year and studio. The game holds ${poolSize} characters on ${day}. A new character comes at midnight UTC.`;
  }
  if (game === 'otakudle-one-piece') {
    return locale === 'fr'
      ? `Otakudle One Piece est un jeu quotidien gratuit de Bunnyverse pour deviner un personnage de One Piece. Tape un personnage : chaque case compare un indice avec le personnage du jour, comme l’affiliation, le fruit du démon, le Haki, la prime, la taille et l’arc de début. Le jeu compte ${poolSize} personnages au ${day}. Nouveau à minuit UTC.`
      : `Otakudle One Piece is a free daily One Piece character guessing game by Bunnyverse. Type a character, and each cell compares one fact with the character of the day: affiliation, Devil Fruit, Haki, bounty, height and debut arc. The game holds ${poolSize} characters on ${day}. A new character comes at midnight UTC.`;
  }
  if (game === 'otakudle-dragon-ball') {
    return locale === 'fr'
      ? `Otakudle Dragon Ball est un jeu quotidien gratuit de Bunnyverse pour deviner un personnage de Dragon Ball. Tape un personnage : chaque case compare un indice avec le personnage du jour, comme la race, l’affiliation, la planète d’origine, l’univers, la série et la saga de début. Le jeu compte ${poolSize} personnages au ${day}. Nouveau personnage à minuit UTC.`
      : `Otakudle Dragon Ball is a free daily Dragon Ball character guessing game by Bunnyverse. Type a character, and each cell compares one fact with the character of the day: race, affiliation, home planet, universe, debut series and debut saga. The game holds ${poolSize} characters on ${day}. A new character comes at midnight UTC.`;
  }
  return GAME_SEO[game]?.description[locale] ?? '';
}

/** Canonical on the clean address of the page, hreflang reciprocal between the two locales, x-default on English (rule 10.5). */
export function dleAlternates(enPath: string, locale: DleLocale): NonNullable<Metadata['alternates']> {
  const fr = localePath(enPath, 'fr');
  return { canonical: locale === 'fr' ? fr : enPath, languages: { en: enPath, fr, 'x-default': enPath } };
}

/** A page says index only when it has its content and, in French, once the owner reviewed it. */
export function dleRobots(locale: DleLocale, hasContent: boolean): NonNullable<Metadata['robots']> {
  return robotsFor(hasContent && (locale === 'en' || DLE_FR_REVIEWED));
}

export function dleMetadata(enPath: string, locale: DleLocale, seo: { readonly title: L10n; readonly description: L10n }, hasContent: boolean, image: string): Metadata {
  const title = seo.title[locale];
  const description = seo.description[locale];
  const alternates = dleAlternates(enPath, locale);
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

/** WebApplication and VideoGame (v2 section 11.11): no rating, no count, never the answer. */
export function gameJsonLd(game: DleGameId, locale: DleLocale): Record<string, unknown> {
  const g = dleGame(game);
  const seo = GAME_SEO[game];
  return {
    '@context': 'https://schema.org', '@type': ['WebApplication', 'VideoGame'],
    name: `${g.brand} ${g.guess[locale]}`,
    description: seo?.app[locale],
    url: abs(localePath(g.path, locale)),
    inLanguage: locale,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    genre: 'Puzzle',
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: 'Bunnyverse', url: NETWORK.url },
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
 */
export function dleSitemapRows(flag: boolean, date: string | null, reviewed: boolean = DLE_FR_REVIEWED, open: boolean = indexingOpenFor('hub')): readonly DleSitemapRow[] {
  if (!flag || !open) return [];
  const en = [DAILY_PATH, ...builtGames().map((g) => g.path)];
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
