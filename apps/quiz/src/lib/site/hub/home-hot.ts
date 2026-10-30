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

/** A quiz of the list with the photo of its group or series (null when its site shows none, or when the quiz has its own cover). */
function withPhoto(card: HubQuizCard): HomeQuiz {
  const q = toHomeQuiz(card);
  return { ...q, photo: q.cover ? null : groupPhotoOf(card.site, card.groupSlug) };
}

async function readHot(): Promise<HomeHot | null> {
  const hot = await getHot();
  if (!hot || hot.all.length === 0) return null;
  // The owner's pictures of the series, read as the OtakuQuiz layout reads them (cached, an empty map on any failure), so an anime quiz
  // shows the picture OtakuQuiz shows for its series.
  await primeOwnerSeriesPictures();
  return {
    all: hot.all.map(withPhoto),
    kpop: hot.kpop.map(withPhoto),
    anime: hot.anime.map(withPhoto),
    // Start easy (home v3); a ranking cached before it existed has none, and the chip is then left out.
    easy: (hot.easy ?? []).map(withPhoto),
    // The way to every quiz of a site: its quiz list (the same route on both sites).
    allPaths: { kpop: '/quizzes', anime: '/quizzes' },
  };
}

export async function loadHomeHot(): Promise<HomeHot | null> {
  return safeBlock('hot', readHot, null);
}
