# Workstream T - K-pop Data Hub ("Pulse"): the citation engine

Status: strategy + phased build plan. Owner-facing. As of 2026-07-23.
Executes Pillar 1 of Workstream S (data-driven PR / backlinks) as a product, not a one-off.

## The strategic position (honest)

soridata.com owns YouTube-stats-for-K-pop: years of history, deep charts. We do not
compete with them - we USE the same ecosystem, two ways:
1. SAME SOURCE, OUR PIPE: their numbers are YouTube's public numbers. The official
   YouTube API gives us identical current data, free and legal. We never scrape
   soridata itself (no API, fragile, and re-posted data earns zero citations).
2. CITE THEM for the deep history we cannot rebuild (2007+ archives, all-time
   aggregates): "according to soridata" + link, in articles and pulse reports.
   Outbound links to topical authorities help our SEO, and citing them first is the
   cheapest possible door-opener to a reciprocal link from a real K-pop data site.
Our monopoly stays FIRST-PARTY FAN BEHAVIOR: quiz scores by fandom, blind-test
recognition rates, duel votes, fandom war weekly standings, streaks. No label, no chart
site, no journalist has this. Strategy: commodity data (YouTube API) + cited soridata
history give CONTEXT, behavioral data gives the HEADLINE.

"SPINE" by NMIXX hit 40M views this week (context, anyone has it). "Fans already
recognize it in 3.2 seconds on the blind test - faster than any 2026 debut" (headline,
ONLY WE have it). The second sentence is the one that gets quoted and linked.

## What we can realistically ingest (solo owner, NANO DB, free tier)

| Source | Feasible? | How |
|---|---|---|
| YouTube Data API | YES - official, free 10K units/day | Track 30-50 MVs (comebacks + evergreen), daily snapshot of views/likes. ~100 units/day. |
| Spotify Web API | YES - official, free | Weekly snapshot: follower count + popularity index per tracked group. |
| Melon / Circle | NO v1 - no public API, scraping fragile + legal grey | Skip. Revisit only via licensed/officially published weekly numbers, manually curated. |
| Weverse | NO - no API | Skip. |
| Our own DB | YES - the moat | Plays, scores, recognition times (per-question ms exists since N4!), duel votes, war map, debate splits, streaks. |
| Comeback calendar | YES - manual + community | `comebacks` table, owner/admin curated (10 min/week). The scheduling spine for everything. |

NANO safety: daily snapshots = tiny rows (video_id, date, views, likes). 50 videos x 365
days = 18K rows/year. Nothing. One cron (existing pattern: prune-activity cron).

## The phases

### T0 - Data foundations (build)
- Migration: `mv_tracking` (video_id, group_id, title, is_comeback, added_at),
  `mv_snapshots` (video_id, date, views, likes), `spotify_snapshots` (group_id, date,
  followers, popularity), `comebacks` (group_id, title, date, mv_video_id, status).
- One Vercel cron daily: YouTube API snapshot for tracked videos (batched, ~2 API calls).
  Weekly: Spotify snapshot. Fail-soft, logged, never blocks anything.
- Admin mini-panel: add/remove tracked MV, add comeback (reuse existing admin patterns).
- Blind-test recognition time: N4 already records per-question ms. Add per-song
  aggregation (avg time-to-answer + accuracy per song) - THE monopoly metric. Verify
  volume honestly: gate any public claim on min 30 recognitions per song.

### T1 - /data hub (build)
- `/data` index + subpages, static/ISR, recharts client charts over baked data:
  - Comeback race: first-14-days view curves of current comebacks (commodity+context)
  - Recognition index: how fast fans recognize each tracked comeback (MONOPOLY)
  - Fandom knowledge index: avg quiz accuracy by fandom, min-plays gated (MONOPOLY)
  - Fandom war history: weekly winners archive (MONOPOLY)
  - Duel verdicts archive (MONOPOLY)
- Every chart: "as of" date, methodology line, Dataset JSON-LD, and a SHARE/EMBED button:
  copy a PNG (OG-route render of the chart) or an iframe embed carrying a followed link
  back. The embed IS the backlink product (merge Workstream L2 here - its spec exists).
- Every page: "Free to cite with a link" line. /data in sitemap + llms.txt + footer.

### T2 - Comeback radar (build, the retention tie-in)
- When a comeback row is live (status active, first 14 days): home page shows a comeback
  banner (real MV thumb via YouTube, group colors) linking to a comeback page:
  the race chart + that group's quiz + blindtest playlist + a debate question queued for
  that group + "recognition speed so far".
- Community page war map: comeback groups get a small "comeback" pulse tag (real).
- This converts news-moment traffic (highest K-pop search spikes) into plays.

### T3 - The Fandom Pulse (recurring citable report)
- Auto-generated weekly page: /data/pulse/{week}: war winner, fastest-recognized song,
  knowledge index movers, duel verdict of the week, biggest comeback race. Archived,
  permalinked = 52 citable URLs/year, each with fresh unique numbers.
- Monthly + yearly rollup ("K-pop Fan Report 2026") = the press flagship.

### T4 - Distribution (owner-led, playbook)
- Reddit: monthly data post to r/kpop (dataisbeautiful-style chart + methodology +
  source link). One good one outranks months of on-page SEO.
- Press kit page /data/press: what we track, how to cite, contact. HARO/journalist
  pitches offering the data as quotable source.
- Influencer kit: ready-made chart PNGs per fandom ("ARMY scored highest this month")
  DM-able to fan accounts - fan accounts LOVE posting fandom-flex numbers with source.
- Embeds outreach: fan blogs/Tumblr/Amino get the widget (T1) = passive followed links.

## Honest constraints and rules
- REAL DATA ONLY, always dated, always min-volume gated. A thin metric hides; never
  extrapolate. Methodology one-liner on every chart (trust = citations).
- YouTube data used within API ToS (no scraping, no republishing raw dumps; charts +
  aggregates with attribution are fine).
- No Melon/Weverse claims v1. No "all of K-pop" claims - "tracked comebacks" framing.
- Owner time budget: ~15 min/week (curate comebacks + approve the pulse). If it needs
  more, the design is wrong.
- Impact metric: backlinks + citations (Bing/GSC referring domains, currently ~1) and
  comeback-page plays. Review monthly against Workstream S numbers.

## Order
T0 -> T1 -> T3 (pulse rides on T1 data immediately) -> T2 -> T4 ongoing.
Each phase = own build prompt when owner green-lights.
