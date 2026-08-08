# MEGA-REPORT - V-FOUNDATION F2: curators can WRITE into tree pages

The page-body editor is built end to end and proven on real prod pages: a curator types into a
tree page, every keystroke autosaves an append-only revision, publish mirrors the exact body to
the reader byte-honest, and the C5 substance rule flips is_stub in both directions. Built to the
locked prototype (prototypes/page-editor-prototype.html, L-096) plus the two owner amendments
(L-097): A1 = NO auto separator over headings; A2 = an editable fact rail with a Data/Edited
grammar where computed fields stay locked to the DB. 5 commits (c5f2838, 835426c, 974c031,
6357dcf, + this Phase-5 commit). 15 commits ahead of origin, NOTHING pushed (commit-not-push).
No schema change in the whole mission - fact overrides ride the page-body jsonb.

FINAL GATES (at the F2 tip): tsc 0 · check:routes pass · check:verse-tokens clean · full
`next build` compiled + 622 static pages (exit 0) · em-dash/en-dash scan of the whole F2 surface
(tree lib + tree components + verse routes + globals.css + this report) = 0.

## PHASE 1 - admin lock + BTS allowlist (commit c5f2838, owner L-097)
(1) SHIPPED: lib/verse/roles.ts isVerseAdmin() (admin only); the hidden-build gates in
    verse/[slug]/layout + page + (builder)/build/[slug] + verse/[slug]/build switched to
    isVerseAdmin; visibility.ts UNPUBLISHED_SPACES stray-kids/ateez/blackpink.
(2) RECEIPT: docs/proofs/vfoundation-f2/phase-1/access-matrix.txt (hidden-state matrix).
(3) NUMBERS: with VERSE_PUBLIC=false, admin URLs stay on the editor route; curator + anon
    redirect to /verse (url_effective is the real signal, not chrome text). BTS stays the one
    live authoring space; the parked spaces 404 for the public.
(4) DEVIATIONS: the access matrix must run against the HIDDEN state - I temporarily flipped
    .env.local VERSE_PUBLIC=false (backed up + restored to true), because the public relaunch
    flag otherwise masks the admin lock. The [TEASER] grep false-matches "KpopVerse" chrome on
    admin rows; url_effective is authoritative. isVersePrivileged kept for the public relaunch.
(5) SCREENSHOTS: none (access gate).

## PHASE 2 - the document block engine (commit 835426c)
(1) SHIPPED: lib/verse/tree/blocks.ts - BLOCK_KINDS (heading, paragraph, list, quote, callout,
    divider, image, table, link); the Run/Mark model (inline text as structured runs, never raw
    HTML); clampBlocks (fail-closed); substanceOf; computeIsStub; DocBody carries factOverrides;
    clampFactOverrides. savePage now clamps + recomputes is_stub on every write.
(2) RECEIPT: phase-2/block-engine.txt.
(3) NUMBERS: 12/12 PASS - clamp drops unknown + locked-widget kinds; the mark whitelist strips
    anything but b/i/u/mark; image paths must be ingest-copied; hrefs must be safe; REORDER keeps
    every block id (the receipt diffs ids before/after a shuffle = identical set); substance BOTH
    directions (a real intro >=15 words + >=1 H2 + >=60 words -> indexable; a thin page -> stub);
    the fact-rail exemption keeps idol pages indexable day 1.
(4) DEVIATIONS: substanceOf is ONE shared computation used by the server is_stub AND the client
    meter (no drift). Widgets (timeline/atlas/stickers/data-block) are in the palette but LOCKED
    and dropped by the clamp if injected - the skeleton kinds ship, the widgets come one by one.
(5) SCREENSHOTS: none (pure engine; the meter is shown in Phase 5 shots).

## PHASE 3 - the writing surface (commit 974c031)
(1) SHIPPED: components/verse/tree/page-editor.tsx (a contenteditable block editor) + runs.ts
    (htmlFromRuns escaped-init, runsFromEl tolerant DOM->runs, runsPlain); the flat-route editor
    at verse/[slug]/[pageSlug]/edit; the .ped-* CSS. Enter splits at the caret, Backspace merges
    up, markdown shortcuts (##, ###, -, >, ---), the slash palette, the selection toolbar, the
    [[ page picker, the gutter (+ / grip) block menu with a 6s undo.
(2) RECEIPT: phase-3/autosave-roundtrip.txt (CDP), writing-surface.png.
(3) NUMBERS: real typed input via CDP Input.dispatchKeyEvent -> autosave -> a new revision ->
    publish -> the reader shows the typed marker byte-honest. XSS-safe BY CONSTRUCTION: inline
    text is stored as runs and the reader emits only a fixed tag set over React-escaped text - no
    dangerouslySetInnerHTML on any user prose.
(4) DEVIATIONS: the editor is a React-controlled contenteditable, so headless synthetic typing
    does not fire the split/slash handlers reliably (this is why the CDP + browser-pane capture
    dance exists); the create-block + keyDown path is the reliable headless trigger (used in
    Phase 5). Rich inline-in-prose links inside a paragraph are wired via runs but the primary
    link affordance is the [[ picker + block link; deep inline styling polish is deferred.
(5) SCREENSHOTS: writing-surface.png (Phase 3), and the full popup set in Phase 5.

## PHASE 4 - the frame + the editable fact rail A2 (commit 6357dcf, owner L-097 A2)
(1) SHIPPED: components/verse/tree/page-editor-frame.tsx - the FRAME owns the single save (blocks
    + factOverrides); a living TOC + scrollspy; the substance meter; the top bar (crumb, lock
    chip, status, saved/rev, word count, history/focus/preview, Publish Cmd+Enter); the history
    panel (revert = a new revision); a read-only PreviewDoc; editable title (rename) + immutable
    slug; EditableFactRail + FactPhoto. factrail.ts extended (FactRow auto/editable/edited;
    EDITABLE_FACT_KEYS; buildFactRail applies overrides). page-editor.tsx refactored so the frame
    owns save. document-page reader renders runs via RunSpan and A1 removed the h2 border-top.
(2) RECEIPT: phase-4/editable-rail.txt, editor-frame.png.
(3) NUMBERS: 13/13 PASS - base rail from pure data (Jisoo); Born + Years active are COMPUTED
    (auto) and locked, never editable; overrides persist ON the body jsonb (NO schema change);
    FAIL-CLOSED - an override aimed at a computed key (born/years) is DROPPED by the clamp;
    the photo override is kept (ingest-copied path); Name/From show the override marked Edited;
    Born STILL computes "age N" from data (the hack never applies); revert restores the data
    value + clears Edited; publish -> published + indexable (fact-rail exemption); 0 leftover.
(4) DEVIATIONS: fact overrides deliberately ride blocks.factOverrides (no new column) so a typed
    fact can never contradict the DB and computed fields stay authoritative. exactOptionalProperty
    Types is ON, so FactOverrides is built key-by-key (never { fields: undefined }).
(5) SCREENSHOTS: editor-frame.png (top bar + living OUTLINE + editable title/immutable slug + A2
    rail with DATA/AUTO badges + the substance meter + A1 no separator over headings).

## PHASE 5 - gates, a11y, screenshots, this report (this commit)
FULL ROUND-TRIP (the mission's acceptance), proven across the receipts above on real prod pages
bound to a real idol (id 8, Jisoo - RM/id 1 is already seeded so its entity slot is taken):
type -> autosave revision (Phase 3) -> publish -> reader byte-honest (Phase 5 reader-preview.png,
the body matches the editor) -> is_stub flips ONLY if the substance rule is met, both directions
(Phase 2, 12/12) · reorder keeps every block id (Phase 2 receipt) · ghost link -> page_links row
-> wanted list -> creating the page resolves the ghost (F1 Phase D, 10/10; the [[ picker in
link-picker.png shows the existing hit AND the ghost option live) · rail override round-trip +
revert + computed fields untouched (Phase 4, 13/13).

A11Y PASS:
- Palette fully keyboard: Escape closes, ArrowUp/ArrowDown move the selection, Enter runs the
  block (page-editor.tsx:238-247); locked widget rows are disabled (not focus-trappable to a
  no-op). The [[ picker input autoFocuses.
- Menus keyboard: the block menu + toolbar are real <button>s (native Tab order); the scrim
  closes on click; the picker is a page-level popup, not a focus trap.
- Toolbar focus management: the selection toolbar uses onMouseDown preventDefault so clicking a
  format button never collapses the text selection it acts on.
- 44px on phone sheets: NEW this phase - a `@media (max-width: 680px)` block turns the floating
  palette / block menu / link picker into full-width bottom SHEETS with a grab handle and >=44px
  touch rows, bumps the selection-toolbar buttons to 44px, and slides the history panel up as a
  sheet. Proven live: the palette sheet computes position:fixed, anchored to the viewport bottom,
  full width, item height 67px (phone-palette-sheet.png). Inline left/top from JS are overridden
  with !important so the sheet geometry wins.

GATES (at this tip, AFTER the phone-sheet CSS): tsc 0 · check:routes pass · check:verse-tokens
clean (globals.css is the token-DEFINITION layer, not scanned) · full `next build` 622 static,
exit 0 · em-dash/en-dash scan = 0.

SCREENSHOTS (docs/proofs/vfoundation-f2/phase-5/, light + dark where the surface is themed):
- reader-preview.png - the reader body byte-honest + the fact rail (DATA/AUTO badges, Born
  computed "age 31", A1 no separator over "Overview").
- history-panel.png - the append-only revision timeline ("Restore creates a NEW revision").
- slash-palette.png + slash-palette-dark.png - the block palette open, all skeleton kinds + the
  locked "soon" widgets; also shows the substance meter's C5 explainer.
- selection-toolbar.png - B / I / U / highlight | Link | [[ Page floating over selected text.
- link-picker.png - the [[ picker with an EXISTING hit (solid) AND the ghost option (C6).
- block-menu.png + block-menu-dark.png - the grip menu (Turn into / Duplicate / Move / Delete
  with the 6s undo).
- phone-palette-sheet.png - the palette as a 44px bottom sheet at 390px.
- (Phase 3 writing-surface.png, Phase 4 editor-frame.png carry the writing surface + A2 rail.)

BUG-CLASS SWEEP on the F2 code: XSS - user prose is stored as runs and rendered through RunSpan
(React-escaped text + a fixed tag set); the only dangerouslySetInnerHTML paths are the editor's
OWN init HTML (htmlFromRuns, which escapes) and table/list init (escaped) - never reader output
of raw user HTML. ONE-H1 - the reader keeps a single page h1; body headings start at H2.
FAIL-CLOSED - clampBlocks + clampFactOverrides drop anything not whitelisted (unknown kinds,
non-b/i/u/mark marks, unsafe hrefs, non-ingest image paths, computed-key overrides). ISR - the
reader stays on-demand; the editor route is curator-gated + admin-locked. NO SCHEMA CHANGE -
factOverrides live on the existing jsonb; nothing written to supabase/migrations.

## DEFERRED (what F2 consciously did NOT do)
- The locked palette widgets, one by one: timeline, atlas, stickers, data-block (in the palette,
  clamped out until each ships).
- Inline comments / annotations on blocks.
- Realtime co-editing (the save model is last-write-wins per curator; revisions are append-only).
- Rich-text inline links INSIDE a paragraph run as the primary flow (the runs model stores them;
  the surfaced affordance is the [[ picker + block link).
- Fact rails for release / track / era / award (F3) - those seeded pages stay honest noindex
  shells until F3 gives them a rail or a curator writes real content.

## STOP
V-FOUNDATION F2 is complete: admin lock -> block engine -> writing surface -> the frame + the
editable fact rail (A2), with the full round-trip, the a11y phone sheets, and the light+dark
screenshot set proven on real prod pages. 15 commits, nothing pushed. Next is F3 (fact rails for
release / track / era / award). STOP.
