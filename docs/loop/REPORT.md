# REPORT - C2-REDESIGN done and proven. C3 not started.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.

Commit: `84c44c6`. Proofs: `docs/proofs/w2c-supply/`.

---

## Fact check: you were right on both counts

**The Hall of Fame is not invisible.** Prod renders it with rows. My last report
generalised a local-environment symptom into a product claim, which was wrong, and I
have not spent this run chasing it. For the record, one observation while proving the
new block: on the same local page the block renders in the DOM while the Hall of Fame
does not, so whatever the local difference is, it is scoped to that component and it
does not block anything.

**And the premise was the real blocker.** On the biggest quiz on the site the top 10 by
score contains zero named players. Matching a leaderboard row to a challenger by
username cannot work while the board is anonymous, which is exactly why my own count
found 4 firing cases site-wide. I did not try to fix the matcher.

## C2-REDESIGN - what shipped

- **The per-row matcher is deleted**, along with the `username -> battleId` map that
  existed only to feed it. Four cases site-wide did not justify carrying it.
- **One identity-free block** renders under the Hall of Fame. It **reuses** the group
  page's `OpenRunsBlock`, generalised with a `subject` and an `href` rather than forked
  into a second UI:

> **10 fans** left unbeaten runs on this quiz.
> Real runs people already played. Beat one whenever you like, they do not have to be online.
> [ Take one ]

- The count uses the **same centralised definition**, paginated and exact. No rounding,
  no floor, no minimum.
- Zero open runs renders **nothing at all**.

### Proven by DOM and screenshot, not by grepping the flight payload

```
rendered on /q/ultimate-bts-era-quiz-only-real-armys-survive : "10 fans left unbeaten runs on this quiz"
independent recount for that quiz                            : 10 open (14 finished battles)

/q/ateez-title-tracks-and-members-quiz (0 open runs)         : .open-runs elements in DOM = 0
```

Screenshot: `partC2redesign-block-390.png`.

## A bug this surfaced, and fixed

"Take one" first landed on a run from a **different quiz**. `/api/battle/random`
appended the global pool, and with no group filter the sort could pick anything. The
block promises "on this quiz", so that was the same silent-widening failure the
filtered battle start already refuses.

A requested scope is now a **promise**, not a preference (`strict=1`): a block saying
"on this quiz" can only ever return a run on that quiz, or report the scope empty. The
non-strict path stays for "Random opponent", which promises only an opponent.

```
4 strict draws on quiz 4ba8f255:
  99ba6b48 | Ultimate BTS era quiz - only real ARMYs survive | pool 10
  e47982d2 | Ultimate BTS era quiz - only real ARMYs survive | pool 10
  771d73ec | Ultimate BTS era quiz - only real ARMYs survive | pool 10
  ded603c9 | Ultimate BTS era quiz - only real ARMYs survive | pool 10
```

Pool 10 matches the published count, and the draw spreads across four different
battles rather than serving one run to everyone.

## Fairness (unchanged, inherited)

The draw already refuses the caller's own run, refuses one they have already played,
and samples uniformly from the top band. Nothing extra was needed to stay honest.

## C3 - not started

The weekly challenge was not reached this run.

## The honest reach number, restated

Whenever C3 ships, this is its ceiling:

- **167 accounts** in total.
- **94%** of battle results and **61%** of plays are anonymous.
- PART A only began stamping browsers this week.

It is a message to a few dozen people, not a site-wide loop, and it should not be
described as one.

## Covenant

Zero added lines matching fake / synthetic / dummy / mock / placeholder /
`Math.random`. Every number shown is a count of real rows.

## Deviations and flags (loud)

1. **C3 not started.**
2. The per-row action from last run is **deleted, not disabled**. If you wanted it kept
   for the 4 cases, it is one revert away.
3. `strict=1` changes `/api/battle/random` behaviour only for callers that pass it. The
   result-screen "Random opponent" is untouched.

## Next

C3, with the reach caveat stated in the product copy as well as the report.

---

STOP (checkpoint). **Nothing was pushed.** report pret.
