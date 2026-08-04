# /caveman report - V-BUILDER-2 step 6 COMPLETE (inline text via the existing editor, L-044)

The owner ruled OPTION 2 (ledger L-044): inline text = the EXISTING section editor (TipTap)
SURFACED IN PLACE over the block. No parallel pipeline, no serializer, no ProseMirror-in-
iframe. That closes the last open part of step 6. BLOCKED.md cleared. Nothing pushed.

## DONE this turn - inline text (acceptances 1 + 2, and the coupled phone bits)

Built 3 builder-only files:
- `inline-text-editor.tsx` (NEW): a thin positioner that mounts the REAL `<SectionEditor>`
  over the block geometry (desktop: absolute at the block rect, same width + .verse-prose;
  phone: full-width bottom sheet). Zero new save code - it just mounts the component.
- `builder-shell.tsx`: `SECTION_FOR` (intro -> overview), an `editing` state, desktop
  affordances (an "Edit text" pill on a selected text block + double-click), the phone
  action-sheet "Edit content" row (gated to text-capable blocks), the editor render, and
  `editableSections` kept in state so a save advances the base revision (no stale-base 409
  on a second edit).
- `build/[slug]/page.tsx`: seeds `editableSections` from `getSection('group', gid,
  'overview')`.

Everything routes through the EXISTING rails: /api/verse/draft autosave, /api/verse/section
(base-revision 409 guard), renderTipTapJSON sanitizer. No new endpoints.

## PROVEN (docs/proofs/vbuilder2-step6/inline-text.txt) - full matrix, screenshots inline

- Round-trip: typed + bolded " QAPROBE", "Draft saved" (draft rail), Publish, canvas
  reloaded and reflected it. Rendered `<strong>QAPROBE</strong>`; intro textContent carries
  NO markup -> indexable text unchanged by the mark (published parity).
- Hostile marks: 11/11 clamped by renderTipTapJSON (javascript:/data: hrefs, <script>,
  on*= attrs, tint/size out-of-enum, unknown mark + node, non-approved image host).
- Conflict 409 from the builder path: base=null -> 409; base=current -> 200 (new rev);
  reused-stale base -> 409.
- Phone (399x865): non-text block (Members) shows NO "Edit content" row; intro shows it,
  with "Move up" disabled at position 1. "Edit content" opens the same editor as a
  full-width bottom sheet; the marks bar is now DOCKED (sticky top:0, never scrolls off) at
  44x44 targets (presentation override scoped to the phone inline editor; the shared toolbar
  component is untouched).
- Published /verse/bts byte-identical: verse_content(group/1, overview) restored byte-for-
  byte to the pre-test backup (content deep-equal, rev 30, updated_at + lock equal); main
  column normalized outerHTML 21312 == pre-test baseline; QAPROBE absent; presentation_draft
  reset to {}; section draft cleared. The test space is back to its pre-session state.
- Gates: tsc clean; check:routes 338; check:verse-tokens pass; em-dash grep clean.

## Step 6 status: ALL FOUR PARTS DONE + committed

- inert a11y debt (L-036) + first-build tour - b7ede35 (earlier).
- phone layer (action sheet + bottom sheets) - f428c3a (earlier).
- inline text via the existing editor (L-044) - THIS commit.

## STOP

Holding before step 7: the OWNER GATE mission comes from Cowork after this audit. Nothing
pushed (commit-not-push law).
