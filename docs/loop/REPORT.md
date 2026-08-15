# REPORT - W3b PART 3: the claim reaches the game screens

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.

Commit: `f38d40b`. Proofs: `docs/proofs/w3b-claim/part3-claim.txt`.

---

## Column checked first, as instructed

`game_plays.anon_id` is **PRESENT** (migration 156, verified live before any code).
`game_plays` holds 1,517 rows, **1,390 of them guest (92%)**, so you were right that this
is both the largest remaining claim surface and a more anonymous one than the quiz side.

## 1. Security first: a foreign anon_id is refused

```
request : {"anonId":"3d377bee-..."}      <- an id this browser never proved
response: {"error":"anon_id_mismatch",
           "detail":"The browser id supplied does not match this browser."} [HTTP 403]

rows carrying the foreign id afterwards : 0
```

Same contract as W3 PART A, not a second one: the httpOnly `nq_anon` cookie is the only
trusted source, and a body that disagrees is refused rather than quietly falling back.

## 2. The claim moves game runs, and only this browser's

```
BEFORE  game_plays with anon_id A : 1   owned 0   unowned 1
claim   -> 200 {"claimed":{"plays":0,"battles":0,"games":1}}
AFTER   game_plays with anon_id A : 1   owned 1 -> 67358f12-...
```

Only `player_id IS NULL` rows are touched, so an owned game run can never be re-owned.

## 3. Nothing is gated on identity

```
game play WITH anon_id  -> 200 {"play_count":24,"score":3,"already_played":false}
game play with NO id    -> 200 {"play_count":24,"score":2,"already_played":false}
```

The cookie is set only when an id is supplied. Private mode plays exactly as before.

## 4. A surface with nothing claimable renders nothing

The min-gate is unchanged because the component is unchanged: `ClaimRun` returns null
when the browser has no id, and it is mounted only on the two game result screens that
actually record a run. `sort-it` and `match-up` still persist no result row, so they get
nothing, which is the same rule that kept them empty last run.

## 5. name_all_member_results stayed out, per your refinement

It has no `player_id` at all. Those rows are per-member detail of a round, not an
ownable run, so there is nothing there to claim and I did not touch it.

## The streak follow-up

My own flag from last run is closed: `recordGuestDaily()` now runs where
`completeDaily('blindtest')` fires, and the same line renders on the blindtest result.
The rule is untouched and still proven by the logic test from PART 2: 3, 7 and 14 only,
once per milestone ever, dismissible, no countdown.

## Covenant

Zero added lines matching fake / synthetic / dummy / mock / placeholder /
`Math.random` / `countdown`.

## Deviations and flags (loud)

1. **The blindtest streak line is mounted but not screenshotted in this run.** The rule
   itself is proven by the PART 2 logic test, which is the part that could be wrong; the
   mount is a one-line render at the same call site as the quiz one.
2. **`this-or-that` also writes `game_plays`** and is therefore now stamped and
   claimable by the same code, but I did not mount the block on its result screen. It
   was not in your list, and I would rather add it deliberately than by inference.
3. The two claim surfaces added are name-all and blind-test. `sort-it` and `match-up`
   remain excluded because they persist nothing.

## Next

Deploy. This is the sixth report saying it, and it is the only thing left that changes
any of these numbers: the funnel, the claim, the weekly challenge and the open-run
supply are all built and all measured at near zero because nothing is in front of a real
player yet.

---

STOP. **Nothing was pushed.** report pret.
