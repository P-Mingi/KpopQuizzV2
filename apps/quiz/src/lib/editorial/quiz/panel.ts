import { utcDayBounds } from '../rules';
import { MAX_QUIZ_PER_DAY, MAX_QUIZ_PER_GROUP_PER_DAY } from './rules';

import type { QuizStore } from './pipeline';
import type { QuizDayStats, QuizDraft, ReviewBatch } from './types';

// Run O1, lot E1b: what the quiz panel of /admin/editorial reads (server side), in one place so the page stays small.

export interface QuizPanel {
  drafts: QuizDraft[];
  batches: ReviewBatch[];
  stats: QuizDayStats;
}

export async function readQuizPanel(store: QuizStore, now: number): Promise<QuizPanel> {
  const day = utcDayBounds(now);
  const [drafts, batches, today] = await Promise.all([
    store.listQuizDrafts(300),
    store.listReviewBatches(30),
    store.publishedQuizzesBetween(day.start, day.end),
  ]);
  return { drafts, batches, stats: { publishedToday: today.length, cap: MAX_QUIZ_PER_DAY, perGroupCap: MAX_QUIZ_PER_GROUP_PER_DAY } };
}
