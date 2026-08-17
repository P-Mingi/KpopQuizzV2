# T1.5 - Industry Pulse: the beautiful monthly K-pop data report

## Claude Code Implementation Prompt

---

T1.5 of Workstream T. Prereq: T0 (monthly pulse machine) shipped - Industry Pulse RIDES
the same cron/report/Discord machine, it does not build a second one. Read
docs/workstream-t-data-hub.md and docs/workstream-t0-monthly-pulse.md first.

Goal: a monthly K-pop INDUSTRY data report (distinct from T0's on-site community pulse)
with history since 2020, built ONLY from legally auto-fetchable primary sources, designed
so beautifully that fan accounts and blogs cite US. UI/UX ambition = the whole point:
dual-skill /ui-ux-pro-max + /frontend-design mandatory, before and after.

Hard rules: NO em dashes. NO scraping of any website, ever (soridata, Melon, Weverse,
anywhere). Every external number cited with source + link + as-of date. REAL DATA ONLY,
thin/ambiguous data hides. Free tier only, no paid API, no new npm dependency without
loud justification. Commit per step, do NOT push. Routes -> allowlist.

## Data sources (all legal, all automatic)

1. GOOGLE TRENDS (the history since 2020):
   - Fetch via the unofficial-but-tolerated trends endpoints server-side. IMPORTANT
     honesty check first: verify a dependency-free fetch is feasible (the daily/interest
     JSON endpoints); if it requires a fragile hack, use the smallest maintained lib and
     justify. Cache aggressively: history 2020->now fetched ONCE per group into a table,
     then only the newest month appended monthly.
   - Track ~20 flagship groups (owner-editable list in admin, seed: BTS, BLACKPINK,
     Stray Kids, TWICE, aespa, NewJeans, SEVENTEEN, IVE, TXT, ENHYPEN, LE SSERAFIM,
     ITZY, NCT, EXO, Red Velvet, (G)I-DLE, ATEEZ, NMIXX, RIIZE, BABYMONSTER).
   - Metrics: monthly interest per group (0-100 relative), plus a rotating head-to-head
     ("BTS vs BLACKPINK search interest, 2020-2026").
   - Methodology line MANDATORY on every Trends chart: "Google Trends relative search
     interest (0-100), worldwide" - these are relative numbers, never present as
     absolute counts.
2. YOUTUBE API (forward-accruing, from T0/T1 foundations):
   - mv_snapshots monthly rollup: views gained per tracked MV per month. History grows
     from install date; charts label honestly "tracked since Jul 2026".
3. SPOTIFY API (forward-accruing): follower deltas per group per month.
   > DORMANT indefinitely (decided 2026-07-27). Spotify's Client Credentials
   > flow is now Premium/quota-walled for new dev apps, which would break the
   > free-tier-only rule. The weekly cron (/api/cron/spotify-snapshot) and the
   > spotify_snapshots table stay in place but fail-soft ASLEEP: with no
   > SPOTIFY_CLIENT_ID/SECRET set it quiet-skips, and no spotify_artist_id is
   > ever resolved or seeded. Revisit only if a free follower source appears.
4. CITED CONTEXT (pulse_citations from T0): 2-4 external milestone numbers per report,
   "according to soridata (link)" / Circle Chart links. Rendered as quotes with source
   badges, visually distinct from our own data. NEVER blended into our charts.

## The pages

- `/data/industry` index + `/data/industry/[month]` (2026-07 onward). Static/ISR.
- Report sections (each: one extractable 40-60 word takeaway sentence + chart/table):
  1. Search interest league table (Trends, month vs prev month, movers up/down)
  2. The long race: 2020->now multi-line chart, top 8 groups (Trends history)
  3. Head-to-head of the month (Trends compare, rotating pair)
  4. Comeback impact: interest spike overlay for the month's comebacks (Trends x
     comebacks table)
  5. MV race (YouTube snapshots, "tracked since" labeled)
  6. Spotify movers (forward data) [DORMANT: see the Spotify note above; section stays hidden until a free follower source exists]
  7. Context corner (cited external milestones, source-badged)
  8. Methodology + "Free to cite with a link" + a one-click "copy citation" button
- Charts: recharts client components over baked data, brand-styled (B0 tokens), dark/light
  parity, mobile-first, every chart gets a shareable OG-rendered PNG endpoint (the
  embed/backlink product) with "kpopquiz.org" watermark + source line baked into the image.
- SEO: Article + Dataset JSON-LD, sitemap, llms.txt, footer link, breadcrumbs. Every
  month = a permalink (52+12 citable URLs/year across both pulses).

## The machine (extend T0, not duplicate)

- Same monthly cron: after the T0 community report, generate the industry report row
  (`industry_reports` month PK + jsonb payload).
- Migration (next free number - CHECK prod): industry_reports + trends_series
  (group_id, month, interest smallint) + tracked_groups admin list.
- Backfill job (one-time, rate-limited, resumable): Trends 2020->now for the 20 groups.
  Run it in slow batches (respect rate limits, hours not seconds); if Trends blocks,
  back off and resume - report honestly how far it got.
- Discord: second embed in the same monthly post (3 industry headlines + link).
- Reddit draft: T0's draft gains an industry section. Still paste-manual. Email frozen.

## Honesty guards
- Trends = RELATIVE interest; every surface says so. No "X has 4x more fans" claims.
- Forward-accruing charts labeled "tracked since {date}"; never imply pre-tracking history.
- If the Trends endpoint proves too unstable for unattended monthly runs, STOP and
  report options rather than shipping a report that can silently rot.
- External citations stay visually quoted, source-badged, linked. Zero blending.

## Build order (commit each, NO push)
1. Feasibility spike: fetch Trends history for 3 groups, show real output + stability
   verdict. STOP and report before continuing.
2. Migration -> OWNER RUNS -> backfill 20 groups (resumable). Commit.
3. Report generation extension + industry_reports. Commit.
4. Pages + charts + OG chart PNGs (the UI/UX showcase step - take it seriously). Commit.
5. Discord + Reddit-draft extension. Commit.
6. Full dry-run July 2026: real report, screenshots light/dark/mobile. Commit.

## Verify
- [ ] Trends numbers spot-checked against trends.google.com UI for 3 groups/months
- [ ] All relative-data disclaimers present; "tracked since" labels correct
- [ ] Zero scraping anywhere (grep for fetch targets, list every external host called)
- [ ] Citations quoted + badged + linked, never in our chart series
- [ ] OG chart PNGs render with watermark + source line
- [ ] Monthly cron idempotent; backfill resumable; failure = silent skip + Discord alert,
      never a broken published page
- [ ] check:routes, tsc, build green; zero em dashes; pages static/ISR

/caveman report per step. Step 1 verdict decides everything - be brutal about stability.
