# REPORT - UI-1: the post-play result screen is now the photocard. No push.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd`
printed before the work. No DDL, no database writes, no push. The prototype
`prototypes/quiz-result-photocard.html` was read in full before a line was
written. Proofs: `docs/proofs/ui-1/`.

---

## What shipped

The `/q/[slug]` result phase was rebuilt from a 13-card pile into the five zones
of the owner-approved prototype, inside the existing design system. Tokens only,
DM Sans, the existing radii and elevation, the real components reused.

**Zone 1 - the photocard.** `result-share-card` became `.photocard`: a
brand->plum->violet gradient top (the count-up score, fill bar and beat-line all
kept), the real `Mascot` (celebrate / sad) as a sticker overlapping the seam, a
dashed verdict stamp, Share/Play-again actions, and a serial strip. The serial
is real data: `Play No. <playCount + 1>` (this run is not in the ISR-baked count
yet) and the current month. The share handler is unchanged.

**Zone 2 - the battle.** `ResultChallenge` is directly under the card, its W2
placement and its funnel analytics **untouched** (`git diff` of the file is
empty). Rendered once, gated by `canChallenge` as before.

**Zone 3 - the run ledger.** One card folds the old stat row, the XP card, your
best/rank, the like pill and the claim card into a single summary. The cells are
a comparison row in one unit (You 25% / Avg 53% / Pass / XP / Time), so the raw
score and percentile stay on the card and no fact repeats. `QuizMyRank`,
`LikeQuizButton` and `ClaimRun` keep their internals; `ClaimRun` gained a
shell-only `flush` option (copy, logic, funnel and the once-per-mount `shownRef`
guard all unchanged) so it sits flush as the card's last section.

**Zone 4 - keep playing.** Related quizzes plus the blindtest cross-link as the
last row, in one list card. "Play again" lives in the photocard, so it is not
duplicated here.

**Zone 5 - the drawer.** Every server-rendered SEO block below the player now
lives inside one `AboutQuizDrawer`. It renders OPEN on the server, and collapses
client-side only when the player fires `quiz:played` on reaching the result
phase (`defaultOpen = !hasPlayed`). See the SEO proof below.

The two new tokens (`--photocard-plum`, `--photocard-violet`) are defined in all
three token sites (light `:root`, the system-dark media block, and `.dark`),
derived from the brand hue. Dark mode was verified, not assumed.

## Proofs

- **Screenshots at 390px** (`docs/proofs/ui-1/`): `played-light-390.png`,
  `played-dark-390.png`, `cold-light-390.png`. The played state is the five
  zones, one primary CTA per moment, and no duplicate score/rank/like on screen.
- **SEO unchanged** (`docs/proofs/ui-1/SEO-PROOF.md`): the `page.tsx` diff is
  purely the drawer wrapper (import + two tags, zero content edits); the served
  HTML before/after shows every SEO string present with only data-driven
  additions and no removals; the panel ships open with the content inside it.
- **Battle `shown` fires once**: `ResultChallenge` is untouched, and the
  once-per-mount `shownRef` guard in `ClaimRun` is byte-identical (only the
  outer `className` changed for the flush shell).
- **No em dash**: `grep -c` over every changed file returns 0.
- **Typecheck**: `npx tsc --noEmit` is clean.

## Gates, and which I ran

- `check:docs-secrets`: PASSED (606 tracked docs, no credential-shaped value).
- `check:routes`: PASSED (364 page routes reachable).
- `check:metadata-dupes` (against the running dev server): reports 3 pre-existing
  collision groups (SEVENTEEN true/false, ateez lyrics part 4/5). These are
  quiz-title-template issues; UI-1 edits no title or description
  (`generateMetadata` is not in the diff), so it neither caused nor changed them.
- `check:indexability`, `check:orphans`: NOT run. See the deviation below.

## Deviations and flags (loud)

1. **No local production build, so two of the five gates did not run.** Two live
   servers are using this checkout's `.next` right now (`next start` on :3021 and
   `next dev` on :8081, both cwd this app). A `next build` rewrites `.next` under
   them and would risk breaking a concurrent session's server. I judged clobbering
   a shared build worse than skipping a gate that this change does not exercise:
   UI-1 adds no route, no sitemap entry, no `noindex`, and no metadata, so
   `check:indexability` and `check:orphans` test surfaces it does not touch. They
   run nightly in CI against a real build. If you want them locally, say so and I
   will build in an isolated worktree.

2. **Zone 3 keeps `ClaimRun` as a flush section rather than a one-line cell.**
   The prototype crams claim into the cell row; `ClaimRun`'s copy carries the A3
   honesty rules the owner protects. Where the prototype and the owner's
   "keep internals" rule conflict, the rule wins: I changed only the shell, never
   the copy. The ledger is still one card, each fact once.

3. **`QuizShareRow` (Reddit/Discord/X) and comments were kept, below the zones.**
   The prototype drops the standalone share row; I kept it rather than remove
   working per-network share the mission did not ask me to delete.

4. **Screenshots are the "sad" mascot / a failing score**, because the capture
   harness answers the first option each time. The celebrate variant renders on a
   pass (>=50%) through the same code path.

## Steps not done, and why

No push (owner-gated). No DDL, no writes. `docs/loop/QUEUED-PERF-1.md` remains on
the bus for next, per the mission's note.

---

STOP. Photocard result screen built across five zones, tokens only, components
reused, SEO byte-preserved. Nothing pushed. Report ready.
