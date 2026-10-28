// /new (SEO phase 1, 2026-10-27): every quiz published in the last 7 days is in the server HTML, so a crawler
// finds each new quiz through a plain link the week it goes live; at least the 10 newest, at most 120. The
// client list goes on from there (InfiniteQuizList continues at the offset of what the server rendered).

export const NEW_WINDOW_DAYS = 7;
export const NEW_MIN = 10;
export const NEW_CAP = 120;

/** The newest quizzes the server renders, from a newest-first list of up to NEW_CAP quizzes. */
export function newWeekCut<T extends { created_at: string }>(newestFirst: T[], now: number): T[] {
  const since = now - NEW_WINDOW_DAYS * 86_400_000;
  const recent = newestFirst.filter((q) => Date.parse(q.created_at) >= since);
  return recent.length >= NEW_MIN ? recent.slice(0, NEW_CAP) : newestFirst.slice(0, NEW_MIN);
}
