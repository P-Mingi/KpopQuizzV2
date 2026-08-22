# UI-1 zone 5 (the About-this-quiz drawer): the SEO blocks are unchanged

The owner's rule for zone 5: server renders the SEO blocks OPEN, they collapse
client-side only for a visitor who just played, and **not one crawlable string
is edited, reworded or removed.** Two independent proofs.

## 1. The authoritative proof: the code diff is purely structural

`git diff` of `apps/quiz/src/app/q/[slug]/page.tsx` is exactly three lines of
change: one import, one `<AboutQuizDrawer ...>` opening tag, one
`</AboutQuizDrawer>` closing tag. Every SEO block between them (creator note,
intro paragraph, In this quiz, engagement counts, QuizStatsBlock, Hall of Fame,
Open runs, Did you know, trivia link, question review, related quizzes, article
links) is byte-for-byte the JSX that shipped before. No content line is added,
reworded or removed. A structural diff cannot change a crawlable string.

## 2. The empirical proof: served HTML before vs after

- **before** = the prior production `next start` on :3021 (predates UI-1)
- **after**  = this session's code served on :8081

Both were reduced to visible text (`before-3021.txt`, `after-8081.txt`) and the
SEO region word-diffed (`seo-before.txt` vs `seo-after.txt`).

Every enumerated SEO anchor is present in BOTH:

    Test your BTS knowledge   In this quiz   A taste of the questions
    Hall of Fame   Did you know   Show the 8 questions
    More quizzes to play   Read more about

The word-diff shows **only additions in `after`, zero removals or rewordings**
(no `<` lines). The additions are data-driven, not UI-1: the newer build has
more Hall-of-Fame rows and renders the full question-review list. UI-1 touches
neither.

## 3. The drawer ships OPEN, with the content inside it

In the raw served HTML the panel is `about-drawer-panel"` with **no `hidden`
attribute** (server default is open), and every SEO string sits INSIDE that
panel. So the crawler and the cold visitor receive the whole block expanded.

## 4. The collapse is client-only and gated on having played

Driven live at 390px: on a fresh load `about-drawer[data-open]` is `true` and
the panel is visible. After playing to the result phase, the player fires
`quiz:played`, and the drawer flips to `data-open="false"` with the panel
`hidden` (still in the DOM, out of the a11y tree). `defaultOpen = !hasPlayed`,
exactly as specified. See `played-light-390.png` / `played-dark-390.png` (drawer
collapsed) and `cold-light-390.png` (drawer open).

## Note: metadata is not in scope and is untouched

`generateMetadata` in the same file is not in the diff. The `check:metadata-dupes`
gate reports 3 pre-existing collision groups (SEVENTEEN true/false, ateez lyrics
part 4/5) that are quiz-title-template issues unrelated to this mission; UI-1
edits no title or description, so it cannot affect them.
