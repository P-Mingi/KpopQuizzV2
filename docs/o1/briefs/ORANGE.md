# OtakuQuiz turns orange and drops the blind test (owner, 2026-10-26)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-orange, branch o1/orange (= o1/integration). Q = apps/quiz/src.
Read this brief, docs/o1/briefs/LD.md (rule 18 and kpop render tree rules apply), Q/lib/site/registry.ts (themes, features, routes),
Q/styles/sites/anime/*, the anime colour uses in docs/o1/design/fanquiz-hub/Main.dc.html, and the code you change.
## Rules
No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets. No en or em dash, no emoji.
Never `git add -A`; files by path. Never edit docs/o1/contracts/** (list what they need in docs/o1/requests/ORANGE.md), scripts/o1/**,
middleware, next.config. kpopquiz.org unchanged: same client modules (apps/quiz/e2e/o1/P1/kpop-chunks.sh) and chunk count
(apps/quiz/e2e/o1/O2/kpop-chunk-count.sh) against the base; the kpop theme tokens byte for byte.
## 1. Orange
OtakuQuiz uses its own theme (registry ANIME_LIGHT and ANIME_DARK, today it borrows KPOP_LIGHT and KPOP_DARK): the accent family
(the tokens named pink, pink-fill, pink-fill-h, pink-ink, pink-soft, pink-soft-ink, pink-line) becomes orange, from the design's
OtakuQuiz values: fill #C2410C, soft #FFF1E6, ink #9A3412 (and the lighter oranges the design uses, #F97316, #FDBA74, #F7DCC7, where
a lighter step is needed). Dark mode: orange steps that pass WCAG AA on the dark surfaces (compute and test the ratios: text 4.5,
large text and UI 3). Every literal pink left in anime-only CSS or components becomes the token. Hover and focus states included.
No pink anywhere on otakuquiz.org (a test greps the anime build's CSS and the anime components for the kpop pink hexes).
## 2. No blind test on OtakuQuiz
features.blindTest and dailyBlindTest false on anime; /blindtest/** leaves the anime route allowlist (it answers 404 there); every
nav item, tab, card, rail, link and copy key that leads to a blind test on the anime build disappears (no dead link: a test crawls the
anime nav and home links). The openings quiz pages and openingOfTheDay stay as they are (not a blind test). The hub's daily blind
test is K-pop only already: unchanged.
## Checks
Unit tests (tokens, contrast ratios, no pink on anime, no blind test route or link on anime, kpop tokens unchanged); tsc 0; full
vitest green (`--testTimeout=30000` if the machine is loaded); check.sh ok; anime, hub and kpop builds green; the two kpop chunk
scripts. Screenshots of the anime home, a series page and a quiz page, light and dark, in docs/o1/reports/ORANGE/.
One or two commits ("o1: OtakuQuiz orange ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 6 lines: sha, files, contrast ratios, what was removed for the blind test, checks, contract requests.
