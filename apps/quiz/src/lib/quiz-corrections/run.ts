// One run of the quiz corrections job: read the open requests (at most 50), decide each one with
// the pure rules (rules.ts) and apply the decision through the store. No server import: the
// store is injected (store.ts in production, an in-memory fake in the tests).
//
// Idempotent. Every status write is conditional on the status it leaves (a second run, or two
// runs at once, cannot move a request twice); the quiz write is conditional on status
// 'published'; a notice that already exists (same creator, quiz, type and title: the mig-122
// dedup index) counts as sent, so a run that stopped between the notice and the status write
// finishes the step next time without a second notice. A failure on one request is logged and
// counted, never thrown: the other requests still run.

import {
  CORRECTION_DEADLINE_MS, CORRECTION_RUN_LIMIT, decide, draftNotice, firstNotice,
} from './rules';

import type { CorrectionNotice, CorrectionQuiz, CorrectionRequest, CorrectionStatus, Decision } from './rules';

/** 'inserted': a new row. 'duplicate': the same notice already exists. 'suppressed': the
 *  preference gate trigger dropped the insert (impossible once the schema SQL exempts the type). */
export type NoticeResult = 'inserted' | 'duplicate' | 'suppressed';

export interface CorrectionStore {
  /** Up to `limit` open requests: pending first (oldest first), then notified (earliest deadline
   *  first). null when public.quiz_correction_requests does not exist (SQL not applied yet). */
  openRequests(limit: number): Promise<CorrectionRequest[] | null>;
  /** The quizzes with these ids; an id with no quiz is absent from the map. */
  quizzes(ids: readonly string[]): Promise<Map<string, CorrectionQuiz>>;
  insertNotice(notice: CorrectionNotice): Promise<NoticeResult>;
  /** pending -> notified, only while still pending. True when the row changed. */
  markNotified(id: string, notifiedAt: string, deadlineAt: string): Promise<boolean>;
  /** pending or notified -> resolved or cancelled. True when the row changed. */
  close(id: string, status: 'resolved' | 'cancelled', at: string): Promise<boolean>;
  /** quizzes.status published -> draft, only while still published. True when it changed. */
  draftQuiz(quizId: string): Promise<boolean>;
  /** notified -> drafted, only while still notified. True when the row changed. */
  markDrafted(id: string, at: string): Promise<boolean>;
  /** The quiz left the public site: refresh its pages and lists. Never throws. */
  quizUnpublished(quiz: CorrectionQuiz): void;
}

export type OutcomeAction = Decision['kind'] | 'skipped' | 'error';

export interface RunOutcome {
  id: string;
  quiz_id: string;
  q_index: number;
  from: CorrectionStatus;
  action: OutcomeAction;
  detail?: string;
}

export interface RunReport {
  /** false: the requests table does not exist yet, nothing was read or written. */
  live: boolean;
  read: number;
  notified: number;
  resolved: number;
  drafted: number;
  cancelled: number;
  waiting: number;
  skipped: number;
  errors: number;
  outcomes: RunOutcome[];
}

export interface RunOptions {
  now: number;
  limit?: number;
  log?: (line: string) => void;
}

function emptyReport(live: boolean): RunReport {
  return { live, read: 0, notified: 0, resolved: 0, drafted: 0, cancelled: 0, waiting: 0, skipped: 0, errors: 0, outcomes: [] };
}

function count(report: RunReport, action: OutcomeAction): void {
  switch (action) {
    case 'notify': report.notified++; break;
    case 'resolve': report.resolved++; break;
    case 'draft': report.drafted++; break;
    case 'cancel': report.cancelled++; break;
    case 'wait': report.waiting++; break;
    case 'skipped': report.skipped++; break;
    case 'error': report.errors++; break;
  }
}

/** Apply one decision. Returns the outcome action and an optional detail. Throws on a store error
 *  (the caller turns it into an 'error' outcome). */
async function apply(
  store: CorrectionStore,
  req: CorrectionRequest,
  quiz: CorrectionQuiz | null,
  decision: Decision,
  now: number,
  quizzes: Map<string, CorrectionQuiz>,
): Promise<{ action: OutcomeAction; detail?: string }> {
  const at = new Date(now).toISOString();
  switch (decision.kind) {
    case 'wait':
      return { action: 'wait' };
    case 'resolve':
    case 'cancel': {
      const status = decision.kind === 'resolve' ? 'resolved' : 'cancelled';
      const changed = await store.close(req.id, status, at);
      return changed ? { action: decision.kind, detail: decision.reason } : { action: 'skipped', detail: 'status changed meanwhile' };
    }
    case 'notify': {
      if (!quiz?.creator_id) return { action: 'skipped', detail: 'no creator' };
      const deadline = now + CORRECTION_DEADLINE_MS;
      const sent = await store.insertNotice(firstNotice(req, { ...quiz, creator_id: quiz.creator_id }, deadline));
      // The clock starts only once the creator can see the notice.
      if (sent === 'suppressed') return { action: 'skipped', detail: 'notice dropped by the preference trigger, left pending' };
      const changed = await store.markNotified(req.id, at, new Date(deadline).toISOString());
      return changed ? { action: 'notify', detail: sent } : { action: 'skipped', detail: 'status changed meanwhile' };
    }
    case 'draft': {
      if (!quiz?.creator_id) return { action: 'skipped', detail: 'no creator' };
      if (quiz.status === 'published') {
        const drafted = await store.draftQuiz(quiz.id);
        if (!drafted) return { action: 'skipped', detail: 'quiz status changed meanwhile' };
        const asDraft: CorrectionQuiz = { ...quiz, status: 'draft' };
        quizzes.set(quiz.id, asDraft); // a second request on the same quiz sees the draft
        store.quizUnpublished(asDraft);
      }
      const sent = await store.insertNotice(draftNotice(req, { ...quiz, creator_id: quiz.creator_id }));
      const changed = await store.markDrafted(req.id, at);
      if (!changed) return { action: 'skipped', detail: 'status changed meanwhile' };
      return { action: 'draft', detail: sent === 'suppressed' ? 'quiz drafted, second notice dropped by the preference trigger' : sent };
    }
  }
}

export async function runQuizCorrections(store: CorrectionStore, opts: RunOptions): Promise<RunReport> {
  const limit = Math.max(1, Math.min(opts.limit ?? CORRECTION_RUN_LIMIT, CORRECTION_RUN_LIMIT));
  const log = opts.log ?? ((line: string) => console.error(line));

  const open = await store.openRequests(limit);
  if (open === null) return emptyReport(false);

  const report = emptyReport(true);
  const batch = open.slice(0, limit);
  report.read = batch.length;
  if (batch.length === 0) return report;

  const quizzes = await store.quizzes([...new Set(batch.map((r) => r.quiz_id))]);

  for (const req of batch) {
    let outcome: { action: OutcomeAction; detail?: string };
    try {
      const quiz = quizzes.get(req.quiz_id) ?? null;
      outcome = await apply(store, req, quiz, decide(req, quiz, opts.now), opts.now, quizzes);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`[quiz-corrections] request ${req.id} (quiz ${req.quiz_id}, question ${req.q_index}) failed: ${message}`);
      outcome = { action: 'error', detail: message };
    }
    count(report, outcome.action);
    report.outcomes.push({
      id: req.id, quiz_id: req.quiz_id, q_index: req.q_index, from: req.status, action: outcome.action,
      ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
    });
  }
  return report;
}
