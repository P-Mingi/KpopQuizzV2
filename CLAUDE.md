# KpopQuiz — project rules for Claude

## Writing & copy rules (STRICT)

**NEVER use an em dash (—, U+2014). Ever.** This applies everywhere: UI copy,
page `<title>`s, meta descriptions, `alt`/`aria-label` text, generated quiz
intros, code comments, commit messages, and PR descriptions.

Use plain punctuation instead:

| Em dash was used for… | Use instead |
|---|---|
| A sentence break / aside ("X — Y") | A period (`X. Y`), comma (`X, Y`), or colon (`X: Y`) |
| A label separator ("Title — 8 questions") | A middot (`Title · 8 questions`) or a regular hyphen (`Title - 8 questions`) |
| A range ("0:30 — 5:00") | A regular hyphen (`0:30-5:00`) |

Also avoid the **en dash** (–, U+2013) for the same reason — use a regular
hyphen `-`. (Regular hyphen-minus `-` and the middot `·` are both fine and are
already the site's separator style, e.g. "12 quizzes · 4.2k plays".)

**Why:** em dashes read as "AI-written" and clash with the site's plain,
fan-made voice. Existing copy never uses them.

**Before finishing any task,** grep the diff for `—` and `–` and remove them:

```bash
grep -rn $'—\|–' apps/quiz/src   # must return nothing
```

## Working System V2 (ratified 2026-08-04)

Full standing laws live in the auto-loadable skill `.claude/skills/verse-laws/`.
The load-bearing process rules, restated here so they never rot:

**RATCHET LAW.** Never edit, weaken, or delete a test, gate script, or proof to
make a gate go green. Gates only ever move forward. If a gate is wrong, raise it
with the owner; do not neuter it. (The PreToolUse hook hard-blocks edits to
`apps/quiz/scripts/_*.mts`, `check-*.mts`, and `test-*.mts`.) A violation is an
instant report rejection.

**NO PLACEHOLDER.** No stub or fake implementation to pass a gate. If the real
work cannot be done, write `docs/loop/BLOCKED.md` and stop. Never simulate a
result (no fake data, no hardcoded "passing" output).

**LOOP CONTRACT (per step).** Each step has ACCEPTANCE criteria (the gates/greps
that must pass). Loop fix -> run -> fix until they are green BEFORE reporting: one
report per step, not per attempt. BUDGET is 10 self-correction iterations; spent
without green, write `docs/loop/BLOCKED.md` with the blocker + options and STOP.
Never thrash and never guess through a gate.

**The bus + guardrails.** Missions arrive in `docs/loop/MISSION.md`; reports go to
`docs/loop/REPORT.md` (and are printed); blockers to `docs/loop/BLOCKED.md`; every
proof artifact is saved as a file under `docs/proofs/<step-id>/`. `git push` is
owner-gated (hook-blocked). Migrations are owner-run: write the SQL to
`docs/pending-migrations/` as a file, never to `supabase/migrations/`. A Stop hook
keeps `tsc` green before any turn ends.
