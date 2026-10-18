# Requests of lane Q0a

1. To ORCH, `scripts/o1/gate.sh` (owner ORCH). For lane Q0a only, run the lane's own harness from the gate worktree:
   `$WT/scripts/o1/gate-checks.sh` instead of `$O1/scripts/o1/gate-checks.sh` (which exists only after Q0a merges).
   Why: the done test "gate-checks.sh runs on a gate worktree with the three site builds and writes one log per
   check" can then be proven by the gate's own evidence, the only evidence R accepts. Q0a's diff stays in the
   neutral folders, so the gate builds kpop, anime and hub itself and parity is skipped.
2. To ORCH, `scripts/o1/gate.sh`, step 7. When the gate calls parity (`touches_kpop`), pass `--keep`:
   `step parity "$O1/scripts/o1/parity.sh" "$base" "$sha" --evidence "$EV" --keep`. Nothing else: gate-checks.sh
   finds the kept head build itself through `KPQ/cache/parity/kept.json` (written by Q0a's parity.sh v2 on
   `--keep`), checks that it is the build of the gate's head, and serves it with `parity.sh --serve-kept`; the next
   parity run removes the kept worktrees, their frozen state and kept.json. Why: the kpop check:indexability,
   metadata-dupes, orphans and sitemap-hygiene grade production data (a 600 URL floor, the priority hubs, the live
   catalogue), which only the kept parity build has; without `--keep` they are recorded `pending` with this
   request named, never as a pass. (Interface final as of slice 3.) Since slice 12 the kpop half of the leak suite
   and of check-network-links is recorded the same way (`kpop-leak`, `kpop-network-links`: pending with this
   request named) when no kpop server exists. With this change, call gate-checks.sh with the same `O1_KPQ` that
   step 7 passes to parity.sh (`env O1_KPQ="$(parity_kpq)"`, the stand-in KPQ while `docs/o1/PARITY-OFFLINE`
   exists): gate-checks.sh reads `$KPQ/cache/parity/kept.json`, and `parity.sh --serve-kept` and `--check-kept`
   source `$KPQ/secrets/kpop-parity.env`, so a different KPQ would find no kept build, or serve one with the other
   env file (review Q0a r1, note for ORCH).
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
11. To ORCH, `scripts/o1/gate.sh`, step 6, once G1 is open (dbenv dev). Keep the kpop gate build (`build-kpop`, on the
    dev branch) when the diff touches kpop, next to the parity run. Why: gate-checks.sh then serves the kept parity
    build for the production-data checks (phase A) and swaps in this dev kpop build for the content leak and the
    lane's specs (phase B): those must never meet the kept parity build (a browser on it would reach the production
    Supabase directly, and production holds no anime row, so the content leak would prove nothing). Without it they
    are skipped with this request named. Before G1 nothing changes.
12. To B2, through ORCH (contract note). gate-checks.sh runs `check-site-scope.mts` as
    `cd apps/quiz && scripts/o1/env.sh offline -- tsx scripts/o1/check-site-scope.mts` (no argument, from the head
    under test; exit 0 = zero findings, any other exit = a failure, findings on stdout). It also serves the gate
    builds with `SITE_SCOPE=1` when `apps/quiz/src/lib/site/scope.ts` exists and the gate runs on a dev branch, and
    tells the leak suite so (`O1_SITE_SCOPE=1`). If the script needs arguments or another path, a CR to Q0a.
13. To F0, O1 and H1, through ORCH (contract note, `routes.md`). gate-checks.sh runs check:metadata-dupes on an anime
    or hub build when the head has `apps/quiz/src/app/sites/[site]/sitemap.xml/route.ts` (the path routes.md names),
    and fails when the base had it and the head lost it. A different path: tell Q0a.
14. To ORCH, for every lane that writes specs (contract note next to item 9). Lane specs get their servers in
    `O1_KPOP_URL`, `O1_ANIME_URL`, `O1_HUB_URL` (also `O1_LEAK_<SITE>_URL`; base URLs `http://<site>.localhost:<port>`
    on the gate's ports 4021 to 4023), the database in `O1_ENV` (and the env.sh variables of the gate's database),
    `O1_SITE_SCOPE`. A site without a server has no variable: the spec skips with its reason. The
    kpop variable is never set to the kept parity build.
15. To F0, through ORCH (rule 18, `contracts/twins.json`). What `apps/quiz/scripts/o1/twins.mts` reads, so the JSON
    and the check agree: `pages[].file` and `twin` as a string or an array (paths relative to `apps/quiz/src`;
    `apps/quiz/src/...`, `src/...` and `@/...` accepted); `mustImport` as module specifiers (`@/components/...`) or
    paths; a row whose `twin` is null or empty is a technical row whose file must contain no JSX (row 37). Screen
    files that need a row: every `page`, `layout`, `template`, `not-found`, `error`, `global-error`, `loading`,
    `default`, `forbidden`, `unauthorized`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon` under
    `app/sites/` outside `_folders` (route handlers such as `robots.txt/route.ts` need none). One file can sit in
    several rows (anime and hub share `app/sites/[site]/page.tsx`): each row's mustImport is checked on it.
    A mustImport module counts when the page reaches it directly, through a module of the page's own folder, or as a
    dependency of another mustImport module of the same row that the page reaches (so listing what `hub.tsx` renders
    next to `hub.tsx` is fine); never through a wrapper module elsewhere.
16. To F0 and ORCH (rule 18, the spike). Dry run of twins.mts on the spike tree (`o1/F0s` at `ab42803`, read only)
    against F0's contract `docs/o1/contracts/twins.json` (`o1/F0` at `79e3a8b`): exit 1, 4 failures, all
    `missing-import`: `layout.tsx` (rows 28 and H-0: `@/components/layout/ux-v1/ux-shell`), `page.tsx` (row 1:
    `@/components/home/ux-v1/ux-home`; row H-1 has an empty mustImport), `not-found.tsx` (row 27:
    `@/components/ui/mascot`; H-8 empty). `[...rest]/page.tsx` passes as the technical row 27b (no JSX), the
    `robots.txt/route.ts` handler needs no row, and no copy. (Against the earlier draft rows, which listed what each
    module renders, it was 29.) Why it matters: once twins.mts and twins.json are both in O1, a lane tree carrying
    these placeholders fails the `twins` step. TWINS.md rule 4 already keeps the spike pages as routing placeholders
    that O1 and H1 replace: either keep them off o1/integration until then, or let F0s's layout, home and 404 import
    the shell, the home and the mascot as their twins do. The check gives no placeholder exception (it would be the
    loophole rule 18 closes).
17. To ORCH, `scripts/o1/check.sh` (owner ORCH). (a) Merge order: once twins.mts is in O1 and twins.json is in
    neither O1 nor the lane, check.sh exits 1 ("cannot check") on every lane's gate. Merge F0's twins.json before or
    with Q0a, or let check.sh print `pending` until O1 has it. (b) Optional: pass `--json "$EVIDENCE/twins.json"`
    (when the gate gives check.sh its evidence folder) so R reads the structured result. (c) The check takes about
    20 s on the real tree (1455 files parsed); the harness-unit step gains about 30 s for twins.test.mjs under load.
18. To ORCH, for the owner of `apps/quiz/next.config.ts` once it leaves the HOT list (F0 wires it). One line:
    `distDir: process.env.O1_NEXT_DIST_DIR || '.next'`. Why: `scripts/o1/dev-multi.sh` (deliverable 4) runs three
    `next dev` at once from one worktree; Next 16.2 refuses a second dev server on the same output folder (lock at
    `<distDir>/dev/lock`), the programmatic server's `conf` does not reach the dev bundler, and a per-site folder of
    links serves no route (404 everywhere, Turbopack and webpack; report D37). Unset, the config is byte for byte
    today's: builds and parity do not change. No longer blocking (slice 5, D39): dev-multi.sh runs each site from an
    APFS-cloned mirror of apps/quiz under the worktree's ignored `.next/`, synced every 2 s. With the variable, the
    mirrors and their sync delay can go (dev-multi then sets `.next/multi-<site>` in apps/quiz itself).
19. To B4, through ORCH (cookies.md section 2, the dev fallback of `__Host-pp_tx`). Q0a's brief: "the dev fallback
    name for `__Host-` cookies on plain http is B4's (write the helper test only)". The test is written:
    `apps/quiz/e2e/o1/dev-multi/cookies.o1.ts`, "the dev fallback name of the __Host- transaction cookie", skipped
    until the helper exists. It imports `apps/quiz/src/lib/passport/tx-cookie.ts` (or the path B4 gives in
    `O1_TX_COOKIE_MODULE`) and calls `txCookieName(url: string | URL, env?: { VERCEL_ENV?: string }): string` on 12
    rows: `__Host-pp_tx` for every https URL, for `VERCEL_ENV=production` even on an http localhost, for an http
    host that is not `localhost` or `*.localhost` (127.0.0.1, `evil-localhost.com`, `localhost.evil.com`); `pp_tx`
    only for http `localhost` and `*.localhost`. Ask: B4 names the module and the export (or confirms these), so the
    table runs at B4's gate. A different signature is fine: tell Q0a, the test adapts, the rows stay.
20. To ORCH and R, a CR proposal (BACKLOG 5.2: parity may be made stricter, never looser). flag-off-diff (not Q0a's,
    never edited) replaces every hashed asset name (`static/css/<hash>.css`, `static/chunks/...js`) before it diffs,
    and nothing compares what those files hold: a change in `globals.css`, a CSS module or a Tailwind class that
    exists only in CSS changes the served style of kpopquiz.org and still passes parity. Proposal: `compare.mjs`
    adds one check, run on every URL that flag-off-diff found identical too: the set of stylesheets each page links,
    fetched once per run from A and B, compared by content after the same name normalisation (and N1 for the UX
    stylesheet only). A difference fails the page as `css-content`, with the first differing rule in `result.txt`.
    It reads only the two local servers (no production read), adds about one second per distinct stylesheet, and
    keeps determinism (contents, not times). Q0a writes it once approved (owned paths); until then the gap is
    written in parity.sh's header. JS chunks stay out (behaviour is the lanes' e2e and R's UX runs, not parity).
21. To ORCH, for the owner (the G0 normalisations are the owner's: a CR; blocks every real parity run). Q0a's offline
    parity rehearsal (2026-10-17, report section "Parity rehearsal", evidence
    `apps/quiz/e2e/o1/parity/rehearsal-2026-10-17/`): parity.sh unchanged, its KPQ pointed at a stand-in whose
    `kpop-parity.env` names the offline Supabase (127.0.0.1:9), so no production read; base b5e8c55, head the same
    tree with one line of visible text changed on /about. Result: 34 of 60 pages DIFFERENT. 31 differ only in the
    module ids of the Flight client references in the inline page data (`I[418146,[...],"ThemeInit"]` against
    `I[755668,[...],"ThemeInit"]`, on every page that answered 200; export names and normalised chunk lists equal);
    1 (/blindtest/group-bts) only in where the Flight stream is cut into `self.__next_f.push` tags (the same rows,
    pushed in another order); 1 (/bts-name-all-members, a 500 offline) in its error digests; 1 (/about) is the plant,
    caught in the HTML and in the page data. No client code differs between the two trees, so Turbopack (Next 16.2.1)
    gives one client module two ids in two builds. Consequence: with flag-off-diff at the bytes level and only N1 and
    N2, parity says DIFFERENT for any two builds; every lane that touches kpop paths would fail the parity step and
    the merge step, and each such run spends a production read. N2 (the Analytics reference) is this same symptom on
    one reference. Options:
    (a) N3: in the inline page data, a Flight client reference `I[<number>,` reads `I[<id>,` on both sides (export
        name and chunk list still compared; the server HTML still compared byte for byte); N4: the Flight stream of
        a page is joined from all its pushes and compared as its sorted rows, so where the stream is cut into script
        tags, and the order in which rows stream, do not count (every row, and the rest of the document, still
        compared). Measured on the rehearsal's stored pages: 58 of 60 equal, /about DIFFERENT (the plant, in the HTML
        and the rows) and /bts-name-all-members (error digests of an offline 500 page). Q0a's recommendation.
    (b) flag-off-diff's own `--structure` level (the v11 and v12 proofs used it): drops the client script tags and the
        whole inline page data. Simpler, but blind to the page data.
    (c) First learn whether one build folder for both sides keeps the ids stable: one more offline rehearsal (two
        builds, no production read). Even if it does, a client change in a shared layout still moves every id
        (flag-off-diff's own comment), so (a) is likely needed anyway.
    Until a decision: Q0a runs no real parity run (each would fail and spend a production read). Once approved, Q0a
    writes N3 and N4 in `scripts/o1/parity/compare.mjs` with tests (owned paths) and reruns the rehearsal, then the
    real runs of the done test within D-005.
    Answered 2026-10-17 (CR-008, option (a)); done in slice 7 (`compare.mjs` N3 and N4 with tests). Slice 7 also
    found the cause (report D46): Next takes ROOT's pnpm-workspace.yaml as the workspace root, so every module path
    carries the worktree folder name; parity.sh now builds both sides at one path. Request 20 answered by CR-009,
    done in slice 7 (the css-content check).
22. To ORCH, `scripts/o1/parity.sh` of O1 (Q0a's file, merged copy). Until Q0a's slice 7 merges, every parity run
    leaves its two `next-server` processes listening on 4011 and 4012 (`next start` forks them; the cleanup kills the
    subshell and its direct child only), and the next run stops on "port 4011 busy" (exit 8). Seen twice on
    2026-10-17: after Q0a's slice 6 rehearsal (stopped by Q0a in slice 7) and after the gate's F0 parity run
    (d77a26f against 62dbff3; its servers, pids 95936 and 95937 with their subshells 95934 and 95935, cwd the deleted
    o1-parity-base and o1-parity-head, were stopped by Q0a at 23:19 UTC so that Q0a's run and the gate's spike parity
    waiting behind it could serve); the gate's spike parity run then left another pair (pids 12759 and 12760), which
    Q0a's queued run stopped at 23:36 UTC before taking the lock. Fixed in Q0a 69f3019 (kill_tree). Until it merges, before a gate or merge parity
    run: `lsof -tiTCP:4011 -sTCP:LISTEN` and 4012 empty, or stop the orphans (parent 1, cwd under a deleted
    o1-parity-* folder). Also after Q0a merges: parity serves both sides from `o1-parity-build` (D50), and with
    `--keep` the kept head build is there (kept.json names it).
23. To ORCH (a CR: a normalisation is G0's, ruled by ORCH under rule 15 as for CR-008). Slice 7's run 4 (the CSS
    plant, offline) found one page DIFFERENT by streaming timing, not by the plant: /bts-name-all-members (a 500
    offline) had a Suspense boundary resolved before the shell flushed on the base read (`<!--$-->...<!--/$-->`)
    and after it on the head read (`<!--$?--><template id="B:0"></template>`, then the hidden `S:0` segment and
    React's `$RC("B:0","S:0")` script). Runs 1 to 3 read the same page resolved on both sides. This is the HTML twin
    of the Flight order N4 covers, and it can fail any pair, quiet or not, on any page with a boundary that settles
    near the flush. Options: (a) N5 suspense-resolved: before comparing, a streamed boundary is put back where its
    template stands (the `S:n` segment's content replaces `<template id="B:n">`, `<!--$?-->` reads `<!--$-->`, the
    segment and its `$RC` call leave), so both sides compare in their resolved form; every node still compared, only
    when it arrived does not count. Q0a's recommendation (deterministic, small, testable on the stored pages).
    (b) No rule: read the page again on a difference. Weaker: the base side is a record (D50) and cannot be read
    again, and a verdict that depends on how many reads were tried is not deterministic. Until a ruling, a quiet
    pair can fail on this page about one read in four offline (one of the four reads of slice 7).
    Update, slice 8: no ruling needed for the case seen; Q0a fixed it at its source (report D52) and withdraws the
    request unless a new case appears. The boundary was Next's own metadata boundary ("Next.Metadata", in a
    `<div hidden>` at the top of the body), which Next 16 streams on a page rendered at request time to every user
    agent except an HTML-limited crawler. parity.sh now records both sides with one header that Next matches as an
    HTML-limited crawler, so that metadata is rendered blocking in the head; nothing in a response is rewritten, and
    prerendered pages (generated with `allReady`, never racing) are served from the build cache whatever the
    header. If an app Suspense boundary on a request-time page ever races, the node diff shows it and N5 is the rule
    to ask for then.
24. To ORCH (a CR: a normalisation is G0's, ruled by ORCH under rule 15 as for CR-008; blocks the determinism item
    of Q0a's done test). Slice 8's run 6 (`--recheck` of the quiet pair 53f48f9 and 0056679, offline, evidence
    `apps/quiz/e2e/o1/parity/offline-2026-10-18/run6-quiet-recheck/`) found 2 of 60 pages DIFFERENT by React text
    separators only: `/fr/blind-test-kpop` and `/es/adivina-la-cancion-kpop` (one component, `ux-v1/landing.tsx`,
    two copies) read `Toutes les playlists<!-- --></a>` on one side and `Toutes les playlists</a>` on the other, and
    the reverse for the Spanish link; every following node is the same, shifted by one. `<!-- -->` is the comment
    React's server renderer writes after a text node that ends a render segment; where segments end depends on what
    had already arrived when the page was prerendered, so it is a property of one build, not of the source. In 14
    builds of the same tree (slice 7 runs 2 to 4, slice 8 runs 5 to 8) the French page had it and the Spanish page
    did not in 13; in run 6's base build the two swapped. No other page of the 60 varied in any of them. It holds no
    text and makes no element; a browser and a crawler read the same text either way.
    Options: (a) N6 text-separators: the exact comment `<!-- -->` is removed from both sides' HTML before comparing
    (it does not occur in the page data); every element, attribute and character of text stays compared, and two
    adjacent texts compare as their concatenation. Q0a's recommendation: the HTML twin of N4 (both come from where
    React cuts its streams), deterministic, a few lines and tests in `compare.mjs`, recorded in result.json like N3
    and N4.
    (b) No rule: a pair, quiet or not, fails on those two pages when one of its two builds swaps them (1 in 14 here),
    and any later page with a text at a segment end can too (every kpop gate runs parity offline under D-025). Until a
    ruling, parity's verdict on a pair holds on the other 58 pages; on these two, R reads the node diff (`<!-- -->`
    alone).
    Answered 2026-10-18 (CR-010: N5, the narrow form of option (a): only a separator immediately followed by a
    closing tag). Done in slice 9 (03c0794): `compare.mjs` N5 with tests, rules `q0a-g0-v3` (report D54); run 6's
    records judged by it give 60 of 60 identical, and the offline determinism runs 9 and 10 of the quiet pair are
    identical and deterministic.
25. To ORCH, `scripts/o1/gate.sh` step 5 (`unit`, ORCH's). Q0a's gate at 3888ec5 was red on `unit` by 3 timeouts
    (5 s) of base source-scan tests that read every file of `apps/quiz/src` (`lib/seo/og.test.ts`,
    `lib/seo/json-ld.test.ts`, `lib/quiz/scoring.test.ts`); Q0a changes no file under `apps/quiz/src`. The machine was
    loaded from outside the run (8 cores, load average 20 to 30, the top processes belong to other projects): that
    gate's tsc took 139 s and its builds 244 to 446 s, against 30 s and 99 to 140 s in F0's gate at 62dbff3, whose
    `unit` passed in 15 s. Measured in Q0a's worktree at e9c5ba9 (its one change since 3888ec5 is outside vitest),
    under the same load (2026-10-18, 04:53 to 05:05 local), every failure a 5 s timeout: default workers 4 files and 5
    tests, then 2 and 2; `--maxWorkers=6` and `--maxWorkers=4` 1 file and 2 tests
    (`json-ld.test.ts`); the 3 files alone pass (57 tests, 4.9 s); `--maxWorkers=2` passes, 124 files, 2269 tests,
    104 s. Proposal, no test touched and the same timeout: run the step with `--maxWorkers=2` (or under
    `build-lock.sh`, so it never overlaps a gate build), and write the load average next to the step in `unit.log`.
    A re-run of Q0a's gate at a quieter time is the alternative; nothing in Q0a's lane can make these tests faster.
    Update, slice 11 (2026-10-18, 03:24 to 03:34 UTC). The gate at 3440d48 was red on `unit` again, every other step
    green (tsc 231 s): 5 timeouts (5 s) of 4 base files, `og.test.ts`, `json-ld.test.ts` (both scans),
    `scoring.test.ts` and `editorial/team-render.test.ts` (a dynamic import). Q0a's diff still has no file vitest
    collects (`src/**/*.test.ts`; the diff from a62d673 has nothing under `apps/quiz/src`, nor in vitest.config.ts,
    package.json or tsconfig.json). Measured in Q0a's worktree with the gate's command, the timeouts follow paging,
    not CPU or disk: swap 15.4 to 16.1 GB used on a 16 GB machine; the one full run that passed (17.5 s) swapped in
    620 pages, the three that failed 17,491 to 78,758 (vm_stat before and after); the scans' walk in plain node reads
    the 1328 files in 0.25 s, and 0.5 s with seven copies at once. `--maxWorkers=2` failed too at 03:28 (4 tests at
    load average 21), so it is not enough on its own at that level, and at 03:34 one scan timed out with the four
    files run alone. Options, none touching a test or a timeout:
    (a) re-run Q0a's gate when the machine pages less (unit passed in the gates whose tsc took 30 and 36 s and failed
    in those at 139 and 231 s, so the tsc time of the same gate is a usable sign); (b) the unit step under
    `build-lock.sh`, so it never overlaps a gate build, with `vm.swapusage` and the load average written in unit.log;
    (c) an owner action: free memory before gates (the swap is held by processes outside the run). A larger
    `testTimeout` or a retry of timed-out files would change the gate: ORCH's or the owner's call, not proposed here.
    Update, slice 13 (2026-10-18, 10:28 to 10:31 UTC). The gate at ee4f7c2 was red on `unit` a third time, every
    other step green (tsc 126 s): 2 timeouts (5 s) of base scans, `og.test.ts` and `json-ld.test.ts`. Q0a's diff from
    a62d673 and from eb36e4c still has nothing vitest collects. Four runs of the gate's command here, swap 15.0 to
    15.1 GB used of 16 GB at each start: run b passed (124 files, 2269 tests, 31.7 s, load 16.5); runs a, c and d
    timed out 3, 1 and 2 base tests (load 12.4 to 22.9; c and d swapped in 9,487 and 15,987 pages). So the gate's
    `unit` is a draw on this machine as it stands, and a re-gate of Q0a at ee4f7c2's tree (or its docs-only
    successor) is likely to pass on a second or third try; (b) or (c) above would make it reliable. Note for
    gate.sh: summary.json's `failures` keeps the tail of unit.log, which for vitest is the Duration and Isolate
    lines; the `FAIL` lines (or `Test Files` and `Tests`) would name what failed.
