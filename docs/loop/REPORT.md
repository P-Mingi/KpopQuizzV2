# REPORT - SEO GROWTH (Google indexation + W1 head-term push)

Small gated PRs, one per mission step, opened with `gh pr create --base main`, **never merged, never
pushed to main** (owner merges each). Zero DB/DDL. No em/en dashes, no emoji. Proofs in
`docs/proofs/seo-indexation/`.

## PHASE 1 - INDEXATION

### PR-I1 - Sitemap hygiene  (branch `feat/seo-sitemap-hygiene`)
**What changed:** the sitemap was already hygienic (allow-list built from live DB, killed routes
excluded by construction, honest lastmod, title-dedup) - proven: prod `/sitemap.xml` = 649 URLs,
0 killed-pattern occurrences (games / coer-quiz / tier-list / rankings / battle / personality /
avatar / pinterest / blind-test), all 15 Tier A/B hubs present, a 16-URL sample all HTTP 200. So no
dead entry to remove. Instead of fabricating churn, PR-I1 ships the **lasting guarantee**: a
regression gate `scripts/check-sitemap-hygiene.mts` (sibling to check:indexability/orphans/dupes)
that fails CI if a killed route ever re-enters the sitemap, a priority hub drops out, or the file
exceeds Google's 50k limit. Wired into the nightly `seo-gates.yml` + its Discord failure line.
**Target query + effect:** structural - protects the indexation of all ~649 advertised URLs (the
mission's "single biggest lever": content exists, Bing ranks it, Google is under-indexed). Keeps the
crawl budget on live winners, never on 301/404 ghosts.
**Gates:** tsc 0, unit 118/118, next build (green), gate positive (2992 local URLs, 0 killed, 15/15
hubs) + negative (synthetic killed+missing -> exit 1) both proven. 0 em/en dash.
**CI run URL:** <<fill after push>>
**Only remaining gate:** the owner merging the PR.

### PR-I2 - Internal-linking crawl paths  (pending)
### PR-I3 - Bing/IndexNow + robots/llms sanity  (pending)

## PHASE 2 - W1 HEAD-TERM PUSH
### PR-W1 Home + /quizzes head  (pending)
### PR-W2 Cortis + ILLIT  (pending)
### PR-W3 SEVENTEEN + BABYMONSTER + aespa + Stray Kids  (pending)
### PR-W4 Rescue blackpink + twice  (pending)

## Notes
- The content-engine autopilot (`docs/loop/AUTO-CONTENT.md`) is a SEPARATE scheduled task and is NOT
  touched by this mission. While this worker runs (tree not clean), that autopilot self-halts and
  emails harmlessly; it resumes when the tree is clean and paused.
- `docs/loop/MISSION.md` (the owner's mission spec) is committed on the PR-I1 branch, since the owner
  wrote it into the tree and the worker commits it as it starts.
