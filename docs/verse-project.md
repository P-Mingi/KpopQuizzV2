# VERSE PROJECT MEMORY (living state · recreated 2026-08-04)

THE memory file. Cowork updates it at every meaningful state change.
Old copy died with a lost session; never store memory outside docs/ again.
New session read order: docs/COWORK-HANDOFF.md -> this file ->
docs/VERSE-LEDGER.md -> docs/VERSE-BUILDER-BLUEPRINT.md (section 13) ->
docs/workstream-vbuilder-1.md.

## 1. Team + chat protocol

- Owner Mingi · Cowork = planner/auditor/co-designer · Claude Code =
  executor (separate terminal, /caveman reports).
- Loop: Cowork writes specs into docs/ -> owner pastes to worker ->
  worker reports -> owner pastes report -> Cowork audits CRITICALLY
  against the spec FILE (never memory) -> next paste.
- STANDING: always critical, never rubber-stamp anything.
- CHAT RULES (2026-08-04): Cowork replies in /caveman always.
  PROTOTYPE-FIRST LAW: every idea / UX / UI surface gets a rendered
  mockup widget in chat -> owner critique -> LOCK -> only then the
  worker paste. Design stays ahead of code, no exceptions.
- WORKING SYSTEM V2 RATIFIED 2026-08-04 (full text
  docs/VERSE-WORKING-SYSTEM-V2.md): file bus docs/loop/ (MISSION.md /
  REPORT.md / BLOCKED.md) · proofs as files docs/proofs/<step>/ ·
  LOOP CONTRACT per step (machine-checkable acceptance, budget 10,
  self-correct before report) · RATCHET LAW (never edit tests/gates
  to go green) · deterministic hooks (block push, migrations dir,
  test edits; Stop hook tsc+build) · owner stays trigger + gates.
  One-time worker setup step pending.
- Owner gates: migrations (owner runs all SQL, Cowork reads every line
  first, BEGIN/COMMIT wrap on existing tables), new deps, design locks,
  publishing, pushing.

## 2. Hard rules (never violate)

- NO em dashes, no en dashes anywhere. Hyphen + middot only.
- Worker commits per step, NEVER pushes. Preview push approved in
  principle, HELD until owner adds Supabase env to Vercel Preview
  (~150 commits unpushed, intentional).
- No new deps without loud justification + owner gate. Hand-rolled first.
- Play byte-untouched: triple-proof every close = head byte-diff +
  720px layout probe + screenshot. File-scope arguments do not count.
- Bug-class laws swept at every close: ISR-throw, 1000-row cap
  (fetchAllRows), fail-closed privacy, middleware KNOWN_ROUTES
  allowlist, XSS at JSON-LD sinks, no fabricated data, min-gate,
  one-H1, reading-order (DOM = SEO order), token gate + ink floor,
  SEO parity proof (config vs default = identical indexable set).
- Supabase MCP REBOUND to prod org 2026-08-04 (KpopQuizz
  rdkgouofytwfdpbxbzio visible, verified). Cowork uses it READ-ONLY
  (list_tables, advisors, logs) for audits. ALL SQL writes stay
  owner-run by hand. Migrations applied through 145. Never renumber
  gaps.
- Editor parity law · widget duality law · infinite depth law ·
  lean navbar law (max 5 tabs + More) · crawlable collapse ·
  measure 66ch · dual-skill design on visible surfaces · voice rule.

## 3. Product state (pre-builder, all CLOSED)

Everything through V3/V4, V-PAGES, V-HARMONY-1/2A/2B (primitives,
four-door PageShell on 42 page types, WidgetShell), V-REPAIR,
V-UPGRADE-1 (~22 tiered badges + per-world shared-surface mirrors),
V-TRUST (covenant live at /verse/promises), QA-PRELAUNCH-V2: DONE,
zero coherence debt. Spaces: bts (default face), stray-kids (neon),
ateez (soft). Data: 204 idols, 348 albums, 2682 tracks, ~21 fandoms.
Play side: game modes + rankings threshold 30 + CTR sprint baseline.

## 4. BUILDER ERA (current arc)

Governing doc: docs/VERSE-BUILDER-BLUEPRINT.md. Formula: Notion blocks +
constrained 12-col grid + Gutenberg library/patterns + our SEO laws.
Wix free x/y REJECTED forever. 5 phases: 1 block model · 2 canvas
/build · 3 grid+patterns+entity migration · 4 admin hub · 5 lean nav.

- Spike V-BUILDER-0 APPROVED: architecture B = same-origin iframe of
  real render + overlay + optimistic same-origin DOM updates (0.8ms) +
  background validated save; inline text = native contentEditable.
  Phase 2 MUSTs: same-origin iframe · chrome-less draft-render route ·
  STABLE block ids (never array index) · optimistic + iframe-truth
  reconcile. Spike files kept (spike-* routes, curator-gated, noindex).
- LOCKED co-design 1 (builder chrome) + 2 (block library). Full text:
  blueprint section 13.
- Co-design 3 (style panel) LOCKED 2026-08-04 (ledger L-021): desktop
  drawer 4 groups Layout/Surface/Color/Text · swatch-only pickers
  (validator keeps clamped hex, UI never offers free hex) · span
  presets + 12-tick rail · duplicate/collapse in header · delete =
  instant + undo toast 6s no confirm · panel retargets on selection ·
  text precedence mark > block > world, alignment toolbar-only ·
  phone = bottom sheet 2 detents, block auto-scrolled visible, span
  demoted to "Desktop width".
- Co-design 4 (mobile edit sheet) LOCKED 2026-08-04 (ledger L-023):
  tap = action sheet · mobile up/down + position indicator · desktop
  drag on handles (from co-design 1) + keyboard fallback · marks bar
  above keyboard, alignment there.
- Co-design queue: 5 patterns (next) -> 6 admin hub.

### Phase 1 (V-BUILDER-1, spec docs/workstream-vbuilder-1.md)

- Steps 1-3 DONE approved on proofs: c89850b (schema + lossless
  converter) · 2a6af25 (registry, 31 BlockSpecs = 29 modules + doorway
  + prose; blueprint says 22, doc drift noted) · b5a1bc9 (renderer swap
  byte-identical + validator 8/8).
- Step 4 (six text marks) commit 4b24dff. Five receipts RECEIVED and
  AUDITED 2026-08-04 (ledger L-020): 1-4 accepted, 5 accepted with
  notes. Step-5 approval pending only: owner accent ruling (Cowork
  recommends keep clamped-hex validator + swatch-only panel UI) +
  owner screenshot eyeball. Then step 6 sweep + V2 setup step.
- After approval: step 6 closing sweep, then Phase 1 CLOSES, then
  Cowork writes Phase 2 spec (canvas /build) honoring MUSTs + locks.

## 5. Open threads

- Pre-push ledger (re-raise before ANY push): pt-leaderboard fake users
  vs covenant (owner chose KEEP, standing tension) · SEO head-diff vs
  live prod never run · full visual matrix + 5-space fresh-eyes never
  run.
- Deferred: per-page doorway overrides (needs migration, only if asked)
  · origin mobile search fold-in · Phase 3 entity jsonb migration
  (written at Phase 3 gate, owner-run).
- Owner-pending: standalone domain · supporter tier · affiliate links ·
  W5.4 upload policy · newsletter · Discord full · Stage C · niche 2.
- Recruitment reddit posts ready (docs/recruitment-reddit-posts.md).
- CTR re-check log due 2026-08-24/31.

## 6. Notion status (swept 2026-08-04)

LAPSED at 2026-07-29; zero rows for V-HARMONY/V-REPAIR/V-UPGRADE-1/
V-BUILDER. docs/ + this file are truth. Tracker: 63 rows (57 done,
W4.10 gated, W-DISCORD pending, 4 parked). Data source
dd5fb393-da4e-4a14-903c-09623018f320. UNIQUE Notion content worth
keeping (not in repo): Project Overview ops log (504 middleware
incident chain, Googlebot disk-IO incident, wrong-Supabase discovery,
GSC baseline 65/422, KNOWN_ROUTES gotcha, migration-repair history) ·
per-row verification notes · "KpopQuiz Next STEP" identity brainstorm
(seeded Workstream W). Backfill tracker only if owner asks.

## 7. Tracking method (the 100% system, 2026-08-04)

- docs/VERSE-LEDGER.md = append-only event log. EVERY ruling, lock,
  gate verdict, commit approval, audit, artifact, method change gets a
  numbered entry (L-###) same day. Cowork appends; never edits old
  entries (corrections = new entry).
- This file = current state snapshot, rewritten as state changes.
- docs/COWORK-HANDOFF.md = session boot instructions, refreshed at
  every session end AND after big mid-session changes.
- All three live in docs/ on disk, so no chat death loses anything.
  Committing them to git = worker's per-step commits or owner.
