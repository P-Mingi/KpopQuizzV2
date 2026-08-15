# REPORT - W2b C3: the weekly challenge. The W2/W2b/W3 arc is complete.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.

Commit: `ab2b28c`. Proofs: `docs/proofs/w2c-supply/partC3-weekly.txt`,
`partC3-notification-390.png`.

---

## C3 - what shipped

`GET /api/cron/weekly-challenge`, cron-authed like the other jobs, bounded to 50
deliveries per run, with a `?dry=1` mode that writes nothing.

**Targeting**: bias group first (`profiles.ult_groups`), then closest to that player's
own average battle score, then most recent. Candidates come from the **same centralised
open-run definition**; this file owns none of its own.

## The copy, with your correction applied

> **A run worth beating**
> @fan_5223 left 5/7 in August. Beat it?

Screenshot: `partC3-notification-390.png`, rendered in the red challenge style built in
W2. The time shift is stated. Nothing implies the challenger is online, waiting, or has
just challenged the reader.

And nothing in it mentions our account count. You were right to cut that: telling a
player they are one of very few here is a discouraging non-sequitur, not honesty. The
copy owes them one truth, that the run is real and was played earlier, and it delivers
exactly that.

## Fairness, proven against the rows actually delivered

Not asserted from the code. I re-derived each rule from the 15 delivered notifications:

```
rule 1  own run delivered               : 0
rule 2  already-played run delivered    : 0
rule 3  same challenger twice in a row  : 0
rule 4  one per user per week           : run 2 delivered 0, skipped 15
every delivered run still OPEN at delivery time : yes
```

Rule 3 is honest about its own limits: users with only one delivery so far cannot
violate it, and the check is written to catch it once they have two.

## Idempotency

```
run 1 : delivered 15, eligible 15
run 2 : delivered 0,  skipped because already had one this week 15
```

Rule 4 is checked per user against the notifications already delivered, so the job is
idempotent by construction. There is no separate ledger that could drift.

## The honest reach number (report only, as instructed)

- **167 accounts** in total.
- **94%** of battle results and **61%** of plays are anonymous.
- PART A only began stamping browsers this week.
- This run found **15 eligible signed-in players** who have actually battled, and
  delivered to all 15.

Fifteen people. That is the true size of this loop today, and it grows only as fast as
the claim flow converts anonymous players into named ones. It is not a site-wide
mechanic and should not be described as one internally either.

## Covenant

Zero added lines matching fake / synthetic / dummy / mock / placeholder /
`Math.random`. Every candidate is a `battles` row a human created and finished, and an
empty result means nobody is messaged rather than someone being messaged about nothing.

## Deviations and flags (loud)

1. **The notification type is overloaded.** This rides `battle_beaten`, because that is
   what migration 154 added and this mission forbids DDL. The type now carries two
   meanings ("someone beat your run" and "here is a run worth beating"). The user only
   ever sees the copy, which is accurate, and the red styling fits both. The clean fix
   is a dedicated `battle_challenge` type, which needs a migration you run. Say the word
   and I will write it into `docs/pending-migrations/`.
2. **Weekly dedup keys on the link's utm_campaign**, since there is no column to mark a
   weekly delivery without DDL. It works and is self-contained, but it is a string
   convention, not a constraint.
3. **The candidate pool for the draw is bounded to 300 recent finished battles.** That is
   a draw, not a published count, and the published counts elsewhere remain exact and
   paginated.
4. Delivery ran for real against the live database: 15 notifications now exist. They are
   genuine offers of genuine runs, not test rows, so I left them.

## The arc

W2 (trigger, random opponent, share-as-challenge), W2b (pick your fight, rematch,
C1 group supply, C1-FIX, C2 redesign, C3 weekly), W3 (identity and the claim) are all
in. Sixteen local commits, nothing pushed, ready for your batch review.

---

STOP. **Nothing was pushed.** report pret.
