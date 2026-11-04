# Dev preview of the network on o1-dev (run O1, lot DEV-PREVIEW, 2026-11-03)

A Vercel Preview of the three projects (`kpopquiz`, `fandomverse`, `otakuquiz`), branch `o1/integration`, on the dev database `o1-dev`, with the four
daily games on (Kpopdle Idol, Otakudle, Otakudle One Piece, Otakudle Dragon Ball), the links between the sites and the 365-day draw of each game.
Preview only. Nothing here touches Production: the SQL is applied to `o1-dev` by the orchestrator with `scripts/o1/migrate-dev.sh`, and the one
code switch ignores a Production build.

## 1. The SQL, for the orchestrator

Apply, in this order, with `scripts/o1/migrate-dev.sh --branch dev <files...>` once this lot is merged to `o1/integration` (the script wants the files
committed there and the order of `docs/o1/contracts/manifest.md`, rows 21 to 39; it skips what its log already holds):

| row | file (in `docs/pending-migrations/multisite`) | what |
|---|---|---|
| 21 | `dev/D01-dev-catchup.sql` | DEV ONLY. The three differences o1-dev has against today's files (below). Refuses on a database with more than 200 profiles or a live anime or hub site |
| 22 | `017-deletion-kpop.sql` | replaces the older 017 that o1-dev already runs by hand (dormant) |
| 23 | `018-entity-images.sql` | the images table and bucket (admin Images), the current version |
| 24 | `019-dle-core.sql` | the daily games engine, switched off |
| 25 | `020-dle-kpop-idol.sql` | Kpopdle Idol game row and its view |
| 26 | `021a-k1-idol-gender-debut.sql` | idols.gender and debut_year |
| 27 | `021c-k1-idol-corrections.sql` | debut years and QIDs |
| 28 | `021b-k1-idol-activate.sql` | empty list: activates nobody |
| 29 | `022-photos-admin.sql` | licensed photos, agencies, site assets |
| 30 | `023-dle-otakudle.sql` | Otakudle tables and game row |
| 31 | `024-dle-series-games.sql` | One Piece and Dragon Ball game tables and rows |
| 32 | `launch/L04-K1-series.sql` | the anime series, arcs, characters, themes |
| 33 | `launch/L05-K1-facts.sql` | the verified facts and their sources |
| 34 | `launch/L06-B3-badges.sql` | the six anime badges |
| 35 | `launch/L08-K3-daily-bank.sql` | the anime daily bank (draft rows) |
| 36 | `launch/L10-PERS-personality.sql` | the 10 "Which character are you" sets |
| 37 | `launch/L13-A1-character-facts.sql` | the 750 characters' Otakudle facts |
| 38 | `launch/L15-A2-series-games.sql` | the facts of One Piece and Dragon Ball |
| 39 | `launch/L14-O1-dle-on.sql` | switches the four games on: pool snapshot, epoch (the day it runs, UTC), 365 days drawn, `active` |

L14 is the whole database switch. No other dev-only file is needed to turn the games on. Not applied on o1-dev, and listed after L14 in the manifest so they
block nothing: `L02` (31 Team auth users, which may not be created there; the 31 fixture Team profiles and 284 published anime quizzes are already on
o1-dev), `L03` (two sentinel auth users, only the dormant deletion reads them), `L07` (the Team catalogue, already loaded by the fixtures) and `021d`
(lot K2: it activates idols of the 021b list by id, rows o1-dev does not hold, and refuses on the first unknown one). Rows 45 to 48 (`L09`, `L10-K3`, `L11`,
`L12`) are files that are not written or that wait for them; `L12` (sites live) is not read by the app.

D01 exists because the catalogue of o1-dev, compared object by object with a local build of today's files, differed in exactly this:
1. `entity_sources_source_check` has no `'fandom'` (011 predates CR-023); L13 and L15 write that source.
2. `public.entity_images` is the first, empty version of 018 (no `license_url`, `commons_file`, `needs_credit`); 018 keeps an existing table, so D01 drops it when it is empty (and refuses when it holds a row).
3. The `sites` rows anime and hub carry the domains of before Bunnyverse; D01 puts them on `bunnyverse.org/anime` and `bunnyverse.org` (domain and brand only, only while `building`).

Looked at and left alone, already right on o1-dev: the grant of `merge_anon_passport` (008), the `spoiler_reports` design of 015, the comment-only changes of 007 and 002a.

Proof on a local Postgres, never on o1-dev: `TMPDIR=$HOME/kpq-o1/tmp-prev bash docs/launch/o1/dev-preview-rehearsal.sh --prod-copy docs/strategy/o1/prod-schema/prod-public.sql`.
It builds the state o1-dev is in, runs rows 21 to 39 and a second time, checks the preview needs and D01's refusals. The same rows were also run on a local copy of o1-dev's idols, groups
and anime content (read-only export): all 19 files ok, a second run changing nothing, four games on with 365 days each, Kpopdle pool 114.

## 2. Environment variables (Vercel, Preview, scoped to the git branch `o1/integration`)

The Preview variables that already exist stay as they are. A public variable is read at build: redeploy the project after adding it.

| variable | kpopquiz | fandomverse (hub) | otakuquiz (anime) | note |
|---|---|---|---|---|
| `NEXT_PUBLIC_DLE_PREVIEW` | `1` | `1` | `1` | new. Turns the hub's `dailyGuess` on for the Preview: the Burrow and the four game pages on the hub, the links on OtakuQuiz and, with the three below, on kpopquiz.org. Closed by default: it is on only when `NEXT_PUBLIC_VERCEL_ENV` is exactly `preview` as well (Vercel sets that one itself on every deployment, if "Automatically expose System Environment Variables" is on in the project's Environment Variables settings), the same value in the server and the browser. A Production build, a local build and a project without the exposed system variables keep the games closed. Never set it on Production |
| `NET_KPOPDLE_HOME` | `1` | not used | not used | the Kpopdle module on the kpopquiz.org home |
| `NET_KPOPDLE_QUIZEND` | `1` | not used | not used | the Kpopdle row under "Next quiz" after a K-pop quiz |
| `NET_KPOPDLE_GROUP` | `1` | not used | not used | the Kpopdle card on a group page |
| `ADMIN_USER_IDS` | not needed | not needed | the auth user id of your account **on o1-dev** | not a secret, but o1-dev has its own auth users: the id on Production does not exist there |
| `ADMIN_MFA_ENROL_OPEN` | not needed | never | `1` until the code is turned on, then remove and redeploy | `docs/o1/admin/MFA-OWNER.md` section 2 and the last paragraph of it (a preview runs on another database) |
| `QOTD_ROTATION_FIX` | already (kpop's own) | leave unset | `1`, optional | only for the OtakuQuiz quiz of the day; crons do not run on a Preview, call the cron by hand with the existing `CRON_SECRET` |

Already in Preview and needed as they are: `NEXT_PUBLIC_SITE_ID` (`hub` on fandomverse, `anime` on otakuquiz, absent on kpopquiz), `NEXT_PUBLIC_UX_V1` and `NEXT_PUBLIC_UX_V12` (`1`), the two
Supabase variables and `SUPABASE_SERVICE_ROLE_KEY` (all three o1-dev), `NEXT_PUBLIC_NET_ORIGINS` (it must name the three preview origins of the branch, so that the links between sites go to the previews and not to Production:
check it, do not change what works), `PASSPORT_*`, `NET_IP_HASH_SALT`, `CRON_SECRET`, `SITE_SCOPE`. For the network footer, menu and click counters on the previews, `NEXT_PUBLIC_NET_FOOTER`, `NEXT_PUBLIC_NET_MENU`
and `NEXT_PUBLIC_NET_BEACON` are `1` (they do not gate the games).

Secrets are never typed here: for any secret, copy the value of the existing Preview variable.

## 3. The admin, Images (OtakuQuiz) on the preview

The page is `/anime/admin` on the OtakuQuiz zone of the hub preview (tab Images first, `?tab=photos` for the licensed photos of idols, groups and agencies). It answers 404 to anyone else. It needs:
- a table `entity_images` and the bucket `entity-images`: row 23 (018) and 29 (022);
- an account that exists on **o1-dev** (sign in once on the preview; the Google or Discord redirect of the o1-dev Supabase project must list the preview's callback), and that account's o1-dev auth user id in `ADMIN_USER_IDS` on `otakuquiz`;
- TOTP turned on in the o1-dev Supabase project (Authentication, Multi-Factor), then `ADMIN_MFA_ENROL_OPEN=1` on `otakuquiz` Preview while you enrol (a session at assurance level aal2 is required);
- `ADMIN_PATH`: the code at this commit does not read it (the admin is at `/anime/admin`). If the Admin 2 plan (`docs/o1/admin/PLAN-ADMIN-2.md`) lands on the branch first, that variable is needed on the hub project, Sensitive, and its value is yours to set.

## 4. Pages to test

Base addresses: `HUB` = the fandomverse Preview URL of the branch; OtakuQuiz is `HUB/anime`; `KPOP` = the kpopquiz Preview URL. Games hold one answer per day (UTC); game n. 1 is the day L14 ran. Hub pages exist in English and
French; OtakuQuiz and the kpopquiz.org links are English only.

Hub, English: `HUB/` (the Burrow tab, the daily rows in Today, the footer line), `HUB/daily`, `HUB/kpopdle`, `HUB/otakudle`, `HUB/otakudle/one-piece`, `HUB/otakudle/dragon-ball`, `HUB/credits`, `HUB/passport`, `HUB/privacy`.
Hub, French: `HUB/fr/daily`, `HUB/fr/kpopdle`, `HUB/fr/otakudle`, `HUB/fr/otakudle/one-piece`, `HUB/fr/otakudle/dragon-ball`, `HUB/fr/credits`.
Play each game to the end (win and give up): the result screen, "How far are you?", the share link (`?r=` on the game page), yesterday's answer from day 2.

OtakuQuiz: `HUB/anime` (the Daily games module: Otakudle, One Piece, Dragon Ball), `HUB/anime/one-piece-quiz` and `HUB/anime/dragon-ball-quiz` (the card "character of the day"; a series without a game has none),
the end of any quiz `HUB/anime/q/<slug>` (the "Daily challenge, the mystery character" row), `HUB/anime/which-one-piece-character-are-you` and the nine other personality pages, `HUB/anime/credits`, `HUB/anime/admin` (the admin, Images; then the Photos tab).

kpopquiz.org (Preview): `KPOP/` (the Kpopdle module under the quiz of the day), a quiz result such as `KPOP/q/exo-general` (finish it: the Kpopdle row under "Next quiz"), a group page of a group with members in the game such as `KPOP/twice-quiz`,
`KPOP/seventeen-quiz`, `KPOP/stray-kids-quiz` (the card "The N members of ... are in the Kpopdle"), `KPOP/credits`.

Not testable on this preview, by design: the accounts of the Team (fixtures only), the deletion flow (no sentinel for anime and hub), the K2 idols (pool 114 idols, not 200), the cron-made quiz of the day without a manual call.

## 5. What the draw looks like on o1-dev

Each game gets 365 bank days at `L14`. A pool smaller than 365 repeats targets: Kpopdle Idol draws from 114 idols (112 distinct targets over the year), Otakudle from 113 characters (178 after D03, section 6), One Piece from 73, Dragon Ball from 48. The
"no target twice in the window" of the launch file is a property of a 365-target pool, which o1-dev does not have.

## 6. Two files changed in place after row 39: D03 (run once, after the first apply)

o1-dev applied 019 and 023 on 2026-11-03 (the sha256 of `docs/o1/migration-log.md`), then both changed in place on `o1/integration`: 019 for the bank in blocks (CR-027, merge of
`o1/dle-draw-blocks`), 023 for Otakudle without "How far are you?" (CR-026, PR #196). `migrate-dev.sh` skips a path it already applied, so it cannot run them again.
`dev/D03-dev-reapply-019-023.sql` (row 40 of the manifest, right after L14, dev only, never for production) is the one file to run for this:

`scripts/o1/migrate-dev.sh --branch dev docs/pending-migrations/multisite/dev/D03-dev-reapply-019-023.sql`

In one transaction it refuses what is not o1-dev (more than 200 profiles, a live anime or hub site, a missing table), drops the old `dle_src_anime_character` only if 023 could not replace
it (it can: the `seen_*` of the old 023 were columns of a CTE, the view had the same 8 output columns, so nothing is dropped on o1-dev; and nothing depends on the view, `pg_depend` on o1-dev),
runs 019 and 023 as they are now through `\ir`, then `dev/D02-dev-rebuild-banks.sql` (not a manifest row, run only through D03): the pool snapshot of each game and a bank drawn again from day 1 in blocks,
and checks the result (no `seen_at` left, 365 days, the bank on its pool, every target once per block, the gap held). 024, L13, L15 and L14 are not run again: nothing they hold reads what changed,
and the games stay on with their epoch. A second run changes nothing (D02 says 0 rebuilt). Expect Otakudle at 178 targets (113 before), the other three games unchanged in pool.

Proof, local only, never on o1-dev: `TMPDIR=$HOME/kpq-o1/tmp-d03 bash docs/proofs/dev-reapply/rehearse.sh --prod-copy docs/strategy/o1/prod-schema/prod-public.sql` builds the state o1-dev is in with the 19 files at `f967743`
(the dle part of its catalogue is byte-identical to o1-dev's, compared read-only), runs D03 from this tree, a second time, and its refusals. Its output is `docs/proofs/dev-reapply/rehearse.out.txt`.
The numbers of section 5 for Otakudle become 178 targets, and each bank is in blocks of N days (every target once per block, N = the targets).
