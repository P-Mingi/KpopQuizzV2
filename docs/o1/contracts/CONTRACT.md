# Run O1 contract, version `o1-contract-v1`

Owner: lane F0 (branch `o1/F0`). Reviewer: R-ARCH. When R passes F0, ORCH tags `o1-contract-v1` on the merge
commit; from then on a change to a frozen item is a change request (CR, below).

Sources, in order of authority: `RUN-O1-PROMPT.md` (section 9 overrides), then `BACKLOG.md` (section 5: the contract
list; section 4: database objects; section 8: resolved contradictions), then `COLLISION-MAP.md`. Where this
contract decides something no document fixed, the decision is listed in `docs/o1/reports/F0.md` ("Decisions") and
marked "F0 decision" in the file that freezes it. A G0 default the owner has not confirmed yet is marked
"default, pending" and listed in `defaults.md`.

## Files

| file | what it freezes | lanes that cite it | status |
|---|---|---|---|
| `CONTRACT.md` | this index, the CR process | all | written |
| `naming.md` | identifiers, naming traps, file and folder names | all | written |
| `registry.md` | `SiteId`, `SiteConfig`, `SITE`, `NETWORK`, the three entries | B1, O1, H1, B6, P1 | written |
| `routes.md` | route map per site, otakuquiz.org URL scheme, the rewrite design, the "must 404" list | ORCH, B1, O1 to O6, H1, Q0a, D0 | written |
| `tokens.md` | theme token names, selectors, new tokens | B1, O1, H1, D0 | written |
| `schema.sql` | DDL shape of every BACKLOG 4.1 object | B2, B3, B4, B5, B7, K1, E1, O3, O5, O6, L1 | written |
| `schema.base.sql` | not frozen: the stand-in for today's production objects that `schema.sql` builds on, used only on a local cluster before G3 | F0 scripts, Q0b | written |
| `manifest.md` | SQL file names, order, owner, transaction mode, production phase, prerequisites, cron schedules | every SQL lane, ORCH (`migrate-dev.sh`) | written |
| `rpcs.md` | function signatures, SECURITY mode, grants, callers | B2 to B7, E1, O3, O5, O6, H1, P1 | pending |
| `apis.md` | every HTTP route of BACKLOG 5.1 | B4, B6, B7, H1, P1, Q0b | pending |
| `cookies.md` | ticket, `__Host-pp_tx`, code format, outcome enum | B4, B7, H1, P1 | written |
| `flags-env.md` | flags, env names, secret names, dev hosts | all code lanes, L1 | written |
| `fixtures.md` + `fixtures/` | fixture users, series fixtures | Q0b, B3, B4, B7, O2 to O5, P1, H1 | pending |
| `formats.md` + `schemas/` | JSON Schemas of the content formats | E1a, K1 to K4, X1 | pending |
| `copy-keys.md` | copy keys per site and lane (keys only) | D0, O1 to O6, P1, H1, B6, X1 | written |
| `link-allowlist.md` | cross-site links allowed in crawlable HTML | Q0a, B6, X1, H1, O1 | pending |
| `LANES.md` | every lane of BACKLOG section 1 and the sections it cites | all, R | pending |
| `defaults.md` | the G0 defaults, each "default, pending" | all, ORCH | written |
| `TWINS.md` | rule 18: every anime and FanQuiz page, its kpop twin, the shared components it imports, its closed list of differences | D0, O1 to O6, P1, H1, E1b, X1, Q0a, R | written |
| `twins.json` | the machine form of `TWINS.md` (same rows), read by Q0a's `apps/quiz/scripts/o1/twins.mts` through `scripts/o1/check.sh` | Q0a, gate, R | written |
| `spike-checks.tsv` | route checks of the routing spike (branch `o1/F0s` only) | gate | on `o1/F0s` |

Code that implements the contract on `o1/F0` (compiling stubs, imported by nothing on the kpop path until B1
wires them): `apps/quiz/src/lib/site/{types,registry,routing,index}.ts` with `registry.test.ts`, `routing.test.ts`
and `contract.test.ts` (the checkable rules of the contract files: token names, per-site sheets, copy files, the
flag and secret tables, the G0 list, the SQL manifest and the conventions of `schema.sql`; it grows with every
slice). Pending: `lib/network/types.ts`,
`lib/passport/types.ts`, `lib/anime/types.ts`, `lib/db/contract.types.ts` (generated),
`apps/quiz/scripts/o1/gen-contract-types.mts`, `apps/quiz/scripts/o1/check-contract.mts`.

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
