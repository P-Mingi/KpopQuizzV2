# Run O1 contract, version `o1-contract-v1`

Owner: lane F0 (branch `o1/F0`). Reviewer: R-ARCH. When R passes F0, ORCH tags `o1-contract-v1` on the merge
commit; from then on a change to a frozen item is a change request (CR, below).

Sources, in order of authority: `RUN-O1-PROMPT.md` (section 9 overrides), then `BACKLOG.md` (section 5: the contract
list; section 4: database objects; section 8: resolved contradictions), then `COLLISION-MAP.md`. Where this
contract decides something no document fixed, the decision is listed in `docs/o1/reports/F0.md` ("Decisions") and
marked "F0 decision" in the file that freezes it. The G0 defaults are listed in `defaults.md`; the owner confirmed
every one of them on 16 October 2026 (LEDGER D-021), so each is marked "confirmed by the owner (G0, 2026-10-16)".
CR-002 to CR-006 are not defaults: they stay pending until the owner decides them.

## Files

| file | what it freezes | lanes that cite it | status |
|---|---|---|---|
| `CONTRACT.md` | this index, the CR process | all | written |
| `naming.md` | identifiers, naming traps, file and folder names | all | written |
| `registry.md` | `SiteId`, `SiteConfig`, `SITE`, `NETWORK`, the three entries | B1, O1, H1, B6, P1 | written |
| `routes.md` | route map per site, otakuquiz.org URL scheme, the rewrite design, the "must 404" list | ORCH, B1, O1 to O6, H1, Q0a, D0 | written |
| `tokens.md` | theme token names, selectors, new tokens | B1, O1, H1, D0 | written |
| `schema.sql` | DDL shape of every BACKLOG 4.1 object | B2, B3, B4, B5, B7, K1, E1, O3, O5, O6, L1 | written |
| `schema.base.sql` | not frozen: the stand-in for today's production objects that `schema.sql` builds on, so the scripts run on a local cluster with no file from outside the repository; `check-contract.mts --prod-copy` proves it gives production's contract (G3, 2026-10-17: 0 of 557 objects differ) | F0 scripts, Q0b | written, checked against G3 |
| `lib/db/contract.types.ts` | generated from `schema.sql` by `gen-contract-types.mts` (never edited by hand); stamped with the sha256 of `schema.sql` | B2 to B7, K1, E1, O3, O5, O6, H1, P1 | written |
| `manifest.md` | SQL file names, order, owner, transaction mode, production phase, prerequisites, cron schedules | every SQL lane, ORCH (`migrate-dev.sh`) | written |
| `rpcs.md` | callers, roles and semantics of every function of `schema.sql`; the server modules and component props of BACKLOG 5.1 with their signature types; the projection of another member's row | B1 to B7, E1, K2, O2, O3, O5, O6, H1, P1, X1 | written |
| `apis.md` | every HTTP route of BACKLOG 5.1 (method, sites, flag, inputs, answers, logged outcomes), the new crons, the existing shared routes the run extends | B4, B5, B6, B7, E1b, O6, H1, P1, L1, Q0b | written |
| `cookies.md` | ticket, `__Host-pp_tx`, code format, outcome enum | B4, B7, H1, P1 | written |
| `flags-env.md` | flags, env names, secret names, dev hosts | all code lanes, L1 | written |
| `fixtures.md` + `fixtures/` | the 38 fixture accounts (`users.json`, the list ORCH's `fixtures/run.mts` creates) and the three fixture series (`series/*.json`, `series-fixture.schema.json`): who loads what and when | Q0b, B3, B4, B7, O2 to O5, P1, H1, D0, ORCH | written |
| `formats.md` + `schemas/` | the content formats (fact, quiz draft, daily bank row, creator profile, playlist, Which character question set and set, name-all set, this-or-that bracket, crossover entry, review packet) as JSON Schemas, with where each lands | E1a, E1b, K1 to K4, O5, O6, X1 | written |
| `copy-keys.md` | copy keys per site and lane (keys only) | D0, O1 to O6, P1, H1, B6, X1 | written |
| `link-allowlist.md` + `link-allowlist.json` | cross-site links allowed in crawlable HTML (the JSON is read by Q0a's `check-network-links.mts`) | Q0a, B6, X1, H1, O1 | written |
| `LANES.md` | every lane of BACKLOG section 1 and the sections it cites | all, R | pending |
| `defaults.md` | the G0 defaults, each "confirmed by the owner (G0, 2026-10-16)" | all, ORCH | written |
| `TWINS.md` | rule 18: every anime and FanQuiz page, its kpop twin, the shared components it imports, its closed list of differences | D0, O1 to O6, P1, H1, E1b, X1, Q0a, R | written |
| `twins.json` | the machine form of `TWINS.md` (same rows), read by Q0a's `apps/quiz/scripts/o1/twins.mts` through `scripts/o1/check.sh` | Q0a, gate, R | written |
| `spike-checks.tsv` | route checks of the routing spike (branch `o1/F0s` only) | gate | on `o1/F0s` |

Code that implements the contract on `o1/F0` (compiling stubs, imported by nothing on the kpop path until B1
wires them): `apps/quiz/src/lib/site/{types,registry,routing,index}.ts` with `registry.test.ts`, `routing.test.ts`
and `contract.test.ts` (the checkable rules of the contract files: token names, per-site sheets, copy files, the
flag and secret tables, the G0 list, the SQL manifest and the conventions of `schema.sql`; it grows with every
slice). Types and constants (slice 6): `lib/network/types.ts` (NetBridgeId, NetMe, the beacon, caps, crossover
entry, NetLink and CrossoverFact props), `lib/passport/types.ts` (memberships, the member projection, the handoff
formats, the HTTP bodies of apis.md) and `lib/anime/types.ts` (series rows, question tags, spoiler level and
progress, bank categories). The server modules of BACKLOG 5.1 are frozen as signature types (`SiteServerFns`,
`PassportServerFns`, `NetLinkFns`, `NetEligibilityFns`, `AnimeSpoilerFns`): an owner lane implements one as
`export const forSite: SiteServerFns['forSite'] = ...`, so a drifting signature fails tsc (rpcs.md 3).
The content formats (slice 8) are checked by `apps/quiz/scripts/o1/contract/json-schema.ts`, a validator of the JSON
Schema subset `schemas/` uses (no dependency): E1's check C1 and the lanes' tests import `validate` and
`validateEntries`, and `contract.test.ts` validates every lane data file named `<name>.<format>.json` (formats.md 1).

### The schema contract in a database (slice 5)

- `apps/quiz/scripts/o1/gen-contract-types.mts` writes `apps/quiz/src/lib/db/contract.types.ts` from `schema.sql`
  (override 8: psql and the catalog, never the Supabase command line): it loads the base, then `schema.sql` section
  by section, in one rolled-back transaction on a throwaway local Postgres 18 cluster (or, `--base db`, on
  o1-scratch only). The file maps the frozen SQL names to types, shaped like Supabase's `Database` type:
  `ContractTables` (Row, Insert), `ContractAddedColumns`, `ContractViews`, `ContractFunctions` (Args, Returns) and
  the helpers `TableRow`, `TableInsert`, `ViewRow`, `FnArgs`, `FnReturns`. Its header stamps the sha256 of
  `schema.sql`; `contract.test.ts` fails when the stamp is stale, and `--check` exits 1 when the text differs.
- `apps/quiz/scripts/o1/check-contract.mts` diffs a database against the contract. The contract is the delta that
  each `@file` section makes on the base: relation kind, RLS, view options and grants; column type, nullability,
  default and identity; constraint and index definitions; function arguments with defaults, result, SECURITY
  mode, search_path and EXECUTE grants; trigger definitions; policy command, roles and mode (policy expressions
  are intent, frozen as comments, not compared); enum labels; the objects a section drops must be absent. Grants
  are read for PUBLIC, anon, authenticated and service_role only; MAINTAIN (Postgres 17 and later) is ignored.
  `--self-test` is the done test (a database built from `schema.sql`: zero diffs; 19 planted differences: each
  reported). `--target db` reads a branch (`scripts/o1/env.sh scratch|dev`) in a read-only transaction;
  `--applied-only` lists a section none of whose new objects exist yet as not applied instead of failing, and
  requires every object of a section that is partly there. `--prod-copy <KPQ/prod-public.sql>` (G3) builds the
  contract on `schema.base.sql` and on production's catalog copy (under the stand-in's platform part and rows) and
  lists every object whose section, novelty or value differs: rerun it on every new copy of production's schema, and
  fix `schema.base.sql` (or `schema.sql`, before the tag) where it reports one.
- Both scripts refuse a database URL that names the production project or lacks the branch ref (exit 5) and never
  print it. Local clusters live under `O1_PG_TMP` (else the OS temp folder) and are deleted at exit.

## Change requests (CR)

1. A lane that needs a change files it in its worktree: `docs/o1/requests/<lane>.md`, one numbered item headed
   `CR:` with the contract file, the exact change, why, and which lanes it touches.
2. ORCH forwards it to R-ARCH, who checks it against the two lists below and against every lane that cites the
   file (`LANES.md`).
3. ORCH records the verdict in `LEDGER.md` ("Change requests": `CR-nnn`, lane, change, review, status). An accepted
   CR is applied by F0's files owner of the moment (F0 while it runs, then ORCH) in one commit that names `CR-nnn`.
4. A lane never works around the contract in its own files while a CR is pending: it codes against the frozen
   shape, or behind a flag, and says so in its report.

### What a CR may add (BACKLOG 5.2), without a re-freeze

- New nullable or defaulted columns, new tables, new indexes, new views. Never a rename or a retype of a frozen
  object.
- New optional `SiteConfig` fields; new feature keys (default false on every site that does not set them); anime and
  hub registry values (vocabulary text, titles, token values within the frozen token names).
- New anime or hub routes. Never a new kpop route beyond the ones `routes.md` lists.
- New `NetBridgeId` values, new flag names, new copy keys and all copy text (keys inside a lane's own copy files
  need no CR at all: copy-keys.md 2).
- New fixture users or series; new check codes after C14; new optional content format fields.
- New `handoff_events` outcomes.

### What no CR may change inside the run (BACKLOG 5.3)

`SiteId` values; the names and signatures of the 11 locked functions, `ensure_daily_quiz` and its v2,
`award_world_xp`, `ensure_membership`; the URL schemes; the cookie and ticket formats; the kpop route set; the theme
token names.

Anything else frozen in 5.1 and not in 5.2 needs a full re-freeze: every affected lane agrees, ORCH asks the owner.
