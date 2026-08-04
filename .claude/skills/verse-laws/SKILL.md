---
name: verse-laws
description: The standing engineering laws for ALL KpopQuiz (Play) and KpopVerse work in KpopQuizzV2. Load this at the start of any session on this repo and BEFORE writing, reviewing, or committing any Verse or Play code. Covers the SEO invariant + parity proof, reading-order, one-H1, token gate + ink floor, min-gate, ISR fail-closed, privacy fail-closed, the 1000-row cap, the middleware allowlist, XSS-at-sinks, the em-dash ban, commit-not-push, no-new-deps, the Play triple-proof definition, the ratchet law, real-data, crawlable collapse, and the loop contract.
---

# Verse + Play standing laws

These are non-negotiable. They override convenience. When a task conflicts with a
law, follow the law and say so. Source: CLAUDE.md + docs/VERSE-BUILDER-BLUEPRINT.md
(section 9) + the recorded workstream rulings.

## SEO + rendering laws

1. **SEO invariant + parity proof.** Any config-vs-default (or skinned-vs-plain)
   surface must emit the SAME indexable set: same text, same real `<a href>`s,
   same headings. Prove it per phase with a parity harness, never by assertion.
2. **Reading-order law.** DOM order = reading order = SEO order, always. Layout
   changes VISUAL placement via CSS only (the grid). Free x/y placement does not
   exist in this system.
3. **One H1.** Exactly one `<h1>` per page (the page title / space name). Prose
   headings are h2/h3 only. Heading hierarchy comes from block structure.
4. **Token gate + ink floor.** No raw hex in a Verse surface (`src/app/verse`,
   `src/components/verse`) - every colour routes through a `--verse-*` token.
   Accent is a hex CLAMPED to WCAG AA on BOTH light and dark grounds after
   shading (the ink floor); a per-block background is a token, never raw hex.
   `npm run check:verse-tokens` enforces it. globals.css + lib are the token
   definition layer (not scanned).
5. **Min-gate.** Every module/section self-hides below its content floor. No dead
   doors, no empty states advertised, no fabricated filler.
6. **ISR fail-closed reads.** Reader pages are ISR/static server components. A
   data read that throws must be caught (safeFetch) so a DB blip never 500s the
   page. A build-time client construction that throws SYNCHRONOUSLY (no Supabase
   env in preview/CI) must be guarded (skip prerender / return [] when the env
   is absent) - safeFetch cannot catch a synchronous constructor throw.
7. **Crawlable collapse.** A collapse/fold keeps its content in the served HTML
   (native `<details>`), never fetch-on-expand, never `display:none` on content.
   seoCritical blocks: restyle and reorder freely, never remove or hide (the
   server auto-injects a missing seoCritical block as a backstop).
8. **XSS at sinks.** Escape all user/config content at the render SINK
   (jsonLdScript, any HTML-string builder). Stored config is never trusted.
9. **Measure 66ch.** Running prose stays near 66 characters wide for readability.

## Data + privacy laws

10. **Real data only.** Every widget, badge, fact, and number maps to genuinely
    tracked activity. No fabricated content, no simulated/fake progress.
11. **Privacy fail-closed.** Redact private data from PROPS, not CSS. Default to
    hiding. Never leak private identity or private fields to the client.
12. **1000-row cap.** PostgREST `.select()` caps at 1000 rows; counting
    client-side undercounts. Use a head `count` or the fetchAllRows paginator for
    any aggregate-in-JS read.
13. **Middleware allowlist.** Every page route must be reachable via
    `isKnownRoute` (route-allowlist.ts) or the middleware 301s it to `/`.
    `npm run check:routes` enforces it.

## Process laws

14. **Em-dash ban.** Never use an em dash (`—`, U+2014) or en dash (`–`, U+2013)
    anywhere: UI copy, titles, meta, alt/aria, comments, commit messages. Use
    `.` `,` `:` `·` or a plain `-`. Grep the diff before finishing.
15. **Commit-not-push.** Commit per step. NEVER `git push` (owner-gated; the hook
    hard-blocks it). Preview-branch pushes happen only at a workstream close and
    only when the owner triggers them. Production is owner-only.
16. **No new deps.** Hand-roll first. Any dependency needs a loud written
    justification and the owner's gate.
17. **Migrations owner-run.** Never write `supabase/migrations/` (the hook blocks
    it) and never run SQL. Write migration SQL to `docs/pending-migrations/` as a
    file and STOP for the owner to run.
18. **Play triple-proof.** Any change touching shared or Play chrome must PROVE
    Play is unchanged with all three: (a) `<head>` byte-diff vs the pre-phase
    baseline, (b) a 720px layout probe (no overflow, same structural metrics),
    (c) a screenshot. "No Play files touched" is NOT the proof.
19. **Ratchet law.** NEVER edit, weaken, or delete a test, gate script, or proof
    to go green. Gates only move forward. The PreToolUse guard hard-blocks edits
    to `scripts/_*.mts`, `check-*.mts`, `test-*.mts`. Violation = report rejected.
20. **No placeholders.** No stub implementations to pass a gate. Real work only.

## The loop contract (per step)

- ACCEPTANCE: the step's machine-checkable gates/greps must be green. Loop
  fix -> run -> fix until green BEFORE reporting. One report per step.
- BUDGET: max 10 self-correction iterations. Spent without green = write
  `docs/loop/BLOCKED.md` and STOP. Never thrash, never guess through a gate.
- PROOFS: save every artifact under `docs/proofs/<step-id>/` (command outputs as
  `.txt`, screenshots as `.png`).
- BUS: missions arrive in `docs/loop/MISSION.md`; reports go to
  `docs/loop/REPORT.md` (and are printed); blockers to `docs/loop/BLOCKED.md`.
- Owner gates (design locks, migrations, push, new deps, final step approvals)
  sit ABOVE the loop and are never bypassed.
