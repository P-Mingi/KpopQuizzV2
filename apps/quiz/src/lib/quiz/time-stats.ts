// The quiz_time_stats cache: one row per (quiz, score, question count) with the
// number of timed runs, their average and the fastest. Written by the play route
// after a run. R1: the write goes through the service role, because the table's
// write-all policy is dropped (r1-rls-tighten.sql); the sample is validated here
// first, since the route is now the only door.

export interface TimeStatsRow {
  id: string;
  attempt_count: number;
  avg_time_seconds: number;
  fastest_time_seconds: number | null;
}

export interface TimeSample {
  score: number;
  totalQuestions: number;
  seconds: number;
}

const MAX_QUESTIONS = 200;
const MAX_SECONDS = 4 * 60 * 60; // nobody takes four hours; a larger value is noise or abuse

/** A sample worth recording, or null. */
export function timeSample(score: unknown, totalQuestions: unknown, seconds: unknown): TimeSample | null {
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) return null;
  if (typeof totalQuestions !== 'number' || !Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > MAX_QUESTIONS) return null;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_SECONDS) return null;
  return { score, totalQuestions, seconds };
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** The row values after one more run (the same arithmetic the route always did). */
export function nextTimeStats(
  existing: Pick<TimeStatsRow, 'attempt_count' | 'avg_time_seconds' | 'fastest_time_seconds'> | null,
  seconds: number,
): { attempt_count: number; avg_time_seconds: number; fastest_time_seconds: number } {
  if (!existing) return { attempt_count: 1, avg_time_seconds: round1(seconds), fastest_time_seconds: round1(seconds) };
  const count = existing.attempt_count + 1;
  const avg = (existing.avg_time_seconds * existing.attempt_count + seconds) / count;
  const fastest = existing.fastest_time_seconds !== null ? Math.min(existing.fastest_time_seconds, seconds) : seconds;
  return { attempt_count: count, avg_time_seconds: round1(avg), fastest_time_seconds: round1(fastest) };
}

// The minimal shape of the Supabase client this needs (a service-role client in the route).
interface StatsDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: 'quiz_time_stats'): any;
}

/** Read-modify-write of the stats row for one validated sample. Never throws. */
export async function recordTimeSample(db: StatsDb, quizId: string, sample: TimeSample): Promise<void> {
  try {
    const { data: existing } = await db
      .from('quiz_time_stats')
      .select('id, attempt_count, avg_time_seconds, fastest_time_seconds')
      .eq('quiz_id', quizId)
      .eq('score', sample.score)
      .eq('total_questions', sample.totalQuestions)
      .maybeSingle();

    const row = existing as TimeStatsRow | null;
    const next = nextTimeStats(row, sample.seconds);
    if (row) {
      await db.from('quiz_time_stats').update({ ...next, updated_at: new Date().toISOString() }).eq('id', row.id);
    } else {
      await db.from('quiz_time_stats').insert({ quiz_id: quizId, score: sample.score, total_questions: sample.totalQuestions, ...next });
    }
  } catch {
    // Non-critical: never fail the play save over the timing cache.
  }
}
