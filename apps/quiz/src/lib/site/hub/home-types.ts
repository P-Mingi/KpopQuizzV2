// Run O1, lot H2a: the shapes of the new FanQuiz home (docs/o1/design/fanquiz-hub/). Each block of the page takes its data from
// one loader (home-*.ts) that returns one of these shapes. The H2a bodies return the design's sample data; lot H2b replaces the
// bodies with real data and keeps the shapes. Pure types and two pure helpers: no site name or origin is written here.

import { netOrigin } from '@/lib/site/registry';

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
}

/** The three filters of the Hot now chips. */
export type HotFilter = 'all' | 'kpop' | 'anime';

/** A site door of the hero. */
export interface HomeDoor {
  readonly site: HomeSite;
  readonly name: string;
  readonly tagline: string;
  /** The pills of the desktop card ("482 quizzes", "Daily blindtest"). */
  readonly chips: readonly string[];
  /** The one line of the phone card ("482 quizzes", "138 quizzes · 31 series"). */
  readonly phoneLine: string;
  /** "Top now" or "Just added", then the quiz. */
  readonly spotlight: { readonly label: string; readonly title: string; readonly path: string };
}

export interface HomeTodayQuiz extends HomeLink {
  readonly title: string;
  /** "10 questions · Easy". */
  readonly meta: string;
}

export interface HomeToday {
  readonly quizzes: readonly HomeTodayQuiz[];
  readonly blindtest: { readonly site: HomeSite; readonly path: string; readonly songs: number; readonly seconds: number };
  readonly debate: { readonly site: HomeSite; readonly title: string; readonly path: string };
}

export interface HomeQuestion {
  readonly site: HomeSite;
  /** The quiz the question comes from, with the link to it. */
  readonly source: string;
  readonly path: string;
  readonly text: string;
  readonly options: readonly string[];
  readonly correct: number;
  readonly explain: string;
  readonly explainShort: string;
}

/** A sourced fact; `path` is the trivia page of its site. */
export interface HomeFact extends HomeLink {
  readonly text: string;
  readonly source: string;
}

export interface HomeQuick {
  readonly question: HomeQuestion;
  readonly facts: readonly HomeFact[];
}

export interface HomeHot {
  readonly kpop: readonly HomeQuiz[];
  readonly anime: readonly HomeQuiz[];
  readonly allPaths: Readonly<Record<HomeSite, string>>;
}

export interface HomeForYouCard extends HomeLink {
  /** The small line above the title ("Continue", "Next for a Stray Kids fan"), without the site name. */
  readonly label: string;
  readonly title: string;
  readonly meta: string;
  /** Continue only: how far the fan is, 0 to 100. */
  readonly progress?: number;
  /** The bridge to the other site: its card takes the colour of that site. */
  readonly bridge?: boolean;
}

export interface HomeForYou {
  /** Signed in: continue, the next one in the fandom, the bridge to the other site. */
  readonly signedIn: readonly HomeForYouCard[];
  /** Signed out: the friendliest first quiz of each site. */
  readonly signedOut: readonly HomeForYouCard[];
}

export interface HomeCrossoverCard extends HomeLink {
  readonly title: string;
  readonly sub: string;
}

export interface HomeCrossover {
  readonly fact: string;
  readonly cards: readonly HomeCrossoverCard[];
}

export interface HomeFan {
  readonly handle: string;
  readonly level: number;
  readonly onKpop: boolean;
  readonly onAnime: boolean;
}

/** The signed-in fan: from the passport, with the numbers the design shows as samples until lot H2b. */
export interface HomeViewer {
  readonly username: string;
  readonly level: number;
  readonly sitesJoined: number;
  /** Progress to the next level, 0 to 100. */
  readonly progress: number;
  readonly streaks: Readonly<Record<HomeSite, number>>;
}

/** The absolute URL of a link on its own site: the registry origin on production, the dev origin of NEXT_PUBLIC_NET_ORIGINS elsewhere. */
export function homeUrl(link: HomeLink): string {
  return `${netOrigin(link.site, { NEXT_PUBLIC_NET_ORIGINS: process.env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: process.env.VERCEL_ENV })}${link.path}`;
}

/** The Hot now list of a filter: both sites alternate, the first three of each (the design's script), or the six of one site. */
export function hotList(hot: Pick<HomeHot, 'kpop' | 'anime'>, filter: HotFilter): readonly HomeQuiz[] {
  if (filter === 'kpop') return hot.kpop.slice(0, 6);
  if (filter === 'anime') return hot.anime.slice(0, 6);
  const out: HomeQuiz[] = [];
  for (let i = 0; i < 3; i++) {
    if (hot.kpop[i]) out.push(hot.kpop[i]!);
    if (hot.anime[i]) out.push(hot.anime[i]!);
  }
  return out;
}
