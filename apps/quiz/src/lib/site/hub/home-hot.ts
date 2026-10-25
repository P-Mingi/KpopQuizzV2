// Run O1, lot H2a: the data of "Hot right now" (the quizzes ranked by the algorithm of the Plan, section 3 A). The body returns the
// design's sample list; lot H2b replaces it with the hourly cached ranking of both sites and keeps the shape (HomeHot).

import type { HomeHot, HomeQuiz, HomeSite } from './home-types';

const q = (site: HomeSite, tile: string, group: string, title: string, meta: string, plays: string, path: string): HomeQuiz => {
  const [level, format] = meta.split(' · ');
  return { site, tile, group, title, level: level!, ...(format ? { format } : {}), plays, isNew: plays === '', path };
};

const KPOP: readonly HomeQuiz[] = [
  q('kpop', 'BTS', 'BTS', 'Ultimate BTS era quiz - only real ARMYs survive', 'Medium', '2.7k plays', '/q/ultimate-bts-era-quiz'),
  q('kpop', 'SK', 'Stray Kids', 'SKZ true or false - only real STAYs pass', 'Easy · True or false', '2.1k plays', '/q/skz-true-or-false'),
  q('kpop', 'BP', 'BLACKPINK', 'BLACKPINK ultimate fan challenge', 'Medium', '1.7k plays', '/q/blackpink-ultimate-fan-challenge'),
  q('kpop', 'K', 'K-pop', 'K-pop company quiz - match the group to the label', 'Easy', '1.7k plays', '/q/kpop-company-quiz'),
  q('kpop', 'K', 'K-pop', 'Which K-pop group debuted first? Timeline challenge', 'Medium', '1.3k plays', '/q/which-kpop-group-debuted-first'),
  q('kpop', 'IL', 'ILLIT', 'are u a real GLLIT?!!', 'Easy · Find the intruder', '1.1k plays', '/q/are-u-a-real-gllit'),
];

const ANIME: readonly HomeQuiz[] = [
  q('anime', 'DN', 'Death Note', 'Name and Face: Death Note True or False', 'Medium · True or false', '', '/q/name-and-face-death-note-true-or-false'),
  q('anime', 'OP', 'One Piece', 'Raising the Flag: One Piece Basics', 'Easy', '', '/q/raising-the-flag-one-piece-basics'),
  q('anime', 'CM', 'Chainsaw Man', 'One Opening, Many Endings: Chainsaw Man Theme Songs', 'Medium', '', '/q/one-opening-many-endings-chainsaw-man-theme-songs'),
  q('anime', 'Fr', 'Frieren', "Journey's Beginning: Frieren Basics", 'Easy', '', '/q/journeys-beginning-frieren-basics'),
  q('anime', 'SF', 'Spy x Family', 'Cover Story or Truth: Spy x Family True or False', 'Medium · True or false', '', '/q/cover-story-or-truth-spy-x-family-true-or-false'),
  q('anime', 'Ha', 'Haikyu!!', 'Four Seasons and a Finale: The Haikyu!! Timeline', 'Hard', '', '/q/four-seasons-and-a-finale-the-haikyu-timeline'),
];

/** The Hot now data. H2a: the design's sample. H2b: the real ranking, cached an hour. */
export async function loadHomeHot(): Promise<HomeHot> {
  return { kpop: KPOP, anime: ANIME, allPaths: { kpop: '/quizzes', anime: '/quizzes' } };
}
