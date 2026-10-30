// Run O1, lot H2c: the data of "Hot right now": the six quizzes of each filter, ranked by the algorithm of the Plan (section 3 A), hourly
// cached by getHot. The links are the canonical pages of the quizzes on their own sites. Null when there is no ranking (the block
// disappears).

import { getHot } from './data';
import { toHomeQuiz } from './home-map';
import { safeBlock } from './home-safe';

import type { HomeHot } from './home-types';

async function readHot(): Promise<HomeHot | null> {
  const hot = await getHot();
  if (!hot || hot.all.length === 0) return null;
  return {
    all: hot.all.map(toHomeQuiz),
    kpop: hot.kpop.map(toHomeQuiz),
    anime: hot.anime.map(toHomeQuiz),
    // Start easy (home v3); a ranking cached before it existed has none, and the chip is then left out.
    easy: (hot.easy ?? []).map(toHomeQuiz),
    // The way to every quiz of a site: its quiz list (the same route on both sites).
    allPaths: { kpop: '/quizzes', anime: '/quizzes' },
  };
}

export async function loadHomeHot(): Promise<HomeHot | null> {
  return safeBlock('hot', readHot, null);
}
