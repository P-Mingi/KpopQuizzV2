# VERSE WORKING SYSTEM V2 (proposal · 2026-08-04 · PENDING owner ratification)

Source: deep research on loop engineering / agentic coding (addyosmani,
ghuntley Ralph, Anthropic effective-harnesses + best-practices, IBM,
kilo, verdent, coderabbit, Cognition dont-build-multi-agents, MAST
arxiv 2503.13657) + Claude Code native features (subagents, hooks,
/goal, headless, worktrees, agent teams).

## 0. Honest verdict first (the critical read)

Loop engineering is real and useful, but NOT a revolution for this
project: we already run its core (plan -> execute -> verify -> proofs
at gates, state on disk, budgets via steps). What we lack: autonomy
inside a step, deterministic guardrails, proof files I can read, and
a copy-paste-free message bus. The literature's number one warning
(cognitive surrender: never surrender verification to the loop) is
exactly our owner-gate system. So: KEEP the gates, AUTOMATE the relay,
FORMALIZE the inner loop. Full autonomous Ralph-style overnight loops:
REJECTED for this repo (design locks + migrations + SEO laws are
human-judgment gates by design). Claude Code agent-teams (parallel
teammates): REJECTED for now (single-writer law, sequential steps,
token cost; revisit at Phase 3 if work truly parallelizes).

## 1. The three roles (unchanged, sharpened)

- OWNER (Mingi): gates only: design locks, migrations (runs all SQL),
  push, new deps, publish, screenshot eyeballs, final step approvals.
  Sits ABOVE the loop, never inside it.
- COWORK (planner/auditor): specs, prototype-first co-design (mockup ->
  critique -> lock -> build), critical audits with fresh-context
  subagent verification, ledger + memory + handoff upkeep.
- WORKER (Claude Code): executor with a SELF-CORRECTING INNER LOOP per
  step (section 3). Maker-checker split INSIDE the worker: before any
  report, it spawns a fresh-context reviewer subagent that audits the
  diff against the spec and includes findings in the report.

## 2. The file message bus (kills the copy-paste relay)

New folder docs/loop/:
- MISSION.md: Cowork writes the current worker mission here (via the
  desktop bridge). Owner tells the worker one line: "read
  docs/loop/MISSION.md and execute". No more long pastes.
- REPORT.md: worker writes its /caveman report here (and still prints
  it). Owner tells Cowork: "report ready" (or nothing; Cowork checks).
  Cowork reads the file directly. No more pasted reports.
- BLOCKED.md: if the worker hits ambiguity or a gate, it writes the
  blocker + options here and STOPS. Never guesses through a gate.
- docs/proofs/<step-id>/: worker saves ALL proof artifacts as FILES:
  command outputs (.txt), screenshots (.png), diffs. Cowork can then
  READ the actual proofs (today screenshots die in the terminal).
Owner stays the relay TRIGGER (both AIs act only when told), which
preserves every gate while removing 90% of the manual copying.

## 3. The worker inner loop (loop engineering, adopted)

Every step spec from Cowork now includes a LOOP CONTRACT:
- ACCEPTANCE: machine-checkable criteria (suites/gates/greps that must
  pass). The worker loops fix -> run -> fix until green BEFORE
  reporting. One report per step, not per attempt.
- BUDGET: max self-correction iterations (default 10). Budget spent
  without green = write BLOCKED.md, stop. Never thrash.
- RATCHET LAW (new standing rule): the worker NEVER edits, weakens, or
  deletes a test, gate script, or proof to go green. Gates only move
  forward. Violation = instant report rejection.
- PROOFS: exact artifact list to save under docs/proofs/<step-id>/.
- NO-PLACEHOLDER rule: no stub implementations to pass a gate.

## 4. Deterministic guardrails (hooks, one-time setup step)

Advisory rules (CLAUDE.md text) guard nothing when context rots.
Worker sets up, one commit, owner-gated:
- PreToolUse hook hard-blocking: git push, writes under
  supabase/migrations/, edits to gate scripts + test files.
- Stop hook: tsc + build must pass before a turn may end (worker
  cannot "finish" red).
- Migration SQL goes to docs/pending-migrations/ as files; owner runs
  by hand as always; Cowork reads every line first (unchanged).

## 5. Project management (extends the tracking system)

- docs/VERSE-LEDGER.md: append-only events (exists).
- docs/verse-project.md: living state (exists).
- Workstream docs: each step now carries the LOOP CONTRACT + a status
  line (todo / running / blocked / gate / approved) that the worker
  updates as it moves. The workstream file IS the task board.
- docs/loop/ bus + docs/proofs/: the work trace, 100% on disk.
- Notion stays lapsed (docs are truth). Optional later: a rendered
  dashboard artifact reading the ledger.

## 6. Skills to install (researched, ranked; owner picks)

Worker (Claude Code):
1. vercel-labs/agent-skills (27.6k stars): react-best-practices +
   web-design-guidelines (perf + a11y rule packs; perfect stack fit).
2. supabase/agent-skills (official): postgres/RLS/index best practices.
3. anthropics/claude-plugins-official: code-review plugin (fresh-eyes
   diff review for the maker-checker split).
4. anthropics/skills: webapp-testing (drives the proof screenshots).
5. trailofbits/skills (security audit pack): later, before public
   launch push; user-generated wiki content = real attack surface.
6. obra/superpowers (methodology pack): cherry-pick only; its
   plan-then-execute discipline we already run via specs.
SKIP: task-master (our ledger + workstreams already do this),
everything-claude-code (bloat), SEO packs (searchfit-seo covers it),
generic design packs (frontend-design + ui-ux-pro-max cover it).
HIGHEST VALUE, custom: build OUR OWN "verse-laws" skill (skill-creator)
encoding the standing laws so every fresh worker session auto-loads
them. Cowork drafts it, owner installs.

## 7. Supabase MCP finding (2026-08-04)

<!-- W5-DOCS-2 (2026-08-17): the two owner email addresses that named these orgs were
     replaced with <owner-dev-account> and <owner-prod-account>. Nothing was lost: they
     were Supabase ORG LABELS, never contact details, and the project refs below still
     identify each org unambiguously. Earlier revisions of this file are on the remote and
     still contain the literal values; that was left alone deliberately, because editing
     the working copy cannot remove them from history and would only look like a fix. -->

Connected token sees ONLY org "<owner-dev-account>'s Org" with
project Bloom (iiwovvyofjccmnercniq). Prod rdkgouofytwfdpbxbzio lives
under the <owner-prod-account> org: NOT reachable from this token.
Fix = owner action in Claude settings -> connectors -> Supabase:
re-authenticate with the prod org account (or a PAT scoped to it).
RECOMMENDATION even after rebind: read-only use (list_tables,
get_advisors, get_logs) for Cowork audits; execute_sql/apply_migration
stay owner-run. The owner-runs-SQL law does not change.

## 8. Adoption checklist (owner ratifies, then live)

- [ ] Ratify sections 1-5 (or amend)
- [ ] Worker one-time step: create docs/loop/, hooks, ratchet law in
      CLAUDE.md (one commit)
- [ ] Pick skills from section 6 to install
- [ ] Rebind Supabase connector (section 7) if wanted
- [ ] Cowork updates memory + handoff + ledger, system goes live
