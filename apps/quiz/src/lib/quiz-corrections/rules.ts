// Corrections to player quizzes (owner, 2026-10-27): "Quiz de joueurs : ne touche pas à leurs
// questions. Envoie une notification au créateur (creator_notifications) avec la question et la
// correction sourcée, délai de 14 jours, puis brouillon si rien n'a changé."
//
// The pure rules of the job (app/api/cron/quiz-corrections): no I/O, no server import, so the
// whole state machine is unit-tested (quiz-corrections.test.ts). A request lives in
// public.quiz_correction_requests (docs/pending-migrations/quiz-corrections-schema.sql) and keeps
// the question and the marked answer exactly as they were when the fact-check ran.
//
//   pending   -> notified   notice sent to the creator; deadline = now + 14 days
//   pending   -> resolved   the question already changed before the notice went out
//   pending   -> cancelled  the quiz is gone, removed or flagged, or has no creator
//   notified  -> resolved   the question changed (edited or deleted), before or after the deadline
//   notified  -> drafted    the deadline passed and the question is unchanged: the quiz moves to
//                           draft (only while it is still published) and a second notice says how
//                           to bring it back
//   notified  -> cancelled  the deadline passed but the quiz was removed or flagged meanwhile
//
// The creator's questions are never written: the only quiz write is status published -> draft.

import { CONTACT_EMAIL } from '@/lib/seo/org';

import type { NotificationType } from '@/lib/notification-types';

export const CORRECTION_DEADLINE_DAYS = 14;
export const CORRECTION_DEADLINE_MS = CORRECTION_DEADLINE_DAYS * 24 * 60 * 60 * 1000;
/** At most this many requests are read and handled by one run. */
export const CORRECTION_RUN_LIMIT = 50;

export const CORRECTION_STATUSES = ['pending', 'notified', 'resolved', 'drafted', 'cancelled'] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];
/** The statuses the job still works on. */
export const OPEN_STATUSES: readonly CorrectionStatus[] = ['pending', 'notified'];

export const CORRECTION_NOTICE_TYPE = 'quiz_correction' satisfies NotificationType;

/** One row of public.quiz_correction_requests (the columns the job reads). */
export interface CorrectionRequest {
  id: string;
  quiz_id: string;
  q_index: number;
  question: string;
  marked_answer: string;
  correction: string;
  source_url: string;
  status: CorrectionStatus;
  notified_at: string | null;
  deadline_at: string | null;
}

/** The quiz as the job reads it (service role). */
export interface CorrectionQuiz {
  id: string;
  title: string;
  slug: string;
  status: string;
  creator_id: string | null;
  questions: unknown;
  group_slug: string | null;
}

/** A creator_notifications insert. */
export interface CorrectionNotice {
  user_id: string;
  type: typeof CORRECTION_NOTICE_TYPE;
  title: string;
  body: string;
  quiz_id: string;
  link_url: string;
  sources: string[];
}

export type Decision =
  | { kind: 'notify' }
  | { kind: 'wait' }
  | { kind: 'resolve'; reason: 'changed' }
  | { kind: 'cancel'; reason: 'quiz_gone' | 'quiz_not_live' | 'no_creator' }
  | { kind: 'draft' };

/**
 * The answer a stored question marks as right, as text: "True" or "False" for a true or false
 * question (correct is a boolean), else the text of the option at the `correct` index (an
 * intruder option is an object: its label). Null when the question has no readable answer.
 * Same rule as the SQL guard of quiz-corrections-e1.sql and seo-explanations-e1.sql.
 */
export function markedAnswerOf(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as { correct?: unknown; options?: unknown };
  if (typeof q.correct === 'boolean') return q.correct ? 'True' : 'False';
  if (typeof q.correct !== 'number' || !Number.isInteger(q.correct) || !Array.isArray(q.options)) return null;
  const option: unknown = q.options[q.correct];
  if (typeof option === 'string') return option;
  if (option && typeof option === 'object' && typeof (option as { label?: unknown }).label === 'string') {
    return (option as { label: string }).label;
  }
  return null;
}

/** The question text and the marked answer at `index`, or null when there is no question there. */
export function questionAt(questions: unknown, index: number): { question: string; answer: string | null } | null {
  if (!Array.isArray(questions) || !Number.isInteger(index) || index < 0 || index >= questions.length) return null;
  const raw: unknown = questions[index];
  if (!raw || typeof raw !== 'object') return null;
  const text = (raw as { question?: unknown }).question;
  return { question: typeof text === 'string' ? text : '', answer: markedAnswerOf(raw) };
}

/** Text compared the way a reader sees it: Unicode NFKC, spaces collapsed, case folded. A change
 *  of spacing or capitals alone is not a fix. */
export function sameText(a: string, b: string): boolean {
  const norm = (s: string): string => s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(a) === norm(b);
}

/** True while the quiz still has, at the request's index, the question and the marked answer the
 *  fact-check saw. A deleted question, a reworded question or another marked answer = changed. */
export function stillMatches(req: Pick<CorrectionRequest, 'q_index' | 'question' | 'marked_answer'>, questions: unknown): boolean {
  const live = questionAt(questions, req.q_index);
  if (!live || live.answer === null) return false;
  return sameText(live.question, req.question) && sameText(live.answer, req.marked_answer);
}

/** When the request's 14 days end (ms), or null when it was never notified. */
export function deadlineOf(req: Pick<CorrectionRequest, 'notified_at' | 'deadline_at'>): number | null {
  const stored = req.deadline_at ? Date.parse(req.deadline_at) : NaN;
  if (Number.isFinite(stored)) return stored;
  const notified = req.notified_at ? Date.parse(req.notified_at) : NaN;
  return Number.isFinite(notified) ? notified + CORRECTION_DEADLINE_MS : null;
}

/** The deadline has passed from its exact instant on (never a millisecond before 14 days). */
export function deadlinePassed(req: Pick<CorrectionRequest, 'notified_at' | 'deadline_at'>, now: number): boolean {
  const end = deadlineOf(req);
  return end !== null && now >= end;
}

/** A quiz the job may still act on: public, or already moved to draft by a correction. */
function quizIsLive(status: string): boolean {
  return status === 'published' || status === 'draft';
}

/** What to do with one open request now. */
export function decide(req: CorrectionRequest, quiz: CorrectionQuiz | null, now: number): Decision {
  if (req.status !== 'pending' && req.status !== 'notified') return { kind: 'wait' };
  if (!quiz) return { kind: 'cancel', reason: 'quiz_gone' };
  if (!stillMatches(req, quiz.questions)) return { kind: 'resolve', reason: 'changed' };
  if (!quizIsLive(quiz.status)) return { kind: 'cancel', reason: 'quiz_not_live' };
  if (!quiz.creator_id) return { kind: 'cancel', reason: 'no_creator' };
  if (req.status === 'pending') return { kind: 'notify' };
  return deadlinePassed(req, now) ? { kind: 'draft' } : { kind: 'wait' };
}

/** "November 10, 2026" (UTC). */
export function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
}

/** The owner editor of the quiz (app/(site)/quiz/[id]/edit): creator or admin only. */
export function editHref(quizId: string): string {
  return `/quiz/${encodeURIComponent(quizId)}/edit`;
}

/** The first notice: the question, the sourced correction and the deadline. */
export function firstNotice(req: CorrectionRequest, quiz: CorrectionQuiz & { creator_id: string }, deadline: number): CorrectionNotice {
  const n = req.q_index + 1;
  return {
    user_id: quiz.creator_id,
    type: CORRECTION_NOTICE_TYPE,
    title: `Please check question ${n} of "${quiz.title}"`,
    body:
      `Question ${n} asks "${req.question}" and marks "${req.marked_answer}" as the answer. ${req.correction} ` +
      `Please edit this question by ${formatDay(deadline)}. If it is unchanged by then, the quiz moves to draft until it is fixed. ` +
      `Source: ${req.source_url}`,
    quiz_id: quiz.id,
    link_url: editHref(quiz.id),
    sources: [req.source_url],
  };
}

/** The second notice, once the quiz is a draft: what is still wrong and how to bring it back. A
 *  creator cannot publish a draft from the owner editor (it has no status control), so the way
 *  back goes through the team mailbox. */
export function draftNotice(req: CorrectionRequest, quiz: CorrectionQuiz & { creator_id: string }): CorrectionNotice {
  const n = req.q_index + 1;
  return {
    user_id: quiz.creator_id,
    type: CORRECTION_NOTICE_TYPE,
    title: `"${quiz.title}" is now a draft (question ${n})`,
    body:
      `Question ${n} still asks "${req.question}" with "${req.marked_answer}" as the answer, so the quiz was moved to draft. ` +
      `${req.correction} To put it back online, edit this question, then email ${CONTACT_EMAIL} to have it published again. ` +
      `Source: ${req.source_url}`,
    quiz_id: quiz.id,
    link_url: editHref(quiz.id),
    sources: [req.source_url],
  };
}
