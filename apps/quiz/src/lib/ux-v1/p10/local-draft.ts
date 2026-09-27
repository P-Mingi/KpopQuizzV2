// P10: the create-funnel draft kept on THIS device, as the passport Quizzes tab's
// draft row (prototype #pp-quizzes: pen thumb, "Stray Kids b-sides deep cut",
// "Draft · 4 of 10 questions · edited 2 days ago", Continue).
//
// Same store and same rule as A0's avatar menu count (lib/ux-v1/a0/my-quizzes.ts):
// the funnel's own read (lib/create-draft.ts loadDraft: localStorage, 7-day expiry,
// old formats migrated) and A0's isStartedDraft (a blank autosave or a ?group=
// preset is not a draft). No server read and no server write: quizzes are never
// saved as server drafts (/api/quiz/create publishes only).

import { completeCount, loadDraft } from '@/lib/create-draft';
import { isStartedDraft } from '@/lib/ux-v1/a0/my-quizzes';

import { timeAgo } from './passport-model';

import type { Draft } from '@/lib/create-draft';

/** Where Continue goes: the funnel restores the draft (and its step) from this device. */
export const DRAFT_CONTINUE_HREF = '/create';
export const UNTITLED_DRAFT = 'Untitled quiz';

export interface DraftRowView {
  title: string;
  /** "Draft · 4 of 10 questions · edited 2 days ago" */
  line: string;
}

/** The row for a started draft, else null. Pure: `now` is passed in. */
export function draftRowView(d: Draft | null, now: number): DraftRowView | null {
  if (!d || !isStartedDraft(d)) return null;
  const questions = Array.isArray(d.questions) ? d.questions : [];
  const total = questions.length;
  const done = completeCount(questions, d.quiz_type ?? 'multiple_choice');
  const edited = timeAgo(new Date(d.updatedAt).toISOString(), now);
  return {
    title: d.title.trim() || UNTITLED_DRAFT,
    line: ['Draft', `${done} of ${total} ${total === 1 ? 'question' : 'questions'}`, edited ? `edited ${edited}` : ''].filter(Boolean).join(' · '),
  };
}

/** Browser only (null on the server): this device's draft row, read like the funnel reads it. */
export function readLocalDraftRow(now: number = Date.now()): DraftRowView | null {
  try {
    return draftRowView(loadDraft(), now);
  } catch {
    return null;
  }
}
