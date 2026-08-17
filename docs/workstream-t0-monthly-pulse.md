# T0 - Monthly K-pop Pulse Report (automatic, free)

## Claude Code Implementation Prompt

---

T0 of Workstream T (docs/workstream-t-data-hub.md - read the position section first).
One deliverable: a monthly report that GENERATES itself, PUBLISHES itself, and
DISTRIBUTES itself. Zero owner work per month except pasting one Reddit draft.

Hard rules: NO em dashes. REAL DATA ONLY, every number dated + traceable, thin metrics
hide. No new paid service, no new npm dependency unless unavoidable (justify loud).
Git commit per step, do NOT push. New routes -> allowlist, check:routes green.

## What the report contains (auto-built from queries that already exist)

Section order, each with one plain-language citable sentence + a small table/number:
1. Fandom of the month: war-map winner aggregated over the month (getFandomWarMap
   pattern over 30 days). "BTS was July 2026's most-played fandom on kpopquiz.org."
2. Most-played quizzes of the month (top 5, reuse the S1 articles query).
3. Debate verdicts: the month's most-voted daily debates + splits (debate_votes).
4. Duel verdict of the month (existing matchups query, monthly window).
5. Community growth: plays this month, quizzes created, new fans joined (profiles
   count delta). Honest absolute numbers - small is fine, growth framing only when real.
6. Blind-test recognition (GATED): fastest-recognized songs IF >= 30 recognitions
   exist per song (per-question ms from N4). Until volume: section hides.
7. Context corner: 2-4 curated external citations with links, e.g. "according to
   soridata, K-pop passed 321B total YouTube views". Stored in a small
   `pulse_citations` table (source, claim, url, as_of_date) the owner can edit in
   admin whenever; report renders whatever is there, stale entries show their
   as_of date honestly. No auto-scraping of anyone.

## The machine

1. **Page:** `/data/pulse/[month]` (e.g. /data/pulse/2026-07) + `/data/pulse` index.
   Static/ISR. Article + Dataset JSON-LD, "as of" dates, methodology line, "Free to
   cite with a link" footer, OG image via existing OG-route pattern. Sitemap + footer
   + llms.txt.
2. **Generation:** Vercel cron, 1st of month 06:00 UTC (CRON_SECRET pattern like
   /api/qotd/publish): computes the month's numbers, writes one `pulse_reports` row
   (month PK, jsonb payload). Page renders from that row (idempotent; re-run = same
   month recomputed).
3. **Discord (automatic):** after generation, post an embed to the existing Discord
   webhook (reuse the flex/DISCORD infra + env pattern; server-side env only): title,
   3 headline numbers, link to the page.
4. **Reddit (semi-automatic, deliberate):** the cron also builds a ready-to-paste
   Reddit draft (title + markdown body + chart/page link, r/kpop-appropriate tone,
   no spam phrasing) and includes it in the Discord post (spoiler block or a second
   admin-only webhook message). Owner pastes manually. Do NOT auto-post to Reddit.
5. **Email:** NOT in T0. Leave a stub note only.

## Migration (116 or next free number - CHECK prod first, 114/115 exist)

`pulse_reports` (month text PK, payload jsonb, created_at) +
`pulse_citations` (id, source, claim, url, as_of_date, active bool).
RLS: public read on both, writes service-role only. Seed pulse_citations with 3 rows
citing soridata's public milestones (owner will verify wording): total views, total
likes, and one genre-split stat, each with as_of 2026-07 and the soridata.com URL.

## Admin

Tiny panel section (existing admin patterns): edit pulse_citations rows; button
"regenerate current month" (calls the cron route with auth).

## Build order (commit each, NO push)
1. Migration written -> OWNER RUNS on prod -> verify. Commit.
2. Generation cron + pulse_reports write + idempotency test. Commit.
3. /data/pulse pages + index + SEO wiring. Commit.
4. Discord webhook post + Reddit draft block. Commit.
5. Admin panel bits + full dry-run: generate July 2026 for real, screenshot the page +
   the Discord embed. Commit.

## Verify
- [ ] July 2026 report generated from real data end-to-end, every number matches a
      hand-run query (spot-check 3)
- [ ] Thin sections hide (recognition section MUST be hidden at current volume)
- [ ] Citations render with source links + as_of dates; zero scraping anywhere
- [ ] Cron idempotent; CRON_SECRET enforced; webhook env server-side only, never logged
- [ ] Reddit draft reads like a human fan post, not marketing
- [ ] check:routes green, tsc clean, build green, zero em dashes
- [ ] Pages static/ISR; JSON-LD valid

/caveman report per step. Flag any number you could not verify.
