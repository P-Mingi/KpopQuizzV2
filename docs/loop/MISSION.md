# MISSION (SEO GROWTH - Google indexation + W1 head-term push. Small gated PRs. NO push to main, owner merges each.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise execute NOTHING, one line in that repo's BLOCKED.md, stop.

## CONTEXT (cat this whole file first)
The content-engine autopilot is a SEPARATE scheduled task (`docs/loop/AUTO-CONTENT.md`) - do NOT
touch it, do NOT run it. This mission is the on-page + technical SEO growth work. Grounded in
`docs/seo/AUDIT.md`, `docs/seo/GSC-21SEP.md`, `docs/seo/STRATEGY.md` (W1), `docs/seo/CONTENT-BACKLOG.md`,
and the market + keyword analysis (top-20 ROI). Every step is its OWN small PR, CI-green, opened with
`gh pr create --base main`, NEVER merged and NEVER pushed to main (the owner merges each). No DB writes,
no DDL. No em dashes, no en dashes, no emoji. Cannibalization guard: a bare "{group} quiz" head term
belongs ONLY to the `/{group}-quiz` hub; explainer/long-tail stays on articles/blindtest.

## ORDER OF PRs (one small PR each, top of list first; do them in order)

### PHASE 1 - INDEXATION (the single biggest immediate lever: content exists, Bing ranks it, Google is under-indexed)
- **PR-I1 Sitemap hygiene.** Ensure `sitemap.xml` lists every LIVE hub / quiz / article / blindtest /
  pt page and EXCLUDES killed or 404 routes; correct `lastmod`; split into a sitemap index if oversize.
  Verify no dead entries remain (killed `/games` sublinks, `/coer-quiz` -> `/cortis-quiz` 301). Prove:
  fetch the sitemap, count URLs, spot-check a sample return 200.
- **PR-I2 Internal-linking crawl paths.** Home + `/groups` link to ALL Tier A + Tier B hubs (cortis,
  illit, seventeen, babymonster, aespa, stray-kids, blackpink, twice, bts, newjeans, le-sserafim, ive,
  enhypen, txt, itzy). Each hub links UP to `/quizzes` and ACROSS to 2-3 sibling hubs (same generation
  or company). Each article links INTO its target hub. Kill any orphan hub (a hub with no inbound
  internal link). Prove: from home, every Tier A/B hub reachable in <= 2 clicks.
- **PR-I3 Bing/IndexNow + robots/llms sanity.** Confirm IndexNow pings on publish, robots allows the
  hubs + AI bots, `llms.txt` current. Some of this shipped in #31 - verify and only patch gaps.

### PHASE 2 - W1 HEAD-TERM PUSH (hub on-page, in top-20 ROI order)
Apply the SAME lever set to each hub: title + H1 + intro copy LEADING with the exact "{group} quiz"
anchor; JSON-LD **Quiz + ItemList + FAQPage**; internal links INTO the hub with the exact "{group} quiz"
anchor from home + sibling hubs + any article that mentions the group.
- **PR-W1 Home + `/quizzes` head** ("kpop quiz" 5127i pos9 ; "kpop quizzes" pos18): title/H1/intro +
  ItemList schema + internal links with "kpop quiz" / "kpop quizzes" anchors. Home title was tuned in
  #31 - build on it, do not regress it.
- **PR-W2 Cortis + ILLIT hubs** (3410i + 2347i, rookie, biggest impressions): full lever set.
- **PR-W3 SEVENTEEN + BABYMONSTER + aespa + Stray Kids hubs**: full lever set.
- **PR-W4 Rescue `/blackpink-quiz` (pos10.6, CTR 3%) + `/twice-quiz` (pos9.3)**: full lever set. Biggest
  fandoms ranking worst = pure upside.

## PER-PR GATES (all must pass before the PR is done)
`npx tsc --noEmit` 0, unit + e2e green, `pnpm --filter quiz build` green, render 200 on every touched
route, every JSON-LD block parses, 0 em dashes, 0 en dashes, 0 emoji. Branch `feat/seo-<slug>`, push,
`gh pr create --base main`, wait for CI green on the current head, paste the run URL in the REPORT.
**DO NOT MERGE. DO NOT PUSH TO MAIN.**

## WHEN DONE (per PR)
Update `docs/loop/REPORT.md`: what changed, the target query + expected effect, the CI run URL, and that
the only remaining gate is the owner merging the PR. Then move to the next PR in the list.

## AFTER W1
The next mission (do NOT start it here) is W2 - the freshness engine: a comeback/debut detector that
auto-seeds a group hub within hours of a new group pulling its first GSC impressions.
