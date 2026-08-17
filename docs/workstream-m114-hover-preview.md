# M1.14 - quiz card hover preview (desktop)

## Claude Code Implementation Prompt

---

Small polish build, owner-validated prototype. Desktop-only hover preview on quiz
cards: hovering a card ~400ms shows a floating panel with the first question teaser
+ stat chips + Play CTA. Makes browsing feel alive.

Hard rules: NO em dashes. Real data only. Commit per step, do NOT push. No new npm
dependency. Zero effect on mobile and zero effect on the cards' server-rendered
HTML/SEO.

## Behavior (from the approved prototype)

- Trigger: mouse hovers a quiz card >= 400ms (timer cancels on leave). Desktop only:
  gate on `(hover: hover) and (pointer: fine)` media query - touch devices never
  mount the listener or the panel.
- Panel: small floating card (~240px) anchored beside the hovered card; flips to the
  other side near the viewport edge; never causes horizontal scroll or layout shift.
- Content:
  1. "FIRST QUESTION" eyebrow + the quiz's first question TEXT ONLY (never answers,
     never the correct option - no spoilers).
  2. Chips: difficulty, play count, avg score % (only chips whose data exists; avg
     hidden under the usual min-plays honesty gate if one exists in the codebase -
     reuse it).
  3. "Play now" line (the whole panel + card remain one click target to the quiz).
- Dismiss: mouse leaves card OR panel -> hide immediately. Keyboard/focus users:
  do NOT wire focus-triggered popups (noise for screen readers); the card's normal
  link behavior is untouched. Panel is aria-hidden decoration.

## Data (the critical constraint: ZERO new hot-path queries)

- The teaser needs the first question's text. Quiz cards are rendered from list
  queries that do NOT fetch questions today. Options, in preference order:
  a. If the list queries can CHEAPLY include a `first_question` text (jsonb ->
     questions->0->>'question' projected in the same query, no extra round trip),
     add it to the card data type + the queries that feed hover-enabled surfaces.
  b. If (a) bloats cached payloads too much (measure: ~100 chars x N cards = fine;
     if fine, prefer (a)), fall back to lazy fetch-on-first-hover per card
     (GET /api/quiz/[id]/teaser, cached s-maxage=3600) - one tiny request per
     hovered card, only on desktop, only after 400ms intent.
  Pick ONE after measuring, state the choice + numbers in the report.
- Truncate teaser to ~120 chars server-side. Strip nothing else.

## Where it mounts

- /quizzes browse grid + home trending carousel + group pages' quiz lists (the
  surfaces using the shared QuizCard). One island wrapping QuizCard's existing
  markup - do NOT fork QuizCard; extend it with an optional `teaser` prop and a
  small client hover controller. Server HTML unchanged when the feature is off
  (mobile) or data absent.
- Result-screen related-quiz rows + ResultLoop cards: SKIP (small rows, low value).

## Verify

- [ ] 400ms delay honored; quick mouse-over never flashes the panel
- [ ] Touch device (emulated): zero listeners, zero panel, zero extra JS work
- [ ] Edge flip works (card at far right shows panel on left)
- [ ] No spoilers: question text only, verified on a guess_from_clues + intruder
      quiz too (their "first question" shape differs - handle per type or hide
      teaser for types where question text spoils, state the per-type decision)
- [ ] No layout shift (panel is position:absolute/fixed-free overlay per site
      conventions), no horizontal scroll at 1280px
- [ ] Chosen data path measured + reported (payload delta or request count)
- [ ] check:routes, tsc, build green; zero em dashes; ISR/static symbols unchanged
      on every touched page

/caveman report: choice (a) vs (b) with numbers, per-type teaser decisions,
screenshots (hover shown desktop light/dark), confirmation mobile untouched.
