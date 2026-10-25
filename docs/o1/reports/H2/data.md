# Lot H2b: the real data of the new FanQuiz home (report)

Source of the rules: `docs/o1/design/fanquiz-hub/Plan.dc.html`, sections 3 and 5. Code: `apps/quiz/src/lib/site/hub/data/` (one module per block, shapes in
`types.ts`, barrel in `index.ts`). Every block is `async (opts) => Shape | null`, cached one hour under the tag `hub:<block>` (For you: five minutes per fan,
because it is personal), and never throws: on a database error it answers the last good value of the server instance, else null.
`opts.origins` (optional) is the origin of each site; by default `netOrigin` of the registry, so every link is the canonical page on its own site.

## Run against o1-dev (counts only)

The run is `apps/quiz/e2e/o1/H2b/run-dev.run.ts` (a vitest file outside the normal glob), as the hub build, 2026-10-25 about 19:57 UTC:
`scripts/o1/env.sh dev -- env NEXT_PUBLIC_SITE_ID=hub pnpm -C apps/quiz exec vitest run --config e2e/o1/H2b/vitest.run.config.ts`.
Dev holds 474 published K-pop quizzes, 234 published anime quizzes, 26 plays, 0 public passport stamps, 31 Team accounts.

```
rotation           17 ms  {"utc":"00:05","paris":"01:05","zone":"CET","secondsLeft":18381}
daily             431 ms  {"kpop":true,"anime":false,"kpopQuestions":10}
blindtest         241 ms  {"songCount":10,"clip":10,"preview":true,"keys":8}
debate            220 ms  {"votes":0,"date":"2026-10-25"}
hot               597 ms  {"all":6,"kpop":6,"anime":6,"allSites":"kakaka","basis":{"plays":"plays-rows","completionMeasured":false,"animeStartup":true},"maxPerGroup":2,"hasQotd":false}
animeFirstPlay  4 days ago
doors             574 ms  {"kpopQuizzes":474,"kpopTopics":48,"animeQuizzes":234,"animeTopics":50,"kpopLabel":"Top now","animeLabel":"Just added","featured":[true,true]}
sixty             627 ms  {"site":"anime","options":4,"hasAnecdote":true,"awardsXp":false,"linkOk":true}
didyouknow        294 ms  {"kpop":true,"anime":true,"pool":{"kpop":3,"anime":899},"noRepeatDaysKpop":3,"noRepeatDaysAnime":60}
startEasy         103 ms  {"kpop":true,"anime":true}
crossover         101 ms  {"quizzes":3,"sites":"kaa","fact":true,"week":"2026-W43"}
topFans            82 ms  {"result":"null"}
surprise          121 ms  {"pool":200,"kpop":100,"anime":100,"played":0}
forYou            251 ms  {"cards":2,"kinds":"next,bridge","bridgeOtherSite":true,"via":"-,start-easy"}
surpriseUser      242 ms  {"pool":200,"played":0}
forYou(guest)  null
```

Reading it: every block answers in under 0.7 s on a cold cache; Hot gives 6, 6 and 6 cards, K, A, K, A, K, A in All, at most 2 per group, no quiz of the day;
OtakuQuiz is in its start-up week (first anime play 4 days ago); the daily blind test serves 10 songs; Did you know has 899 anime facts and 3 K-pop facts;
Crossover resolves 3 picks (1 K-pop page, 2 anime quizzes) and 1 fact; For you gives the fandom's next quiz and a bridge from the other site; Top fans and the
anime quiz of the day are null on dev (see below).

## What the data says, against the Plan

| Topic | Plan or canvas | Truth |
|---|---|---|
| Rotation time | "2 h 05, Paris time" | The cron `5 0 * * *` runs at 00:05 UTC and the quiz of the day is the one of the UTC date (`ensure-daily-quiz/route.ts`, `getQuizOfTheDay`). On a Paris clock that is 02:05 in summer (CEST) and 01:05 in winter (CET); today the clocks changed (2026-10-25 01:00 UTC). `getRotation()` gives `nextAt`, `utcTime`, `parisTime`, `parisZone`, `secondsLeft`. The debate cron runs at 00:10 UTC; the daily blind test is made by the first request to the K-pop site after 00:00 UTC, so until then the hub shows yesterday's set. The page should print `parisTime`, not a fixed 2:05. `rotation.test.ts` pins the numbers to `vercel.json`. |
| Daily blind test | "5 songs" | The set is 10 songs (`/api/daily/blindtest`: `SONGS_COUNT = 10`, 10 seconds each). `songCount` says 10. |
| Completion rate (Hot) | finished over started, exclusion under 40% | NO server record of a started run exists (`plays` has one row per finished run; the Continue state is localStorage). The rate is unknown, so the neutral value 1 is used and the 40% exclusion cannot fire. `quiz_daily_plays.started` (SQL below) is the place to fill once something records starts; the code uses it as soon as it is there (20 started runs a window). |
| Plays per day | "add a small table if none" | The per-day count exists by deriving it from `plays` (index on created_at). Hot pages the plays rows of the 7 days (past the 1000 row cap). The table is prepared and used when it is applied, filled and reaches yesterday (today always from `plays`). |
| Reported quiz | "signale" | Out when `status` is not `published` (the 5 distinct signed-in reporter auto flag) or `report_count` is 5 or more (anonymous reports pile up without flagging). Dev: 6 K-pop quizzes have 5 reports or more. |
| "Verified first" (OtakuQuiz start-up) | editorial quality, verified first | No per-quiz verified flag exists. The stand-in is the series tier A, B, C (`series.tier`), then likes, then newest. |
| Continue (For you) | last quiz started, not finished, in 14 days | Not possible: the run in progress is in the browser of each site (`ux:continue:v1`), and `fanquiz.org` has another origin. The block returns the other cards; no Continue card is invented. Needs a server table of runs in progress, a later lot. |
| XP of the week (Top fans) | XP won this week | No XP ledger: `award_xp` and `award_world_xp` add to a running total. Exact figure needs the daily snapshot table (SQL below); without it the block estimates from the XP of the quiz plays of the week (once per player and quiz), used for the order only. `basis` says which. |
| Public profiles (Top fans) | public profiles only | A fan appears only with a public stamp: `world_memberships.show_elsewhere` true on an activated, not banned membership (the switch `public_passport` applies; default false). Only public stamps count and show; the level only when `passport_prefs.show_passport_level` is true. Team accounts (any `editorial_accounts` row) are out; if that list cannot be read the block fails instead of guessing. So the board starts empty and fills as fans opt in. |
| Anime quiz of the day | one per site | Dev has no published anime bank row, so `getQuizOfTheDay('anime')` is null and the anime Today card disappears until launch rows L08 are in. |
| Did you know | sourced, fun or history, no spoiler, no repeat in 60 days | Sourced = a published `trivia` row with a source; the quality filter of the trivia pages (`isUsableFact`); anime facts about a character, arc or episode are left out (trivia rows carry no spoiler mark). One fact a day walks a stable shuffled pool, so nothing repeats inside `pool` days. Anime pool 899 (60 days guaranteed). K-pop pool is 3 on dev: its facts repeat every 3 days until the pool reaches 60 (the K-pop trivia pages are built from quiz fun facts, which carry no source). |
| 60 seconds | easy or medium, Top quiz, no spoiler, no XP | Multiple choice with 4 options, a quiz of the Hot picks of the site of the day (UTC even day K-pop, odd day anime), not a quiz of the day, no `spoiler.arc` above 0, quiz `spoiler_arc_ord` 0 or null. The question with an anecdote (`fun_fact`) is preferred. `awardsXp` is false. |
| Surprise me | 200 best, not played, never the same site twice | Pool = the 100 best quizzes of each site (smoothed like rate, series tier on a site with no plays), so both sites are always in it. `pickSurprise(pool, { playedIds, lastSite })` is pure and client safe (`surprise-pick.ts`). |
| Crossover | a hand-picked list, 3 shown, changed weekly | `crossover-list.ts`: the KPop Demon Hunters page of the K-pop site and two anime quizzes with K-pop guests (Tower of God, Solo Leveling), each checked against the published questions and trivia; facts are shown only while a published trivia row with the same text exists. With 3 entries the same 3 show each week; adding entries turns the list. |
| Bridge pairs | at least 30 common players, else hand-picked pairs | `bridge-pairs.ts`: Stray Kids with Tower of God and Solo Leveling, TXT with Solo Leveling, each resting on a published fact. The passport count (30 players who play both) is computed per fandom, cached an hour; on dev it never reaches 30. |

## SQL prepared (not applied anywhere but o1-scratch)

`docs/pending-migrations/hub/` (header, idempotent, RLS, service_role writes, like multisite 016), each with its rollback:

- `001-quiz-daily-plays.sql`: `public.quiz_daily_plays (quiz_id, day, plays, started)`, read for everyone, writes by `hub_refresh_quiz_daily(p_days)` (service_role only).
- `002-xp-daily-snapshots.sql`: `public.xp_daily_snapshots (day, user_id, site_id, xp)`, no policy (service role only), written by `hub_snapshot_xp()`.

Tried on o1-scratch: each file twice (idempotent), the functions in a rolled back transaction (counts, the `started` column kept, a deleted play zeroing its day, the prune), anon cannot read the snapshots nor write the daily table, the daily table read through PostgREST by `loadPlays` (source `daily-table`), each rollback twice. Both rollbacks refuse while data that cannot be rebuilt exists (001: a `started` count; 002: any snapshot row of an earlier day), proven on scratch. One thing to know for the owner: the rollback of 002 drops a table that references `auth.users` and needed more than the 5 s lock timeout once on scratch, while another session held a transaction; run it when the auth service is quiet. Scratch was left as found (neither file applied). Both functions need a nightly call (a cron route or the owner's scheduler); the app does not call them. Neither file is in `docs/o1/contracts/manifest.md` yet (a new file is a change request there): see `docs/o1/requests/H2b.md`.

## Environment the hub build needs

Service role key for Top fans only (closed tables: Team list, memberships, preferences); the anon key for everything else (plays are a public read). No block writes or calls an rpc: the daily blind test is today's row, else yesterday's, else null, `NEXT_PUBLIC_NET_ORIGINS` outside production for the links. `getForYou` and `getSurprise` take the user id from the caller, which must have checked the session itself (`createServerClient().auth.getUser()`); the modules never read cookies.

## Tests

`pnpm -C apps/quiz exec vitest run src/lib/site/hub`: unit tests per block over an in-memory stand-in for Supabase (`test-support.ts`): ranking maths with fixed dates, the 72 hour boost, the quality clamp, caps per group, alternation, the start-up rule, the 1000 row paging, canonical links, no Team account, private stamps out, null and failure paths, the cache wrapper (last good value, timeout, Next signals), no dash or emoji, read only.
