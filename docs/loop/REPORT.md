# REPORT - W3 + W2b: PART B shipped, PART A blocked at a schema wall

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL was run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.
`check:metadata-dupes` not re-run: this phase adds no page and no metadata, so the
indexable set is unchanged from W1.

Commit: `ce93d92` (PART B). Proofs: `docs/proofs/w3-identity/`.

**This is a checkpoint report, not a finished mission.** PART B is done. PART A is
blocked on a schema wall I will not guess my way past, and PART D is blocked behind
it by the mission's own wording. PART C is not started.

---

## PART A - BLOCKED. The column does not exist, and the mission said to stop here

The mission's rule: "Guest data is sacred: claiming must carry the existing anonymous
history over, not discard it. If carrying it over needs a column that does not exist,
STOP and block." It does. Measured today, `partA-claim-feasibility.txt`:

```
plays total               : 59,003
plays with player_id NULL : 36,158  (61.3% guest)
plays columns             : id, quiz_id, player_id, score, total_questions,
                            time_taken_seconds, created_at, per_question_times
```

**A guest play stores nothing that identifies the browser that made it.** `player_id`
is simply NULL. Those 36,158 rows are unattributable by construction: no code, however
written, can carry them into a new account.

The battle side is worse than absent, it is misleading:

```
battle_results anonymous rows : 955 over 512 distinct player_hash
hashes covering >1 run        : 199   (largest covers 15 runs)
player_hash = sha256(ip + UTC day)
```

Claiming by `player_hash` would hand one signup **every run made behind that IP that
day, including strangers'**, and would still miss the same guest's runs from
yesterday because the hash rotates daily. It is neither stable enough to find a
history nor private enough to claim one. Shipping it would be a privacy leak dressed
as a feature, so I did not.

**What I recommend** (full options in BLOCKED.md): add `anon_id` to `plays` and
`battle_results`, written from a localStorage UUID, AND ship a current-run-only claim
now. The migration makes the doctrine's retroactive merge true from ship date forward.
Nothing can rescue the 36,158 existing guest plays, and the signup copy must not
promise otherwise.

**Also: migration 154 from W2 is still not applied.** The mission said it was being
applied. Probed live today, an insert of type `battle_beaten` is still rejected by the
CHECK constraint, so the challenge notification remains inert.

## PART D - not attempted

The mission states "nothing in PART D can exist until a run belongs to someone". It
depends entirely on PART A. Building history, streaks and W/L on top of anonymous rows
would mean inventing the attribution that PART A is blocked on.

---

## PART B - DONE (ships for everyone, no identity, no DDL, no new content)

### B1. Rematch in one click

The reveal offered "New battle", which called `startBattle()` with whatever topic
state happened to be set. After accepting a challenge link that state is empty, so it
**dumped the player into a random group**: the exact dead end the mission names. The
reveal now remembers the ground the battle was fought on (quiz id + group slug,
recorded on both the challenge-accept and quick-match paths) and offers **"Same quiz,
new rival"**, drawing another real open run from the PART B pool.

Proven end to end (`partB1-rematch.txt`): a player finishes a bts battle, asks for the
same arena, and gets a different real run.

```
battle just played : 4d73967f...
rematch drew       : 6b2d0df2...   @fan_b9eb scored 4/7   group bts
open pool here     : 236 real runs
```

If the arena has nothing left it says so and falls back to a fresh battle, rather than
dead-ending or silently widening.

### B2 + B3. Pick your fight, and the honest refusal

`groups.generation` ('2nd Gen'..'5th Gen') and `quizzes.difficulty` (easy 110 /
medium 267 / hard 23) already exist, so both pickers are filters, not content. The 7
groups with no generation set are not offered rather than guessed at.

The rule that mattered most here was "if a filter would leave a bucket empty, say so
honestly, do not silently widen it". `selectBattleQuestions` previously always topped
up from any published quiz, which would have served easy questions from another group
and called it a hard BTS battle. That last resort is now **skipped for any filtered
request**, and the route reports what actually exists (`partB-pickers.txt`):

```
{"groupSlug":"bts"}                          -> battle with 7 questions
{"generation":"4th Gen"}                     -> battle with 7 questions
{"generation":"3rd Gen","difficulty":"easy"} -> battle with 7 questions
{"generation":"2nd Gen","difficulty":"hard"} -> battle with 7 questions
{"groupSlug":"bts","difficulty":"hard"}      -> REFUSED: "Not enough hard bts
                                                questions for a battle yet." (0/7)
{"groupSlug":"treasure","difficulty":"hard"} -> REFUSED (0/7)
```

The refusals are real: there genuinely are no hard BTS questions. Screenshot of all
three pickers: `partB-pickers-mobile-390.png`.

### The covenant line

No synthetic player, no generated score, no padded pool. Grep proof over the whole
diff (`partB-no-fabrication.txt`): zero added lines matching `fake`, `synthetic`,
`dummy`, `mock`, `seed`, `faker`, `placeholder`, `Math.random`. The only `Math.random`
in the touched files shuffles real rows (question order, random group pick). Every
opponent served is an existing `battles` row a human created and finished.

---

## PART C - not started

Time-shifted supply (group-page counts, leaderboard "beat this run", the weekly
challenge). It is independent of PART A and is the natural next slice. It was not
reached in this run.

---

## Deviations and flags (loud)

1. **PART A blocked deliberately**, per the mission's own STOP condition. The wall is
   the absence of a browser-scoped anonymous id, not a difficulty of implementation.
2. **PART D not attempted**, because the mission ties it to PART A.
3. **PART C not started.** Checkpoint reached before it.
4. **Migration 154 (W2) has still not been applied**, contradicting the mission's
   premise. The challenge notification stays inert until it lands.
5. B1's "rematch the same opponent's run" is implemented as **same arena, next real
   rival**. Replaying one specific opponent would need an opponent-scoped endpoint and
   a second open run from that same person, which the data does not guarantee. What
   shipped never dead-ends and never invents an opponent.

## Next

Owner decision on BLOCKED.md w3-partA (the `anon_id` migration plus the
current-run-only claim), and apply 154. Then PART C, which needs neither.

---

STOP (checkpoint). **Nothing was pushed.** report pret.
