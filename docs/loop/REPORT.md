# REPORT - SEO GROWTH (Google indexation + W1 head-term push)

Small gated PRs, one per mission step, opened with `gh pr create --base main`, **never merged, never
pushed to main** (owner merges each). Zero DB/DDL. No em/en dashes, no emoji. Proofs in
`docs/proofs/seo-indexation/`. (Each PR branches off main independently, so REPORT.md / MISSION.md may
need a trivial rebase when an earlier PR merges - expected.)

## PHASE 1 - INDEXATION

### PR-I1 - Sitemap hygiene  (branch `feat/seo-sitemap-hygiene`, PR #35)  DONE
The sitemap was already hygienic (allow-list from live DB, killed routes excluded by construction,
honest lastmod, title-dedup): prod `/sitemap.xml` = 649 URLs, 0 killed-pattern occurrences, all 15
Tier A/B hubs present, a 16-URL sample all 200. So instead of churn, PR-I1 ships the lasting guarantee:
`scripts/check-sitemap-hygiene.mts`, a regression gate (sibling to check:indexability/orphans/dupes)
that fails CI if a killed route re-enters the sitemap, a priority hub drops out, or the file passes
Google's 50k limit. Wired into the nightly `seo-gates.yml`. Proven positive + negative.
CI: https://github.com/P-Mingi/KpopQuizzV2/actions/runs/35611707386

### PR-I2 - Internal-linking crawl paths  (branch `feat/seo-internal-links`)  DONE
Closed three real gaps in the hub crawl graph:
1. **Home rail** (`home-group-pills.tsx`) capped at 13 and omitted the biggest rookie hubs
   (cortis 3410i, illit 2347i, babymonster, itzy). `ORDER` now carries all 15 Tier A/B hubs, rookies
   surfaced near the front. Proof: home links 15/15 priority hubs as `/{slug}-quiz` coins - every one
   reachable in 1 click (mission target was <= 2).
2. **Hub UP link** (`group-quiz-page.tsx`): added a `/quizzes` breadcrumb item, rendered as a link and
   in the `BreadcrumbList` JSON-LD. Proof: every hub now `Home > Quizzes > {group} Quiz` (valid schema).
3. **Sibling cross-links** (`related-groups.ts`): cortis / illit / babymonster had no `RELATED_GROUPS`
   entry, so their "Fans also play" section did not render. Added entries (labelmate + fellow rookies,
   all with quizzes). Proof: each rookie hub now emits 3 sibling hub links.
No orphan priority hub remains (inbound from home + /groups + sibling sections).
**Target query + effect:** structural - tightens the crawl graph feeding all 15 head-term hubs, the
mission's biggest indexation lever. tsc 0, unit 118/118, build (CI). 0 em/en dash.
CI: <<fill after push>>

### PR-I3 - Bing/IndexNow + robots/llms sanity  (pending)

## PHASE 2 - W1 HEAD-TERM PUSH
### PR-W1 Home + /quizzes head  (pending)
### PR-W2 Cortis + ILLIT  (pending)
### PR-W3 SEVENTEEN + BABYMONSTER + aespa + Stray Kids  (pending)
### PR-W4 Rescue blackpink + twice  (pending)

## Notes
- The content-engine autopilot (`docs/loop/AUTO-CONTENT.md`) is a SEPARATE scheduled task and is NOT
  touched by this mission.
- `docs/loop/MISSION.md` (the owner's mission spec) is committed on the PR-I1 branch.
