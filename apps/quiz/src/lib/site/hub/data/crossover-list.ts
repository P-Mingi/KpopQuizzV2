// Run O1, lot H2b: the editorial list of the Crossover block (Plan.dc.html, section 3.D: "une liste choisie a la main (quiz marques
// crossover) ; 3 affiches, changes chaque semaine"). Edit this file to add a pick; nothing else decides what is a crossover.
//
// A quiz entry names a quiz by its slug: it is shown only while that quiz is published on its site (the reader looks it up), so a
// removed or renamed quiz drops out instead of leaving a dead link. The page entry is the KPop Demon Hunters bridge quiz of KpopQuiz
// (a personality quiz, not a row of `quizzes`; it answers 404 when the K-pop site has its v12 flag off, which production has on).
// A fact entry is our own sentence resting on one published trivia row of the database: it is shown only while a published row with
// exactly the text in `basedOn` exists, and it carries that row's source.
//
// Every line below was checked on 2026-10-25 against the published quiz questions and trivia rows of o1-dev
// (sources: the Wikipedia pages of the two seasons).

import { BRIDGE_PATH } from '@/lib/personality/bridge';

import type { HubSite } from './types';

export interface CrossoverQuizEntry {
  readonly kind: 'quiz';
  readonly site: HubSite;
  readonly slug: string;
  readonly line: string;
}

export interface CrossoverPageEntry {
  readonly kind: 'page';
  readonly site: HubSite;
  readonly path: string;
  readonly title: string;
  readonly tile: string;
  readonly meta: string;
  readonly line: string;
}

export type CrossoverEntry = CrossoverQuizEntry | CrossoverPageEntry;

export const CROSSOVER_ENTRIES: readonly CrossoverEntry[] = [
  {
    kind: 'page',
    site: 'kpop',
    path: BRIDGE_PATH,
    title: 'Loved HUNTR/X? Find your real K-pop girl group',
    tile: 'KD',
    meta: 'Six questions',
    line: 'The animated film, and the real K-pop girl group that fits your taste.',
  },
  {
    kind: 'quiz',
    site: 'anime',
    slug: 'studios-singers-and-strings-the-tower-on-screen',
    line: 'Stray Kids sang the songs of Tower of God season one.',
  },
  {
    kind: 'quiz',
    site: 'anime',
    slug: 'behind-the-gate-staff-songs-and-idol-guests',
    line: 'K-pop guests on the Solo Leveling openings.',
  },
];

export interface CrossoverFactEntry {
  readonly text: string;
  /** The exact `fact` of the published trivia row this sentence rests on. */
  readonly basedOn: string;
  readonly site: HubSite;
}

export const CROSSOVER_FACTS: readonly CrossoverFactEntry[] = [
  {
    text: 'Stray Kids sang the songs of Tower of God season one in Japanese, English and Korean, one version for each language dub.',
    basedOn: 'Stray Kids sang the season one songs in Japanese, English and Korean, one version for each language dub.',
    site: 'anime',
  },
  {
    text: 'Season 2 of Solo Leveling opens with Reawaker by LiSA, featuring Felix of Stray Kids.',
    basedOn: 'Season 2 opens with Reawaker by LiSA (feat. Felix of Stray Kids) and closes with Un-Apex by TK from Ling Tosite Sigure.',
    site: 'anime',
  },
  {
    text: 'Season 1 of Solo Leveling opens with Level by SawanoHiroyuki[nZk], with Tomorrow X Together.',
    basedOn: 'Season 1 opens with Level by SawanoHiroyuki[nZk]: Tomorrow X Together and closes with Request by Krage.',
    site: 'anime',
  },
];
