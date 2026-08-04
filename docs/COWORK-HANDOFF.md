# COWORK SESSION HANDOFF (updated 2026-08-04, session 2)

Read this FIRST if you are a new Cowork session continuing the KpopVerse
work. Then read IN ORDER: docs/verse-project.md (living state, THE
memory file), docs/VERSE-LEDGER.md (append-only event log),
docs/VERSE-BUILDER-BLUEPRINT.md (governing builder doc, especially
section 13), docs/workstream-vbuilder-1.md (running phase).

## 1. The team and the protocol

- The owner (Mingi) + you (Cowork = planner, auditor, co-designer) +
  Claude Code (the executor, in a separate terminal).
- The loop: you write specs into docs/, the owner pastes them to Claude
  Code, Claude Code reports back in /caveman style, the owner pastes the
  report to you, you audit it CRITICALLY against the spec FILE (never
  memory) and produce the next paste.
- STANDING: always be critical. Push problems, question, never
  rubber-stamp a report, spec or design.
- CHAT RULES: reply in /caveman always. PROTOTYPE-FIRST LAW: every
  idea / UX / UI surface = rendered mockup widget in chat -> owner
  critique -> LOCK -> only then the worker paste. Design ahead of code.
- Owner gates: migrations (owner runs all SQL, you read every line
  first, BEGIN/COMMIT wrap when touching existing tables), new deps,
  design locks, publishing, pushing.
- TRACKING: append every ruling/lock/gate/commit/audit/artifact/method
  change to docs/VERSE-LEDGER.md same day (L-### entries, never edit
  old ones). Rewrite docs/verse-project.md at every state change.
  Refresh THIS file at session end and after big mid-session changes.

## 2. Hard standing rules (never violate)

- NO em dashes, no en dashes, anywhere. Hyphen and middot only.
- Worker commits per step, NEVER pushes. Local-only. (Preview-branch
  push approved in principle but HELD until the owner adds Supabase env
  to the Vercel Preview scope; ~150 commits unpushed is intentional.)
- No new deps without loud justification + owner gate. Hand-rolled first.
- Play (the quiz product) byte-untouched: triple-proof every close
  (head byte-diff + 720px layout probe + screenshot). File-scope
  arguments ("zero Play files touched") are NOT the proof.
- Bug-class laws swept at every close: ISR-bakes-a-lie (page-defining
  reads THROW), 1000-row PostgREST cap (scope/paginate, fetchAllRows),
  fail-closed privacy reads, middleware allowlist for new public routes,
  XSS escaping at JSON-LD sinks, no fabricated data, min-gate (no dead
  affordances), one-H1, reading-order law (DOM order = SEO order),
  token gate (all color via tokens, chromaticity-gated in build),
  SEO parity proofs (rich vs default config = identical indexable set).
- The connected Supabase MCP points at the WRONG project ("Bloom",
  iiwovvyofjccmnercniq). Never use it. Prod = rdkgouofytwfdpbxbzio;
  the owner runs SQL by hand. Migrations applied through 145.

## 3. Where the product stands

Everything through V3/V4, harmonization (V-HARMONY-1/2A/2B), repairs
(V-REPAIR) and upgrades (V-UPGRADE-1) is DONE and closed. Zero
coherence debt. Covenant public at /verse/promises. Pre-push ledger
still open (re-raise before any push): pt-leaderboard fake users vs
covenant (owner chose KEEP, standing tension), SEO head-diff vs live
prod never run, full visual matrix + 5-space fresh-eyes never run.

## 4. The BUILDER ERA (current arc)

See docs/verse-project.md section 4 for full live state. Summary:
blueprint governs; spike verdict = architecture B (same-origin iframe,
MUSTs locked); co-designs 1 (chrome) + 2 (library) LOCKED; co-design 3
(style panel) delivered, awaiting 3 owner locks; queue after: mobile
edit sheet -> patterns -> admin hub. Phase 1 steps 1-3 approved
(c89850b, 2a6af25, b5a1bc9); step 4 report received (4b24dff), step-5
gate on HOLD pending 5 receipts (ledger L-011). After close: Cowork
writes Phase 2 spec honoring MUSTs + locked co-designs.

## 5. Notion (lapsed, optional)

Tracker lapsed 2026-07-29; nothing on the post-W era. docs/ + memory
are truth. Unique Notion-only content (ops log, incidents, identity
brainstorm) listed in verse-project.md section 6. Backfill only if
owner asks.

## 6. Other live threads

- Recruitment: reddit posts ready at docs/recruitment-reddit-posts.md;
  owner fires whenever.
- Deferred: origin mobile search fold-in; per-page doorway overrides
  (migration, only if curators ask); CTR re-check 2026-08-24/31.
