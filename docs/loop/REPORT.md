# REPORT - SEO GROWTH (Google indexation + W1 head-term push)

Small gated PRs, one per mission step, opened with `gh pr create --base main`, **never merged, never
pushed to main** (owner merges each). Zero DB/DDL. No em/en dashes, no emoji. Proofs in
`docs/proofs/seo-indexation/`. (Each PR branches off main independently, so REPORT.md / MISSION.md may
need a trivial rebase when an earlier PR merges - expected.)

## PHASE 1 - INDEXATION

### PR-I1 - Sitemap hygiene  (branch `feat/seo-sitemap-hygiene`, PR #35)  DONE
Sitemap already hygienic (allow-list, killed routes excluded, honest lastmod, title-dedup): prod
649 URLs, 0 killed-pattern hits, 15/15 hubs, 16-URL sample all 200. Ships the lasting guarantee:
`scripts/check-sitemap-hygiene.mts` regression gate (killed-pattern exclusion + priority-hub presence
+ 50k size guard), wired into nightly `seo-gates.yml`. Proven positive + negative.
CI: https://github.com/P-Mingi/KpopQuizzV2/actions/runs/35611707386

### PR-I2 - Internal-linking crawl paths  (branch `feat/seo-internal-links`, PR #36)  DONE
Three crawl-graph gaps closed: (1) home rail now carries all 15 Tier A/B hubs (was 13, missing
cortis/illit/babymonster/itzy) - every hub 1 click from home; (2) every hub gained a `/quizzes` UP
link in the breadcrumb + BreadcrumbList schema; (3) cortis/illit/babymonster now emit sibling
cross-links (were absent from `RELATED_GROUPS`). No orphan priority hub remains.
CI: https://github.com/P-Mingi/KpopQuizzV2/actions/runs/35613126921

### PR-I3 - Bing/IndexNow + robots/llms sanity  (branch `feat/seo-indexnow-sanity`)  DONE
Verified already-correct: robots allows every hub + 8 AI bots + declares the sitemap; llms.txt current
with 0 dead routes; IndexNow fully wired (lib + api route + per-publish ping + on-deploy workflow) and
the key file is live on prod (200). One genuine silent-failure risk guarded: if the IndexNow key is
rotated in `lib/indexnow.ts` but not in `public/<KEY>.txt` (or the file is deleted), every submission
403s and Bing (the #1 referrer) stops recrawling, invisibly. Added `src/lib/indexnow.test.ts` (3
tests) asserting the public key file matches the exported key; runs on every PR.
**Effect:** protects the Bing IndexNow pipeline from silent death. unit 121/121 (118 + 3). 0 em/en dash.
CI: https://github.com/P-Mingi/KpopQuizzV2/actions/runs/35613784804 (PR #37)

Phase 1 MERGED to main (PRs #35, #36, #37; main 645d707) - deployed, home links the cortis-quiz coin
live (I2 verified on prod).

## PHASE 2 - W1 HEAD-TERM PUSH
### PR-W1 Home + /quizzes head  (branch `feat/seo-w1-head`)  DONE
Both pages were already strongly optimized (title + ItemList shipped in #31; /quizzes also has H1 +
FAQPage). The one real gap: the home H1 was "Are you a real fan?" with no keyword, on the site's #1
page for "kpop quiz" (5127i pos9). Home changes only (`home-hero.tsx`): (1) H1 now LEADS with the
exact "K-pop Quiz" anchor (eyebrow line) while keeping the challenge hook; (2) primary CTA "Browse
quizzes" -> "Browse K-pop quizzes", an exact-match internal anchor into the pos-18 `/quizzes`. The
tuned `<title>` is untouched (not regressed). tsc 0, unit 121/121, render 200, 0 em/en dash.
CI: https://github.com/P-Mingi/KpopQuizzV2/actions/runs/35616813624 (PR #38)
### PR-W2 Cortis + ILLIT  (branch `feat/seo-w2-cortis-illit`)  DONE
The hub lever set was mostly already shipped (H1 leads "{group} Quiz"; ItemList present; Quiz schema
lives on the `/q/` pages; internal anchors from PR-I2). The real gap: **no FAQPage on any hub**. Added
a shared, fact-gated FAQ to `group-quiz-page.tsx` - `buildGroupFaqs` builds Q/A from real facts only,
reusing the hero's gates (placeholder fandom + memberCount>0), feeding BOTH a visible `<dl>` and the
FAQPage JSON-LD (>= 2 real Q/A). Added the **Cortis** title override (was missing; not in the CTR
freeze) leaning on the 2025 debut (no member/fandom claim - Cortis has neither in the DB). Proof:
Cortis FAQ = 2 truthful Q (no fabricated fandom/members); ILLIT = 3 (member Q correctly skipped, real
GLLIT fandom kept); BTS = full set. Visible `<dl>` matches the schema. All hubs get the FAQPage.
CI: https://github.com/P-Mingi/KpopQuizzV2/actions/runs/35618661780 (PR #39)
### PR-W3 SEVENTEEN + BABYMONSTER + aespa + Stray Kids  (pending)
### PR-W4 Rescue blackpink + twice  (pending)

## Notes
- The content-engine autopilot (`docs/loop/AUTO-CONTENT.md`) is a SEPARATE scheduled task and is NOT
  touched by this mission.
- `docs/loop/MISSION.md` (the owner's mission spec) is committed on the PR-I1 branch.
