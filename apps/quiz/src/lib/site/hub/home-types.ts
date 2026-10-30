// Run O1, lot H2a: the shapes of the new Bunnyverse home (docs/o1/design/fanquiz-hub/). Each block of the page takes its data from
// one loader (home-*.ts) that returns one of these shapes. Lot H2c: every loader maps its module of lib/site/hub/data/ (lot H2b) to
// its shape; a block with no data is null (or empty) and the page leaves it out, as the design's sc-if does. Pure types and two pure
// helpers: no site name or origin is written here.
// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): the quiz image of a Hot row, the Start easy filter, Top fans per
// site, the level of each site and the quizzes of the day done today; For you and the old Start easy block are gone.

import { joinSiteUrl, netBase } from '@/lib/site/base-path';

import type { SiteId } from '@/lib/site/types';

/** The two sites a quiz of the home can belong to. */
export type HomeSite = Extract<SiteId, 'kpop' | 'anime'>;
export const HOME_SITES: readonly HomeSite[] = ['kpop', 'anime'];

/** The link of a quiz: the canonical page on its own site (`path` on the origin of `site`). Nothing is copied onto the hub. */
export interface HomeLink {
  readonly site: HomeSite;
  readonly path: string;
}

/** One quiz of the Hot now list (and of the Surprise me pool). `plays` is empty for a quiz below the threshold: the card says New. */
export interface HomeQuiz extends HomeLink {
  /** The initials on the tile. */
  readonly tile: string;
  /** The group or the series. */
  readonly group: string;
  readonly title: string;
  /** The difficulty: "Easy", "Medium", "Hard". */
  readonly level: string;
  /** The format when it is not the classic one ("True or false", "Find the intruder"); the phone card shows the level only. */
  readonly format?: string;
  /** "2.7k plays", or '' when the quiz is new. */
  readonly plays: string;
  readonly isNew: boolean;
  /** The quiz's own cover image (K-pop only), or null: the row then shows `photo`, else the initials tile. */
  readonly cover: string | null;
  /** Owner decision 2026-10-30: the photo of its group (K-pop) or series (anime) as its own site shows it, for a quiz with no cover of its
   *  own (lib/site/hub/home-photo.ts), or null. Missing on a quiz mapped before it existed: read it as null. */
  readonly photo?: string | null;
}

/** A site card of the first row: its name, the real count of its quizzes, what it is about, one quiz and the way in. */
export interface HomeDoor {
  readonly site: HomeSite;
  readonly name: string;
  readonly tagline: string;
  /** "N quizzes": the real count, rounded down by the shared helper (lib/stats/site-stats.ts atLeast, "450+" from 455). */
  readonly count: string;
  /** "Top now" or "Just added", then the quiz; null when the site has no quiz to feature (the line then disappears). */
  readonly spotlight: { readonly label: string; readonly title: string; readonly path: string } | null;
}

export interface HomeTodayQuiz extends HomeLink {
  /** The quiz id (the signed-in fan's plays of today are matched on it). */
  readonly id: string;
  readonly title: string;
  /** The number of questions (0 when unknown). */
  readonly questions: number;
  /** "10 questions · Easy". */
  readonly meta: string;
}

/** The blind test of the day: K-pop, audio only; `previewUrl` is the 10 second preview of its first song. */
export interface HomeBlindtest {
  readonly site: HomeSite;
  readonly path: string;
  readonly songs: number;
  readonly seconds: number;
  readonly previewUrl: string;
}

export interface HomeDebate {
  readonly site: HomeSite;
  readonly title: string;
  readonly path: string;
}

/** The next change of the daily picks: the instant (ISO) the countdown aims at, and the same time on a Paris clock ("2:05", "1:05"). */
export interface HomeRotation {
  readonly nextAt: string;
  readonly parisTime: string;
}

/** Each part may be missing (no quiz of the day in a bank, no blind test, no debate): its card is left out. */
export interface HomeToday {
  readonly quizzes: readonly HomeTodayQuiz[];
  readonly blindtest: HomeBlindtest | null;
  readonly debate: HomeDebate | null;
  readonly rotation: HomeRotation;
}

export interface HomeQuestion {
  readonly site: HomeSite;
  /** The quiz the question comes from, with the link to it. */
  readonly source: string;
  readonly path: string;
  readonly text: string;
  readonly options: readonly string[];
  readonly correct: number;
  /** The story shown after the answer; '' when the question has none. */
  readonly explain: string;
  readonly explainShort: string;
}

/** A sourced fact; `path` is the trivia page of its site. */
export interface HomeFact extends HomeLink {
  /** The group or series the fact is about, shown with it (a fact without one is left out). */
  readonly subject: string;
  readonly text: string;
  readonly source: string;
  /** The source's own page, an absolute https URL, linked from the source name (a fact without one is left out). */
  readonly sourceUrl: string;
}

export interface HomeQuick {
  /** Null when no question qualifies (the card is left out). */
  readonly question: HomeQuestion | null;
  /** Zero, one or two facts (K-pop, anime). */
  readonly facts: readonly HomeFact[];
}

/** The lists of the filter chips, each in rank order: `all` and `easy` already alternate the two sites; `easy` may be empty (no chip). */
export interface HomeHot {
  readonly all: readonly HomeQuiz[];
  readonly kpop: readonly HomeQuiz[];
  readonly anime: readonly HomeQuiz[];
  readonly easy: readonly HomeQuiz[];
  readonly allPaths: Readonly<Record<HomeSite, string>>;
}

export interface HomeCrossoverCard extends HomeLink {
  readonly title: string;
  readonly sub: string;
}

export interface HomeCrossover {
  /** The fact that links the two worlds; null when no sourced one is available (the line is left out). */
  readonly fact: string | null;
  /** The name of the fact's source, printed beside it (SEO rule 3.8); null with no fact. */
  readonly factSource: string | null;
  /** The source's own page (absolute https), linked from its name; null with no fact. A fact without one is left out. */
  readonly factUrl: string | null;
  readonly cards: readonly HomeCrossoverCard[];
}

export interface HomeFan {
  readonly handle: string;
  /** The level on the site of the board; null while the fan keeps it private. */
  readonly level: number | null;
}

/** Top fans this week, one board per site; a site with no public fan has an empty board (its tab is left out). */
export type HomeFans = Readonly<Record<HomeSite, readonly HomeFan[]>>;

/** The level of the signed-in fan on one site, and the progress to the next one (0 to 100). */
export interface HomeSiteLevel {
  readonly level: number;
  readonly progress: number;
}

/** The signed-in fan: the passport (username, level, sites joined), the progress to the next level and the daily streak of each site. */
export interface HomeViewer {
  readonly username: string;
  readonly level: number;
  readonly sitesJoined: number;
  /** Progress to the next level, 0 to 100. */
  readonly progress: number;
  readonly streaks: Readonly<Record<HomeSite, number>>;
  /** The level of each site the fan joined (the passport card of the home lists them). */
  readonly sites: Readonly<Partial<Record<HomeSite, HomeSiteLevel>>>;
}

/** The quizzes of the day the signed-in fan finished today (a row of `plays` since 00:00 UTC), by site. */
export type HomeDone = Readonly<Record<HomeSite, boolean>>;

/** The absolute URL of a link on its own site: the registry origin on production, the dev origin of NEXT_PUBLIC_NET_ORIGINS elsewhere. */
export function homeUrl(link: HomeLink): string {
  // Bunnyverse: the base URL of the site (its sub-folder included); the home of a site in a sub-folder has no trailing slash.
  return joinSiteUrl(netBase(link.site, { NEXT_PUBLIC_NET_ORIGINS: process.env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: process.env.VERCEL_ENV }), link.path);
}

/** One quiz of the Surprise me pool: the 200 best quizzes of both sites. */
export interface HomeSurpriseCard extends HomeLink {
  readonly id: string;
  readonly tile: string;
  readonly title: string;
}

export interface HomeSurprise {
  readonly pool: readonly HomeSurpriseCard[];
  /** Quiz ids the signed-in fan already played (empty for a guest). */
  readonly playedIds: readonly string[];
}
