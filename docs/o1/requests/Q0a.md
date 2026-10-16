# Requests of lane Q0a

1. To ORCH, `scripts/o1/gate.sh` (owner ORCH). For lane Q0a only, run the lane's own harness from the gate worktree:
   `$WT/scripts/o1/gate-checks.sh` instead of `$O1/scripts/o1/gate-checks.sh` (which exists only after Q0a merges).
   Why: the done test "gate-checks.sh runs on a gate worktree with the three site builds and writes one log per
   check" can then be proven by the gate's own evidence, the only evidence R accepts. Q0a's diff stays in the
   neutral folders, so the gate builds kpop, anime and hub itself and parity is skipped.
2. To ORCH, `scripts/o1/gate.sh`. When the gate calls parity (`touches_kpop`), pass `--keep`, and hand the kept head
   build (`ROOT/.claude/worktrees/o1-parity-head/apps/quiz/.next` and `KPQ/cache/parity/<key>/freeze`) to
   gate-checks.sh for the kpop checks; the next parity run removes the kept worktrees. Why: the brief asks gate.sh
   to skip its own kpop build when parity runs, and an offline kpop build has no data for check:orphans and
   check:indexability. Exact interface comes with gate-checks.sh (next slices); this item is the heads-up.
3. To ORCH, `scripts/o1/gate.sh`, optional. Build kpop with `NEXT_PUBLIC_BT_TRACKING=1` too: production runs with it
   (`docs/design/growth-v12/run/LAUNCH-REPORT.md` step 2). parity.sh now sets it.
4. To F0 and B6, through ORCH (contract note). The client wrapper that gives `<Analytics />` its `beforeSend` must
   be a named export `NetAnalytics`. Why: the G0 normalisation N2 (`scripts/o1/parity/compare.mjs`) recognises the
   client reference of `Analytics` and `NetAnalytics` only; a default export would appear as `"default"` and keep the
   page DIFFERENT.
5. To B1, through ORCH (contract note). For N1, declare `--ux-on-accent` with a white value (`#fff` or `#ffffff`) in
   the served UX stylesheet and replace `color: #fff` by `color: var(--ux-on-accent)` (no fallback form
   `var(--ux-on-accent, #fff)`). Any other change to the served CSS keeps the `?v=` difference, so parity fails.
6. To F0, through ORCH (contract note, `docs/o1/contracts/link-allowlist.md`). Ship the frozen allowlist as data too,
   `docs/o1/contracts/link-allowlist.json`, in the shape of `apps/quiz/e2e/o1/leak/link-allowlist.json` (entries
   footer, about-kpop, about-anime, team-article, network-page, directory; `maxPerPage` counts per target site;
   `domainText` anime -> kpop and kpop -> anime). The checker and the leak suite read F0's file first when it exists.
   Why: BACKLOG 2.6 says the allowlist config is frozen in F0; one machine-readable copy avoids two lists drifting.
   The Team article's page is `null` until a CR names its path at launch.
7. To F0, O1 and H1, through ORCH (contract note, `tokens.md` or `routes.md`). Every anime and hub page, the 404
   page included, renders `data-site="<site>"` on `<html>` (the theme selector `html.ux-v1[data-site=...]` of
   BACKLOG 5.1). Why: the leak suite takes it as the site identity of a server when no build folder is given, and
   its "site identity" test fails when an anime or hub home lacks it.
8. To O3, through ORCH. The JSON-LD spoiler cases go in `apps/quiz/e2e/o1/O3/leak-cases.json`, key
   `spoilerJsonLd`: `[{ "site": "anime", "path": "/q/<slug>", "forbidden": ["<spoiler string>"], "note": "<why>" }]`.
   The suite (`apps/quiz/e2e/o1/leak/spoiler-jsonld.o1.ts`) runs each case; no edit in Q0a's folder is needed.
   Any lane may add cases the same way (other keys are free for later kinds).
9. To ORCH, `docs/o1/lanes.json`. A lane's `specs` are files under `apps/quiz/e2e/o1/<LANE>/` named `*.o1.ts`: only
   `apps/quiz/playwright.o1.config.ts` collects them (project `lanes`); a `*.spec.ts` there would also be collected
   by the default config's desktop and mobile projects (COLLISION-MAP 6.2). gate-checks.sh (slice 3) passes the
   listed files to the `lanes` project.
10. To F0, through ORCH (contract note, `fixtures.md`). Give the series fixtures' slugs and their quiz slugs (Death
    Note, One Piece, Spy x Family, 5 quizzes each) in `contracts/fixtures/`. Why: the content leak cases search the
    kpop lists for the fixture names today; exact slugs make them immune to a K-pop title that shares a word.
