// In-memory rate limit for the duel routes (V12 G7), keyed by the voter hash, never
// by an IP. It is per server instance, so it only stops a burst; the hard limits
// live in the database (one vote per pair per voter per day, and a daily cap per
// voter, both in duel_cast_song_vote).

export interface RateLimiter {
  /** Records one hit. False when the key is over its limit for the window. */
  hit(key: string): boolean;
}

export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }): RateLimiter {
  const now = opts.now ?? Date.now;
  const maxKeys = opts.maxKeys ?? 5000;
  const hits = new Map<string, { start: number; count: number }>();
  return {
    hit(key: string): boolean {
      const t = now();
      if (hits.size > maxKeys) {
        for (const [k, v] of hits) if (t - v.start >= opts.windowMs) hits.delete(k);
        // still full of live windows: drop the oldest entries (Map keeps insertion order)
        for (const k of hits.keys()) { if (hits.size <= maxKeys) break; hits.delete(k); }
      }
      const cur = hits.get(key);
      if (!cur || t - cur.start >= opts.windowMs) {
        hits.set(key, { start: t, count: 1 });
        return true;
      }
      cur.count += 1;
      return cur.count <= opts.limit;
    },
  };
}

/** 30 votes a minute: six full bonus cards, far above what a person does. */
export const voteLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
/** 20 pair requests a minute. */
export const pairsLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
