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
 */
export function autoSchedule(
  unscheduled: QuizBankEntry[],
  existingSchedule: QuizBankEntry[],
  startDate: string,
): Map<string, string> {
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
        const sameGroup = quiz.group_id && prevEntry?.group_id === quiz.group_id;
        const sameCategory = prevEntry?.category === quiz.category;

        if (!sameGroup && !sameCategory) {
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
