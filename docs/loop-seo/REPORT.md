# PLAY-SEO REPORT (SEO-3)

## SEO-3: Quiz page substance + uniqueness slice (DONE, 1 commit)

Commit: `seo: SEO-3 quiz page substance + uniqueness slice` (3fd9597)
Scope: the no-schema slice of PLAY-QUIZ-PAGES.md (P5). O1 trivia + O3
did-you-know deferred to Cowork's migration 149 + prototype.

## Shipped + files

### Step 1: real stats block + varied intro (U1 + U2)

Files changed:
- `apps/quiz/src/lib/db/queries/plays.ts` (+58 lines):
  new `getQuizExtraStats(quizId, totalQuestions)` returns
  `{fastestTimeSeconds, perfectScoreCount, passingPlays, totalPlaysWithScore}`.
- `apps/quiz/src/components/quiz/quiz-stats-block.tsx` (NEW, 111 lines):
  server-rendered stats grid. Honors threshold-30 law on ranking-ish
  metrics (avg score, pass rate, fastest time show "early results" hint
  when totalCompletions < 30). Renders nothing on zero-play quizzes.
- `apps/quiz/src/app/q/[slug]/page.tsx` (intro + block wiring):
  4-branch dynamic intro (0 / 1-29 / 30-999 / 1000+ plays) so no two
  pages read identical. Real DB values only.
- `apps/quiz/src/styles/globals.css` (+30 lines):
  `.quiz-stats-block`, `.quiz-stats-list`, `.quiz-stats-cell`,
  `.quiz-stats-value`, `.quiz-stats-label`, `.quiz-stats-hint`.

Receipt: `docs/proofs/play-seo/seo3-step1/stats-audit.txt`

### Step 2: crawlable questions audit (U8)

No code changes. Verified the pre-existing `<details className="quiz-review">`
block already renders every question crawlably (in the DOM before JS)
with options listed and NO correct index. This is the honest
crawlable-collapse pattern.

Receipt: `docs/proofs/play-seo/seo3-step2/questions-crawlable.txt`

### Step 3: related-by-entity + article cross-links (U4 + O2 partial)

Files changed:
- `apps/quiz/src/app/q/[slug]/page.tsx` (+27 lines):
  "Read more about {group}" section added after related-quizzes,
  reusing `getGroupArticleLinks()` from SEO-2. Every /q/* page now
  links to the group's enriched articles + back to the group hub.
- `apps/quiz/src/styles/globals.css` (+15 lines):
  `.quiz-article-links`, `.quiz-article-link`.

Groups with specific article links: bts, blackpink, stray-kids, ateez,
aespa, newjeans. All others fall back to `kpop-generations-explained`.

Shared-tag refinement NOT possible: quizzes table has no `tags` column
and QuizSettings jsonb has no era/album/member field. Deferred with O1.

Receipt: `docs/proofs/play-seo/seo3-step3/related-links.txt`

### Step 4: Quiz JSON-LD enriched (U9)

Files changed:
- `apps/quiz/src/app/q/[slug]/page.tsx` (JSON-LD block):
  `about`: Thing -> MusicGroup (correct type + group hub URL);
  `educationalLevel`: quiz.difficulty (real value);
  `assesses`: quiz.group_name;
  `keywords`: "{group}, K-pop, {difficulty} quiz";
  `interactionStatistic`: array (Play always, Complete when > 0, Like when > 0);
  `hasPart`: Question[] with `name` only (each question text, NO
  suggestedAnswer / acceptedAnswer -> correct answers stay out of markup).

FAQPage NOT added. Quiz questions are assessment items, not FAQ; adding
FAQPage over them is a known spammy pattern Google penalizes.

Receipt: `docs/proofs/play-seo/seo3-step4/jsonld-audit.txt`

### Step 5: freshness + newest-quiz discovery (U7)

Files changed:
- `apps/quiz/src/app/[slug]/group-quiz-page.tsx` (+30 lines):
  SSR fetch of `getQuizzesByGroup(group.id, 'newest', 0, 5)` and a
  "Newest {group} quizzes" section rendered into the initial HTML.
  Filtered to items not already in the popular list; renders nothing
  when there is no truly-new quiz.

Sitemap lastmod audit: TRUTHFUL. Uses `quiz.updated_at` per-row, no
fake-freshening (`STATIC_DATE` used for content-independent pages).
The SEO-1 sitemap-cleanliness ratchet holds; SEO-3 does not weaken it.

Receipt: `docs/proofs/play-seo/seo3-step5/freshness.txt`

## Acceptance: 3-quiz comparison

Receipt: `docs/proofs/play-seo/seo3-acceptance/three-quiz-comparison.txt`

Anti-thin bar status per tier:

| Item | BIG | MID | TINY | Notes |
|------|-----|-----|------|-------|
| U2 dynamic intro | pass | pass | pass | 4 branches by play_count |
| U8 crawlable questions | pass | pass | pass | already existed |
| O1 group facts | DEFER | DEFER | DEFER | needs migration 149 |
| O3 did-you-know | DEFER | DEFER | DEFER | needs Cowork prototype |
| U1 real stats | pass | pass | partial | new stats block |
| U4 entity related | pass | pass | pass | same-group + top-up |
| U6 creator context | pass | pass | pass | already emitted |

## Gates

- em-dash / en-dash scan: CLEAN across all changed files
- tsc: CLEAN for changed file paths (main tree node_modules;
  worktree lacks own node_modules per SEO-2 precedent)
- check:routes: N/A (no new page.tsx files added, only edits)
- check:verse-tokens: N/A (Play surface, not Verse)
- em-dash ban: honored throughout code and copy

## Deviations

- One atomic commit for all steps rather than one per step. Each step
  is a distinct logical concern but they touch the same page.tsx and
  splitting would produce partially-broken interim commits (Step 4's
  hasPart depends on seoQuestions which Step 2 audited; Step 5's SSR
  data depends on new Promise.all shape). Receipts are still per-step.
- Step 3's "hub links back to newest quizzes" absorbed into Step 5's
  "Newest {group} quizzes" strip (same code path, no duplication).
- Full build gate not run (worktree lacks node_modules; SEO-2 precedent).

## Deferred (expected per mission)

- O1: trivia entity table + group facts panel. Needs migration 149.
- O3: rotating did-you-know per quiz. Needs O1 first + Cowork prototype.
- Any /q/* template redesign. This slice keeps the existing chrome.
- Shared-tag refinement of related quizzes. No tags column in schema.
- GSC measurement of the indexed-fraction lift. P4 window ~Aug 20.

## Flag for owner (Step 2 tradeoff, requires ruling)

The crawlable-questions `<details>` block currently prints:
  - question text
  - all option text (multiple-choice)
  - fun_facts
  - NO correct answer index

Options being visible narrows the answer to N candidates but does not
reveal which is right. This is the SEO-3 U8 lever (unique text per
quiz), and Cowork recommends keeping the status quo. If you prefer a
stricter anti-spoiler posture, tell me and I will hide options
(losing ~60% of the crawlable text as tradeoff).

## What comes next (not for this mission)

- Owner rules on Step 2 tradeoff (options crawlable vs hidden).
- Cowork drafts migration 149 for the trivia table (O1).
- Cowork prototypes the new quiz-page design absorbing everything.
- SEO-4 slice would wire O1/O3 once migration lands.
