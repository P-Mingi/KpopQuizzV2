// Run O1, lot H2b: the shapes the new Bunnyverse home reads (docs/o1/design/fanquiz-hub/Plan.dc.html, sections 3 and 5; the sample data of
// Main.dc.html gives the shape of each block). Plain data, no function, no Date: every value survives a cache and a JSON round trip.
// Every link is the canonical page on its own site (netOrigin); nothing is copied onto the hub.

import type { SiteId } from '@/lib/site/types';

/** The two sites with quizzes. */
export type HubSite = Extract<SiteId, 'kpop' | 'anime'>;

/** The origin of every site on this deployment (netOrigin: the registry url on production). */
export type HubOrigins = Readonly<Record<SiteId, string>>;

/** The options every block takes. Both are optional; a block reads the environment when `origins` is missing. */
export interface HubOpts {
  readonly origins?: HubOrigins;
}

/** A quiz as a card of the home (a Hot now row, a For you card, a door's featured quiz). */
export interface HubQuizCard {
  readonly id: string;
  readonly site: HubSite;
  readonly siteName: string;
  readonly slug: string;
  /** The canonical path on its own site (`/q/<slug>`). */
  readonly path: string;
  /** The canonical absolute URL: the origin of its site plus `path`. */
  readonly href: string;
  readonly title: string;
  /** The group (K-pop) or the series (anime). */
  readonly group: string;
  readonly groupSlug: string;
  /** Two letters of the group, for the initials tile (no artwork, no logo). */
  readonly tile: string;
  readonly difficulty: string;
  /** "Medium" or "Easy · True or false". */
  readonly meta: string;
  /** "2.7k plays" once the quiz has 100 plays, else "". */
  readonly plays: string;
  /** Published less than 14 days ago. */
  readonly isNew: boolean;
  readonly hasPlays: boolean;
  readonly questionCount: number;
  /** Home v3 (2026-10-29): the quiz's own cover image (its `cover_image_url` on a configured image host), K-pop only; null for every anime
   *  quiz (no artwork without a written licence) and for a quiz without one. The home then shows the initials tile. */
  readonly cover: string | null;
}

export interface HubHotCard extends HubQuizCard {
  readonly rank: number;
}

/** Hot right now: six ranked quizzes for each filter of the home (All, KpopQuiz, OtakuQuiz, Start easy). */
export interface HubHot {
  readonly all: readonly HubHotCard[];
  readonly kpop: readonly HubHotCard[];
  readonly anime: readonly HubHotCard[];
  /** Home v3: the Start easy filter, the easy quizzes of both sites in the same order and mix (two per group or series at most), the sites
   *  alternating. Missing from a value cached before it existed: read it as empty. */
  readonly easy?: readonly HubHotCard[];
  /** Where the numbers come from, for the data report and the page's footnote logic. */
  readonly basis: {
    /** plays per day: the daily table when it is fresh, else the plays rows of the last 7 days. */
    readonly plays: 'daily-table' | 'plays-rows';
    /** Completion rate needs a started count, which nothing stores yet: false means the neutral value 1 was used. */
    readonly completionMeasured: boolean;
    /** True while OtakuQuiz has less than 7 days of data and its places go to its New quizzes. */
    readonly animeStartup: boolean;
  };
}

/** One door of the hero: the real count of published quizzes, and one featured quiz. */
export interface HubDoor {
  readonly site: HubSite;
  readonly name: string;
  readonly origin: string;
  readonly quizCount: number;
  /** Groups (K-pop) or series (anime) that have published quizzes. */
  readonly topicCount: number;
  readonly topicLabel: string;
  /** "Top now" once the site has 7 days of data, else "Just added". */
  readonly featuredLabel: 'Top now' | 'Just added';
  readonly featured: HubQuizCard | null;
}

export interface HubDoors {
  readonly kpop: HubDoor;
  readonly anime: HubDoor;
}

/** A quiz of the day (Today). */
export interface HubDailyQuiz {
  readonly id: string;
  readonly site: HubSite;
  readonly siteName: string;
  readonly title: string;
  readonly path: string;
  readonly href: string;
  readonly group: string;
  readonly questionCount: number;
  readonly difficulty: string;
  /** "KpopQuiz · 10 questions · Easy". */
  readonly meta: string;
}

export interface HubDailyQuizzes {
  readonly kpop: HubDailyQuiz | null;
  readonly anime: HubDailyQuiz | null;
}

/** The daily blind test (K-pop only, audio only). Nothing here names the song or shows a cover. */
export interface HubBlindtest {
  readonly site: 'kpop';
  readonly siteName: string;
  /** UTC date of the set. */
  readonly date: string;
  /** Songs in the set (10 today: the existing route serves 10). */
  readonly songCount: number;
  /** Seconds each song plays. */
  readonly clipSeconds: number;
  /** Fresh Deezer preview URL of the first song (the stored one when Deezer does not answer). */
  readonly previewUrl: string;
  readonly path: string;
  readonly href: string;
}

export interface HubDebate {
  readonly site: 'kpop';
  readonly siteName: string;
  readonly date: string;
  readonly question: string;
  readonly sideA: string;
  readonly sideB: string;
  readonly votes: number;
  readonly path: string;
  readonly href: string;
}

/** The next change of the daily picks. */
export interface HubRotation {
  /** ISO instant of the next rotation (the daily cron, 00:05 UTC). */
  readonly nextAt: string;
  readonly utcTime: string;
  /** The same instant on a Paris clock: "02:05" in summer, "01:05" in winter. */
  readonly parisTime: string;
  readonly parisZone: 'CEST' | 'CET';
  readonly secondsLeft: number;
}

export interface HubSixtySeconds {
  readonly site: HubSite;
  readonly siteName: string;
  readonly quizTitle: string;
  readonly quizHref: string;
  readonly question: string;
  readonly options: readonly string[];
  /** Index in `options`. */
  readonly correct: number;
  /** The anecdote shown after the answer; null when the question has none. */
  readonly explanation: string | null;
  /** The question gives no XP. */
  readonly awardsXp: false;
}

export interface HubFact {
  readonly site: HubSite;
  readonly siteName: string;
  readonly fact: string;
  readonly source: string;
  readonly sourceUrl: string | null;
  /** The trivia page of the site. */
  readonly moreHref: string;
}

export interface HubDidYouKnow {
  readonly kpop: HubFact | null;
  readonly anime: HubFact | null;
  /** Facts in each pool (a rotation repeats no fact for `min(60, pool)` days). */
  readonly pool: { readonly kpop: number; readonly anime: number };
}

export type HubForYouKind = 'continue' | 'next' | 'bridge';

export interface HubForYouCard {
  readonly kind: HubForYouKind;
  readonly card: HubQuizCard;
  /** "Next for a Stray Kids fan", "Stray Kids fans also play". */
  readonly eyebrow: string;
  /** "Medium · you averaged 90% on Stray Kids". */
  readonly meta: string;
  /** For a bridge: where the pair comes from. */
  readonly via?: 'passport' | 'editorial' | 'start-easy';
}

export interface HubForYou {
  /** Three cards at most, one of them always from the other site than the fandom. */
  readonly cards: readonly HubForYouCard[];
  /** The group or series played the most. */
  readonly fandom: { readonly site: HubSite; readonly name: string; readonly slug: string };
}

export interface HubStartEasy {
  readonly kpop: HubQuizCard | null;
  readonly anime: HubQuizCard | null;
}

/** One quiz of the Surprise me pool: the 200 best quizzes of both sites. */
export interface HubSurpriseCard {
  readonly id: string;
  readonly site: HubSite;
  readonly siteName: string;
  readonly tile: string;
  readonly title: string;
  readonly group: string;
  readonly href: string;
}

export interface HubSurprise {
  readonly pool: readonly HubSurpriseCard[];
  /** Quiz ids the signed-in fan already played (empty for a guest). */
  readonly playedIds: readonly string[];
}

/** One crossover pick: a quiz (or the KPop Demon Hunters bridge quiz page) of its own site, with one editorial line. */
export interface HubCrossoverQuiz {
  readonly site: HubSite;
  readonly siteName: string;
  readonly title: string;
  /** The canonical page on its own site. */
  readonly href: string;
  readonly tile: string;
  readonly meta: string;
  /** One editorial line. */
  readonly line: string;
}

export interface HubCrossover {
  readonly quizzes: readonly HubCrossoverQuiz[];
  readonly fact: { readonly text: string; readonly source: string; readonly sourceUrl: string } | null;
  /** ISO week (`2026-W43`) the picks were drawn for. */
  readonly week: string;
}

export interface HubTopFan {
  readonly rank: number;
  readonly handle: string;
  readonly initial: string;
  /** The passport level; null while the fan keeps it private. */
  readonly level: number | null;
  readonly kpop: boolean;
  readonly anime: boolean;
  readonly href: string;
}

export interface HubTopFans {
  /** Both sites together: the XP of the week of every public stamp, the passport level. */
  readonly fans: readonly HubTopFan[];
  /** Home v3: one board per site, the XP of the week on that site only and the level of that site. Missing from a value cached before it
   *  existed: read it as empty. */
  readonly bySite?: Readonly<Record<HubSite, readonly HubTopFan[]>>;
  /** `snapshots`: XP now minus XP seven days ago. `plays`: the XP of the quiz plays of the week (no XP ledger exists). */
  readonly basis: 'snapshots' | 'plays';
}
