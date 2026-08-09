# REPORT - iteration 5: full-bleed home + tighter sidebar top block + bigger accordion toggles

Three owner-flagged nav/layout fixes. Scoped to /verse; Play untouched. tsc 0; next build green.
Kept everything that works (in-flow sidebar, real logo, collapsible accordions, editorial center).
Nothing pushed.

## FIX 1 - FULL WIDTH (edge to edge)
The home was centered in a capped column, so the global cream --bg showed as gutters on both
sides. Now the home is FULL-BLEED white: dropped the 1360 cap and the shell's horizontal padding
on the home so the white ground (--v2-paper) reaches BOTH viewport edges - sidebar flush at x=0,
main to the right edge, the 1120 reading cluster still centered in main.
- CSS (globals.css), desktop only (the mobile drawer keeps its padding):
  `main:has(.vh2-home){max-width:none;padding-inline:0}` + `.verse-page:has(.vh2-home){padding-inline:0}`.
- PROOF at 1720px: verse-page left=0, right=1720, background=rgb(255,255,255), main max-width=none.
  No cream anywhere (see fullbleed-1720.png).
- SCOPE: scoped to the home via :has(.vh2-home). Sub-pages keep their current padded layout and
  ground on purpose - extending full-bleed white to every editorial sub-page (indexes, grids,
  member pages) is unverified and would risk regressing them. Say the word to extend it once those
  layouts are checked; the global cream --bg is never reintroduced on the home.

## FIX 2 - the top block is now ONE tight structured stack
Even 2px vertical rhythm, every control full-width to the same left edge, one type scale, no stray
pills (globals.css .v-side-top and friends):
- Row 1: real logo (left) + collapse chevron (right).
- Play: the pink CTA, full-width, the clear primary action (kept).
- Fandoms + Community: two equal .v-side-row nav rows (icon + label), identical to Space home /
  Browse / Members.
- Utility row: Search as a full-width soft FIELD with the theme toggle as a compact 40px square on
  its right - one aligned row (.v-side-searchrow), not two stray pills.
- Sign in / profile: one clean full-width control, same width as Play, soft-filled and centered
  (the reused TopNavProfile's inline pill chrome is overridden) - no mismatched outline pill.
- Then the divider and the BTS space chip.

## FIX 3 - the accordion toggles are bigger and easier to hit
The whole parent row was already the toggle (the <summary> is the full-width .v-side-row); made it
obvious: comfortable 40px min-height rows and a clearer 15px SVG chevron on the right with better
contrast (--v2-muted, ink on hover) that rotates 180deg on open. Reduced-motion still honoured.
Verified: /verse/bts/discography-index auto-opens Music with the rotated chevron and Discography
active; the home shows every section collapsed with the larger down-chevrons.

## FILES
- apps/quiz/src/styles/globals.css                       (full-bleed home; top-block reformat; chevron/row)
- apps/quiz/src/components/verse/tree/side-nav-rows.tsx   (SVG chevron in the accordion summary)

## SCREENSHOTS (docs/proofs/v3nav-iter5/)
- fullbleed-1720.png            : full-bleed white home at 1720px (no cream gutters, sidebar flush-left).
- open-accordion-collapsed.png  : the restructured top block; NAVIGATE collapsed by default.
- open-accordion-expanded.png   : a Music sub-page - Music expanded (rotated chevron), Discography active.
- icon-rail.png                 : the 60px in-flow uniform icon rail (unchanged).

## GATES
tsc 0; next build PASS. Play outside /verse byte-identical. Real logo only. Nothing pushed.
