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
