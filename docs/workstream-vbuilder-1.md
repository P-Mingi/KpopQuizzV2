# V-BUILDER-1 - the unified block model (Phase 1 of the Builder)

## Claude Code Implementation Prompt

---

Phase 1 of VERSE-BUILDER-BLUEPRINT.md: READ THAT DOC FULLY FIRST, it is
the governing document (owner rulings locked 2026-08-02: constrained
12-col grid, lean navbar, one admin hub, buildable entity pages in
principle). This phase builds the FOUNDATION: one composition schema, one
validator, one renderer, and the registry that turns the existing 22
modules + prose blocks into a single unified block system. Mostly
invisible to readers: the visible builder canvas is Phase 2.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps
(evaluate hand-rolled first; any dep proposal = loud justification +
owner gate). NO migration in this phase (the space home already has
composition storage in verse_spaces.presentation; entity pages wait for
Phase 3). Play triple-proof. All standing laws hold: SEO invariant +
parity proof, reading-order law, token gate, ink clamps, min-gate,
real-data, fail-closed reads, ISR-throw. Dual-skill design on any
visible surface.

## What Phase 1 delivers

1. THE COMPOSITION SCHEMA: page = sections[] -> blocks[] -> props.
   Section: { id, width: text|wide|full, background(token), density,
   divider }. Block: { id, type, span (1-12, for Phase 3 columns; Phase
   1 renders full-width stacks), props, style }. Versioned (version
   field), stored where composition already lives (presentation jsonb
   for the space home). Backward-compatible: the CURRENT presentation
   config maps losslessly into the new schema (a converter, proven both
   ways: old config -> new schema -> identical render).
2. THE BLOCK REGISTRY: every existing module (the 22), every doorway
   type, and the prose block become BlockSpec entries: { id, category
   (layout|text|media|live|doorway|fan), icon, name, description,
   dataSource, seoCritical, allowedZones, styleOptions, minGateRule }.
   Registry is CONFIG (niche-agnostic core law). The library UI (Phase
   2) will read this registry; Phase 1 proves it complete by rendering
   the whole space home through it.
3. THE ONE RENDERER: a composition renderer that renders sections ->
   blocks via the registry, producing byte-identical output to today's
   space-home renderer for the equivalent composition (the harmonized
   look does not change: this is re-plumbing). The existing
   SpaceHomeRenderer becomes a thin wrapper or is replaced; prove
   byte-parity on bts + both showcases.
4. THE VALIDATOR: one composition validator (the presentation validator
   extended): unknown block type rejected, section/block caps enforced,
   seoCritical presence enforced (cannot be removed from a page that
   requires it), style options clamped (tokens only, ink floor), spans
   valid. Human-readable errors (the standing voice).
5. THE STYLE OPTION SET, defined per block (not yet the panel UI):
   frame, background tint, radius step, density, divider, accent
   override (clamped), text options where relevant. Encoded in each
   BlockSpec so Phase 2's style panel is pure UI over data.
6. NEW TEXT MARKS (the editor gains, token-governed): underline,
   strike, highlight (token tints), size steps (S/M/L on the type
   scale), alignment (left/center). Color stays token-palette only,
   contrast-clamped. Wire into the existing TipTap editor + renderer +
   sanitizer; the parity law holds (marks are presentation on the same
   indexable text).

## Steps

1. Schema + converter: define the composition types; write the
   old-config -> new-schema converter; prove lossless round-trip and
   byte-identical render on bts/stray-kids/ateez. Commit.
2. Registry: all existing blocks as BlockSpecs; grep-prove every module
   in the presentation validator has a spec; render the space home
   through the registry. Commit.
3. The one renderer + validator: swap the space home onto the
   composition renderer behind the converter; full validator with gate
   tests (unknown type, caps, seoCritical removal attempt, hostile
   style values all rejected with plain sentences). Commit.
4. Text marks: the six new marks in editor + renderer + sanitizer,
   token-governed, contrast-clamped; prove published output parity
   (same text indexable, marks presentational); update the editor
   toolbar (roving tabindex law). Commit.
5. STOP: owner review. This phase is mostly invisible, so the matrix is
   proof-oriented: the byte-parity diffs (old vs new renderer on 3
   spaces), the registry table (every block + its category/flags), the
   validator gate results, and screenshots of the new text marks in the
   editor + published (light/dark). Plus Play triple-proof.
6. Closing sweep after approval: full gate suites (vpages, templates,
   fold, play-probe, token gate), SEO parity re-proof, a11y on the
   toolbar additions, full build, em-dash grep, check:routes. Commit.

## Verify

- [ ] Old config -> new schema -> render is byte-identical on 3 real
      spaces (the converter is lossless, proven both directions)
- [ ] Every existing module/doorway/prose block has a BlockSpec; the
      space home renders entirely through the registry
- [ ] Validator rejects: unknown type, cap breach, seoCritical removal,
      raw hex, un-clamped accent, bad span: each with a human sentence
- [ ] Text marks: token-governed only, contrast-clamped, published
      parity proven, toolbar keyboard-complete
- [ ] No migration, no new deps; Play triple-proof; all suites green;
      tsc/build/routes/token-gate green; zero em dashes

/caveman report per step; step 5 is the owner gate. This phase is the
foundation: invisible plumbing, proven byte-perfect, so Phase 2's canvas
has one true system to build on.
