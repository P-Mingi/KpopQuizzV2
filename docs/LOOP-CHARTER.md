# LOOP CHARTER - autonomous iteration rules (Cowork <-> Claude Code)

Owner-approved 2026-07-28. Scope: INTERNAL tooling only. No user-facing AI
exists on the platform (owner decision, standing).

## The loop we already run (formalized)

Cowork (planner/auditor) writes a spec with acceptance criteria -> Claude Code
(executor) plans, builds, runs verification, reports -> Cowork audits -> adjust.
This charter defines when Claude Code may ITERATE AUTONOMOUSLY inside a task
instead of stopping to report each cycle.

## Task classes that MAY loop autonomously

A task may iterate plan->act->verify->adjust without human contact ONLY if ALL:
1. Acceptance criteria are MACHINE-CHECKABLE (a script/query/test decides pass).
2. The loop touches NO owner-gated surface (see gates below).
3. Stop conditions are declared in the task spec.

Qualifying classes:
- BUILD-VERIFY-FIX within a step: code until tsc + build + check:routes +
  declared tests pass (standard practice, now named).
- COVERAGE GRIND: raise computed entity coverage (fields filled, pages linked,
  aliases wired) across N groups until target % or source exhaustion.
- QA SWEEPS: run scripted checks (em-dash grep, gate exercises, link-resolution,
  contrast checks) across surfaces; fix mechanical failures; report the rest.
- CONTENT-INTEGRITY AUDITS: cross-check displayed numbers vs hand-run queries;
  fix wiring bugs found; never alter data to match display.

## HARD GATES - never autonomous, always stop-and-ask

- Migrations / any schema change (owner runs on prod, always).
- Policy surfaces: living-persons, real-data rules, honesty gates, licensing.
- Design changes to approved surfaces (prototype-first with owner).
- Publishing/announcing anything (Discord posts, Reddit, launches).
- New dependencies, new external hosts fetched, new env vars.
- Anything where the verify step itself is ambiguous. Ambiguity = stop.

## Mandatory loop spec format (in every prompt that permits looping)

LOOP: [class] · GOAL: [machine-checkable criteria] · MAX: [N iterations] ·
STOP IF: [conditions: migration needed / criteria unreachable / policy touch /
budget] · REPORT: [what the final report must show, incl. iterations used].

## Why the gates are the point

This project's quality record comes from verify-first + human gates: the loop
that would have "efficiently" shipped Google Trends rot, simulated votes, or a
vandalized "Tacos de asada" label is not a loop we run. Autonomy applies to
convergence on checkable truth, never to judgment.
