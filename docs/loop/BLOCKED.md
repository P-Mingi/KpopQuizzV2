# BLOCKED (message bus)

The worker writes here ONLY when it hits a real blocker (ambiguity it cannot
resolve from the spec/code, a gate it cannot pass honestly, or a decision that
belongs to the owner) and then STOPS. It never guesses through a gate.

Format for an entry:

```
## <step-id> - <one-line blocker>
- What is blocked: ...
- Why (the specific gate / ambiguity / owner decision): ...
- Options (each with its trade-off): 1) ...  2) ...  3) ...
- Recommendation: ...
- Proof / context: docs/proofs/<step-id>/ (if any)
```

When resolved, the worker clears the entry and continues.

---

## w3-partA - "claim this run" cannot carry anonymous history: the column does not exist

- What is blocked: PART A's non-negotiable rule, "claiming must carry the existing
  anonymous history over, not discard it". PART D is blocked behind it by the
  mission's own wording ("nothing in PART D can exist until a run belongs to
  someone"). PARTS B and C are NOT blocked and are being built.
- Why (the mission's own STOP condition: a column that does not exist):
  - `plays` is `id, quiz_id, player_id, score, total_questions, time_taken_seconds,
    created_at, per_question_times`. For a guest, `player_id` is NULL and there is
    NOTHING else. 36,158 of 59,003 plays (61.3%) are guest rows that carry no trace
    of which browser made them. They are unattributable by construction, so no code
    can carry them over.
  - `battle_results.player_hash` exists but is `sha256(ip + UTC day)`. Measured:
    955 anonymous rows over 512 distinct hashes, 199 hashes cover more than one run,
    the largest covers 15. Claiming by it would hand one signup EVERY run made
    behind that IP that day, including strangers'. It also rotates daily, so it
    cannot find the same guest's runs from yesterday. It is neither stable enough to
    find a history nor private enough to claim one. Using it would be a privacy leak
    dressed as a feature.
- Options (each with its trade-off):
  1) Add a stable browser-scoped anonymous id and start writing it now: a
     `anon_id uuid` (or text) column on `plays` and on `battle_results`, filled from
     a localStorage UUID the client sends. Claim then means "attach every row with
     MY anon_id". Trade-off: needs a migration (owner-run), and it only carries
     history from the day it ships forward. It cannot rescue the 36,158 existing
     guest plays, and no design can.
  2) Ship the claim scoped to THE CURRENT RUN only, with no migration: the client
     already holds the row it just created, so signing in can stamp `user_id` on
     that one row. Honest, useful, and it is literally what "CLAIM THIS RUN" says,
     but it is not the retroactive merge the doctrine promises, and the signup copy
     must NOT claim "your 12 games are now yours".
  3) Do nothing until W3 proper. Trade-off: PART D stays impossible.
- Recommendation: 1 AND 2 together. 2 ships now and is the moment that converts;
  1 is the migration that makes the doctrine's retroactive merge true from ship date
  onward. Both need you: 1 is DDL, and 2 needs your ruling that a current-run-only
  claim is acceptable given the doctrine's wording.
- Also worth knowing: migration 154 (W2) is NOT applied yet. Probed live today: an
  insert of type `battle_beaten` is still rejected by the CHECK constraint. The
  mission said it was being applied; it has not landed.
- Proof / context: docs/proofs/w3-identity/partA-claim-feasibility.txt

## w2-notify - the challenge notification needs a migration the worker cannot run

- What is blocked: the "someone beat your run" notification cannot be delivered.
  The code path is built, typechecked and wired, but `creator_notifications.type`
  has a CHECK constraint that does not include `battle_beaten`, so every insert is
  rejected until the constraint is swapped.
- Why (owner decision + law): this mission says NO DDL, block instead, and DDL is
  owner-run in this repo. The SQL is written and ready:
  `docs/pending-migrations/154_battle_challenge_notification.sql`. It does two
  things: adds `battle_beaten` to the type CHECK, and adds it (plus the already
  live `verse_watch`, which drifted) to the `gate_notification_prefs()` CASE so the
  type respects the user's mute settings instead of bypassing them.
- Options (each with its trade-off):
  1) Apply 154 as written. The notification starts working for signed-in
     challengers immediately. Nothing else changes.
  2) Do not apply it. Everything else in W2 works; the battle loop simply has no
     return hook, and the insert keeps failing soft (logged, swallowed, never
     blocking a battle result).
  3) Reuse an existing type such as `cheer` to avoid the migration. Rejected: it
     would mislabel the data and break the red styling, which keys on the type.
- Recommendation: 1.
- Second, separate limitation the owner should know: a notification can ONLY reach
  a challenger who was SIGNED IN when they created the run.
  `creator_notifications.user_id` is NOT NULL against `auth.users`, and 94% of
  battle results are anonymous. So this return hook covers a small slice today and
  gets materially better with W3 (identity), which is why the audit pairs them.
- Proof / context: docs/proofs/w2-battle/ · the CHECK lives in
  supabase/migrations/133_verse_discussions_watchlists.sql:45-51 · the prefs CASE
  in 122_notification_foundation.sql:83-95.

## w1-ctr - the new duplicate-metadata gate is RED on a duplicate quiz the code cannot honestly split

- What is blocked: `check:metadata-dupes` cannot go green on the quiz side. One collision is left
  after every template fix: `/q/seventeen-true-or-false` and `/q/seventeen-true-or-false-65` render
  the identical title `SEVENTEEN true or false · 7 questions | KpopQuiz`.
- Why (owner decision): both rows are `status = published`, both are literally titled "SEVENTEEN
  true or false", both have 7 questions. They differ only in difficulty (medium vs easy), plays
  (257 vs 351) and creation date (2026-03-23 vs 2026-04-01). No metadata template can invent a
  difference that is not in the data, and inventing one would break the honesty gate. This is a
  CATALOGUE decision, not a code one.
- Options (each with its trade-off):
  1) Retitle one quiz in the admin (e.g. "SEVENTEEN true or false: hard mode"). Cheapest, keeps both
     quizzes and both URLs, fixes the collision at the source. Loses nothing.
  2) Unpublish the weaker one (the older medium, 257 plays) and 301 it to the survivor. Best for
     crawl budget, but deletes a page that has real plays.
  3) Add difficulty to the `/q` title template for every quiz. Fixes this pair mechanically but
     lengthens all 400 titles for one collision, and two quizzes could still share a difficulty.
- Recommendation: 1. It is a 30-second admin edit and it fixes the actual problem (two pages telling
  Google the same thing) instead of papering over it.
- Also awaiting the owner, NOT blocking this sprint: 7 collision groups in `/verse/*`, including 228
  URLs that all render the space-level description "The ARMY home on KpopVerse: ...". Verse is
  paused and out of this mission's scope, so it was left untouched. It needs its own pass when Verse
  resumes.
- Proof / context: docs/proofs/w1-ctr/partD-dupes.txt · docs/proofs/w1-ctr/partD-q-collisions.txt

push-gate-1b blocker CLEARED: owner ruled the four conflict groups (L-084); the merge was
re-run and the rulings applied EXACTLY (merge commit ae93720), the gate re-proven at the merged
tip, main left strictly ahead of origin/main. See docs/proofs/push-gate-1/ + the step entry in
docs/loop/REPORT.md. One flagged fallback: the Pinterest manifest/csv regeneration timed out, so
remote's committed artifacts shipped as-is (refresh with scripts/generate-question-pins.mts).
