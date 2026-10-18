# G0 defaults (o1-contract-v1)

Gate G0 asked the owner to confirm these defaults (RUN-O1-PROMPT section 8, BACKLOG section 7 row G0). The owner
answered on 16 October 2026 at 17:07 UTC: every default is confirmed (LEDGER D-021, "ok pour tous les choix par
défaut"). Every row below is therefore **confirmed by the owner (G0, 2026-10-16)**, except the rows the owner had
already accepted before G0. A later change by the owner is a CR (`CONTRACT.md`); ORCH records it in `LEDGER.md` and
the row then carries the owner's new value and the CR number.

What G0 did not decide: CR-002 to CR-006 were proposals, not defaults (LEDGER D-021); the owner refused them for O1 on
18 October 2026 (LEDGER D-027), backlog after launch, so `copy-keys.md`, `flags-env.md` and `cookies.md` hold no copy
key, flag or storage name for them. The values that also wait for another gate say so in their last column (G5 for colour values, G6 for the personas, G15
for the rate limits, G16 for the texts: sign-out wording, privacy and deletion policies).

`contract.test.ts` checks that the two lists are complete (21 and 9 rows), that every row carries one of the two
status words below, and that no contract file still carries the old pending status of a default.

Status words: `confirmed by the owner (G0, 2026-10-16)`, `accepted` (the owner said yes before G0).

## 1. The 21 decisions of the v2 plan (`2026-10-MULTI-NICHE-v2.md` section 9)

| id | default | status | where the contract uses it |
|---|---|---|---|
| V2-01 | Network name FanQuiz, fanquiz.org (fallback quizworlds.org) | confirmed by the owner (G0, 2026-10-16) | naming.md, registry.md (`NETWORK`, hub brand) |
| V2-02 | OtakuQuiz colour: Persimmon, Option A | confirmed by the owner (G0, 2026-10-16) | tokens.md 4.2 (values also wait for G5) |
| V2-03 | Vocabulary "sites" on kpopquiz.org and otakuquiz.org ("Your sites"), "worlds" only on fanquiz.org; the code type is `SiteId` (naming.md) | confirmed by the owner (G0, 2026-10-16) | naming.md traps, copy-keys.md 4 |
| V2-04 | Show the artist of an opening to everyone ("TOP · Stray Kids"), no link for anonymous visitors | confirmed by the owner (G0, 2026-10-16) | copy-keys.md (`anime.x1.credit`), link-allowlist.md |
| V2-05 | "Search the whole network" line on an empty search for anonymous visitors: later | confirmed by the owner (G0, 2026-10-16) | no route, no key in the run |
| V2-06 | "Your sites" menu on kpopquiz.org: automatic (accounts with 2 sites), reviewed after 4 weeks | confirmed by the owner (G0, 2026-10-16) | flags-env.md (`NEXT_PUBLIC_NET_MENU`) |
| V2-07 | Footer line on kpopquiz.org: on the anime launch day, not before | confirmed by the owner (G0, 2026-10-16) | flags-env.md (`NEXT_PUBLIC_NET_FOOTER` off until L1) |
| V2-08 | Passport deletion: 7-day grace period, published quizzes kept under "deleted user" by default | confirmed by the owner (G0, 2026-10-16) | cookies.md 3 (`deletion_pending`), schema.sql (B7 objects) |
| V2-09 | Anime title ladder validated (v2 section 3) | confirmed by the owner (G0, 2026-10-16) | registry.md (anime `levelTitles`: the v2 ladder on the kpop thresholds) |
| V2-10 | P3: silent P3a, the K-pop sign-in screen does not change | confirmed by the owner (G0, 2026-10-16) | flags-env.md (`PASSPORT_SEED` reserved, inert) |
| V2-11 | Discord on OtakuQuiz: not at launch, reviewed if 10% of sign-ins ask for it | confirmed by the owner (G0, 2026-10-16) | registry.md (anime `auth.providers`: google, email) |
| V2-12 | "Sign out: On this device" text on kpopquiz.org corrected if the two-device test shows a global sign-out | confirmed by the owner (G0, 2026-10-16) | registry.md (kpop `signOutModes: ['global']`), G16 |
| V2-13 | P2: 4 weeks after launch, without waiting for the 25% threshold | confirmed by the owner (G0, 2026-10-16) | routes.md (`/auth/start`, `/auth/continue` reserved, 404), flags-env.md (`PASSPORT_CONTINUE`) |
| V2-14 | Anime made from an idol licence (Dark Moon with ENHYPEN) lives on kpopquiz.org | confirmed by the owner (G0, 2026-10-16) | K1 series list, routes.md (no such series on anime) |
| V2-15 | Thresholds marked "estimate" accepted as a starting point, reviewed on day 30 | confirmed by the owner (G0, 2026-10-16) | registry.md (`minPublishedForIndexableHub` 3 on anime), the "New" rule |
| V2-16 | The old "K-pop and K-drama OSTs" quiz of the owner's account: rewritten within scope, else unpublished | confirmed by the owner (G0, 2026-10-16) | outside the contract (owner content) |
| V2-17 | Pokemon postponed, replaced by Cowboy Bebop | confirmed by the owner (G0, 2026-10-16) | fixtures.md, K1 |
| V2-18 | Berserk replaced by Vinland Saga | confirmed by the owner (G0, 2026-10-16) | fixtures.md, K1 |
| V2-19 | 30 named creators with the Team badge, quizzes inspired but rewritten, real numbers | accepted | owner validated it on 15 October 2026 (v2 section 9 item 19) |
| V2-20 | Second anime reviewer recruited before production, credited with consent | confirmed by the owner (G0, 2026-10-16) | G17 |
| V2-21 | Launch date: 5 April 2027 as the base, January if the 4 checks of 1 December are green | confirmed by the owner (G0, 2026-10-16) | outside the contract (L1 runbook dates) |

## 2. The 9 new defaults of the run plan (`2026-10-RUN-O1-PLAN.md` section 8, RUN-O1-PROMPT section 8)

| id | default | status | where the contract uses it |
|---|---|---|---|
| RUN-1 | 600 launch quizzes: tier A 8 series x 32, tier B 12 x 20, tier C 10 x 10, Anime Mix 4 | confirmed by the owner (G0, 2026-10-16) | formats.md (quiz draft), K2 targets |
| RUN-2 | 20 series-dedicated creators and 10 theme creators, 20 quizzes each, all with the Team badge | confirmed by the owner (G0, 2026-10-16) | fixtures.md (Team creator fixture), copy-keys.md (`anime.p1.team`) |
| RUN-3 | One extra system account "OtakuQuiz Team" for the daily quiz and Anime Mix | confirmed by the owner (G0, 2026-10-16) | registry.md (`daily.systemUserId`, launch L02), schema.sql (`sites.system_user_id`) |
| RUN-4 | Team creators earn XP only from real events (creation, real likes), never on boards | confirmed by the owner (G0, 2026-10-16) | registry.md (the boards exclude the Team accounts; anime `leaderboards` is on since CR-001, TWINS row 35), rpcs.md (`award_world_xp` callers) |
| RUN-5 | Anime publisher 25 to 40 quizzes a day, never two in a row from one account; kpopquiz.org unchanged | confirmed by the owner (G0, 2026-10-16) | registry.md (`editorial.quizDailyCap`: anime 40, kpop 0), section 3 |
| RUN-6 | Live rooms off on OtakuQuiz at launch | confirmed by the owner (G0, 2026-10-16) | registry.md (anime `features.live` false), routes.md (live must 404 on anime) |
| RUN-7 | Sporcle and other quiz sites: listing pages only (titles, formats, play counts), never their questions | confirmed by the owner (G0, 2026-10-16) | formats.md (inspiration log: title, format, URL only) |
| RUN-8 | Cowboy Bebop and Vinland Saga replace Pokemon and Berserk | confirmed by the owner (G0, 2026-10-16) | fixtures.md, K1 |
| RUN-9 | Two tolerated parity differences: the `?v=` stylesheet hash when the served sheet is equal after the `--ux-on-accent` normalisation, and the Analytics client reference | confirmed by the owner (G0, 2026-10-16) | tokens.md 2 (the one kpop CSS change), Q0a parity N1 and N2 |

## 3. Other G0 items of BACKLOG section 7

| id | default | status | where the contract uses it |
|---|---|---|---|
| BK-1 | Oshi storage: per-series oshi in `favourite_characters` (counts on series pages from 30), the passport's top oshi in `favourites.pick`, denormalised to `world_memberships.tag_text` (BACKLOG 8 row 15) | confirmed by the owner (G0, 2026-10-16) | schema.sql (K1 and B3 objects), registry.md (`pickEntityType: 'character'`) |
| BK-2 | Oshi icon: star (BACKLOG 8 row 16) | confirmed by the owner (G0, 2026-10-16) | registry.md (anime `pickIcon: 'star'`) |
| BK-3 | Profile indexability: kpop unchanged; anime /u follows the kpop rule; Team creator profiles noindex at launch; hub /u always noindex (BACKLOG 8 row 32) | confirmed by the owner (G0, 2026-10-16) | routes.md, H1 and P1 |

## 4. Values F0 froze inside a default (F0 decisions, report "Decisions"), confirmed with it

| id | value | status | follows from |
|---|---|---|---|
| F0-D1 | anime `editorial.quizDailyCap` = 40 (top of the 25 to 40 range) | confirmed by the owner (G0, 2026-10-16) | RUN-5 |
| F0-D2 | anime `editorial.weeklyGroupLimit` = 2 per series per ISO week | confirmed by the owner (G0, 2026-10-16) | BACKLOG lane B5 |
| F0-D3 | anime `features.live` = false (`leaderboards` = true since CR-001, TWINS row 35; the Team accounts stay off every board, RUN-4) | confirmed by the owner (G0, 2026-10-16) | RUN-6, CR-001 |
| F0-D4 | anime and hub `auth.signOutModes` = global and local; kpop global only | confirmed by the owner (G0, 2026-10-16) | V2-12, P S5 |
| F0-D5 | handoff rate limits 30 per user per hour, 60 per IP hash per hour | confirmed by the owner (G0, 2026-10-16) | P 6.6; G15 (the owner's reading of the Supabase Auth limits) may still move the numbers, never the names |

## 5. Already accepted by the owner

| id | what | status | source |
|---|---|---|---|
| WS-1 | The Working System V2 exceptions of rule 17: the run's bus is `docs/o1/` (never `docs/loop/`), SQL runs on the dev branches and a throwaway local database (never in production), F0's contract stubs and fixtures are allowed | accepted | the owner's start message, 16 October 2026 (item 6); LEDGER G0 row |

## 6. Read as confirmed with G0 (LEDGER D-021)

| id | what | status | where the contract uses it |
|---|---|---|---|
| G6-1 | The default list of 30 launch series (G6) | confirmed by the owner (G0, 2026-10-16) | K1 series list, fixtures.md (slice 7) |
| G6-2 | The creator persona method: K2 drafts the personas, the owner validates each one (G6; the personas themselves are still to validate) | confirmed by the owner (G0, 2026-10-16) | K2, fixtures.md (Team creator fixture) |
