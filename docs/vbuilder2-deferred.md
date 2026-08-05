# V-BUILDER-2 - consciously deferred items (Phase 2 -> Phase 3 backlog)

Everything Phase 2 (the builder canvas) deliberately pushed. One line each with its target
workstream. None of these is a bug; they are scope Phase 2 chose not to open.

## To V-BUILDER-3 (grid + block editors)

- **Width / column-span control** -> V-BUILDER-3 (Phase 3 grid). Blocks render single-column
  full-width; the co-design's "width presets + 12-tick rail" is not shipped (style-panel.tsx
  says so explicitly: "NO width control (Phase 3)"). Density shipped; width waits for the grid.
- **Inline text on the other text blocks** -> V-BUILDER-3. Inline editing is wired only for the
  intro block (SECTION_FOR = { intro: 'overview' }). Quote / prose / other text-capable blocks
  don't yet surface the in-place editor; extend SECTION_FOR + seed their editableSections when
  Phase 3 does block editors.
- **doorwayFormat per-door editor** -> V-BUILDER-3. The doorway block exposes a doorwayFormat
  style enum (registry), but there is no per-target / per-door presentation editor UI, and
  per-target overrides remain a deferred migration (see the doorway-registry-presentation
  note). Build the per-door editor with the block editors.

## To review at V-BUILDER-3 (copy / polish)

- **Library honest-hint copy per data source** -> review at V-BUILDER-3. The empty-source hint
  sentences are the registry's generic min-gate lines; tailored per-source copy (why THIS
  widget is empty + the one action to fill it) is a copy pass for Phase 3.
- **Publish confirm is a native window.confirm** -> review at V-BUILDER-3. Functional and
  honest (names the consequence) but not the styled in-chrome confirm the co-design imagines;
  low priority.

## To G-HUB follow-up

- **name-all auto-start + in-game mode rail** -> next G-HUB pass. name-all-player is structurally different (inline conditional render, plain startGame(), roster variants); higher render-blind risk than the registry games. Its lobby got the legal-wall CSS-art fix; the interstitial is still live.

## A11y notes carried forward

The step-8 a11y re-pass FIXED the real barriers (keyboard hijack while an overlay is open,
focus-in/restore for the style panel + inline editor + phone sheets, and the 44px floor on the
library + style phone sheets) - see docs/proofs/vbuilder2-step8/a11y-repass.txt. Two LOW-polish
items were consciously deferred:

- **Library tabs: no aria-controls / role="tabpanel" association** -> V-BUILDER-3. The tabs use
  role=tab + aria-selected but the content region is not associated back. Add the ids.
- **BuilderTour does not move focus to its Skip/Next button on open** -> V-BUILDER-3 (optional).
  It is a non-modal role="region" tip with its own Esc; moving focus is a nicety, not a barrier.
