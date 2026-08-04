# V-BUILDER-2 - OWNER WALKTHROUGH (~10 minutes)

A click path that exercises everything. Do it once on desktop, once on a phone-width window.

## Setup

1. Dev server on :3021 (from `apps/quiz`):
   ```
   pnpm --filter quiz dev
   ```
2. Sign in as the dev owner (admin + curator everywhere): open
   `http://localhost:3021/api/dev/login` once (it redirects home).
3. Go to the builder:
   ```
   http://localhost:3021/verse/bts/build
   ```
   Everyone who is not a curator of this space gets a 404 here (by design).

## Desktop tour

1. SELECT - click the "Members" grid. A selection ring + a block label appear, with handles
   (grip, duplicate, delete) top-right and "+ add block" seams above and below. The bottom
   status line names the selection.
2. REORDER (drag) - drag the grip handle. Drop seams light up between blocks; drop on one.
   The block moves and the canvas re-renders in place (the change is optimistic; it saves in
   the background and reconciles on reload). "Saved just now" shows in the top bar.
3. REORDER (keyboard) - press Tab to move the focus ring between blocks, Enter to select,
   Enter again to GRAB (the ring goes dashed), Arrow Up/Down to move it, Enter to drop, Esc
   to cancel back to where it started.
4. DUPLICATE - select a block, click the duplicate handle. A copy appears right after it,
   already selected.
5. DELETE + UNDO - select a block, click the trash handle. The block disappears and a
   "<block> deleted" toast offers Undo for a few seconds. Click Undo (or press the top-bar
   Undo arrow) to bring it back. seoCritical blocks have no delete handle (they can be
   restyled and reordered but never removed).
6. INSERT FROM LIBRARY - click "+ Add block" (top bar) or a seam "+". The library drawer
   opens. Insert a single BLOCK (e.g. a Quote) and also a multi-block PATTERN. Notice the
   HONEST HINT: a block whose data source is empty for this space shows its one-line reason
   instead of inserting a ghost (e.g. a widget with no items yet).
7. STYLE PANEL - select a block, click "Style". Change the ACCENT (swatch tint), the FRAME
   (None / Card / Outline), BACKGROUND, CORNERS, DENSITY, text SCALE (S/M/L), and DIVIDER.
   The block updates live. RETARGET: with the panel open, select a different block; the panel
   follows the new selection. Every value is a token (no raw colour).
8. INLINE TEXT + MARKS - select the intro paragraph at the top. Click the "Edit text" pill in
   the handles (or double-click the block). The real section editor opens OVER the block, same
   width and typography. Type a word, select it, click Bold (try Italic, a Highlight, a Link).
   "Draft saved" appears (the autosave). Click Cancel to discard, or Publish to save the
   section as a new revision - the block re-renders with your text.
9. PUBLISH - click "Publish" (top bar) and confirm. This replaces the live space page with
   your draft. (Use Preview first to open the live page in a new tab.)

## Phone tour (resize the window to <= 640px wide, reload the builder)

1. TAP A BLOCK - a bottom ACTION SHEET rises with the block name + "position n of m".
2. For a TEXT block (the intro) the sheet's first row is "Edit content"; for a non-text block
   there is no such row. "Move up" is disabled at position 1.
3. "Edit content" opens the SAME section editor as a full-width bottom sheet, with the marks
   bar DOCKED at the top (sticky, 44px targets) so it stays reachable while the keyboard is up.
4. "Style" opens the style panel as a bottom sheet (grabber toggles half / full height).
5. "+ Add block" opens the library as a bottom sheet. Tap outside any sheet to dismiss and
   deselect. There is no drag on phone (use Move up / Move down).

## Reset after (leave the test space clean)

From `apps/quiz`, discard the draft you built:
```
npx tsx scripts/vb2-reset-draft.mts bts
```
This sets the presentation draft back to empty. If you published and want the intro text
restored too, it was already left byte-identical for the audit; re-publishing the draft-reset
state (or leaving it) keeps `/verse/bts` as the ARMY home you started with.
