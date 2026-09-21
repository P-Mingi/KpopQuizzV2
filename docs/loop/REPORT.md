# REPORT - CONTENT ENGINE v1 (W3 of docs/seo/STRATEGY.md)

Branch `seo/content-engine-v1` off main `a1b2a1f`. TSX-only, **zero DB / DDL**, behaviour preserved,
Verse untouched, no new paid service. No push to main. Proofs in `docs/proofs/content-engine/`.

Built the repeatable AEO-article pipeline, shipped ONE article end-to-end as the proof, and queued
the next 10.

## PART 1 - the pipeline (`docs/seo/CONTENT-ENGINE.md`)
The re-runnable 5-step process, written so the next article is a repeat:
1. **Keyword selection** from `docs/seo/GSC-21SEP.md` (proven intent, non-cannibalizing an existing
   hub/quiz/article, article-shaped not page-shaped).
2. **Brief** (target query + GSC numbers, intent, the ONE internal-link target, angle, schema type).
3. **Draft** - answer-first (BLUF) body in the site voice, question-style H2s, verified facts
   (never fabricate members/dates/counts/generation), no em dashes, no emoji.
4. **Wire-up** - `registry.ts` `ArticleMeta` (title with no doubled brand) + `content/index.ts`
   `CONTENT_MAP` entry + one anti-orphan inbound link; sitemap + Article/FAQ/Breadcrumb JSON-LD are
   automatic from the route.
5. **Self-check** - the repo's SEO gates (`check-metadata-dupes`/`orphans`/`indexability`) + render
   200 + JSON-LD validation + tsc/unit/build.
Each step is annotated with exactly what a `[CRON]` would automate in v2 (wire-up + self-check are
fully automatable; keyword non-cannibalization and fact verification stay human; a human still merges).

## PART 2 - article #1 shipped (the proof)
**Slug:** `kpop-blind-test-2026` -> `/articles/kpop-blind-test-2026`
**Target query:** "blind test kpop 2026" (GSC-21SEP.md: **pos 4, open field, 0 clicks to take** - the
strategy's named blindtest long-tail gap). Dated variant, so it does NOT cannibalize `/blindtest`
(the head term) or the existing `kpop-blind-test-guide` how-to article - it widens the surface and
funnels INTO `/blindtest`.
**Links to:** `/blindtest` (x7, the money surface), `/cortis-quiz` (freshness), and the sibling
`/articles/kpop-blind-test-guide`. **Inbound:** contextually linked FROM `kpop-blind-test-guide`
(a 53-click ranking article) + listed on `/articles` + in the sitemap. Not orphaned.
**Schema:** Article + FAQPage (4 Q/A) + BreadcrumbList, all valid JSON (saved to
`docs/proofs/content-engine/article-jsonld.json`).
**seo-check result:** render 200; single-brand title (no doubling); in sitemap; no duplicate
title/description across all 20 articles; 0 em dashes / 0 emoji.
**Facts:** all named groups real + active; generation labels cross-checked against the site's own
`kpop-generations-explained` (fixed a draft slip - Stray Kids is 4th gen, replaced with EXO in the
3rd-gen line); NO song titles / dates / member counts / blindtest song-count asserted (that count is
still unconfirmed, 300-vs-4000).

## PART 3 - the backlog (`docs/seo/CONTENT-BACKLOG.md`)
Next 10 articles ranked by ROI, each with target query (+ GSC impressions/position), intent,
internal-link target, and schema type. Top of queue: Who Is Cortis (test cortis 1026i pos7.8),
BLACKPINK Blind Test (blind test blackpink pos6 open), Who Is ILLIT (illit 2347i pos5.1). Plus a
"refresh not new" note (extend `guess-the-kpop-idol-guide` for "by picture" rather than compete) and
the PT-localization angle queued behind the `/pt` on-page work.

## Gates (local)
- `tsc --noEmit` full project: **exit 0**
- `pnpm test:unit`: **118 passed (118)**
- `next build`: **compiled successfully** (see PART: build in `docs/proofs/content-engine/`)
- em-dash / emoji sweep (article + registry + both docs): **0 / 0**
- CI on the branch head: PR **#32** (https://github.com/P-Mingi/KpopQuizzV2/pull/32); Tests run
  https://github.com/P-Mingi/KpopQuizzV2/actions/runs/35596576363 (push run 35596552208 already green:
  unit pass). Vercel Preview building.

## Notes for the owner / Cowork
- Zero DB. The article is code; merging it needs only a normal PR review.
- The full-sitemap crawl gate (`check-metadata-dupes`) is CI-oriented (too slow against a dev server,
  as in prior missions); the dedup risk was verified directly against the registry (no collisions).
  It runs green in CI on the PR.
- Cowork to audit the article body before the owner merges. No push to main.
