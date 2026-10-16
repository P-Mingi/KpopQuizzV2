# G0 defaults (o1-contract-v1)

Gate G0 asks the owner to confirm these defaults (RUN-O1-PROMPT section 8, BACKLOG section 7 row G0). Until he
answers, the contract freezes each one as **default, pending**: lanes build on it, and a later change by the owner
is a CR (`CONTRACT.md`). When the answer comes, ORCH records it in `LEDGER.md` and changes the status column here to
`confirmed (G0, <date>)` or to the owner's new value with its CR number; a status change alone is not a CR.
`contract.test.ts` checks that every row has a status and that the two lists are complete (21 and 9 rows).

Status words: `default, pending` (G0 not answered), `accepted` (the owner already said yes), `confirmed (G0, date)`.

## 1. The 21 decisions of the v2 plan (`2026-10-MULTI-NICHE-v2.md` section 9)

| id | default | status | where the contract uses it |
|---|---|---|---|
| V2-01 | Network name FanQuiz, fanquiz.org (fallback quizworlds.org) | default, pending | naming.md, registry.md (`NETWORK`, hub brand) |
| V2-02 | OtakuQuiz colour: Persimmon, Option A | default, pending | tokens.md 4.2 (values also wait for G5) |
| V2-03 | Vocabulary "sites" on kpopquiz.org and otakuquiz.org ("Your sites"), "worlds" only on fanquiz.org; the code type is `SiteId` (naming.md) | default, pending | naming.md traps, copy-keys.md 4 |
| V2-04 | Show the artist of an opening to everyone ("TOP · Stray Kids"), no link for anonymous visitors | default, pending | copy-keys.md (`anime.x1.credit`), link-allowlist.md |
| V2-05 | "Search the whole network" line on an empty search for anonymous visitors: later | default, pending | no route, no key in the run |
| V2-06 | "Your sites" menu on kpopquiz.org: automatic (accounts with 2 sites), reviewed after 4 weeks | default, pending | flags-env.md (`NEXT_PUBLIC_NET_MENU`) |
| V2-07 | Footer line on kpopquiz.org: on the anime launch day, not before | default, pending | flags-env.md (`NEXT_PUBLIC_NET_FOOTER` off until L1) |
| V2-08 | Passport deletion: 7-day grace period, published quizzes kept under "deleted user" by default | default, pending | cookies.md 3 (`deletion_pending`), schema.sql (B7 objects) |
| V2-09 | Anime title ladder validated (v2 section 3) | default, pending | registry.md (`levelTitles`, placeholder until G6) |
| V2-10 | P3: silent P3a, the K-pop sign-in screen does not change | default, pending | flags-env.md (`PASSPORT_SEED` reserved, inert) |
| V2-11 | Discord on OtakuQuiz: not at launch, reviewed if 10% of sign-ins ask for it | default, pending | registry.md (anime `auth.providers`: google, email) |
| V2-12 | "Sign out: On this device" text on kpopquiz.org corrected if the two-device test shows a global sign-out | default, pending | registry.md (kpop `signOutModes: ['global']`), G16 |
| V2-13 | P2: 4 weeks after launch, without waiting for the 25% threshold | default, pending | routes.md (`/auth/start`, `/auth/continue` reserved, 404), flags-env.md (`PASSPORT_CONTINUE`) |
| V2-14 | Anime made from an idol licence (Dark Moon with ENHYPEN) lives on kpopquiz.org | default, pending | K1 series list, routes.md (no such series on anime) |
| V2-15 | Thresholds marked "estimate" accepted as a starting point, reviewed on day 30 | default, pending | registry.md (`minPublishedForIndexableHub` 3 on anime), the "New" rule |
| V2-16 | The old "K-pop and K-drama OSTs" quiz of the owner's account: rewritten within scope, else unpublished | default, pending | outside the contract (owner content) |
| V2-17 | Pokemon postponed, replaced by Cowboy Bebop | default, pending | fixtures.md, K1 |
| V2-18 | Berserk replaced by Vinland Saga | default, pending | fixtures.md, K1 |
| V2-19 | 30 named creators with the Team badge, quizzes inspired but rewritten, real numbers | accepted | owner validated it on 15 October 2026 (v2 section 9 item 19) |
| V2-20 | Second anime reviewer recruited before production, credited with consent | default, pending | G17 |
| V2-21 | Launch date: 5 April 2027 as the base, January if the 4 checks of 1 December are green | default, pending | outside the contract (L1 runbook dates) |

## 2. The 9 new defaults of the run plan (`2026-10-RUN-O1-PLAN.md` section 8, RUN-O1-PROMPT section 8)

| id | default | status | where the contract uses it |
|---|---|---|---|
| RUN-1 | 600 launch quizzes: tier A 8 series x 32, tier B 12 x 20, tier C 10 x 10, Anime Mix 4 | default, pending | formats.md (quiz draft), K2 targets |
| RUN-2 | 20 series-dedicated creators and 10 theme creators, 20 quizzes each, all with the Team badge | default, pending | fixtures.md (Team creator fixture), copy-keys.md (`anime.p1.team`) |
| RUN-3 | One extra system account "OtakuQuiz Team" for the daily quiz and Anime Mix | default, pending | registry.md (`daily.systemUserId`, launch L03), schema.sql (`sites.system_user_id`) |
| RUN-4 | Team creators earn XP only from real events (creation, real likes), never on boards | default, pending | registry.md (anime `leaderboards` off), rpcs.md (`award_world_xp` callers) |
| RUN-5 | Anime publisher 25 to 40 quizzes a day, never two in a row from one account; kpopquiz.org unchanged | default, pending | registry.md (`editorial.quizDailyCap`: anime 40, kpop 0), section 3 |
| RUN-6 | Live rooms off on OtakuQuiz at launch | default, pending | registry.md (anime `features.live` false), routes.md (live must 404 on anime) |
| RUN-7 | Sporcle and other quiz sites: listing pages only (titles, formats, play counts), never their questions | default, pending | formats.md (inspiration log: title, format, URL only) |
| RUN-8 | Cowboy Bebop and Vinland Saga replace Pokemon and Berserk | default, pending | fixtures.md, K1 |
| RUN-9 | Two tolerated parity differences: the `?v=` stylesheet hash when the served sheet is equal after the `--ux-on-accent` normalisation, and the Analytics client reference | default, pending | tokens.md 2 (the one kpop CSS change), Q0a parity N1 and N2 |

## 3. Other G0 items of BACKLOG section 7

| id | default | status | where the contract uses it |
|---|---|---|---|
| BK-1 | Oshi storage: per-series oshi in `favourite_characters` (counts on series pages from 30), the passport's top oshi in `favourites.pick`, denormalised to `world_memberships.tag_text` (BACKLOG 8 row 15) | default, pending | schema.sql (K1 and B3 objects), registry.md (`pickEntityType: 'character'`) |
| BK-2 | Oshi icon: star (BACKLOG 8 row 16) | default, pending | registry.md (anime `pickIcon: 'star'`) |
| BK-3 | Profile indexability: kpop unchanged; anime /u follows the kpop rule; Team creator profiles noindex at launch; hub /u always noindex (BACKLOG 8 row 32) | default, pending | routes.md, H1 and P1 |

## 4. Values F0 froze inside a pending default (F0 decisions, report "Decisions")

| id | value | status | follows from |
|---|---|---|---|
| F0-D1 | anime `editorial.quizDailyCap` = 40 (top of the 25 to 40 range) | default, pending | RUN-5 |
| F0-D2 | anime `editorial.weeklyGroupLimit` = 2 per series per ISO week | default, pending | BACKLOG lane B5 |
| F0-D3 | anime `features.live` = false, `leaderboards` = false | default, pending | RUN-4, RUN-6 |
| F0-D4 | anime and hub `auth.signOutModes` = global and local; kpop global only | default, pending | V2-12, P S5 |
| F0-D5 | handoff rate limits 30 per user per hour, 60 per IP hash per hour | default, pending | P 6.6, waits G15 too |

## 5. Already accepted by the owner

| id | what | status | source |
|---|---|---|---|
| WS-1 | The Working System V2 exceptions of rule 17: the run's bus is `docs/o1/` (never `docs/loop/`), SQL runs on the dev branches and a throwaway local database (never in production), F0's contract stubs and fixtures are allowed | accepted | the owner's start message, 16 October 2026 (item 6); LEDGER G0 row |
