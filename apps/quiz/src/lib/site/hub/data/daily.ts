// Run O1, lot H2b: Today, the quiz of the day of each bank. The same read as each site's own home (getQuizOfTheDay(site): the quiz
// the cron published for the UTC date, else the rotation fallback), so the hub never shows another quiz than the site does.
// Plan, section 3.C: "celui de la banque de chaque site pour la date du jour".

import { getQuizOfTheDay } from '@/lib/db/queries/quizzes';

import { hubCached } from './cache';
import { difficultyLabel, HUB_SITES, resolveOrigins, siteName } from './util';

import type { QuizCardData } from '@/lib/db/types';
import type { HubDailyQuiz, HubDailyQuizzes, HubOpts, HubOrigins, HubSite } from './types';

export type DailyQuizReader = (site: HubSite) => Promise<QuizCardData | null>;

export function toDailyQuiz(site: HubSite, q: QuizCardData, origins: HubOrigins): HubDailyQuiz {
  const path = `/q/${q.slug}`;
  const questions = q.question_count ?? 0;
  const difficulty = difficultyLabel(q.difficulty);
  return {
    id: q.id,
    site,
    siteName: siteName(site),
    title: q.title,
    path,
    href: `${origins[site]}${path}`,
    group: q.group_name,
    questionCount: questions,
    difficulty,
    meta: [siteName(site), questions > 0 ? `${questions} questions` : '', difficulty].filter(Boolean).join(' · '),
  };
}

/** Both quizzes of the day. A bank with no quiz gives null for its site; both null gives null (the block disappears). */
export async function readDailyQuizzes(origins: HubOrigins, qotd: DailyQuizReader = getQuizOfTheDay): Promise<HubDailyQuizzes | null> {
  const [kpop, anime] = await Promise.all(HUB_SITES.map((s) => qotd(s)));
  const out: HubDailyQuizzes = {
    kpop: kpop ? toDailyQuiz('kpop', kpop, origins) : null,
    anime: anime ? toDailyQuiz('anime', anime, origins) : null,
  };
  return out.kpop || out.anime ? out : null;
}

const cached = hubCached('daily-quizzes', (origins: HubOrigins) => readDailyQuizzes(origins));

/** The quizzes of the day of both banks, cached one hour (tag hub:daily-quizzes). */
export async function getDailyQuizzes(opts?: HubOpts): Promise<HubDailyQuizzes | null> {
  return cached(resolveOrigins(opts));
}
