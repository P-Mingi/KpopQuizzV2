# REPORT - SEO AUDIT ULTRA (post-refonte, read-only)

Branch `seo/p0-audit` off main `0cc9399` (kill #26, cache #28, 3s-nav #29, ui-polish #27 all merged).
READ ONLY: nothing in `src/` changed. No push to main. Deliverable: `docs/seo/AUDIT.md` + proofs.

## What was done
- Grounded the whole audit in real GSC data: the owner's FRESH 6-month export (2026-09-21: 3.46k
  clicks, 46.5k impr, 7.5% CTR, pos 7.8) cross-checked with the committed 3-month `DATA-19SEP.md`.
- Technical facts from the live site + a clean local build (795 static pages, exit 0, ZERO 522 - DB
  now Supabase Pro/micro, stable): robots.txt, sitemap (646 URLs), render-mode table, Googlebot 2MB
  HTML check, image/LCP signals.
- File-level codebase sweep (on-page templates, JSON-LD per template, canonical/noindex/hreflang, dead
  internal links, internal linking to hubs, image alt, sitemap.ts).
- claude-seo v2.3.1 checklist methodology folded in.

## claude-seo install status
CLONED cleanly; NOT formally installed. Why: its install needs the interactive `/plugin` Claude Code
command (unavailable in this non-interactive session) OR `install.sh`/`/seo setup` which provision a
Playwright-Chromium + Python runtime (heavy install the owner asked to avoid, out of the read-only
scope). Its skill checklists were READ and applied (2MB fetch cap, crawl depth, GEO/llms.txt, IndexNow).
Full note: `docs/proofs/seo-audit/claude-seo-status.txt`.

## Verdict: the technical base is SOUND (no hard P0). The wins are CTR/ranking + freshness + small leaks
- P0.1 (confirm): `/news` `index:false` - possible accidental deindexation, settle intent.
- P1 (big): home `<title>` brand-doubling on the top page (ranks "kpop quiz" pos 9.14, CTR 4.21%);
  `/quizzes` stuck at pos 18.22; MISSING fresh-group hubs (`/coer-quiz` 404 despite 32 clicks pos
  4.81); dead `/games` links on indexable article bodies + popular-page; hub-vs-quiz slug
  cannibalization (illit/cortis); evergreen big hubs under-perform (blackpink pos 10.64 CTR 3.02%);
  trivia/test/"name all"/"guess by picture" query-intent coverage.
- P2 (polish): blindtest 300+/60+ vs OG 4000+/87+ count conflict; robots `*` missing
  /admin//settings//onboarding Disallow; no ItemList JSON-LD on home + /quizzes; group-hub member-face
  `alt=""`; /blindtest H1 missing "blind test" kw; /pt under-localized; kpopquiz.io brand confusion;
  Bing >> Google referrer = Google headroom.

## Top-10 quick wins (in AUDIT.md, ranked impact/effort)
Home title fix; repoint indexable dead /games links; settle /news noindex; fix blindtest count;
robots Disallow admin/settings/onboarding; ItemList JSON-LD home+/quizzes; big-hub internal-link boost;
/blindtest H1 keyword; repoint remaining /games links; seed /coer-quiz + fresh-hub trigger.

## Proof battery (`apps/quiz/docs/proofs/seo-audit/`)
route-modes.txt, technical-facts.txt, gsc-evidence.txt, codebase-sweep.txt, claude-seo-status.txt.

## Scope proof
Only `docs/seo/*`, `docs/proofs/seo-audit/*`, `docs/loop/REPORT.md` touched. `src/` UNCHANGED (no fix of
anything found - each is named in AUDIT.md for Cowork's strategy + the owner to schedule). No push to
main. No new paid service. No em dashes, zero emoji.

NOTE on `.gitignore`: `docs/*` is ignored with negations for the tracked trees (`!docs/loop/`,
`!docs/proofs/`, `!docs/data/`, `!docs/loop-seo/`), but `docs/seo/` has NO negation, so `AUDIT.md` was
committed with `git add -f` (the scope fence explicitly authorizes `docs/seo/*`). If you want `docs/seo/`
tracked by default, add `!docs/seo/` to `.gitignore` - I did not touch `.gitignore` (out of scope).

## Cowork next
Write the full strategy FROM `docs/seo/AUDIT.md`. The through-line: freshness converts (fresh-group hub
pipeline), the head terms are within reach on page 1 (home title + /quizzes), and Bing outranks Google
so the Google upside is the whole game.
