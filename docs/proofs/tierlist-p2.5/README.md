# TIERLIST phase 2.5 proofs

Built on `next build` + `next start` (:3021), never dev. See `docs/loop/REPORT.md`.

## FIX 1 - real photos in the share card
- `share-card.png` - BTS members OG card, seven real photos in coloured tiers (248KB vs the old
  ~137KB initials card).
- `share-card-story.png` - the 9:16 story variant, real photos.
- `share-card-fallback.png` - three real photos + one "MB" initials tile for an unreachable custom
  face: graceful degradation, never an all-grey card.

## FIX 2 - create wizard + import modal
- `screen-wizard-subject.png` - CreateSubject: search, popular grid (real logos + generation),
  Start blank, BTS selected + what-to-rank tiles.
- `screen-wizard-pool.png` - CreatePool: real member photos with drop/re-add, uploads segment,
  Add-your-own card, Tiers & title with S-D / S-F / Top 3 presets.
- `screen-wizard-import.png` - ImportModal: crop preview, Name, Zoom, Add to pool.
- `screen-maker-custom.png` - the maker tray with the 7 bank members plus the custom
  "Jung Kook (solo)" item (8 items), proving the client-only upload survived pool -> board.

## Cross-cutting
- `tests.txt` - 22 unit (vitest) + 19 e2e passed / 7 skipped (Playwright desktop + mobile).
- `route-modes.txt` - hub static, /tier-list/create new noindex tool, no existing URL changed.
- `gates.txt` - docs-secrets + routes PASS; the three failing gates report only pre-existing,
  non-tier-list offenders (this work adds no new dupe/orphan/indexability break).
- `no-emoji.txt` - 0 emoji codepoints across 24 tier-list source files; every icon is inline SVG.
