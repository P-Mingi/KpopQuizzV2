# Brief Q0a: the parity and leak harness (Wave 0, code, priority 0)

Read first: `O1/docs/o1/briefs/COMMON.md` (all of it). Reviewer profile: ARCH. Size: 8 to 10 agent-hours of the 14 to
18 of Q0 (estimate; Q0b, in Wave 1, does the production-schema cluster, the auth suite and the equivalence fixtures).

## Goal
The tests every other lane is judged by: a deterministic kpopquiz.org parity check, the leak suite, the per-site gate
checks, and `dev:multi`.

## Worktree and ports
`ROOT/.claude/worktrees/o1-Q0a`, branch `o1/Q0a`, guard agent `Q0a`. Ports: `O1/docs/o1/ports.tsv`. Parity ports
4011 and 4012 belong to `parity.sh`; gate serving uses 4021 to 4023.

## Inputs (read only)
- `ROOT/docs/strategy/o1/RUN-O1-PROMPT.md` rule 5, section 2 (Builds, Gate evidence), section 8 (the two allowed
  parity normalisations of G0).
- `ROOT/docs/strategy/o1/BACKLOG.md` section 0 (invariants and the gate list), the Q0 card in section 3, section 2.6
  (check-network-links), section 5.1 (snapshot and leak lists, link allowlist).
- `ROOT/docs/strategy/o1/COLLISION-MAP.md` 1.3 to 1.7, 6.1 to 6.3 (scripts, e2e, Playwright config, flag-off-diff).
- `ROOT/docs/strategy/research/Q-bridges.md` 5 D0 (the check-network-links spec), `research/P-passport.md` section 2
  (principle P2 and its string test).
- The Phase 0 versions of `O1/scripts/o1/parity.sh` and `O1/scripts/o1/gate.sh`, and
  `O1/apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs` (existing, not yours: wrap it, never edit it).

## Deliverables
1. `scripts/o1/parity.sh` completed (you own it; the gate always runs O1's merged copy, so your changes take effect
   after your merge): the 60-URL list in `apps/quiz/e2e/o1/parity/urls.txt` (home, group hubs, quizzes `/q/` with
   real slugs, blind test, PT pages, fr, es and id landings, trust pages, sitemap.xml, robots.txt, llms.txt; one line
   each, comments allowed); a proof that no URL of the list writes to production on a GET (read the route code paths;
   list any RPC or insert they reach; drop a URL that writes); the two G0 normalisations in your own wrapper
   (`scripts/o1/parity/`), applied after flag-off-diff's: the `?v=` CSS hash only when the served CSS of both sides is
   equal after normalizing `#fff` to `var(--ux-on-accent)` (fetch both stylesheets and compare), and the Analytics
   wrapper reference in the page data; nothing else is normalised; the production flags of kpopquiz.org confirmed from
   the repo (v12 launch report, docs PR #97) and written in the script header; determinism: two runs on the same sha
   pair give identical outputs.
2. `scripts/o1/gate-checks.sh <lane> <worktree> <evidence dir> <sites>` (gate.sh calls it when it exists): for each
   site build the gate kept (`apps/quiz/.next-<site>` in the gate worktree), serve it and run
   `check:indexability`, `check:metadata-dupes`, `check:orphans`, `check:sitemap-hygiene` through their existing
   `*_BASE_URL` overrides (never edit those scripts: RATCHET LAW and the repo hook), `check:site-scope` when B2's
   script exists, the leak suite, and the lane's e2e specs listed in `O1/docs/o1/lanes.json` (`specs`); one log per
   check in the evidence folder; exit non-zero on any failure. Decide per check which build makes it meaningful (an
   offline build shows empty data; the dev branch after G1; for kpop, the parity head build kept with
   `parity.sh --keep`, which reads production and therefore counts as a parity run) and write the choice in the
   script header. gate.sh skips its own kpop build when parity runs: adapt gate.sh through a request to ORCH if you
   need it changed.
3. The leak suite in `apps/quiz/e2e/o1/leak/` (Playwright, config `apps/quiz/playwright.o1.config.ts` with its own
   projects; never edit `playwright.config.ts`): route leak (every kpop route answers 404 on anime and hub builds,
   from F0's route map once merged; until then from `lib/route-allowlist.ts` and the kpop landings list), string
   leak (P principle P2 and its mirror: no K-pop string on anime pages, no anime string on kpop pages), link leak
   (`apps/quiz/scripts/o1/check-network-links.mts`: anonymous crawl, every cross-site link must be on the allowlist),
   canonical and OG per site (never a cross-domain canonical), content leak (needs B2's SITE_SCOPE and a dev branch:
   write the cases now, skipped with a clear reason until then), JSON-LD spoiler leak hook (O3 adds the cases), and
   the anonymous check that no server HTML of 20 pages contains `/api/n/me`. Each test fails on a planted leak (prove
   it in the report) and passes on the base.
4. `scripts/o1/dev-multi.sh`: three `next dev` servers, `kpop.localhost`, `anime.localhost`, `hub.localhost`, on the
   lane's port triple, with `scripts/o1/env.sh offline|scratch|dev`; a Playwright test in `apps/quiz/e2e/o1/dev-multi/`
   proving the three hosts keep separate cookies; the dev fallback name for `__Host-` cookies on plain http is B4's
   (write the helper test only). ORCH adds the `dev:multi` alias when `package.json` leaves the HOT list.

## Your exception to "builders never build" (recorded in LEDGER.md)
You build the harness, so you may run `next build` (only through `O1/scripts/o1/build-lock.sh run Q0a-<x> -- ...`)
and your own `parity.sh` at most 4 times in total (production reads), never between 00:00 and 01:00 UTC, each run
listed in your report with its time and result. All other builds use `scripts/o1/env.sh offline`.

## Owned paths
`O1/docs/o1/OWNERSHIP.json`, id `Q0a`.

## Done test
- Two parity runs on the same sha pair: identical outputs (determinism), and both say identical.
- A planted visible string change in a kpop page makes parity fail; each leak test fails on its planted leak and
  passes on the base.
- `gate-checks.sh` runs on a gate worktree with the three site builds and writes one log per check.
- dev:multi: three hosts, three separate sessions (cookie isolation test green).
- tsc and unit tests green; the report lists every production read you made.
