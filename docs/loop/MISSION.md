# WORKER MISSION (written by Cowork · 2026-08-04)

Read fully, execute top to bottom, /caveman report at the end.

## Gate verdict

Step 5 gate: APPROVED. Receipts 1-5 accepted. Accent ruling: keep the
validator as built (contrast-clamped hex); the Phase 2 style panel UI
will be swatch-only, no free hex field. No code change.
Phase 2 spec note, no action now: the builder UI must never offer
delete on seoCritical blocks (auto-injection stays as server backstop).

## Part 1 - STEP 6, closing sweep per spec (workstream-vbuilder-1.md)

Full gate suites (vpages, templates, fold, play-probe, token-gate),
SEO parity re-proof, a11y pass on the toolbar additions, full build,
em-dash grep, check:routes. Commit.

## Part 2 - WORKING SYSTEM V2 one-time setup (separate commit)

Owner ratified. Read docs/VERSE-WORKING-SYSTEM-V2.md first.

1. Create docs/loop/ (this MISSION.md lives there already if the owner
   moved it; otherwise create the folder) with REPORT.md and
   BLOCKED.md templates, plus docs/proofs/. From now on: missions
   arrive in docs/loop/MISSION.md; you write reports to
   docs/loop/REPORT.md (and still print them in the terminal);
   blockers go to BLOCKED.md, then STOP; every proof artifact is
   saved as files under docs/proofs/<step-id>/ (command outputs as
   .txt, screenshots as .png).
2. Hooks in .claude/settings.json: PreToolUse hard-block on git push,
   on any write under supabase/migrations/, and on any edit to the
   gate/proof scripts (the scripts/_*.mts suites). Stop hook: tsc +
   build must be green before a turn may end. Any future migration
   SQL goes to docs/pending-migrations/ as files for the owner to run.
3. CLAUDE.md additions: RATCHET LAW (never edit, weaken or delete a
   test, gate script or proof to go green; gates only move forward) +
   NO-PLACEHOLDER rule + the loop contract (self-correct until the
   step's acceptance criteria are green, max 10 iterations, else
   write BLOCKED.md and stop).
4. Create .claude/skills/verse-laws/SKILL.md: an auto-loadable skill
   listing ALL standing laws (SEO invariant + parity proof,
   reading-order, one-H1, token gate + ink floor, min-gate, ISR-throw,
   fail-closed privacy, 1000-row cap, middleware allowlist, XSS at
   sinks, em-dash ban, commit-not-push, no new deps, Play triple-proof
   definition, ratchet law, real-data, crawlable collapse, measure
   66ch). Source from CLAUDE.md + VERSE-BUILDER-BLUEPRINT.md; keep it
   under 200 lines.
5. Fold the untracked docs into this commit: docs/verse-project.md,
   docs/VERSE-LEDGER.md, docs/COWORK-HANDOFF.md,
   docs/VERSE-WORKING-SYSTEM-V2.md, docs/loop/, docs/proofs/.

## Report

Write the /caveman report to docs/loop/REPORT.md (first use of the
bus) and print it. Phase 1 closes on Cowork's read of that report.
Do not push. Do not start Phase 2.
