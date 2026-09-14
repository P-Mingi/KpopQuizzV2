// G-HUB v2 step 5: deterministic daily rotation. Picks one item from a list by
// the UTC day (days since the epoch), so every viewer sees the SAME item on a
// given day and it advances at the UTC midnight boundary. No randomness at
// render, so it is ISR-safe: the cached page holds one day's pick and simply
// re-picks on the next revalidation once the day has rolled over. Empty -> null.
//
// `now` is injectable so the pick is unit-testable without touching the clock.
export function pickDaily<T>(items: readonly T[], now: number = Date.now()): T | null {
  if (items.length === 0) return null;
  const dayIndex = Math.floor(now / 86_400_000); // 86_400_000 ms = 1 day
  return items[dayIndex % items.length] ?? null;
}

// Deterministic per-UTC-day pick of N DISTINCT items, same for every viewer on a
// given day (ISR-safe like pickDaily). Used for the games hub's blind-test band
// preview chips: n real song options that rotate daily. Returns fewer than n only
// when the list is smaller than n.
export function pickDailyMany<T>(items: readonly T[], n: number, now: number = Date.now()): T[] {
  const len = items.length;
  if (len === 0 || n <= 0) return [];
  const dayIndex = Math.floor(now / 86_400_000);
  const take = Math.min(n, len);
  const out: T[] = [];
  for (let i = 0; i < take; i += 1) {
    out.push(items[(dayIndex + i) % len]!);
  }
  return out;
}
