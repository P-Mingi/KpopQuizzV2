// KpopCards: the rate limits of the write routes. A small sliding-window counter per player and bucket, kept in memory of the server instance (the
// same pattern as the report form's limit in lib/cards/report.ts). It is a brake against floods and runaway clients, NOT the guarantee: what
// protects the economy is the database (the wallet lock, the idempotency key, the day caps), so a second instance or a restart never breaks a promise.
export interface Limit { max: number; windowMs: number }

/** Per bucket: how many calls a player may make in a window. */
export const LIMITS: Record<string, Limit> = {
  open: { max: 40, windowMs: 60_000 },
  write: { max: 120, windowMs: 60_000 },
  friendCode: { max: 5, windowMs: 3_600_000 },
  friendRedeem: { max: 10, windowMs: 600_000 },
  craft: { max: 60, windowMs: 60_000 },
  recycle: { max: 20, windowMs: 60_000 },
};

const hits = new Map<string, number[]>();

/** True when the call may go on; false when the player is over the limit for this bucket. Counts the call. */
export function allow(userId: string, bucket: string, now: number = Date.now(), limits: Record<string, Limit> = LIMITS): boolean {
  const lim = limits[bucket] ?? limits.write!;
  const k = `${bucket}|${userId}`;
  const from = now - lim.windowMs;
  const list = (hits.get(k) ?? []).filter((t) => t > from);
  if (list.length >= lim.max) {
    hits.set(k, list);
    return false;
  }
  list.push(now);
  hits.set(k, list);
  if (hits.size > 20_000) for (const [key, v] of hits) if (v.every((t) => t <= from)) hits.delete(key);
  return true;
}

export function resetRateLimits(): void {
  hits.clear();
}
