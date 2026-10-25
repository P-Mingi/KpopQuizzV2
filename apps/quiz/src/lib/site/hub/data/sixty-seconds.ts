// Run O1, lot H2b: 60 seconds, the question playable on the home (Plan.dc.html, section 3.C).
//
// One easy or medium question from a quiz of the Top (the Hot right now picks of the site of the day), K-pop one day and anime the
// next (UTC day number, even days K-pop). Never a question of a quiz of the day, never a question marked spoiler (spoiler.arc above 0,
// or a quiz whose spoiler level is above 0). The answer, the anecdote (the question's fun_fact) and the link to the full quiz come with
// it, so the page needs no second request. The question gives no XP: awardsXp is false and nothing here reaches an XP function.
// Only multiple choice questions of four options are used (the shape of the card); a question with an anecdote is preferred.
// The pick is a hash of the date: stable for the whole day, different the next day.

import { createPublicReadClient } from '@/lib/supabase/server';

import { hubCached } from './cache';
import { getHot, qotdIdsOf } from './hot';
import { chunk, dayNumber, must, resolveOrigins, siteName, stableHash, utcDate } from './util';

import type { HubHot, HubOpts, HubOrigins, HubSite, HubSixtySeconds } from './types';

type Db = ReturnType<typeof createPublicReadClient>;

interface QuestionJson {
  readonly question?: unknown;
  readonly options?: unknown;
  readonly correct?: unknown;
  readonly fun_fact?: unknown;
  readonly spoiler?: { readonly arc?: unknown } | null;
}

export interface SixtyQuizRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly site_id: string;
  readonly quiz_type: string;
  readonly difficulty: string;
  readonly spoiler_arc_ord: number | null;
  readonly questions: unknown;
}

export interface SixtyCandidate {
  readonly quizId: string;
  readonly quizTitle: string;
  readonly quizSlug: string;
  readonly index: number;
  readonly question: string;
  readonly options: readonly string[];
  readonly correct: number;
  readonly explanation: string | null;
}

/** A question with four distinct options, a valid answer and no spoiler mark, or null. */
export function toCandidate(quiz: SixtyQuizRow, q: QuestionJson, index: number): SixtyCandidate | null {
  if (typeof q.question !== 'string' || q.question.trim() === '') return null;
  if (!Array.isArray(q.options) || q.options.length !== 4) return null;
  const options = q.options.map((o) => (typeof o === 'string' ? o.trim() : ''));
  if (options.some((o) => o === '') || new Set(options).size !== 4) return null;
  if (!Number.isInteger(q.correct) || (q.correct as number) < 0 || (q.correct as number) > 3) return null;
  const arc = q.spoiler && typeof q.spoiler === 'object' ? Number(q.spoiler.arc) : 0;
  if (Number.isFinite(arc) && arc > 0) return null;
  const fact = typeof q.fun_fact === 'string' ? q.fun_fact.trim() : '';
  return {
    quizId: quiz.id,
    quizTitle: quiz.title,
    quizSlug: quiz.slug,
    index,
    question: q.question.trim(),
    options,
    correct: q.correct as number,
    explanation: fact.length >= 10 ? fact : null,
  };
}

/** The questions a quiz may give: easy or medium multiple choice, spoiler free, not a quiz of the day. */
export function candidatesOf(quizzes: readonly SixtyQuizRow[], excludeIds: ReadonlySet<string>): SixtyCandidate[] {
  const out: SixtyCandidate[] = [];
  for (const quiz of quizzes) {
    if (excludeIds.has(quiz.id)) continue;
    if (quiz.quiz_type !== 'multiple_choice' || (quiz.difficulty !== 'easy' && quiz.difficulty !== 'medium')) continue;
    if ((quiz.spoiler_arc_ord ?? 0) > 0) continue;
    const questions = Array.isArray(quiz.questions) ? (quiz.questions as QuestionJson[]) : [];
    questions.forEach((q, i) => {
      const c = q && typeof q === 'object' ? toCandidate(quiz, q, i) : null;
      if (c) out.push(c);
    });
  }
  return out.sort((a, b) => (a.quizId === b.quizId ? a.index - b.index : a.quizId < b.quizId ? -1 : 1));
}

/** The site of a day: even UTC days K-pop, odd days anime. */
export function siteOfDay(now: Date): HubSite {
  return dayNumber(now) % 2 === 0 ? 'kpop' : 'anime';
}

/** The question of the day among the candidates: those with an anecdote first, then a hash of the date. */
export function pickQuestion(candidates: readonly SixtyCandidate[], site: HubSite, now: Date): SixtyCandidate | null {
  const withFact = candidates.filter((c) => c.explanation !== null);
  const pool = withFact.length > 0 ? withFact : candidates;
  if (pool.length === 0) return null;
  return pool[stableHash(`${utcDate(now)}:${site}`) % pool.length] ?? null;
}

export interface SixtyDeps {
  readonly db: Db;
  readonly hot: () => Promise<HubHot | null>;
  readonly qotdIds: () => Promise<ReadonlySet<string>>;
}

export async function readSixtySeconds(origins: HubOrigins, now: Date, deps: SixtyDeps): Promise<HubSixtySeconds | null> {
  const hot = await deps.hot();
  if (!hot) return null;
  const excluded = await deps.qotdIds();
  const first = siteOfDay(now);
  const order: HubSite[] = first === 'kpop' ? ['kpop', 'anime'] : ['anime', 'kpop'];
  for (const site of order) {
    const ids = hot[site].map((c) => c.id);
    if (ids.length === 0) continue;
    const rows: SixtyQuizRow[] = [];
    for (const part of chunk(ids, 20)) {
      rows.push(...must<SixtyQuizRow[]>(
        await deps.db.from('quizzes').select('id, slug, title, site_id, quiz_type, difficulty, spoiler_arc_ord, questions').in('id', part).in('site_id', [site]).eq('status', 'published'),
        'quizzes for the 60 seconds question',
      ));
    }
    const picked = pickQuestion(candidatesOf(rows, excluded), site, now);
    if (!picked) continue;
    return {
      site,
      siteName: siteName(site),
      quizTitle: picked.quizTitle,
      quizHref: `${origins[site]}/q/${picked.quizSlug}`,
      question: picked.question,
      options: picked.options,
      correct: picked.correct,
      explanation: picked.explanation,
      awardsXp: false,
    };
  }
  return null;
}

const cached = hubCached('sixty-seconds', (origins: HubOrigins) =>
  readSixtySeconds(origins, new Date(), {
    db: createPublicReadClient(),
    hot: () => getHot({ origins }),
    qotdIds: () => qotdIdsOf(origins),
  }));

/** The 60 second question, cached one hour (tag hub:sixty-seconds). */
export async function getSixtySeconds(opts?: HubOpts): Promise<HubSixtySeconds | null> {
  return cached(resolveOrigins(opts));
}
