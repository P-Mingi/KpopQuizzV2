# Review F0 round 1, profiles ARCH and UX

| field | value |
|---|---|
| lane | F0 (the frozen contract) with its spike F0s (never merges, D-004) |
| round | 1 (first ARCH review of the lane; the UX pass covers the contract's rule 18 artifacts, F0 has no screen) |
| profiles | ARCH, UX (one pass, D-029; each item below says which profile it serves) |
| reviewer | R (fresh instance) |
| reviewed sha | bf3746047927d55deb30b1e7dae06c2892675966 (bf37460), branch o1/F0 |
| tree | 2ba6a105645049e0ec90bb5cda668b2526c6f0ce |
| spike tip | 2c3d39ad91d8be33cbba6be53dec3cc5034fa9ef (2c3d39a), branch o1/F0s (`spike.txt` of the evidence names the same sha) |
| gate base | d28e3165f5fc84715c3ced8f9894a6b380c33467 (tip of o1/integration, equal to the merge base) |
| evidence folder | `docs/o1/evidence/F0/bf3746047927d55deb30b1e7dae06c2892675966/` |
| date | 2026-10-18 (review 19:47 to 20:10 UTC) |
| verdict | FIX (3 major, 3 minor) |

## Reviewability gate

- `git -C o1-F0 rev-parse HEAD` is bf37460, the sha I was given; `git status --porcelain` printed nothing at the start
  and after all my runs. The spike worktree o1-F0s is at 2c3d39a and clean too, before and after.
- Every server, plant and Playwright run of this review used copies in my scratchpad (a `git archive` of the F0 tree,
  copies of the gate's `.next-<site>` folders of the spike, Playwright output folders); no lane or gate worktree was
  written. The three servers I started were stopped at the end.

## Checks (items of REVIEWER.md that apply)

1. Scope (ARCH): PASS.
   - `guard.log`: `F0 ok (57 range d28e316..bf37460)`. My own run of `scripts/o1-owner-guard.mjs --agent F0` on the
     same range: same output, exit 0. On the spike (`--agent F0s`, range bf37460..2c3d39a): `F0s ok (9 ...)`, exit 0.
   - `hot.log` clean (320 hot files); my grep of the 57 changed paths against `HOT.txt`: 0 hits. The spike's three
     routing files are HOT but exempt for F0s (D-004) and the spike never merges.
2. Contract (ARCH): PASS on shape, with the findings below on behaviour.
   - `SiteConfig` in `lib/site/types.ts` carries the exact field list of BACKLOG 5.1 (id, kind, url, domain, letter,
     brand, vocabulary with favourites, features, routes.allow, seo, audio, theme, levelTitles, auth, passport,
     editorial, daily, copy). `SITE_ID` resolves `NEXT_PUBLIC_SITE_ID`, then `SITE_ID`, unset = kpop, throws on a
     disagreement or an unknown value.
   - D-021: every G0 row of `defaults.md` says "confirmed by the owner (G0, 2026-10-16)" (41 occurrences), no
     "default, pending" left (contract test checks it).
   - D-027 (CR-002 to CR-006 refused): my grep of the contract and the type modules finds no copy key, flag or storage
     name for them (`NET_WELCOME`, `kpop.p1`, `anime.p1.welcome`, `appear`, `keep`, `oshi.rowTitle`,
     `anime.oshi.pending.v1`); the remaining mentions say "refused". The `welcome` value of `NET_LINK_IDS` stays: it is
     part of "NetBridgeId = Q's list" (BACKLOG 5.1), renders nowhere and its comment says so. Not a finding.
   - D-026: `kpop /bts-quiz 200` is gone from `spike-checks.tsv`. D-028 and D-033: Q0c is in `LANES.md`.
   - Nothing on the kpop path imports `lib/site`, `lib/network`, `lib/passport/types`, `lib/anime` or
     `lib/db/contract.types` (my grep of `src` and `scripts` outside those folders: no hit).
   - `check-contract.mts --self-test` (mine, local Postgres 18 under my scratchpad, `env.sh offline`): exit 0, "zero
     diffs on the clean build, every planted difference reported". `gen-contract-types.mts --check`: exit 0, "up to
     date". The gate does not run these (request F0-11), so my runs are the evidence for that done test row.
3. Evidence (ARCH): PASS.
   - `summary.json`: madeBy `scripts/o1/gate.sh`, sha bf37460, tree 2ba6a105 (equal to `git rev-parse HEAD^{tree}`),
     base d28e316, green true, every step rc 0 (guard, hot, copy, secrets, twins, tsc, unit, build-anime, build-hub,
     parity, spike-build-kpop, spike-build-anime, spike-build-hub, spike-routes, spike-parity, site-checks).
   - `changed.txt` equals my `git diff --name-only d28e316 bf37460` (57 paths).
   - My tsc (`./node_modules/.bin/tsc --noEmit -p tsconfig.json --incremental false`): exit 0 (142 s under load).
   - My vitest (`vitest run --testTimeout=30000`, the gate's form): 128 files, 2496 tests, exit 0, as `unit.log`.
   - Spike: `vitest run src/lib/site src/lib/route-allowlist.test.ts src/lib/seo` 11 files, 332 tests green;
     `src/middleware-matcher.test.ts` 124 tests green. `git diff o1/integration o1/F0s` on the three routing files:
     25 added lines, 1 removed, as routes.md says.
4. kpopquiz.org unchanged (ARCH): parity PASS, one kpop change outside parity's list (M3).
   - `parity.json`: identical true, 60 URLs, harness cb12ed53, `parity-mode.txt` "offline (D-025)",
     `parity-refused.txt`: the one known `ensure_daily_debate` write refused on both sides. `spike-parity.log`:
     identical, 60 pages. The css-content failure of 25fa0a0 is gone; the contract test "F0 adds no rule to the kpop
     sheet" (two Tailwind runs, planted proof) passes in my run.
   - Offline parity compares many kpop pages as 500/500 (data pages): accepted under D-025, not a finding.
   - Not covered by parity: `/sites/...` on kpopquiz.org changes its 404 body with the spike's wiring (M3).
5. Leaks on the lane's surfaces (ARCH): FAIL (M1, M2, m1). `lanes.json` lists no lane spec for F0 and the gate's leak
   run skipped all 29 tests (no wired server). I served the gate's own spike builds of 2c3d39a and ran Q0a's leak
   specs and my own probes against them (attacks 1 and 2).
   - Spike lines: `spike-routes.log` 39 of 39 ok (kpop 8, anime 20, hub 11); every line the brief lists is present.
     The kpop unknown URL line waits as a comment (decision 95, F0-18 c): see attack 3, the claim holds.
11. Copy (ARCH, UX): PASS. `copy.log` empty; my grep of every added line of F0 and of the spike: no U+2013, U+2014 or
    emoji; naming traps (`World`, `BRIDGE_`, `bridge` outside the frozen names, hub id `'id'`): none outside the
    report's own sentences that name them. The spike's placeholder text is labelled as such in both files.
9. UX against the twins (UX): PASS for the contract artifacts, with m3.
   - No screen on o1/F0 (`twins.log`: "0 screen files under app/sites", "twins: ok"); the spike pages are routing
     placeholders, say so in their headers and in TWINS.md 1 rule 4, and never merge. D0 frames, axe, keyboard and
     contrast do not apply to this lane.
   - Every twin path of `twins.json` exists (my script, 54 rows with a twin file). `mustImport` completeness: my script
     compared every twin file's non-type imports with its row; each unlisted import is a legacy branch the UX v1 path
     does not render (settings, notifications, create, leaderboard read `UX_V1` first), a page-local data or form
     module (`./faq`, `./corrections`, `./search-form`, `./onboarding-form`), or an F-coded feature (Discord lines,
     the war strip). No missing shared component.
   - Copy keys follow the twin slots: `anime.o1 nav` and `tab` are in the order of `NAV_ITEMS` and `TAB_ITEMS` of
     `lib/ux-v1/a0/nav.ts` (home, quizzes, groups as series, blindtest, community, leaderboard; home, quizzes,
     blindtest, community, you).
   - The answers to the rule 18 audit (`reviews/F0-rule18-UX.md`, 2 blockers and 6 majors) are in the report's table;
     the ones I spot checked (B1 shell keys, B2 404, M4 placeholders, M6 refused CRs) hold.
12. The report tells the truth (ARCH): mostly; three claims are wrong or stale (M3 on "byte-identical", m1 on spike
    finding 3, m2 on routes.md 6). The numbers I re-ran (tests, lines, parity, the 500 under `-H 127.0.0.1`) match.

Items 6 (SQL migrations), 7 (security corpus), 8 (content) and 10 (SEO) are not this lane's profiles; `secrets.log`
is clean.

## Attack attempts

1. Served the gate's spike builds outside the check list (copies of `.next-anime`, `.next-hub`, `.next-kpop` of
   `o1-gate-F0-spike` in my scratchpad, `next start`, `env.sh offline`, anime on 3190 and hub on 3191 at
   `-H 127.0.0.1` as the gate does, kpop on 3192 at `-H localhost`), then probed 31 paths no spike line covers.
   Result: hub `/admin`, `/admin/network`, `/onboarding`, `/onboarding/x` answer 307 to `/login?returnTo=...` (M1);
   anime and hub `/favicon.ico`, `/apple-touch-icon.png`, `/og-default.png`, `/site.webmanifest` are kpop's files,
   byte for byte (`cmp` with `public/favicon.ico` and `public/site.webmanifest`), and the anime home has no icon link
   (M2); anime and hub `/x.png`, `/wp-login.php`, `/api`, `/auth`, `/api/does-not-exist`, `/auth/nope`,
   `/_vercel/x` answer 404 with kpopquiz.org's metadata (m1); kpop `/sites/anime` answers a 16530 byte "404: This page
   could not be found." while kpop `/sites` and `/an-unknown-o1-spike-path` answer the 21819 byte kpop 404 page (M3).
   Anime `/`, `/unknown-page`, `/login/x`, `/page-not-found`, `/robots.txt` behave as routes.md says.
2. Ran Q0a's leak specs (`route-leak`, `string-leak`, `canonical-og`, `link-leak`, project `leak`, files before
   `--project`) against those anime and hub servers with `O1_LEAK_<SITE>_NEXT` pointing at the served builds and
   `O1_LEAK_REQUIRE=anime,hub`. Result: 6 passed (anime route leak, anime string leak, the link leaks), 4 skipped (the
   kpop halves, no kpop server given), 5 failed: route leak on hub with exactly `/admin answered 307 ->
   /login?returnTo=%2Fadmin` and `/onboarding answered 307 -> /login?returnTo=%2Fonboarding` (M1); canonical and OG
   on anime and hub with only `/sitemap.xml answered 404` (spike scope: O1 and H1 write it; not a finding); site
   identity on anime and hub (no `data-site` on `<html>`: B1's root layout, tokens.md 3.2; not a finding).
3. Claims of the report checked against the evidence and a server: (a) decision 95, the kpop unknown URL is a 500
   only under the gate's `-H 127.0.0.1`: `serve-kpop.log` of 25fa0a0 has `Failed to proxy
   http://localhost:4021/page-not-found`, `parity-result.txt` of this sha has `/an-unknown-o1-parity-path status
   500/500` on both sides, and my kpop server at `-H localhost` answers it 404 with the kpop 404 page: the claim holds,
   the cause is the gate's serving (F0-18 c is the right owner). (b) "25 added lines and 1 removed": confirmed. (c)
   "128 files, 2496 tests": confirmed. (d) routing.ts line 8 "kpopQuiz.org is byte-identical": false for `/sites/...`
   (M3). (e) spike finding 3 "An unmatched path rendered the root 404 with the root layout's kpop metadata: fixed":
   only for paths the catch-all takes (m1).
4. Planted bad inputs in a `git archive` copy of the F0 tree: (a) row 6 of `twins.json` given an extra code `A3`:
   `contract.test.ts` fails on "the table and twins.json say the same thing, row by row" (1 failed, 87 passed);
   (b) restored, then an invented screen `app/sites/[site]/stats/page.tsx` added: the test fails with
   `apps/quiz/src/app/sites/[site]/stats/page.tsx: expected false to be true`. Both plants caught.
5. `check-contract.mts --self-test` and `gen-contract-types.mts --check` re-run locally: exit 0, every planted schema
   difference reported (16 kinds listed in the output).
6. `mustImport` completeness script over the 56 rows (UX, item 9): no missing shared component (details above).

## Findings

### Major

M1. The non-kpop middleware step sends the hub's non-routes `/admin` and `/onboarding` into the kpop session branch.
- Where: `apps/quiz/src/lib/site/routing.ts` line 170 (`SESSION_PREFIXES_NON_KPOP = ['/login', '/onboarding',
  '/settings', '/admin']`, the same for anime and hub) and line 178 (`middlewareStep`); `routing.test.ts` line 260
  asserts `'session'` for `/onboarding` and `/admin` on the hub too; `docs/o1/contracts/routes.md` line 22 (item 4).
- Proof: the hub route map (`registry.ts` hub `routes.allow`: `/`, `/privacy`, `/passport`, `/u/{username}`,
  `/settings/**`, `/login`, `/directory`; routes.md 3) has neither path, yet on the spike's hub build `/admin`,
  `/admin/network`, `/onboarding` and `/onboarding/x` answer 307 to `/login?returnTo=...`, and Q0a's route leak spec
  fails on the hub with exactly those two lines (attack 2; "a 3xx is a leak too"). The same branch
  (`lib/supabase/middleware.ts` lines 84 to 99) also sends a signed-in hub user without a profile from `/login` to
  `/onboarding`, a hub 404.
- Fix: derive the session prefixes per site from the site's route map (hub: `/login`, `/settings`), test that hub
  `/admin` and `/onboarding` are `'pass'`, add hub `/admin 404` and hub `/onboarding 404` to `spike-checks.tsv`, and
  say in routes.md item 4 what the session branch may redirect to on the hub (or ask H1 and B4 through a request).

M2. Paths the catch-all skips serve KpopQuiz's brand files on otakuquiz.org and fanquiz.org, and the frozen route map
gives no per-site answer for them.
- Where: `routing.ts` line 37 (`PER_SITE_ROOT_FILES` = robots, sitemap, llms only) and line 63 (`CATCH_ALL_PATTERN`
  skips every dotted last segment); routes.md line 78 ("Public files are shared by the three builds"); spike
  `docs/o1/contracts/spike-checks.tsv` lines 41 and 52 expect anime and hub `/favicon.ico 200` (which is the kpop
  icon).
- Proof (attack 1): anime and hub `/favicon.ico`, `/apple-touch-icon.png`, `/og-default.png` and `/site.webmanifest`
  answer 200 with kpop's files, byte identical to `public/`; the manifest reads `"name": "KpopQuiz"` and
  `"description": "K-pop Quizzes and Games Made by Fans"`. The spike layout sets `icons: null`, so the anime home has
  no icon link and a browser falls back to `/favicon.ico`; services that fetch `/favicon.ico` or
  `/apple-touch-icon.png` directly do so whatever the links say. Rule 10: nothing K-pop on otakuquiz.org. Linking
  `public/brand/<site>/...` from the site metadata (registry.md) does not change what these well-known root paths
  answer, and adding a rewrite after the freeze is a CR.
- Fix: before the tag, add the well-known root brand paths (at least `/favicon.ico`, `/apple-touch-icon.png`,
  `/site.webmanifest`) to the per-site rewrites of non-kpop builds (to `public/brand/<site>/...` or a route), say so in
  routes.md, and change the spike lines to prove the anime and hub answers are not kpop's bytes.

M3. The spike's wiring, which routes.md freezes as the exact diff ORCH applies, changes what kpopquiz.org answers on
`/sites/...`, and the lane decided it alone.
- Where: spike `apps/quiz/src/lib/route-allowlist.ts` line 63 (`'/sites/'` in `KNOWN_ROUTES`); routes.md line 36
  (item 6) and the wiring paragraph; report decision 92 and spike finding 9; `routing.ts` line 8 ("kpopQuiz.org is
  byte-identical").
- Proof: on o1/integration a kpop `/sites/<anything>` is unknown, so the middleware rewrites it to
  `NOT_FOUND_REWRITE` and it renders the kpop 404 page with its chrome. On the spike's kpop build (attack 1)
  `/sites/anime` answers Next's own "404: This page could not be found." (16530 bytes) and `/sites/anime/robots.txt`
  a third body (9633 bytes), while `/sites` and any unknown path answer the kpop 404 page (21819 bytes). The status is
  404 every time, but the page a visitor sees on kpopquiz.org changes, parity's URL list cannot see it, and rule 15
  makes a visible change on kpopquiz.org the owner's call (rule 5).
- Fix: either keep kpop's answer (for example a `'not-found'` step that `middlewareStep('kpop', path)` returns for
  `/sites` and below, which the middleware answers with the same `NOT_FOUND_REWRITE` before the kpop branch, so the
  build guard still knows `/sites/` and the kpop branch keeps its bytes; with a spike line that checks the body), or
  get a ruling recorded in LEDGER.md that this change is accepted. Then correct line 8 of routing.ts.

### Minor

m1. Unmatched file paths and unknown `/api`, `/auth`, `/_vercel` paths render the root 404 with kpopquiz.org's
metadata on anime and hub, while the contract says no unmatched path can.
- Where: routes.md line 90 ("every unmatched path ends in `app/sites/[site]/[...rest]`"); report spike finding 3
  (line 762, "fixed").
- Proof (attack 1): anime and hub `/x.png`, `/wp-login.php`, `/api`, `/auth`, `/api/does-not-exist`, `/auth/nope`,
  `/_vercel/x` answer 404 with the title "KpopQuiz - Play K-pop Quizzes Made by Fans for Fans", a description naming
  BTS, BLACKPINK, Stray Kids, aespa and NewJeans, `og:image` `https://kpopquiz.org/og-default.png` and the
  `p:domain_verify` tag of kpopquiz.org. Minor because B1's done test (no KpopQuiz literal outside the registry)
  moves the root layout to the registry before any launch.
- Fix: correct the sentence, name the root layout's metadata as B1's for these 404s, and add a spike or leak line
  (anime `/x.png` 404 with no K-pop string) so B1's change is proven.

m2. routes.md section 6 is stale.
- Where: routes.md line 193 to the end: "anime (17) and hub (9) and on kpop (6 of 7): kpop `/bts-quiz` is a 500
  offline".
- Proof: `spike-checks.tsv` has 39 lines (8, 20, 11), no `/bts-quiz` line since D-026, and the gate runs on
  `dev.env`.
- Fix: rewrite the section from `spike-routes.log` of the gate.

m3. The shared shell links to two paths the anime route map makes 404, and the contract does not say where its per
site link targets come from (UX, rule 18).
- Where: `lib/ux-v1/a0/nav.ts` lines 22 (`/groups`) and 33 (`/profile`, the You tab), `ux-nav-actions.tsx` lines 48
  and 147 (`/profile`); `routing.ts` lines 210 and 214 list `/groups` and `/profile` as must-404 on anime; TWINS row
  28 only says "configured by the anime registry entry", and `SiteRoutes` has no field for these targets.
- Proof: kpop `/profile` redirects to `/me` (`app/(site)/profile/page.tsx` line 13); on anime the twin shell imported
  as it is would send the You tab and the account menu to a 404, and the series item to `/groups`.
- Fix: say in TWINS row 28 (or registry.md) how the shell gets `/series` and `/me` on anime (a prop of the shell's
  owner on request, or a registry field through a CR), so O1 does not meet it as an unlisted difference.

### Notes (no finding)

- The kpop unknown URL spike line waits on the gate's serving (decision 95): the cause is proven (attack 3) and F0-18
  (c) gives ORCH the change; once the gate serves at `localhost` or the rewrite is in process, the line comes back.
- The hub build's font failure of 25fa0a0 did not recur: `build-hub` rc 0 on this sha.
- `lib/passport.ts` (kpop) and the new folder `lib/passport/` (only `types.ts`, no index) coexist; `@/lib/passport`
  still resolves to the file. A later `lib/passport/index.ts` would change that resolution: lanes should know.

## Verdict

FIX. Three major findings: M1 (hub session paths redirect instead of 404), M2 (kpop brand files on otakuquiz.org
and fanquiz.org through the frozen route map) and M3 (a kpopquiz.org-visible change on `/sites/...` frozen without a
ruling). All three are in the routing contract that ORCH tags as `o1-contract-v1`, so they are cheap now and a CR
after the tag. Minors m1 to m3 go to the report. Everything else holds: scope, evidence for this exact sha and tree,
tsc and unit green in my runs, parity and spike parity identical, the spike lines, the schema tools and their plants,
TWINS and copy keys against the twins, and the removal of CR-002 to CR-006.
