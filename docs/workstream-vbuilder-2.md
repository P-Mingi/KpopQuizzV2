# V-BUILDER-2 - the builder canvas /build (Phase 2 of the Builder)

## Claude Code Implementation Prompt

Phase 2 of VERSE-BUILDER-BLUEPRINT.md: read the blueprint fully first,
especially section 13 (spike verdict + locked co-designs). Scope: the
SPACE HOME only (it already has composition storage). Wiki and entity
pages wait for Phase 3.

ARCHITECTURE (spike MUSTs, non-negotiable):
- Same-origin iframe of the REAL render. The canvas is the reader
  renderer, never a rebuilt preview.
- A chrome-less draft-render route (route group), curator-gated,
  noindex, middleware-allowlisted.
- STABLE BLOCK IDS everywhere. Never an array index.
- Optimistic same-origin DOM updates + background validated save +
  iframe-truth reconcile on reload. Inline text = native
  contentEditable in the iframe.

LOCKED CO-DESIGNS (build to these, no improvisation; ledger L-003,
L-004, L-021, L-023): chrome (floating drawers, slim top bar, seams,
selection outline + tag + handles), library interior (search, Frequent
row, 6 categories, honest-hint cards, patterns tab), style panel
(4 groups per BlockSpec, swatch-only pickers, retarget on selection,
delete = instant + 6s undo toast no confirm, text precedence mark >
block > world, alignment toolbar-only), mobile (bottom sheets, tap =
action sheet, up/down + position indicator, marks bar above keyboard,
desktop drag on handles + keyboard fallback).

Hard rules: all standing laws (verse-laws skill), commit per step,
never push, no new deps (drag = hand-rolled HTML5 DnD + keyboard), no
migration (draft lives beside the composition in
verse_spaces.presentation jsonb), Play triple-proof at the owner gate,
editor parity law, dual-skill design on every visible surface.

LOOP CONTRACT (every step): self-correct until the step's acceptance
list is green, max 10 iterations, else BLOCKED.md + stop. Proofs as
files under docs/proofs/vbuilder2-step<n>/ (outputs .txt, screenshots
.png, light + dark). Report per step to docs/loop/REPORT.md. RATCHET
LAW holds.

## Steps

STATUS: PHASE 2 CLOSED. Every step done + committed on the local branch (nothing pushed;
owner gave GO on the step-7 gate pack 2026-08-05).

| Step | Status | Commit(s) |
|------|--------|-----------|
| 1 Draft model + draft-render route | DONE | 4e9035f |
| 2 /build shell + selection overlay | DONE | 79577c4 |
| 3 Structural edits (optimistic) | DONE | 837ac42 (id persist+freeze) + 23a24ea; BLOCKED receipt c0a3970 |
| 4 Library drawer | DONE | 80f29d6 |
| 5 Style panel drawer | DONE | 588e9ca |
| 6 Inline text + phone layer | DONE | b7ede35 (inert + tour) + f428c3a (phone) + eeb6d7d (inline text, L-044) |
| 7 Owner gate (matrix + walkthrough) | DONE | e1c23f0 (gate pack); owner GO 2026-08-05 |
| 8 Closing sweep | DONE | the closing-sweep commit (this file's commit; see docs/loop/REPORT.md) |

Note on the ARCHITECTURE line "inline text = native contentEditable in the iframe": the owner
AMENDED this mid-phase (ledger L-044) to OPTION 2 - inline text surfaces the EXISTING section
editor in place over the block (no parallel pipeline / no serializer / no ProseMirror-in-
iframe). Steps 6/8 are built and proven to the amended design.

1. DRAFT MODEL + DRAFT-RENDER ROUTE. Draft composition stored beside
   published in presentation jsonb (versioned, stable ids preserved);
   autosave writes draft only; publish = validate + promote + the
   existing before/after confirm; rollback reuses the existing
   revision rails. Chrome-less route renders the draft through THE
   renderer (route group, curator-gated, noindex, allowlisted).
   ACCEPTANCE: same composition renders byte-identical via draft
   route vs published page (minus chrome); non-curator gets 404;
   noindex header proven; check:routes green. Commit.
2. /BUILD SHELL + SELECTION OVERLAY. Route /verse/{slug}/build
   (curator+): slim top bar (space name, device switcher desktop/
   tablet/phone, undo/redo, "saved Xs ago", Preview, Publish), canvas
   iframe of the draft route, device widths real. Click a block in
   the iframe -> selection overlay from iframe geometry: accent
   outline + name tag + grip/duplicate handles + "+ add block" seams.
   Esc clears selection. Keyboard: tab through blocks, enter selects.
   ACCEPTANCE: screenshots desktop+phone light+dark; selection
   follows scroll + device switch; zero layout shift injected into
   the iframe document by the overlay. Commit.
3. STRUCTURAL EDITS, OPTIMISTIC. Reorder (desktop drag on handles,
   seams as drop targets, keyboard alternative; NO mobile drag),
   duplicate (new stable id), delete (instant + 6s undo toast,
   restore by id), insert placeholder at seam. Each op: optimistic
   iframe DOM update, background validated save, reconcile on
   reload; validator rejection surfaces its human sentence in the
   chrome and reverts the optimistic change. Undo/redo covers all
   structural ops. ACCEPTANCE: op latency proof (DOM update under
   ~5ms logged), save round-trip proof, hostile save rejected +
   reverted proof, reading-order = DOM order proof after reorder.
   Commit.
4. LIBRARY DRAWER (locked co-design 2). Blocks tab: search, Frequent
   quick-row (last-used, local), 6 categories as 2-up honest cards
   from the REGISTRY (no hardcoded list), honest-hint cards when the
   dataSource is empty, click-to-insert at the marked seam. Patterns
   tab: schematic mini-previews (no fabricated content), insert whole
   then dissolve into free blocks; empty-data blocks insert with
   builder-only hint + min-gate at publish. NOTE: co-design 5 locks
   (a-d) must be confirmed by the owner before this step is built;
   check the ledger. ACCEPTANCE: every registry block appears exactly
   once; empty-source blocks show hints not ghosts; inserted pattern
   blocks all individually selectable; light/dark screenshots. Commit.
5. STYLE PANEL DRAWER (locked co-design 3). Contextual to selection,
   renders ONLY the selected BlockSpec's styleOptions (absent, never
   disabled): Layout (width presets + 12-tick rail, density), Surface
   (frame, tint swatches, radius, divider), Color (accent: world
   default + swatches, no free hex field), Text (block Scale only;
   precedence mark > block > world). Header: duplicate + collapse;
   bottom: delete (undo toast). Retargets on new selection. All
   writes optimistic + validated. ACCEPTANCE: per-block options match
   registry styleOptions exactly (grep-proven); a style change never
   emits a raw value (token gate); retarget proof; light/dark
   screenshots. Commit.
6. INLINE TEXT + PHONE LAYER. contentEditable on text blocks inside
   the iframe with the existing editor pipeline (sanitizer, autosave,
   conflict guard) + the six-marks toolbar; phone: drawers become
   bottom sheets, tap = action sheet (Modifier le contenu / Style /
   Monter/Descendre + position / Dupliquer / Supprimer), marks bar
   docked above the keyboard, selected block auto-scrolls above
   sheets. First-build tour (3 steps: library, canvas, publish).
   ACCEPTANCE: published parity re-proof after inline edits; phone
   screenshots of action sheet + style sheet + keyboard bar; a11y
   pass (toolbar, sheets, focus trap). Commit.
7. STOP: OWNER GATE. Full matrix: all step proofs + SEO parity proof
   (a built page vs default emits identical indexable set) + Play
   triple-proof (head byte-diff, 720px probe, screenshot) + full gate
   suites + build + em-dash grep + check:routes. Owner walkthrough of
   /build on desktop AND phone. No step 8 until approval.
8. Closing sweep after approval: a11y re-pass, token gate, sitemap
   unchanged proof (draft route absent), handoff of any deferred
   items to the Phase 3 backlog. Commit.

## Verify

- [x] Draft route: real renderer, gated, noindex, byte-identical
- [x] Overlay never mutates the iframe document except block DOM ops
- [x] Stable ids on every op (duplicate/undo/reorder proven)
- [x] Optimistic + validated save + reconcile, rejections surfaced
- [x] Library + patterns + style panel match locked co-designs 2/3/5
- [x] Mobile matches locked co-design 4
- [x] Editor parity, reading-order, min-gate, token gate, one-H1 all
      hold on built pages; SEO parity proven
- [x] No migration, no new deps, nothing pushed, Play triple-proof

/caveman report per step via docs/loop/REPORT.md. Step 7 is the owner
gate. This phase makes the invisible foundation visible: the canvas
IS the page.
