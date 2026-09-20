// FREE-VIABILITY (branch perf/free-viability). Shared TTLs for unstable_cache on
// PUBLIC server-render reads.
//
// The measured baseline (Supabase edge_logs, 24h): 75,651 API requests, 83.6%
// DYNAMIC (per-render Postgres hits), anon role 65%, nano CPU pinned at 50% with
// only 17/60 connections = COMPUTE saturation from read VOLUME, not the pooler.
// The mechanism: bot- and user-triggered ISR re-renders of ~500 crawlable URLs,
// each doing ~10-14 uncached public reads, so the crawl wave multiplies straight
// onto Postgres. Wrapping each per-render PUBLIC read in unstable_cache means the
// DB is touched once per TTL per cache key instead of once per render; shared-arg
// reads (getAllGroups, getFandomWarMap) collapse from once-per-hub to once total.
//
// RULE: only cookie-free, same-for-everyone reads live behind these TTLs. Anything
// session- or user-specific keeps createServerClient and is never cached here, so
// a signed-in user's own state is unchanged. The live social widgets already
// reconcile client-side on mount, so a baked count going up to `stats` seconds
// stale is the pre-existing, intended behaviour - not a regression.
export const CACHE_TTL = {
  /** Catalog + group facts that change rarely (group row, rosters, quiz link
   *  lists, related quizzes, trivia corpus). 6h. */
  catalog: 21600,
  /** Play-derived stats, social counts and leaderboards: tolerate ~1h staleness,
   *  and the live islands reconcile on mount. 1h (parity with today's page
   *  revalidate, so nothing becomes more stale than it already was). */
  stats: 3600,
} as const;
