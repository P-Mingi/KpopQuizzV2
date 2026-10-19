# Lanes (o1-contract-v1): which contract files each lane cites

Every lane of BACKLOG section 1, with the run's splits (Q0 is Q0a, Q0b and Q0c (LEDGER D-028), E1 is E1a and E1b, F0's routing spike is
F0s; `OWNERSHIP.json` and its waves), the contract files it must cite, what those files give it, and the sections to
read first. A lane's brief, report and change requests cite these files; R checks a lane's diff against them, and a CR
to a file is checked against every lane that cites it (CONTRACT.md, CR step 2).

Rule 18: every lane that builds or changes a screen cites `TWINS.md` (its rows in section 2), and every anime or hub
screen starts from its kpop twin.

`contract.test.ts` checks this file: section 1 lists exactly the lanes of `OWNERSHIP.json` (the DUMMY test lane
excepted) with their waves; the "lanes that cite it" column of `CONTRACT.md` is the inverse of section 1's `cites`;
section 2 is what the files themselves assign (manifest.md 1, twins.json, copy-keys.md 3, apis.md 1, rpcs.md 3,
flags-env.md 3, formats.md 13), and a lane with an item there cites the file that assigns it; every lane named as an
owner in routes.md 3 or as a reader in formats.md 13 cites that file; section 3 has one line per lane naming exactly
the files of its `cites` beyond the four every lane cites.

## 1. Lanes and the files they cite

Every lane cites `CONTRACT.md`, `naming.md`, `LANES.md` and `defaults.md`. `contract.types.ts` is
`apps/quiz/src/lib/db/contract.types.ts` (generated from `schema.sql`).

| lane | wave | kind | reviewer | cites |
|---|---|---|---|---|
| ORCH | 0 | orchestration | owner-facing | `CONTRACT.md`, `naming.md`, `routes.md`, `schema.sql`, `schema.base.sql`, `contract.types.ts`, `manifest.md`, `flags-env.md`, `fixtures.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md`, `twins.json`, `spike-checks.tsv` |
| F0 | 0 | code | R-ARCH | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `schema.sql`, `schema.base.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `apis.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `formats.md`, `copy-keys.md`, `link-allowlist.md`, `LANES.md`, `defaults.md`, `TWINS.md`, `twins.json`, `spike-checks.tsv` |
| F0s | 0 | spike (never merges) | R-ARCH | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `flags-env.md`, `LANES.md`, `defaults.md`, `TWINS.md`, `twins.json`, `spike-checks.tsv` |
| Q0a | 0 | code | R-ARCH | `CONTRACT.md`, `naming.md`, `routes.md`, `tokens.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `copy-keys.md`, `link-allowlist.md`, `LANES.md`, `defaults.md`, `TWINS.md`, `twins.json`, `spike-checks.tsv` |
| D0 | 0 | static | R-UX | `CONTRACT.md`, `naming.md`, `routes.md`, `tokens.md`, `fixtures.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| Q0b | 1 | code + SQL | R-ARCH | `CONTRACT.md`, `naming.md`, `schema.sql`, `schema.base.sql`, `manifest.md`, `apis.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `LANES.md`, `defaults.md` |
| Q0c | 1 | code | R-SEC, R-ARCH | `CONTRACT.md`, `naming.md`, `flags-env.md`, `LANES.md`, `defaults.md` |
| B1 | 1 | code | R-ARCH, R-SEO | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `manifest.md`, `rpcs.md`, `apis.md`, `flags-env.md`, `LANES.md`, `defaults.md` |
| B2 | 1 | code + SQL | R-SQL | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `flags-env.md`, `fixtures.md`, `LANES.md`, `defaults.md` |
| B3 | 1 | code + SQL | R-SQL | `CONTRACT.md`, `naming.md`, `registry.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `flags-env.md`, `fixtures.md`, `LANES.md`, `defaults.md` |
| B4 | 1 | code + SQL | R-SEC | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `apis.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| B5 | 1 | code + SQL | R-SQL x2 | `CONTRACT.md`, `naming.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `apis.md`, `flags-env.md`, `fixtures.md`, `LANES.md`, `defaults.md` |
| B6 | 1 | code | R-SEC, R-SEO | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `contract.types.ts`, `rpcs.md`, `apis.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `copy-keys.md`, `link-allowlist.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| B7 | 1 | code + SQL + edge fn | R-SEC, R-SQL | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `apis.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| E1a | 1 | script | R-CONTENT | `CONTRACT.md`, `naming.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `flags-env.md`, `fixtures.md`, `formats.md`, `LANES.md`, `defaults.md` |
| K1 | 1 | content + script + SQL | R-CONTENT, R-SQL | `CONTRACT.md`, `naming.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `flags-env.md`, `fixtures.md`, `formats.md`, `LANES.md`, `defaults.md` |
| K2 | 1 | content | R-CONTENT | `CONTRACT.md`, `naming.md`, `schema.sql`, `manifest.md`, `rpcs.md`, `fixtures.md`, `formats.md`, `LANES.md`, `defaults.md` |
| K3 | 1 | content | R-CONTENT | `CONTRACT.md`, `naming.md`, `schema.sql`, `manifest.md`, `formats.md`, `LANES.md`, `defaults.md` |
| K4 | 1 | content | R-CONTENT | `CONTRACT.md`, `naming.md`, `schema.sql`, `manifest.md`, `formats.md`, `LANES.md`, `defaults.md` |
| O1 | 2 | code | R-UX, R-SEO | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `rpcs.md`, `flags-env.md`, `fixtures.md`, `formats.md`, `copy-keys.md`, `link-allowlist.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| O2 | 2 | code | R-SEO, R-UX | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `contract.types.ts`, `rpcs.md`, `flags-env.md`, `fixtures.md`, `formats.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| O3 | 2 | code + SQL | R-SEO, R-UX | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| O4 | 2 | code | R-UX, R-SEC | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `contract.types.ts`, `rpcs.md`, `flags-env.md`, `fixtures.md`, `formats.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| O5 | 2 | code + SQL | R-UX | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `flags-env.md`, `fixtures.md`, `formats.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| O6 | 2 | code + SQL | R-UX, R-SEC | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `apis.md`, `flags-env.md`, `formats.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| P1 | 2 | code | R-UX, R-SEC | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `contract.types.ts`, `rpcs.md`, `apis.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `formats.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| H1 | 2 | code | R-UX, R-SEO, R-SEC | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `contract.types.ts`, `rpcs.md`, `apis.md`, `cookies.md`, `flags-env.md`, `fixtures.md`, `copy-keys.md`, `link-allowlist.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| E1b | 2 | code | R-SEC | `CONTRACT.md`, `naming.md`, `routes.md`, `schema.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `apis.md`, `flags-env.md`, `formats.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| X1 | 3 | code + content | R-SEO, R-CONTENT | `CONTRACT.md`, `naming.md`, `registry.md`, `schema.sql`, `manifest.md`, `rpcs.md`, `flags-env.md`, `formats.md`, `copy-keys.md`, `link-allowlist.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| L1 | 3 | code + docs | R-ARCH | `CONTRACT.md`, `naming.md`, `routes.md`, `schema.sql`, `manifest.md`, `apis.md`, `flags-env.md`, `copy-keys.md`, `LANES.md`, `defaults.md` |
| C1 | 4 | code (checker) | n/a | `CONTRACT.md`, `naming.md`, `routes.md`, `tokens.md`, `flags-env.md`, `copy-keys.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| C2 | 4 | checker (no build) | n/a | `CONTRACT.md`, `naming.md`, `schema.sql`, `manifest.md`, `rpcs.md`, `apis.md`, `cookies.md`, `flags-env.md`, `LANES.md`, `defaults.md` |
| C3 | 4 | code (checker) | n/a | `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `flags-env.md`, `link-allowlist.md`, `LANES.md`, `defaults.md`, `TWINS.md` |
| RPT | 4 | docs | n/a | `CONTRACT.md`, `naming.md`, `manifest.md`, `LANES.md`, `defaults.md` |

## 2. What the files assign to each lane

Each cell is copied from the file that assigns it (the test compares them): SQL files are the ids of manifest.md 1
(`001`, `002a`, `L01`); TWINS rows are the rows whose owner cell names the lane before any parenthesis; copy
namespaces are copy-keys.md 3; endpoints are apis.md 1; modules are the names of rpcs.md 3 (a row naming two lanes
counts for both); flags are flags-env.md 3; formats are the "written by" column of formats.md 13. `none` is empty.

| lane | SQL files | TWINS rows | copy namespaces | endpoints | modules | flags | formats written |
|---|---|---|---|---|---|---|---|
| ORCH | none | none | none | none | none | none | none |
| F0 | none | none | none | none | none | none | none |
| F0s | none | none | none | none | none | none | none |
| Q0a | none | none | none | none | none | none | none |
| D0 | none | none | none | none | none | none | none |
| Q0b | none | none | none | none | none | none | none |
| Q0c | none | none | none | none | none | none | none |
| B1 | none | none | none | none | cronForSite, getQuizOfTheDay, levelTitlesFor | none | none |
| B2 | 001, L01, 002a, 002b, 002c, 002d | none | none | none | forSite, withSite | SITE_SCOPE | none |
| B3 | 003, 004, 005, 007, L06 | none | none | none | levelTitlesFor, profileForSite, awardXpForSite, PersonName | none | none |
| B4 | 006 | 37 | kpop.b4, anime.b4, hub.b4 | /auth/passport/out, /auth/arrive, /auth/authorize, /auth/land, /api/passport/redeem, /api/passport/after-signin, /api/passport/revalidate, /api/cron/passport-cleanup | safeReturnTo | PASSPORT_JUMP, PASSPORT_CONTINUE, PASSPORT_SEED | none |
| B5 | 008, 009, 010 | none | none | none | getQuizOfTheDay | none | none |
| B6 | none | none | kpop.b6, anime.b6 | /api/n/me, /api/n/b | bridgeHref, editorialHref, eligibleFor, canShow, NetLink | NEXT_PUBLIC_NET_BEACON, NEXT_PUBLIC_NET_FOOTER, NEXT_PUBLIC_NET_MENU | none |
| B7 | 016, L03 | 37 | anime.b7, hub.b7 | /auth/confirm, /api/passport/delete, /api/passport/cancel, /api/passport/leave, /api/cron/passport-deletions | none | none | none |
| E1a | none | none | none | none | none | none | fact, review packet |
| K1 | 011, L04, L05 | none | none | none | none | none | fact |
| K2 | L02, L07 | none | none | none | none | none | quiz draft, creator profile |
| K3 | L08, L10 | none | none | none | none | none | daily bank row, Which character question set, Which character set, name-all set, this-or-that bracket |
| K4 | L09 | none | none | none | none | none | playlist, crossover entry |
| O1 | none | 1, 10, 21, 22, 23, 23b, 24, 25, 26, 26b, 26c, 27, 27b, 28, 30, 30b, 34, 35, 36 | anime.o1 | none | none | none | none |
| O2 | none | 2, 3, 4, 5, 31, 31b, 31c, 31d, 32, 32b, 32c, 33 | anime.o2 | none | none | none | none |
| O3 | 015 | 6, 7, 8 | anime.o3 | none | computeSpoilerLevel, isSafeFor, SpoilerShield | none | none |
| O4 | none | 9 | anime.o4 | none | none | none | none |
| O5 | 013 | 14, 15 | anime.o5 | none | none | none | none |
| O6 | 014 | 11, 12, 13 | anime.o6 | /api/cron/ensure-daily-opening | none | none | none |
| P1 | none | 16, 17, 18, 19, 20 | anime.p1 | none | none | none | none |
| H1 | none | H-0, H-1, H-2, H-3, H-4, H-5, H-6, H-7, H-8 | hub.h1 | none | none | none | none |
| E1b | 012 | 29 | anime.e1b | none | none | none | none |
| X1 | L11 | none | kpop.x1, anime.x1 | none | CrossoverFact | NEXT_PUBLIC_NET_FACTS | quiz draft |
| L1 | L12 | none | kpop.l1 | /admin/network | none | none | none |
| C1 | none | none | none | none | none | none | none |
| C2 | none | none | none | none | none | none | none |
| C3 | none | none | none | none | none | none | none |
| RPT | none | none | none | none | none | none | none |

Not in the table, because no file gives them one owner: `getLevelInfo` (rpcs.md 3, no owner yet: request F0-12),
the rows 8, 23 and 23b blocks built by a second lane (the owner cell's parenthesis: O5's This or that bonus on row
8, O3's spoiler flair on rows 23 and 23b), the A blocks other lanes build inside O2's rows (A3's oshi button with P1,
A4's crossover credit slot with X1 and the blind test link with O6, A5's shield with O3), and the kpop deltas of
TWINS.md 5 (B6, X1).

## 3. Sections to read first, per lane

Each line names every file of the lane's `cites` beyond the four every lane cites; numbers are the files' own
section numbers, and `schema.sql` is cited by its `@file` sections.

- **ORCH**: `routes.md` 1 (the wiring after GH, requests F0-3, F0-4), `schema.sql` and `schema.base.sql` (header:
  how they load), `contract.types.ts` (`gen-contract-types.mts --check`, request F0-11), `manifest.md` 1 (the order
  `migrate-dev.sh` reads), 4 (crons, request F0-7), `flags-env.md` 6, `fixtures.md` 1 (the fixture step, requests
  F0-13, F0-15), `copy-keys.md` 1 (copy file owners, request F0-1), `TWINS.md` 1 and `twins.json` (check.sh),
  `spike-checks.tsv` (gate).
- **F0**: every file (owner until the tag, then ORCH applies CRs): `registry.md`, `routes.md`, `tokens.md`,
  `schema.sql`, `schema.base.sql`, `contract.types.ts`, `manifest.md`, `rpcs.md`, `apis.md`, `cookies.md`,
  `flags-env.md`, `fixtures.md`, `formats.md`, `copy-keys.md`, `link-allowlist.md`, `TWINS.md`, `twins.json`,
  `spike-checks.tsv`.
- **F0s**: `registry.md` (the site of a build), `routes.md` 1 and 6, `flags-env.md` 1 and 2, `TWINS.md` 1 rule 4 and
  `twins.json` (the spike pages are placeholders), `spike-checks.tsv`.
- **Q0a**: `routes.md` 3 and 5 (the leak suite's route lists), `tokens.md` 2 (N1), `cookies.md` 2 (the dev cookie
  name, B4's helper), `flags-env.md` 6, `fixtures.md` 2 and 3 (slugs for the content leak), `copy-keys.md` 1 (string
  leak), `link-allowlist.md` 2 and its JSON, `TWINS.md` 1 and 2 and `twins.json` (twins.mts), `spike-checks.tsv`.
- **D0**: `routes.md` 3 (a frame per route), `tokens.md` 1, 4, 6, 7, `fixtures.md` 3 (Death Note, One Piece),
  `copy-keys.md` 3 (the copy deck), `TWINS.md` (every row: the anime frame next to its kpop twin).
- **Q0b**: `schema.sql` 008 (equivalence fixtures of B5), `schema.base.sql` and `manifest.md` 3 (local scratch
  cluster), `apis.md` 2 and 3 (auth smoke suite), `cookies.md` 1 to 5, `flags-env.md` 5 and 6, `fixtures.md` 1 and 2.
- **Q0c**: `flags-env.md` 1 (the kpop build parity compares), 5 (secret names: the proxy holds the real keys, never
  prints them) and 6 (`env.sh`, the run variables).
- **B1**: `registry.md` (every section; kpop values equal today's literals), `routes.md` 1 to 3, `tokens.md` 2 and 3
  (`--ux-on-accent`, the per-site sheet hook), `manifest.md` 4 (`cronForSite` on every cron), `rpcs.md` 3
  (`cronForSite`, `getQuizOfTheDay`, `levelTitlesFor`), `apis.md` 5, `flags-env.md` 1 and 2.
- **B2**: `registry.md` (the site of a build), `routes.md` 3 (`/notifications`, `/search` scope), `schema.sql` 001,
  L01-B2-sites, 002a to 002d, `contract.types.ts`, `manifest.md` 1 to 3, `rpcs.md` 1, 3 (`forSite`, `withSite`) and
  5, `flags-env.md` 3 (`SITE_SCOPE`), `fixtures.md` 1.
- **B3**: `registry.md` (feature keys, level titles), `schema.sql` 003, 004, 005, 007, `contract.types.ts`,
  `manifest.md` 1 to 3 (and L06), `rpcs.md` 2.1, 2.3, 2.4, 3, 4 and 5, `flags-env.md` 3, `fixtures.md` 2 (the
  memberships each fixture account must reach, request F0-15).
- **B4**: `registry.md` (origins), `routes.md` 3 (shared auth handlers), `schema.sql` 006, `contract.types.ts`,
  `manifest.md` 1 to 4, `rpcs.md` 2.1 and 2.4 (issue, redeem, log), 3 (`safeReturnTo`), `apis.md` 1 to 3 and 5,
  `cookies.md` (every section), `flags-env.md` 3 to 5, `fixtures.md` 2, `copy-keys.md` 3 (`b4.land`, pending),
  `TWINS.md` row 37.
- **B5**: `schema.sql` 008, 009, 010, `contract.types.ts`, `manifest.md` 1 to 4, `rpcs.md` 2.2 (ACL as today), 2.4
  and 3 (`getQuizOfTheDay`), `apis.md` 5 (`ensure-daily-quiz`), `flags-env.md` 3, `fixtures.md` 1.
- **B6**: `registry.md` (letters, `NETWORK`), `routes.md` 1, `contract.types.ts` (`bridge_daily`,
  `passport_prefs`), `rpcs.md` 2.1 (`net_bridge_bump`), 3 and 4, `apis.md` 4, `cookies.md` 7 (client storage),
  `flags-env.md` 3 and 4, `fixtures.md` 2, `copy-keys.md` 3 (`kpop.b6`, `anime.b6`), `link-allowlist.md`,
  `TWINS.md` 5 (the kpop deltas).
- **B7**: `registry.md` (`siteForOrigin`, brands), `routes.md` 3, `schema.sql` 016, `contract.types.ts`,
  `manifest.md` 1 to 4 (and L03, the Send Email Hook row), `rpcs.md` 2.1 and 2.4 (deletion, leave), `apis.md` 3 and
  5, `cookies.md` 5, `flags-env.md` 5, `fixtures.md` 2, `copy-keys.md` 1 (the Edge Function copy) and 3,
  `TWINS.md` row 37.
- **E1a**: `schema.sql` 011 and 012 (the columns its emitters fill), `contract.types.ts`, `manifest.md` 1 (launch
  files it emits for K1 to K4, X1), `flags-env.md` 6, `fixtures.md` 3 (the S 4.7 sample), `formats.md` (every
  section; checks C1 to C14 read the schemas).
- **K1**: `schema.sql` 011, `contract.types.ts`, `manifest.md` 1 (011, L04, L05), `flags-env.md` 6, `fixtures.md` 3
  (replaced by its first load), `formats.md` 1 to 3 and 13.
- **K2**: `schema.sql` 003 and 012 (`create_profile_for_site`, `editorial_accounts`, drafts), `manifest.md` 1 (L02,
  L07), `rpcs.md` 2.1, `fixtures.md` 2 (the 31 Team accounts), `formats.md` 4, 6 and 12.
- **K3**: `schema.sql` 009 and 013, `manifest.md` 1 (L08, L10), `formats.md` 5, 8, 9, 10 and 12.
- **K4**: `schema.sql` 011 and 014 (`series_themes`, `daily_openings`), `manifest.md` 1 (L09), `formats.md` 7, 11
  and 12.
- **O1**: `registry.md` (anime entry, feature keys), `routes.md` 1 to 5, `tokens.md` 3 to 7, `rpcs.md` 3
  (`getQuizOfTheDay`, `getLevelInfo`), `flags-env.md` 1 and 2, `fixtures.md` 2, `formats.md` 6 (Team creators on
  `/about`), `copy-keys.md` 1 to 3, `link-allowlist.md` 2 (footer, About lines), `TWINS.md` 1 to 3 and its rows.
- **O2**: `registry.md` (vocabulary, thresholds), `routes.md` 3 and 4, `tokens.md` 3, `contract.types.ts`
  (`series`, `arcs`, `characters`, `series_themes`), `rpcs.md` 3 and 4, `flags-env.md` 1, `fixtures.md` 3,
  `formats.md` 3 (trivia facts), `copy-keys.md` 3, `TWINS.md` 1 to 3 and its rows.
- **O3**: `registry.md`, `routes.md` 3, `tokens.md` 3, `schema.sql` 015, `contract.types.ts`, `manifest.md` 1,
  `rpcs.md` 2.1 (`report_spoiler`), 3 (`computeSpoilerLevel`, `isSafeFor`, `SpoilerShield`), `cookies.md` 7 (the
  guest spoiler store), `flags-env.md` 1, `fixtures.md` 3 (`expected_level`), `copy-keys.md` 3, `TWINS.md` 2 (A5)
  and its rows.
- **O4**: `registry.md`, `routes.md` 3, `tokens.md` 3, `contract.types.ts`, `rpcs.md` 3 (`computeSpoilerLevel`),
  `flags-env.md` 1, `fixtures.md` 3, `formats.md` 2 (the anime question shape), `copy-keys.md` 3, `TWINS.md` row 9.
- **O5**: `registry.md`, `routes.md` 3 and 4, `tokens.md` 3, `schema.sql` 013, `contract.types.ts`, `manifest.md` 1,
  `rpcs.md` 3, `flags-env.md` 1, `fixtures.md` 3, `formats.md` 8 to 10, `copy-keys.md` 3, `TWINS.md` rows 8, 14, 15.
- **O6**: `registry.md`, `routes.md` 3 and 4, `tokens.md` 3, `schema.sql` 014, `contract.types.ts`, `manifest.md` 1
  and 4, `rpcs.md` 3, `apis.md` 5 (`ensure-daily-opening`), `flags-env.md` 1, `formats.md` 7 and 11, `copy-keys.md`
  3, `TWINS.md` rows 11 to 13.
- **P1**: `registry.md` (ladders, sign-in providers), `routes.md` 3, `tokens.md` 3, `contract.types.ts`, `rpcs.md` 3
  and 4 (`profileForSite`, the member projection), `apis.md` 3 and 6, `cookies.md` 7, `flags-env.md` 1 and 3
  (no welcome flag: CR-002 to CR-006 refused, D-027), `fixtures.md` 2, `formats.md` 6, `copy-keys.md` 3, `TWINS.md` 2 and 6 and its
  rows.
- **H1**: `registry.md` (hub entry), `routes.md` 3 and 5, `tokens.md` 3 and 4.3, `contract.types.ts`, `rpcs.md` 2.1
  (`public_passport`, `my_passport`, `set_passport_prefs`), 3 and 4, `apis.md` 3 and 6, `cookies.md` 7,
  `flags-env.md` 1 and 2, `fixtures.md` 2, `copy-keys.md` 3, `link-allowlist.md` 2 (network page, directory),
  `TWINS.md` 4 (rows H-0 to H-8).
- **E1b**: `routes.md` 3 (`/admin/review`), `schema.sql` 012, `contract.types.ts`, `manifest.md` 1 and 4
  (`editorial-publish`), `rpcs.md` 1, `apis.md` 6 (`editorial-publish`), `flags-env.md` 1, `formats.md` 4 and 12,
  `copy-keys.md` 3 (`anime.e1b`), `TWINS.md` row 29.
- **X1**: `registry.md`, `schema.sql` 002a (L11 rows), `manifest.md` 1 (L11), `rpcs.md` 3 (`CrossoverFact`),
  `flags-env.md` 3 (`NEXT_PUBLIC_NET_FACTS`), `formats.md` 4 and 11, `copy-keys.md` 3, `link-allowlist.md` 2 (Team
  article, About lines), `TWINS.md` 5 (the kpop deltas) and the A4 slot of O2's rows.
- **L1**: `routes.md` 1 and 3, `schema.sql` 001 and L01-B2-sites (L12 flips `sites.status`), `manifest.md` 2 and 4,
  `apis.md` 7 (`/admin/network`), `flags-env.md` 3 to 5, `copy-keys.md` 3 (`kpop.l1`, pending).
- **C1**: `routes.md` 3, `tokens.md` 6, `flags-env.md` 1 and 2, `copy-keys.md` 3, `TWINS.md` (every row against D0).
- **C2**: `schema.sql` (every section), `manifest.md` 1 to 3, `rpcs.md` 2 and 5, `apis.md` 1.1, `cookies.md`,
  `flags-env.md` 5 (the secrets scan).
- **C3**: `registry.md` (`routes.allow`, SEO fields), `routes.md` 3 to 5, `flags-env.md` 1 and 2,
  `link-allowlist.md`, `TWINS.md` 1.
- **RPT**: `manifest.md` 2 (the exact SQL order for the owner).
