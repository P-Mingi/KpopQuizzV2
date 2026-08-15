# REPORT - W2b PART C: C1 shipped, and the 154 receipt you asked for

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.
`check:metadata-dupes` not re-run: no page and no metadata changed.

Commit: `e3a535e` (C1). Proofs: `docs/proofs/w2c-supply/`.

**Checkpoint report.** C1 is done and proven. C2, C3 and PART A are not built.

---

## FACT CHECK: you were right, I was wrong

Migration 154 is applied. Re-probed with controls (`partC-mig154-reprobe.txt`), using a
user_id that is FK-verified via `battle_results.user_id`:

```
control  type=cheer                 -> OK
probe    type=battle_beaten         -> OK          <- the receipt you asked for
negative type=definitely_not_a_type -> ERROR (check constraint)
```

The negative control matters: it proves the CHECK is genuinely enforcing, so
`battle_beaten` passing is not a constraint that stopped working.

**One correction to your diagnosis, for the record.** The FK theory does not hold: the
exact user_id my first probe used (`d54e4b47`, @mingii) now inserts BOTH `cheer` and
`battle_beaten` without error, so the original failure was not an auth.users FK error
misattributed to the CHECK. The only explanation consistent with both observations is
timing. The first probe ran at `11:58:30Z` and returned a check-constraint violation;
this one ran at `12:17:29Z` and passes. Either way the practical answer is the same and
it is yours: **the notification path is live from here.**

---

## PART C1 - DONE. The supply is now visible

The measurement that drove it: 869 open challenges, 541 distinct real challengers. The
opponents already existed. Nobody could see them.

The group page now renders the real number and one tap to take one:

> **75 fans** left unbeaten runs on BLACKPINK.
> Real runs people already played. Beat one whenever you like, they do not have to be online.
> [ Take one on ]

Screenshot: `partC1-group-block-390.png`.

### The count is exact, and proven against an independent query

`countOpenRunsForGroup()` paginates BOTH reads through `fetchAllRows`. A JS-side
aggregate that stops at PostgREST's 1000-row cap would silently UNDER-count, and this
number is shown to users: bounded reads are fine for a draw, a published count has to
be exact. Proof (`partC1-open-runs.txt`) compares the number rendered in the HTML with
a recount written separately from the app code:

```
                rendered      independent recount
bts                49                49
blackpink          75                75
stray-kids         77                77
treasure     (no block)                0
```

`treasure` is the min-gate case: at zero the component returns null, so the page shows
no block rather than an empty state advertising a door that leads nowhere.

### The honesty rules, kept

- The copy states the time shift: "Real runs people already played. Beat one whenever
  you like, they do not have to be online." Nothing implies anyone is online, waiting,
  or has just challenged the reader.
- No floor, no rounding, no minimum. Grep proof in `partC-no-fabrication.txt`: zero
  added lines matching fake / synthetic / dummy / mock / placeholder / `Math.random` /
  `Math.max(` / `|| 1`. The single `rounded` hit is a comment asserting the opposite.

### C4 fairness (already enforced, carried from PART B)

`/api/battle/random` never returns the caller's own run (excluded by `challenger_hash`),
never returns one they already played (excluded by their own result row), and only
returns runs nobody but the challenger has attempted, which is what "already beaten"
means here. Proven live in the previous run
(`docs/proofs/w3-identity/partB1-rematch.txt`).

---

## Not built in this run

- **C2 leaderboard "beat this run".** Needs a per-row lookup of whether a real open run
  exists for that player or quiz, and the row must render no action when none does.
- **C3 weekly challenge.** Needs the targeting (bias group, then closest score, then
  recent), signed-in-only delivery, rate limiting, and the honest time-shift copy. Now
  genuinely unblocked, since 154 is confirmed live.
- **PART A.** Migration 155 IS applied: `plays.anon_id` and `battle_results.anon_id`
  both exist, verified live. So PART A is unblocked and is the next real slice: client
  UUID in localStorage, sent with every play and result, and a claim that verifies the
  caller actually supplied the anon_id it is claiming.

## Deviations and flags (loud)

1. I reported 154 as unapplied last run. It is applied. The receipt is above, and my
   attribution of the original failure differs from yours (timing, not the FK).
2. C1 ships a count that requires two paginated reads per group page render. It is
   inside the ISR path so it is cached, not per-request, but it is the most expensive
   thing on that page. If group pages grow hot, denormalise it.
3. C2, C3 and PART A were not reached. Checkpoint, not a finish.

## Next

PART A, then C3. Both are unblocked now.

---

STOP (checkpoint). **Nothing was pushed.** report pret.
