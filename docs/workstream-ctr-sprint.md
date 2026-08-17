# CTR sprint + index health (Workstream S, lever 1)

## Claude Code Implementation Prompt

---

Goal: raise click-through on pages Google already shows, and close the indexation
gap. Grounded in the owner's real GSC data (Google, last 3 months: 803 clicks,
6.89K impressions, 11.7% CTR, avg position 9.7; 213 indexed / 407 excluded).

Hard rules: NO em dashes anywhere (titles, metas, sitemaps). No keyword stuffing,
no clickbait lies (every title promise must be true on the page). Commit per
step, do NOT push. check:routes green.

## Part A - Title/meta rewrites (the CTR fixes)

Rewrite title + meta description for these pages, worst CTR-vs-position first
(real GSC numbers as of Jul 2026):

| Page | Impr | CTR | Pos | Diagnosis |
|---|---|---|---|---|
| /games | 153 | 1.3% | 5.5 | PAGE 1 with a dead snippet - worst offender |
| /seventeen-quiz | 842 | 6.5% | 12.9 | highest impressions of any group page |
| /quizzes | 702 | 5.8% | 20.3 | head-term page, weak title |
| /aespa-quiz | 334 | 4.5% | 8.6 | page 1, underclicked |
| /blackpink-quiz | 172 | 2.3% | 15.7 | weak |
| /twice-quiz | 121 | 3.3% | 13.2 | weak |
| /articles/best-kpop-quiz-sites-2026 | 90 | 1.1% | 12.2 | listicle with no hook |
| /bts-quiz | 46 | 2.2% | 9.6 | page 1, dead snippet |
| /stray-kids-quiz | 94 | 4.3% | 7.9 | page 1, mid |
| /illit-quiz | 252 | ~8% | 7.0 | good - light touch only |

Title formula guidance (adapt per page, sentence-case per site style):
- Group pages: challenge + specificity + freshness. Pattern ideas:
  "SEVENTEEN Quiz: Can You Name All 13? Free Fan Test 2026" /
  "BTS Quiz: Only Real ARMY Score 10/10" /
  "aespa Quiz: From MY to Casual, Find Your Level". Keep <= 60 chars where
  possible; brand suffix "| KpopQuiz" only where room remains.
- /games: sell the variety: "K-pop Games: Blind Test, This or That, Which
  Member Are You" (it currently reads generic).
- /quizzes: own the head term: "K-pop Quizzes: 380+ Free Fan-Made Tests, Every
  Group" (real count, updates with catalog).
- Metas: 140-155 chars, one concrete hook + one number + one action. Every
  number REAL (pull from DB where dynamic).
- Do NOT touch pages already performing (home 24.5%, cortis 7.9% at pos 8 is
  fine, illit light-touch only).
- Keep every existing keyword the page ranks for in the title (do not swap
  "quiz" for "test" wholesale - Google matched on quiz).

## Part B - The faceted cannibalization fix

/quizzes?group=exo earns impressions (107, pos 13.5) while /exo-quiz should own
that query. Audit: do faceted /quizzes?group=X URLs carry canonical to
themselves? Fix: canonical faceted group URLs to the group page (/X-quiz) OR
noindex the faceted variants - choose based on how the S-strategy doc handled
faceted URLs (read it; consistency beats novelty). Verify with a rendered-HTML
canonical check on 3 examples.

## Part C - Index health (213/620)

1. Pull the 7 exclusion reasons from GSC (owner will paste the breakdown if you
   cannot see it - ASK for the screenshot of Pages > Non indexees reasons).
2. For each reason, classify: intentional (noindex news, redirects, canonicals =
   fine) vs losses (crawled-not-indexed, discovered-not-crawled on REAL pages =
   fix). Report the classification table.
3. For real losses: strengthen internal linking to orphaned-ish pages (the
   time-sliced pages + war map + articles mesh helps; find pages with < 3
   internal inlinks and add natural links), verify sitemap accuracy, and check
   thin-page gating is not accidentally excluding good pages.
4. IndexNow ping after deploy (existing wiring) + list the top 20 URLs worth a
   manual GSC inspect-and-request-index (owner action, 10 min).

## Part D - Measurement loop (so we know it worked)

- Record the baseline table (the numbers above) in docs/ctr-sprint-baseline.md
  with the date.
- Owner re-checks GSC in 3-4 weeks (Google needs time to re-snippet): same
  pages, CTR + position columns. Success = CTR up on >= 6 of 10 target pages.
  If a page's CTR DROPPED after 4 weeks, revert its title (keep the honest
  learning, not the loss).

## Steps
1. Part A rewrites (all 10 pages, one commit; show before/after table). Commit.
2. Part B canonical fix. Commit.
3. Part C audit + internal-link fixes (report first, then changes). Commit.
4. Baseline doc + verify: titles render (SSR), no em dashes, no truncation over
   ~600px width for titles, metadata valid, tsc + build + check:routes. Commit.

/caveman report per step. Part C's classification table is the key deliverable
there - do not guess exclusion reasons, ask for the GSC breakdown.
