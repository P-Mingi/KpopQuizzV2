// Run O1, lot H2c: the data of "Hot right now": the six quizzes of each filter, ranked by the algorithm of the Plan (section 3 A), hourly
// cached by getHot. The links are the canonical pages of the quizzes on their own sites. Null when there is no ranking (the block
// disappears).
// Owner decision 2026-10-30: each quiz also carries the photo of its group or series as its own site shows it (home-photo.ts), which a
// row shows when the quiz has no cover of its own.

import { primeOwnerSeriesPictures } from '@/lib/anime/entity-images-read';

import { getHot } from './data';
import { toHomeQuiz } from './home-map';
import { groupPhotoOf } from './home-photo';
import { safeBlock } from './home-safe';

import type { HubQuizCard } from './data';
import type { HomeHot, HomeQuiz } from './home-types';

/**
 * A quiz of the list with the photo of its group or series (null when its site shows none). Lot HUB-HOT-B: the photo is given next to the quiz's
 * own cover whenever the site has one (the banner of the first place shows the group or series picture first, then the cover).
 */
function withPhoto(card: HubQuizCard & { readonly weekPlays?: number }): HomeQuiz {
  return { ...toHomeQuiz(card), photo: groupPhotoOf(card.site, card.groupSlug) };
}

/** How many quizzes each panel of Popular this week shows. */
export const TOP_SIZE = 3;

/**
 * Lot HUB-HOT-B: the top three of one site by plays of the week, from its ranked picks. A quiz with no play this week (0) is out, so the
 * list never shows a number it does not have; the others go by plays of the week, most first, the rank of the picks breaking a tie; a quiz
 * whose week count is unknown (a ranking cached before the count existed) keeps its place after the counted ones.
 */
export function topThree(list: readonly HomeQuiz[]): HomeQuiz[] {
  const live = list.map((q, i) => ({ q, i })).filter((e) => e.q.weekPlays !== 0);
  live.sort((a, b) => (b.q.weekPlays ?? -1) - (a.q.weekPlays ?? -1) || a.i - b.i);
  return live.slice(0, TOP_SIZE).map((e) => e.q);
}

async function readHot(): Promise<HomeHot | null> {
  const hot = await getHot();
  if (!hot || hot.all.length === 0) return null;
  // The owner's pictures of the series, read as the OtakuQuiz layout reads them (cached, an empty map on any failure), so an anime quiz
  // shows the picture OtakuQuiz shows for its series.
  await primeOwnerSeriesPictures();
  const kpop = hot.kpop.map(withPhoto);
  const anime = hot.anime.map(withPhoto);
  return {
    all: hot.all.map(withPhoto),
    kpop,
    anime,
    top: { kpop: topThree(kpop), anime: topThree(anime) },
    // Start easy (home v3); a ranking cached before it existed has none, and the chip is then left out.
    easy: (hot.easy ?? []).map(withPhoto),
    // The way to every quiz of a site: its quiz list (the same route on both sites).
    allPaths: { kpop: '/quizzes', anime: '/quizzes' },
  };
}

export async function loadHomeHot(): Promise<HomeHot | null> {
  return safeBlock('hot', readHot, null);
}
