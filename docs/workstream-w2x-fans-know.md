# W2.x - wire WHAT FANS KNOW (the moat block on idol pages)

## Claude Code Implementation Prompt

---

Small focused task: light up the gated WHAT-FANS-KNOW block on Verse idol pages with
REAL per-idol fan-behavior stats. This is the data no competitor can copy - treat
accuracy of sourcing as sacred. NO em dashes. Min-gates everywhere. Commit per step,
do NOT push. Migration (if needed) = owner stop-and-wait.

## VERIFY FIRST - what per-idol data actually EXISTS today

Audit before wiring; report findings before building:
1. BIAS COUNT: profiles.bias is free text ("Felix"). Count matches per idol
   (case-insensitive, trimmed) scoped to the idol's group ambiguity risk: two
   idols named the same across groups - decide matching (bias alone vs bias +
   user's ult containing the group). Report the collision reality in our data.
2. PERSONALITY MATCH: personality_results has (group_id, member_name) - "most
   gotten match" rank per member = real and cheap. Verify member_name aligns with
   idols.name for all 15 seeded groups.
3. NAME RECOGNITION: the prototype's "91% name him right" needs PER-MEMBER
   name-all outcomes. Verify: does the name-all game persist per-member
   found/missed anywhere, or is it client-only? Honest expectation: client-only.
   If so, DO NOT fake it from anything else:
   a. Hide that stat now (gate), and
   b. Add cheap additive logging so it accrues: a name_all_member_results table
      (game_id/group_id, member_name, found bool, created_at - NO user linkage
      needed, aggregate-only) written once per finished round from the existing
      finish path. Migration = owner-run. The stat unlocks itself at >= 30
      rounds per group ("tracked since" honesty if shown early).
4. QUIZ ACCURACY per idol: only if question->idol mapping exists (it does not,
   most likely) - if absent, SKIP entirely, note it, no proxy metrics.

## The block (idol page, already designed)

Cells, each individually min-gated (hide below gate, never zero-pad):
- "{N} fans bias him/her" - gate >= 3.
- "#{rank} most-gotten match" from personality_results - gate: group has >= 20
  total results.
- "{pct}% name him/her right" from the new logging - gate >= 30 rounds for the
  group; label "from {n} rounds" honestly while young.
Whole block hides when zero cells qualify (current behavior preserved).

## Steps
1. Audit report (the four verifications, real counts per launch group). STOP if
   the migration is needed -> owner runs it -> continue.
2. Wire bias + personality cells (real queries, cached at ISR with the page).
3. Name-recognition logging + cell (gated until volume).
4. Verify: spot-check every displayed number by hand-run query (3 idols across
   2 groups); gates exercised (an idol with no data = block hidden); no PII in
   any new row; tsc/build/check:routes green; zero em dashes.

/caveman report: audit findings first, then per-cell wiring with real numbers.
