# REPORT - CONTENT ENGINE v2 (the autopilot)

Two branches, two PRs, both CI-green, **no push to main, no auto-merge, zero DB/DDL**. Turned the v1
manual pipeline into a hands-off autopilot and proved it by shipping article #2 through that path.

## PART 1 - the grounding layer (`docs/seo/KPOP-SOURCES.md`)
Curated the authoritative sources with what each is good for and the fact-check rule per tier:
Tier A profiles/data (kprofiles / Kpop Wiki / official label) for roster+debut+fandom, Tier B news
(Soompi / allkpop / official SNS) for the freshness signal, Tier C charts (Circle / Billboard) for
"what is charting" context. Six fact-check rules, including the one that stops the generation-label
class of error v1 caught: only label uncontested gen buckets, neutral phrasing for boundary groups.

## PART 2 - the autopilot run-doc (`docs/loop/AUTO-CONTENT.md`)
A fully self-contained procedure a fresh scheduled Claude session executes start to finish with no
prior context: preconditions (repo guard + sync main + read the machinery) -> pick topic (backlog
top, freshness override, non-cannibalizing) -> fact-check vs KPOP-SOURCES -> draft via the v1
pipeline -> deterministic 3-file wire-up -> self-check gates -> branch + commit + push + open PR ->
emit `EMAIL-<slug>.json` for Cowork. Explicit automatic-vs-human split: everything is automatic
except the final PR **merge** (the human quality gate) and Cowork's Resend send + schedule. It never
merges and never pushes to main.
**PR #33** (branch `content/engine-v2`) - machinery only, CI green.

## PART 3 - proof: article #2 shipped via the auto path
Ran AUTO-CONTENT.md for real on the top backlog item.
- **Article:** `/articles/who-is-cortis` - "Who Is Cortis? Members, Debut and Fandom Name".
- **Target query:** "who is cortis / cortis members". **Data + freshness rationale:** Cortis is the
  strategy's freshness weapon (GSC cortis cluster ~3410 impr; `/cortis-quiz` the #1 hub, 635 clicks);
  the explainer surface is unowned by the quiz hub, so this widens it and funnels into `/cortis-quiz`
  (non-cannibalizing).
- **Facts (verified vs KPOP-SOURCES Tier A):** 5 members (Martin, James, Juhoon, Seonghyeon,
  Keonho), BigHit Music / HYBE, debut Aug 18 2025 with "What You Want", fandom Coer - agreed across
  kprofiles + Kpop Wiki, fandom confirmed by allkpop. **Hedged on purpose:** no generation number
  (2025 rookie = newest wave), no positions/ages, no discography beyond the sourced debut single.
- **seo-check:** render 200, single-brand title, Article + FAQPage (4 Q/A) + BreadcrumbList JSON-LD
  all valid, in sitemap, inbound-linked from `/articles/rookie-kpop-groups-2026` (not orphaned),
  primary link `/cortis-quiz` returns 200, no title/desc dupes across 21 articles, 0 em/en dash / 0 emoji.
- **Email payload:** `docs/proofs/auto-content/EMAIL-who-is-cortis.json` (status ready_for_review, PR
  url, GSC numbers, 3-line summary, fact-check notes, seo-check, CI run url) - Cowork sends via Resend.
- **PR #34** (branch `content/auto-who-is-cortis`), CI green (unit + e2e + Vercel).

## Gates
- Machinery PR #33: docs only, CI green (unit + e2e + Vercel).
- Article PR #34: tsc 0, unit 118/118, `next build` 797/797 static (`/articles/[slug]` SSG),
  render 200, CI green (unit + e2e + Vercel). Proof json in `docs/proofs/auto-content/`.

## Could a scheduled session run AUTO-CONTENT.md unattended? Yes.
This run WAS that procedure executed end to end: pick -> fact-check -> draft -> wire-up -> CI-green PR
-> email payload, with the only human step being the merge. Cowork now: (1) reads
`EMAIL-who-is-cortis.json` and sends the first owner email via Resend, (2) sets up the scheduled task
that runs `docs/loop/AUTO-CONTENT.md`. No push to main; the owner merges #33 then #34.

## Shared-worktree note
A concurrent chat's unpushed "tierlist push" commits had advanced LOCAL main to 5b0a9d7 while
origin/main stayed cdc2fb8. Both my branches were re-based onto origin/main (cdc2fb8) so neither PR
carries the other chat's work; their local commits are untouched. Staged every commit by explicit path.
