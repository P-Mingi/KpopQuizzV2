# FREE-VIABILITY - fix summary (tracked copy; full verdict in docs/refonte/FREE-VIABILITY.md, gitignored)

Branch `perf/free-viability` off main `82082e8`. Goal: make kpopquiz.org survive on Supabase
Free/nano. Zero DDL, zero content change, no push to main.

## The measured hammer (Supabase edge_logs, 24h - FREE-VIABILITY-BASELINE.md)
75,651 API req/24h, 83.6% DYNAMIC (per-render Postgres), anon 65%, 14.4% 5xx (nano 522s),
compute 50% CPU at only 17/60 conns = COMPUTE saturation from read VOLUME. Top tables all
reads: quizzes 17,585 / plays 15,554 / groups 6,746. Mechanism: bot+user ISR re-renders of
~500 crawl URLs x ~10-14 uncached reads each; getGroupBySlug + getRelatedQuizzes used the
cookie client, forcing the group hubs fully DYNAMIC.

## The fix (behaviour-preserving; public reads only)
1. Moved getGroupBySlug/getGroupByName/getRelatedQuizzes off the cookie client to the
   cookie-free client, then wrapped ~18 per-render PUBLIC reads in `unstable_cache`
   (src/lib/db/cache-policy.ts: catalog 6h / stats 1h). The DB is now hit once per TTL per
   key, not once per render; shared-arg reads (getFandomWarMap, getAllGroups) collapse from
   once-per-hub to once total. Signed-in/user-specific reads keep createServerClient and are
   never cached.
2. Added generateStaticParams to /[slug] so the group hub is ISR-cached (a dynamic segment is
   per-request unless it declares one). Now cookie-free children make prerender legal.
3. /api/stats/live counts cached (60s); useMe cookie-gated (anon pageview -> 0 /api/auth/me).

## Proven (files in this dir)
- route-modes.txt: /[slug] flipped `ƒ` Dynamic (no-store) -> `●` SSG/ISR 1h. /q/[slug] stayed `●`.
- cache-headers.txt: next start - /bts-quiz `x-nextjs-cache: HIT`; /bts-trivia MISS->HIT.
- tsc 0, unit 118/118, build exit 0 (801 static pages), gates green.

## Verdict: GO (confirm with the after-logs)
The 85k/day multiplier (crawl-freq x URLs x uncached-reads) is broken; reads now = URLs x
per-TTL, decoupled from crawl frequency. Projected DYNAMIC share -> single digits; 522s clear.
CONFIRM GATE (re-measure edge_logs after deploy): DYNAMIC single-digit %, 5xx <~1%, compute
<60%. Traffic ceiling: Free/nano comfortably holds ~10-20x today's 165 daily visitors, since
added visitors/crawlers are now cache hits; the real limit is catalog size + write volume,
both far from nano's ceiling.
