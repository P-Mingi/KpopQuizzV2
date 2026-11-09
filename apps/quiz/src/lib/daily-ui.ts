// Audit 01 P0-3 / P1-5: the pure text of the daily result screens. No I/O.

/** Time left before the next quiz of the day (UTC midnight), as "9h 2m", or "42m" under an hour. */
export function timeToNextDaily(now: Date = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const mins = Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/** One mark per question: a full dot for a right answer, an empty one for the rest. Nothing of the question or its options. */
export function marksLine(marks: readonly ('ok' | 'no' | null)[]): string {
  return marks.map((m) => (m === 'ok' ? '●' : '○')).join('');
}

/**
 * The text a player shares after the daily quiz: "KpopQuiz Daily #142 · 8/10", the marks, the address of /daily. It is spoiler-free
 * by construction: it takes numbers and marks only, so no question, option or answer can reach it (the number is left out when
 * the first day of the daily is unknown, never invented).
 */
export function dailyShareText(f: { brand: string; number: number | null; score: number; max: number; marks: readonly ('ok' | 'no' | null)[]; url: string }): string {
  const head = `${f.brand} Daily${f.number ? ` #${f.number}` : ''} · ${f.score}/${f.max}`;
  return [head, marksLine(f.marks), f.url].join('\n');
}

/** "day 4" / "4-day streak" line of the daily ending. */
export function streakWords(days: number): string | null {
  if (!Number.isFinite(days) || days < 1) return null;
  return days === 1 ? 'Day 1 of your streak' : `${days}-day streak`;
}
