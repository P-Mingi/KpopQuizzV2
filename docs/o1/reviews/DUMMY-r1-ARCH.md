# Review DUMMY round 1, profile ARCH

| field | value |
|---|---|
| lane | DUMMY (Phase 0 pipeline test lane) |
| round | 1 |
| profile | ARCH |
| reviewer | R (fresh instance) |
| reviewed sha | 674c0861f64921df43bea82cb24bb2211680adf4 (674c086) |
| tree | 4c4ce9ac62751d9b6d95150c5393ef0b22975ad9 |
| branch / worktree | o1/DUMMY, `.claude/worktrees/o1-DUMMY` |
| base | 1cb11de83e39aa1b262a814bc77e5f4e371cd343 (tip of o1/integration, equal to the merge base: the branch is one commit ahead, fast-forwardable, no drift) |
| evidence folder | `docs/o1/evidence/DUMMY/674c0861f64921df43bea82cb24bb2211680adf4/` |
| date | 2026-10-16 |
| verdict | PASS |

## Reviewability gate

- HEAD of the worktree is `674c0861f64921df43bea82cb24bb2211680adf4`: matches the sha I was given.
- `git status --porcelain` printed nothing at the start and nothing after my own tsc and vitest runs. The ignored
  entries are only the `node_modules` symlinks (`node_modules`, `apps/quiz/node_modules`,
  `packages/shared/node_modules`); none is tracked (`git ls-files -s | grep ^120000` is empty).
- One commit in `o1/integration..674c086`: "dummy: pipeline test file", ASCII only, no body.
- `git config o1.agent` is `DUMMY` in the worktree.

## Checks (items of REVIEWER.md that apply; docs-only lane)

1. Scope: PASS.
   - Evidence `guard.log`: `o1-owner-guard: DUMMY ok (2 range 1cb11de...674c086)`. `hot.log`: `hot list: clean (328 hot files)`.
   - My own guard run, exactly as instructed (`--agent DUMMY --range o1/integration..674c086 --ownership
     O1/docs/o1/OWNERSHIP.json`): `DUMMY ok (2 range o1/integration..674c086)`, exit 0. Same result with
     `--ownership-ref o1/integration` (the committed file), so the O1 working copy and the committed copy agree.
   - Diff is exactly two added files: `docs/o1/dummy/hello.md` (3 lines) and `docs/o1/reports/DUMMY.md` (4 lines).
     Both match `docs/o1/dummy/**` (hello) and the implicit `docs/o1/reports/DUMMY.md` (report) of id DUMMY.
   - Neither path is in `HOT.txt` (grep of both, no hit). The lane did not touch OWNERSHIP.json, HOT.txt,
     lanes.json, LEDGER.md, scripts/ or any contract file (`git diff --stat` on those is empty).
2. Contract: N/A with evidence. `docs/o1/contracts/` does not exist yet (arrives with F0). The diff touches no code,
   route, signature, shape or format and no frozen item. No CR is needed and none is claimed.
3. Evidence: PASS.
   - `summary.json`: `sha` 674c0861f64921df43bea82cb24bb2211680adf4, `tree` 4c4ce9ac62751d9b6d95150c5393ef0b22975ad9,
     `madeBy` `scripts/o1/gate.sh`, `base` 1cb11de83e39aa1b262a814bc77e5f4e371cd343, `green` true, `touchesKpop`
     false, `dbEnv` offline.
   - `git rev-parse HEAD^{tree}` in the worktree: 4c4ce9ac62751d9b6d95150c5393ef0b22975ad9. Equal to the evidence
     tree. Only one folder exists under `evidence/DUMMY/` and it is named by the full sha.
   - `steps.tsv`: guard, hot, copy, secrets, tsc, unit, build-kpop, build-anime, build-hub all rc 0; parity and
     site-checks `pending` (see item 4 and finding 4).
   - My tsc: `cd apps/quiz && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --incremental false`: exit 0, no
     output (28 s). Agrees with `tsc.log` (empty, rc 0).
   - My vitest: `./node_modules/.bin/vitest run`: 124 test files passed, 2269 tests passed. Identical counts to
     `unit.log` of the gate.
   - Builds: I did not run `next build` (gate only). The three build logs end in the normal route tables; each step
     is rc 0 under `dbEnv: offline`, which is the standing bar before G1.
4. kpopquiz.org unchanged: PASS.
   - `changed.txt` holds two lines, both under `docs/`. I recomputed it myself
     (`git diff --name-only --no-renames 1cb11de...674c086`) and `diff` against the evidence file is empty.
   - I applied the gate's `neutral` regex to the recomputed list: no path falls outside the neutral folders, so
     `touches_kpop=false`, so `parity.sh` was rightly skipped. `parity.log`: "no path outside the anime, hub and run-only
     folders: parity not needed". No parity.json exists, which is correct for a skipped step.
   - No normalisation was needed or applied.
5. Leaks on the lane's surfaces: N/A. No route, content, string, link, JSON-LD or served file changed. `docs/` is not
   under `apps/quiz/public` or any app route. The two files name no anime, no K-pop and no artist.
6 to 10. SQL, Security, Content, UX, SEO: N/A. No migration, no auth or secret surface, no content entry, no screen,
   no indexable page. `secrets.log`: `secrets: clean`.
11. Copy rules: PASS. See attack A4. `copy.log` is empty (exit 0). I also scanned the two files byte by byte for any
    non-ASCII character (zero hits), and the commit message and author fields (zero hits). No app, style or UI file
    changed, so there is no visible copy to read.
12. The report tells the truth: PASS with a minor note. `docs/o1/reports/DUMMY.md` says "done: docs/o1/dummy/hello.md,
    tested by the gate". The file exists with the described content and the gate evidence for this sha is green, so
    the claim is true. The report is thinner than COMMON.md asks (finding 1).

## Attack attempts

Every attempt was read-only against the lane: I changed no file in any worktree, committed nothing, and touched no
REVIEW-LOG.md. Scratch inputs lived under the session scratchpad only.

| id | what I tried | result |
|---|---|---|
| A1 | Guard with `--paths apps/quiz/src/app/layout.tsx` (the attack named in the task) | Refused: `DUMMY does not own 1 of 1 given paths`, exit 1. |
| A2 | 17 near-miss and cross-lane paths through the guard as DUMMY: other lanes' report and request files (F0), `docs/o1/reports/DUMMY2.md`, `docs/o1/reports/dummy.md` (case), `docs/o1/dummyx/a.md`, bare `docs/o1/dummy`, `docs/o1/reviews/DUMMY-r1-ARCH.md`, `OWNERSHIP.json`, `scripts/o1-owner-guard.mjs`, `docs/o1/evidence/DUMMY/x/summary.json`, `LEDGER.md`, `HOT.txt`, `.github/workflows/indexnow.yml`, `package.json`; plus a mixed list of two owned paths and `apps/quiz/src/middleware.ts` | All refused with exit 1 and the mixed list failed on the single foreign path only. Correctly allowed: `docs/o1/dummy/sub/deep/a.md`, `docs/o1/reports/DUMMY/shot.png`, `docs/o1/requests/DUMMY.md`. The guard is not loose on prefixes, case, or the evidence and review folders. |
| A2b | Guard with the traversal string `docs/o1/dummy/../../../apps/quiz/src/app/layout.tsx` | ACCEPTED in `--paths` mode (exit 0), because matching is on the raw string. Then I tried to get git to produce such a path: in a throwaway repo in the scratchpad, `git update-index --cacheinfo` with `..`, `./` and a leading `/` all failed with "Invalid path" (exit 128). So the form cannot reach the staged or `--range` modes. Dry-run only; recorded as finding 2. |
| A3 | Checked that parity was rightly skipped: recomputed the changed list and compared with `changed.txt` (identical), ran the gate's `neutral` regex over it (nothing outside), then planted `apps/quiz/src/app/layout.tsx` into the same classifier and look-alike paths `docsx/a.md`, `Docs/a.md`, `apps/quiz/docs/a.md` | The planted kpop path and all three look-alikes are flagged as non-neutral, so a real kpop change would have forced parity. The skip for this lane is justified. |
| A4 | Copy rule: ran the gate's exact perl (`[\x{2013}\x{2014}]` or `\p{Extended_Pictographic}`) over the real range diff, listed every added line, scanned both files and the commit object for non-ASCII; then fed the same perl a planted stream with an em dash, an en dash and three emoji | Real diff: exit 0, seven added lines, all plain ASCII (the `- done:` is a markdown bullet, not a dash). Planted stream: all five bad lines caught, exit 1, while the hyphen, the double hyphen and a removed line containing an em dash were correctly ignored. The gate check is not blind on this host. |
| A5 | Dual ownership: ran the guard as every id in OWNERSHIP.json against both paths | Only DUMMY owns `docs/o1/dummy/hello.md` and `docs/o1/reports/DUMMY.md`. No other lane, including ORCH, matches either path. |
| A6 | Tamper check on the rules themselves: sha256 of the lane's copy of OWNERSHIP.json, the O1 working copy and `git show o1/integration:docs/o1/OWNERSHIP.json`; guard rerun with `--ownership-ref o1/integration` | All three hashes equal (`da819d58...20dc`), the lane did not touch ownership, HOT, lanes or scripts, and the guard result is the same against the committed rules. |
| A7 | File modes and types: `git diff --raw` and `git ls-tree -r` for the two added files | Both `100644` regular blobs. No symlink, no exec bit, no submodule, no hidden or ignored file (the only ignored entries are the three untracked `node_modules` symlinks). |
| A8 | Claim in the report ("tested by the gate") checked against the evidence folder | Backed: `summary.json` green true, madeBy gate.sh, sha and tree equal to HEAD. The claim names no number or path, so there is nothing further to check. |
| A9 | Stale-base and staleness check: `merge-base o1/integration 674c086` against the integration tip | Same commit (1cb11de). The branch is a direct descendant, so the evidence base is current. |

## Findings

No blocker. No major.

Minor (none blocks a PASS):

1. Minor, lane report: `docs/o1/reports/DUMMY.md` line 4. The report has only a one-line Progress block. COMMON.md
   ("How a builder works") asks for Progress (done, tested how, deviations, requests, SQL files, owner actions), then
   Decisions, then Open points. The report names no sha, no evidence path and no tsc or unit numbers, and has no
   Decisions or Open points headings. For a pipeline-test lane the claim is true and harmless; real lanes should be
   held to the full shape.
2. Minor, ORCH tooling (not the lane): `scripts/o1-owner-guard.mjs`, the glob matching in `isOwned`. In `--paths`
   mode a path such as `docs/o1/dummy/../../../apps/quiz/src/app/layout.tsx` is accepted because `**` matches `..`
   segments (proof: attack A2b). It is unreachable in pre-commit and `--range` modes, since git rejects `..`, `.`
   and absolute paths (proof: scratch repo, exit 128). Suggested hardening for ORCH: reject any path containing a
   `..` or `.` segment before matching, so the dry-run mode cannot mislead.
3. Minor, ORCH document (not the lane): `docs/o1/LEDGER.md` line 112, decision D-015. It says in the past tense that
   the dummy lane "went through ... review and merge" and points at this review file, but it is committed in
   1cb11de, before any review or merge existed, and the "Review verdicts" table is still empty. Treat D-015 as written
   in advance; ORCH should add the verdict row (and keep the entry true) once the merge step has run.
4. Minor, gate readability (ORCH, not the lane): `steps.tsv` lists `parity pending` and `site-checks pending` while
   `summary.json` has `green: true`. The reason parity was skipped ("not needed") is only in `parity.log`; REVIEWER.md
   item 4 says `steps.tsv` states it. A reader must open the log to tell "not needed" from "not run yet". The
   site-checks line is explained by `site-checks.log` (arrive with Q0a). No action needed for this lane.

## Verdict

PASS. Scope is exactly the two owned files, nothing is hot, the evidence is for this exact sha and tree and made by
gate.sh, my own tsc (exit 0) and unit run (124 files, 2269 tests) agree with it, parity was rightly skipped
because the diff is docs only, the copy rules hold on every added line and the gate's check demonstrably catches a
planted violation, and the report's one claim is true. The four minor findings go to the record; none needs a
second round for this lane.
