export interface QuizBankEntry {
  id: string;
  title: string;
  description: string | null;
  group_id: number | null;
  quiz_type: string;
  difficulty: string;
  category: string;
  questions: Record<string, unknown>[];
  scheduled_date: string | null;
  status: string;
  verified_at: string | null;
  verification_notes: string | null;
  published_quiz_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleViolation {
  date: string;
  quiz_id: string;
  quiz_title: string;
  rule: 'same_group_consecutive' | 'same_category_consecutive' | 'group_weekly_limit';
  message: string;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const dayOfWeek = d.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + mondayOffset);
  return monday.toISOString().split('T')[0]!;
}

export function validateSchedule(quizzes: QuizBankEntry[]): ScheduleViolation[] {
  const violations: ScheduleViolation[] = [];

  const scheduled = quizzes
    .filter((q) => q.scheduled_date)
    .sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!));

  for (let i = 1; i < scheduled.length; i++) {
    const prev = scheduled[i - 1]!;
    const curr = scheduled[i]!;

    if (prev.group_id && curr.group_id && prev.group_id === curr.group_id) {
      violations.push({
        date: curr.scheduled_date!,
        quiz_id: curr.id,
        quiz_title: curr.title,
        rule: 'same_group_consecutive',
        message: `Same group as previous day (${prev.title})`,
      });
    }

    if (prev.category === curr.category) {
      violations.push({
        date: curr.scheduled_date!,
        quiz_id: curr.id,
        quiz_title: curr.title,
        rule: 'same_category_consecutive',
        message: `Same category as previous day: ${curr.category}`,
      });
    }
  }

  // No more than 3 of the same group in a calendar week
  const weekGroups: Record<string, Record<number, number>> = {};
  for (const q of scheduled) {
    if (!q.group_id || !q.scheduled_date) continue;
    const week = getWeekKey(q.scheduled_date);
    if (!weekGroups[week]) weekGroups[week] = {};
    weekGroups[week][q.group_id] = (weekGroups[week][q.group_id] ?? 0) + 1;
    if (weekGroups[week][q.group_id]! > 3) {
      violations.push({
        date: q.scheduled_date,
        quiz_id: q.id,
        quiz_title: q.title,
        rule: 'group_weekly_limit',
        message: `More than 3 quizzes for this group in the same week`,
      });
    }
  }

  return violations;
}

/**
 * Assigns dates to unscheduled quizzes starting from startDate,
 * avoiding same-group and same-category on consecutive days.
 *
 * Returns a Map of quiz_id -> ISO date string.
 *
 * QOTD rotation fix (v11 P1): the legacy walk below compares a candidate with the
 * CLOSEST scheduled entry at any distance and may jump up to 365 days per quiz, so
 * the last quizzes of a bank end up years ahead with empty days in between (the
 * 2026-04-01 run left 16 rows between 2026-12-15 and 2030-01-28 and nothing after
 * 2026-06-30). With QOTD_ROTATION_FIX on, the compact scheduler is used instead:
 * consecutive days, no gap. Off (the default), this function is unchanged.
 */
export function autoSchedule(
  unscheduled: QuizBankEntry[],
  existingSchedule: QuizBankEntry[],
  startDate: string,
  opts: { compact?: boolean; random?: () => number } = {},
): Map<string, string> {
  if (opts.compact ?? qotdRotationFixEnabled()) {
    return autoScheduleCompact(unscheduled, existingSchedule, startDate, opts.random);
  }
  const assignments = new Map<string, string>();

  // Build set of already-occupied dates
  const occupiedDates = new Set<string>(
    existingSchedule
      .filter((q) => q.scheduled_date)
      .map((q) => q.scheduled_date!),
  );

  // Build ordered list of existing scheduled items for consecutive checks
  const sortedExisting = existingSchedule
    .filter((q) => q.scheduled_date)
    .sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!));

  // Returns the closest preceding quiz from either the existing schedule or new assignments
  function getClosestPreceding(dateStr: string): QuizBankEntry | null {
    let closestDate = '';
    let closestEntry: QuizBankEntry | null = null;

    for (const e of sortedExisting) {
      if (e.scheduled_date! < dateStr && e.scheduled_date! > closestDate) {
        closestDate = e.scheduled_date!;
        closestEntry = e;
      }
    }

    for (const [id, d] of assignments) {
      if (d < dateStr && d > closestDate) {
        closestDate = d;
        closestEntry = unscheduled.find((q) => q.id === id) ?? null;
      }
    }

    return closestEntry;
  }

  // Returns the quiz already scheduled for the day immediately after dateStr
  function getImmediateFollowing(dateStr: string): QuizBankEntry | null {
    const next = new Date(dateStr + 'T00:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    const nextStr = next.toISOString().split('T')[0]!;

    for (const e of sortedExisting) {
      if (e.scheduled_date === nextStr) return e;
    }
    for (const [id, d] of assignments) {
      if (d === nextStr) return unscheduled.find((q) => q.id === id) ?? null;
    }
    return null;
  }

  // Shuffle to avoid alphabetical bias
  const shuffled = [...unscheduled].sort(() => Math.random() - 0.5);

  // cursorDate is the earliest date to try for the next quiz.
  // It advances only when a quiz is successfully placed, so failed
  // attempts for one quiz never push the start point for the next one.
  let cursorDate = startDate;

  for (const quiz of shuffled) {
    const candidate = new Date(cursorDate + 'T00:00:00Z');

    for (let attempts = 0; attempts < 365; attempts++) {
      const dateStr = candidate.toISOString().split('T')[0]!;

      if (!occupiedDates.has(dateStr)) {
        const prevEntry = getClosestPreceding(dateStr);
        const nextEntry = getImmediateFollowing(dateStr);
        const sameGroup = quiz.group_id && prevEntry?.group_id === quiz.group_id;
        const sameCategory = prevEntry?.category === quiz.category;
        const sameGroupNext = quiz.group_id && nextEntry?.group_id === quiz.group_id;
        const sameCategoryNext = nextEntry?.category === quiz.category;

        if (!sameGroup && !sameCategory && !sameGroupNext && !sameCategoryNext) {
          assignments.set(quiz.id, dateStr);
          occupiedDates.add(dateStr);
          candidate.setUTCDate(candidate.getUTCDate() + 1);
          cursorDate = candidate.toISOString().split('T')[0]!;
          break;
        }
      }

      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
  }

  return assignments;
}

// ---------------------------------------------------------------------------
// QOTD rotation fix (UX v11, P1). Why the rotation stopped on 2026-06-30:
//  1. The daily publish (cron /api/cron/ensure-daily-quiz -> ensure_daily_quiz)
//     only publishes a quiz_bank row whose scheduled_date is EXACTLY today.
//  2. The bank (100 rows) was auto-scheduled once on 2026-04-01/02 by the legacy
//     walk above: 82 rows got consecutive days from 2026-04-06 to 2026-06-30 (two
//     gap days, 06-18 and 06-27), 2 rows kept missed dates (2026-04-03/05) and 16
//     rows were pushed to 2026-12-15 .. 2030-01-28. From 2026-07-01 no row matches
//     "today", the RPC returns NULL and the cron still answers { ok: true }.
//  3. The catalog fallback (/api/admin/auto-select-qotd) exists but is not in
//     vercel.json (and is POST-only while Vercel Cron sends GET), so nothing fills
//     an empty day. The home masks it with an unlogged read-side replay pick.
// The fix below is pure (unit-tested) and only runs when the server env switch
// QOTD_ROTATION_FIX=1 is set (default OFF: production behaviour unchanged until
// the owner says go).
// ---------------------------------------------------------------------------

/** Server env switch for the QOTD rotation fix. Default OFF. */
export function qotdRotationFixEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = env.QOTD_ROTATION_FIX;
  return v === '1' || v === 'true';
}

/** YYYY-MM-DD plus n days (UTC). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type Neighbour = { group_id: number | null; category?: string | null } | null | undefined;

function clashes(q: { group_id: number | null; category?: string | null }, other: Neighbour, byCategory: boolean): boolean {
  if (!other) return false;
  if (q.group_id != null && other.group_id != null && q.group_id === other.group_id) return true;
  return byCategory && !!q.category && q.category === other.category;
}

/**
 * Compact scheduler: fills every free day from startDate on, one quiz per day, no
 * gap. For each day it takes the first remaining quiz that repeats neither the
 * group nor the category of the day before or the day after; when none fits it
 * relaxes the category rule, then takes the first remaining quiz (a repeated
 * category beats an empty day). Deterministic for a given `random`.
 */
export function autoScheduleCompact(
  unscheduled: QuizBankEntry[],
  existingSchedule: QuizBankEntry[],
  startDate: string,
  random: () => number = Math.random,
): Map<string, string> {
  const assignments = new Map<string, string>();
  const byDate = new Map<string, Neighbour>();
  for (const e of existingSchedule) if (e.scheduled_date) byDate.set(e.scheduled_date, e);

  // Fisher-Yates with the injected source (no alphabetical bias, testable).
  const pool = [...unscheduled];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  let day = startDate;
  // Bound: each step places one quiz or skips one occupied day.
  const maxSteps = unscheduled.length + byDate.size + 1;
  for (let step = 0; pool.length > 0 && step < maxSteps; step++) {
    if (byDate.has(day)) { day = addDays(day, 1); continue; }
    const prev = byDate.get(addDays(day, -1));
    const next = byDate.get(addDays(day, 1));
    let idx = pool.findIndex((q) => !clashes(q, prev, true) && !clashes(q, next, true));
    if (idx < 0) idx = pool.findIndex((q) => !clashes(q, prev, false) && !clashes(q, next, false));
    if (idx < 0) idx = 0;
    const [pick] = pool.splice(idx, 1);
    assignments.set(pick!.id, day);
    byDate.set(day, pick);
    day = addDays(day, 1);
  }
  return assignments;
}

export type OpenBankEntry = Pick<QuizBankEntry, 'id' | 'group_id' | 'category' | 'scheduled_date' | 'status'>;

/**
 * The bank row to publish on `date` when none is scheduled for it: a row that is
 * still verified/scheduled, missed dates first (oldest first), then undated rows,
 * then the earliest future date, skipping (when possible) a row with the same group
 * or category as the previous day's quiz. Null when the bank is empty.
 */
export function pickBankEntryForDate(
  entries: OpenBankEntry[],
  date: string,
  previous?: { group_id: number | null; category?: string | null } | null,
): OpenBankEntry | null {
  const open = entries.filter((e) => (e.status === 'verified' || e.status === 'scheduled') && e.scheduled_date !== date);
  const rank = (e: OpenBankEntry): [number, string] => {
    if (!e.scheduled_date) return [1, ''];
    return e.scheduled_date < date ? [0, e.scheduled_date] : [2, e.scheduled_date];
  };
  open.sort((a, b) => {
    const [ra, da] = rank(a);
    const [rb, db] = rank(b);
    return ra - rb || da.localeCompare(db) || a.id.localeCompare(b.id);
  });
  return open.find((e) => !clashes(e, previous, true))
    ?? open.find((e) => !clashes(e, previous, false))
    ?? open[0]
    ?? null;
}

export interface CatalogQuiz {
  id: string;
  group_id: number | null;
  play_count: number;
  like_count: number;
  total_completions: number;
  total_score_sum: number;
  question_count: number;
  report_count?: number | null;
  created_at: string;
}

export interface QotdLogRow { quiz_id: string; featured_date: string }

/** Days a quiz waits before it can be the quiz of the day again. */
export const QOTD_REPEAT_DAYS = 90;

/**
 * Catalog pick when the bank is empty (same idea as /api/admin/auto-select-qotd,
 * made deterministic): a published quiz with 5+ questions, fewer than 3 reports, at
 * least one play, not featured in the last 90 days (qotd_log), preferring a group
 * that was not featured in the last 3 days, ranked by like ratio, completion rate,
 * a mid-range average (40 to 70%) and recency; ties by plays, then id.
 */
export function pickCatalogQotd(
  candidates: CatalogQuiz[],
  recent: QotdLogRow[],
  date: string,
): { id: string; score: number } | null {
  const since = addDays(date, -QOTD_REPEAT_DAYS);
  const blocked = new Set(recent.filter((r) => r.featured_date > since && r.featured_date <= date).map((r) => r.quiz_id));
  const groupOf = new Map(candidates.map((c) => [c.id, c.group_id]));
  const recentGroups = new Set(
    recent
      .filter((r) => r.featured_date >= addDays(date, -3) && r.featured_date < date)
      .map((r) => groupOf.get(r.quiz_id))
      .filter((g): g is number => g != null),
  );
  const eligible = candidates.filter((q) =>
    q.question_count >= 5 && (q.report_count ?? 0) < 3 && q.play_count >= 1 && !blocked.has(q.id));
  if (eligible.length === 0) return null;

  const dayMs = Date.parse(`${date}T00:00:00Z`);
  const score = (q: CatalogQuiz): number => {
    const likeRatio = q.play_count > 0 ? Math.min(1, q.like_count / q.play_count) : 0;
    const completion = q.play_count > 0 ? Math.min(1, q.total_completions / q.play_count) : 0;
    const avg = q.total_completions > 0 && q.question_count > 0 ? (q.total_score_sum / q.total_completions / q.question_count) * 100 : 50;
    const difficulty = avg >= 40 && avg <= 70 ? 1 : avg >= 25 && avg <= 85 ? 0.6 : 0.3;
    const ageDays = Math.max(0, (dayMs - Date.parse(q.created_at)) / 86_400_000);
    const recency = Math.max(0, 1 - ageDays / 60);
    return Math.round((likeRatio * 35 + completion * 20 + difficulty * 25 + recency * 20) * 100) / 100;
  };
  const fresh = eligible.filter((q) => q.group_id == null || !recentGroups.has(q.group_id));
  const pool = fresh.length > 0 ? fresh : eligible;
  const ranked = pool
    .map((q) => ({ q, s: score(q) }))
    .sort((a, b) => b.s - a.s || b.q.play_count - a.q.play_count || a.q.id.localeCompare(b.q.id));
  const top = ranked[0]!;
  return { id: top.q.id, score: top.s };
}
