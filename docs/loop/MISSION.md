# MISSION (UI-1 - the photocard result screen. Owner-approved design. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**`cat` this file. Do not `head` it.**

Note: the PERF-1 mission that was on this bus is NOT cancelled. It is parked verbatim in
`docs/loop/QUEUED-PERF-1.md` and returns to the bus after this one. Do not do both at once.

## WHAT THIS IS
The post-play result screen on `/q/[slug]` is being rebuilt to an owner-approved design.
**The target is `prototypes/quiz-result-photocard.html`. Open it in a browser and read it
before writing a line.** It shows three states: today's pile, the new played state, and the
new cold-visitor state. The middle and right phones are the spec.

The concept in one line: the result hero becomes a photocard, the thing fans screenshot and
share, and the 13 stacked cards below it collapse into 5 zones.

## THE OWNER'S ONE RULE, AND IT BOUNDS EVERYTHING
**Keep the existing UI direction.** This is a reorganisation inside the current design
system, not a redesign of it. Concretely:

1. **Tokens only.** Every colour comes from the custom properties already in
   `globals.css` (`--brand`, `--brand-light`, `--btn`, `--surface`, `--txt*`, `--border`).
   The photocard gradient is the ONE new thing: define at most two new tokens for it, next
   to the existing brand block, with light AND dark values, and derive them from the brand
   family (the prototype uses brand pink into plum/violet). No other new colours anywhere.
2. **No new fonts, no new radii conventions, no new shadow language.** DM Sans, the
   existing rounded-card vocabulary, the existing elevation. The stamp, serial strip and
   sticker are compositions of existing primitives, not a new style.
3. **Reuse the existing components, do not rewrite them.** `ResultChallenge`, `ClaimRun`,
   `LikeQuizButton`, `QuizComments`, `Mascot`, `QuizStatsBlock`, `QuizMyRank`,
   `StreakBackup` keep their internals; this mission moves and merges their placement.
   Where the ledger strip absorbs a card (stat row + your best + XP + like + claim), keep
   the underlying logic and state, change the shell.
4. **The real mascot.** The prototype's bunny is my sketch. Use the existing `Mascot`
   component variants (celebrate / sad) as the sticker, positioned per the prototype.
5. **Both themes.** The tokens should make dark mode fall out for free; verify it, do not
   assume it. Screenshot both.
6. **No em dash anywhere**, including comments. CLAUDE.md rule. Grep the diff before
   committing.

## THE ZONES (middle phone of the prototype)
1. **Photocard hero**, reworked from the existing `result-share-card`: gradient top
   (group tag, quiz title, count-up score kept, beat bar, beat line), mascot sticker
   overlapping the seam, verdict stamp, then actions (Share primary inside the card,
   Play again outline), then a serial footer strip: `KPOPQUIZ · <quiz kind>` left,
   `PLAY No. <n> · <month year>` right. **The serial number must be real data**, the
   quiz's play count at render, never an invented figure. Keep the existing share handler.
2. **Battle**, `ResultChallenge` as-is, directly under the card, its W2 placement and its
   funnel analytics untouched. **The `shown` event must keep firing exactly once**, the
   StrictMode ref guard stays.
3. **Run ledger**, one card: five cells (You / Avg / Rank #n of m / Pass / +XP) with
   tabular-nums, then a claim row (save text, like count, Claim button). This absorbs
   the old stat row, "your best" band, XP card, like pill and claim card. XP level bar
   detail may live inside the claim flow or a subtle expansion, worker's call, but not as
   its own card.
4. **Keep playing**, one list card: related quizzes rows + the blindtest cross-link as the
   last row. "See all" keeps its link.
5. **The drawer.** See below, it is the only part with SEO consequences.

Clue-quiz specifics (clue breakdown card) and the level-up overlay keep working; slot them
where they least fight the zones (breakdown belongs with zone 3).

## ZONE 5, THE DRAWER, READ TWICE
The server-rendered SEO blocks under the player (intro paragraph, In this quiz, engagement
counts, `QuizStatsBlock`, Hall of Fame, Did you know, trivia link, question review, related
reads) collapse into one "About this quiz" drawer.

- **Server renders it OPEN.** The crawler and the cold visitor see everything, exactly as
  today. The collapse to closed happens client-side only when the visitor has just played
  (the player already knows `phase === 'result'`). `defaultOpen = !hasPlayed` is the
  owner-locked rule.
- **Not one crawlable string is edited, reworded or removed in this mission.** The intro
  paragraph, the In this quiz block and every SEO string ship byte-identical; they change
  container, not content. The W1 metadata control window runs to 2026-08-24: no title or
  meta description edits either.
- Prove it: extract the visible text of the served production HTML before and after, and
  show the SEO strings are present and unchanged. A structural diff is expected; a content
  diff is a failure.

## DO NOT TOUCH
`app/layout.tsx` (render-mode fix is its own pending mission), the sitemap, metadata,
anything under `/api`, the database. No DDL, no writes, no push.

## PROOFS, in docs/proofs/ui-1/
- Production build. Served-HTML text extraction before/after showing SEO strings intact.
- Screenshots (or rendered captures) at 390px: played state light, played state dark,
  cold state light. The played state must fit the prototype's shape: 5 zones, one primary
  CTA per moment, no duplicate score/rank/like anywhere on screen.
- `grep -c` for em dashes over changed files: 0.
- All four gates, cwd printed before each: `check:docs-secrets`, `check:routes`,
  `check:indexability`, `check:orphans` unscoped, `check:metadata-dupes` unchanged at 8.
- The battle `shown` event verified firing once per result mount.

## STANDING RULES
- A mission is not finished until `docs/loop/REPORT.md` describes it.
- If you skip a part, say so in the report.
- Recompute before asserting; prove against the served HTML of a production build.
- If a zone cannot be built without breaking a rule above, BLOCK with the conflict named
  rather than improvising a new design. The prototype is the spec; the owner's rule wins
  over the prototype where they conflict.
