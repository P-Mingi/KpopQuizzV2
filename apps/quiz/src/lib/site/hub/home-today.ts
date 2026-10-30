// Run O1, lot H2c: the data of "Today": the quiz of the day of each bank, the blind test of the day (K-pop, audio only, the real preview
// of its first song), the debate of the day, and the next change of the picks (the daily cron, 00:05 UTC, on a Paris clock). A part with
// no data is left out; a Today with no quiz, no blind test and no debate is null and the block disappears.

import { getBlindtest, getDailyQuizzes, getDebate, getRotation } from './data';
import { plainTime } from './home-map';
import { safeBlock } from './home-safe';

import type { HubDailyQuiz } from './data';
import type { HomeToday, HomeTodayQuiz } from './home-types';

/** "10 questions · Easy" (the site's name is added by the page). The link enters the daily run, so the streak of the fan counts. */
export function toTodayQuiz(q: HubDailyQuiz): HomeTodayQuiz {
  return {
    site: q.site,
    id: q.id,
    title: q.title,
    questions: q.questionCount,
    meta: [q.questionCount > 0 ? `${q.questionCount} questions` : '', q.difficulty].filter(Boolean).join(' · '),
    path: `${q.path}?daily=quiz`,
  };
}

async function readToday(): Promise<HomeToday | null> {
  const [daily, blindtest, debate, rotation] = await Promise.all([getDailyQuizzes(), getBlindtest(), getDebate(), getRotation()]);
  const quizzes = [daily?.kpop, daily?.anime].filter((q): q is HubDailyQuiz => !!q).map(toTodayQuiz);
  if (quizzes.length === 0 && !blindtest && !debate) return null;
  return {
    quizzes,
    blindtest: blindtest
      ? { site: blindtest.site, path: blindtest.path, songs: blindtest.songCount, seconds: blindtest.clipSeconds, previewUrl: blindtest.previewUrl }
      : null,
    debate: debate ? { site: debate.site, title: debate.question, path: debate.path } : null,
    rotation: { nextAt: rotation.nextAt, parisTime: plainTime(rotation.parisTime) },
  };
}

export async function loadHomeToday(): Promise<HomeToday | null> {
  return safeBlock('today', readToday, null);
}
