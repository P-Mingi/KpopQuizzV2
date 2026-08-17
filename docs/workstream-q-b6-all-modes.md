# Q-B6 - open all 5 quiz modes to creators

## Claude Code Implementation Prompt

---

Follow-up to Workstream Q (read docs/workstream-q-report.md section on the 5 types +
the per-type polymorphism map, and docs/workstream-q-build.md). Q-B3's shared
QuestionListEditor already powers all 5 types in edit mode. Now creators get them at
CREATE time. NO AI. NO em dashes. Commit per step, do NOT push.

## The unlock

**Step 1 gains a type picker** (5 cards with mini-descriptions + an example line):
- Classic (multiple choice) - default, current behavior
- True / False
- Guess from Clues (3 clues per answer, the points-by-clues scoring)
- Image quiz (picture question -> 4 choices)
- Find the Intruder (which one does not belong)

**Step 2 renders the type's fields** via the SAME QuestionListEditor (it already does
this for edit mode - wire type through from step 1, verify each type's inline
validity badges make sense per the polymorphism map).

**Image + intruder types need per-question images at create time:** reuse the
EXISTING secure upload pipeline (client compression, magic-byte validation,
moderation queue) that the admin editor / cover upload uses. Do NOT weaken it. If the
admin image flow is admin-gated server-side, add a creator-scoped path with the same
validations + moderation queue (report exactly what differs).

## Guardrails

- Publish payload: quiz_type from the picker (kills the hardcoded multiple_choice);
  verify create_quiz_bypass accepts all 5 (audit said schema-ready + API-validated -
  confirm, and re-issue the RPC ONLY if actually needed; if needed that is a
  migration -> stop-and-wait for owner).
- validateQuestions (shared lib) must cover all 5 types' rules in ONE place - extend
  if any type's rules only live in the admin path today.
- Drafts: DraftQuestion shape gains type-specific fields; old drafts (all classic)
  convert untouched. OAuth round-trip re-verified for a non-classic draft.
- Type is locked after step 1 for v1 (switching types mid-draft = data loss trap;
  show "start a new quiz to change type" hint). Flag if trivially avoidable.
- Browse/cards: existing QuizTypeBadge already displays types - verify filters
  include the newly creatable types with real counts.
- Also fix the flagged one-liner orphan: quiz-card.tsx ?edit= link -> point it at
  the real edit route.

## Verify
- [ ] Create one quiz of EACH type end-to-end in-browser (anonymous -> draft ->
      publish path at least to the auth gate; use the dev harness for the
      authenticated publish if headless auth is blocked, say so)
- [ ] Per-type validity badges correct (e.g. intruder needs the odd-one-out marked,
      clues needs 3 clues)
- [ ] Image upload path: same security checks as cover (list them), moderation queue
      entries created
- [ ] Old classic drafts unaffected; non-classic draft survives reload
- [ ] check:routes, tsc, build green; zero em dashes; no new dependency

/caveman report per step. If the RPC needs re-issue, stop at that migration for owner.
