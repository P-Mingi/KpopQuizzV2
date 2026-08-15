# REPORT - W2b C2: implemented, NOT verified. C3 not started.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.

Commit: `f228301`. Proofs: `docs/proofs/w2c-supply/`.

**Read the status line first: C2 is built and its data is proven, but I could not
observe it rendering, so I am not claiming it works. C3 was not started.**

---

## C2 - what shipped

- `openRunsForQuiz()` lives in the **same module** that owns the open-run definition.
  There is still exactly one definition; a second one is what caused the 455-run blind
  spot last run. It returns the open count plus a `username -> battleId` map.
- **One page-level call for the whole leaderboard**: 3 bounded reads (battles by quiz,
  their results, one profiles lookup), constant in the number of rows shown. No per-row
  query, no N+1.
- The action links to **that player's actual open run** (`/battle?b=<id>`), not a
  generic battle. Where no open run exists the row renders **no action**: no disabled
  tease, no substitute, no redirect.

## C2 - what IS proven (the data)

```
open quiz-linked runs                    : 459
  left by a SIGNED-IN player             :  28
  AND that player is in that quiz top-10 :   4   <- when the action can fire today
```

This is the honest shape of the feature: battle challengers and quiz top-scorers are
**near-disjoint populations**. An anonymous challenger has no username to match a
leaderboard row against, and 94% of battle results are anonymous. So even working
perfectly, this action is rare until more challengers carry names, which is exactly
what PART A started fixing this week.

## C2 - what is NOT proven, and why

The Hall of Fame block **does not appear in the DOM** on the quizzes I tested:

```
document.body.innerText.includes('Hall of Fame')  -> false
document.body.innerText.includes('Top scorers')   -> false
document.querySelectorAll('.beat-run').length     -> 0
```

`QuizHallOfFame` always renders its own header, even in the thin case
(`quiz-hall-of-fame.tsx:73`), so an absent header means **the component is not being
reached at all** on these pages. That is pre-existing and independent of this change,
and it deserves attention on its own: the per-quiz Hall of Fame appears to be invisible.

I ruled out the obvious causes:
- not the ISR cache: `.next` was nuked and the server restarted;
- not RLS: `getQuizHallOfFame`'s read works from the anon key when called directly
  (verified live, plays readable);
- not the data: `illit-guess-the-idol` has an open run by `@staygllit_nix`, who IS in
  that quiz's top 10, which is precisely the case the action targets.

I also wasted effort on a bad test earlier: I grepped the raw HTTP response for
`class="beat-run"`, but `/q/[slug]` returns an RSC flight payload where row content
sits in referenced chunks, so those greps were meaningless. The DOM checks above are
the real ones.

**Next diagnostic**: instrument the `/q/[slug]` render to log whether
`QuizHallOfFame` is reached and what `hallOfFame.length` is at render time.

## C3 - not started

The weekly challenge (targeting, signed-in delivery, rate limit, time-shift copy) was
not reached.

## The honest reach number you asked for

Whenever C3 does ship, this is its ceiling today:

- **167 accounts** exist in total.
- **94%** of battle results and **61%** of plays are anonymous.
- PART A only began stamping browsers this week: at audit time **5 plays stamped, 1
  claimed**.

So a weekly challenge is not a site-wide loop. It is a message to a few dozen people at
most, growing only as fast as the claim flow converts. Presenting it as anything larger
would be a lie.

## Covenant

Zero added lines matching fake / synthetic / dummy / mock / placeholder /
`Math.random`. The action renders only when the map holds a real battle id for that row.

## Deviations and flags (loud)

1. **C2 is unverified.** Committed anyway because it is additive, gated (renders only
   on a real match), and typechecks and builds. If you would rather it not sit in the
   tree unproven, say so and I will revert it.
2. **The Hall of Fame not rendering is a separate, pre-existing problem** that this
   mission surfaced by accident. It is worth its own look regardless of C2.
3. **C3 not started.**

## Next

Find out why the Hall of Fame does not render, which unblocks proving C2. Then C3.

---

STOP (checkpoint). **Nothing was pushed.** report pret.
