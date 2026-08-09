# REPORT - iteration 3: rebuild the Verse sidebar fold (kill the overlay; clean in-flow rail)

The collapsed/hover behaviour was "horrible": an absolute overlay that floated over the
document, top-nav button chrome crammed into the rail, and content bleeding under it. Rebuilt
to two clean IN-FLOW states. Scoped to /verse; Play untouched. tsc 0; next build green. Not pushed.

## ROOT CAUSES - all three fixed
1. HOVER-PEEK OVERLAY covered content -> KILLED. The collapsed rail was `position:absolute;
   width:66px` with `:hover { width:250px }` floating a popover over Overview/members. Removed
   entirely. No hover-peek anywhere.
2. RAIL REUSED TOP-NAV BUTTON CHROME -> GONE. The rail no longer restyles the reused top-nav
   islands. A dedicated `.v-side-rail` renders every icon (global AND space) as a uniform plain
   40px button, no borrowed borders/boxes.
3. CONTENT BLED UNDER THE RAIL -> FIXED. The sidebar is in-flow (position:sticky, never
   absolute), so the cover/hero and document live entirely inside .v-navmain.

## TARGET - two clean IN-FLOW states (verified by computed styles)
The layout is `[ .v-sidenav (fixed width) | .v-navmain (flex:1) ]`; toggling REFLOWS the row.
side-nav.tsx now renders BOTH states, CSS toggles which shows:
- OPEN (.v-side-open): the ~250px expanded column, unchanged from what already looked right
  (real logo -> Play/Fandoms/Community + search/theme/profile, BTS chip, Space home / Browse
  everything, NAVIGATE tree, ON THIS PAGE). Content to its right; the 1120 cluster centered.
- COLLAPSED (.v-side-rail): a ~60px IN-FLOW icon rail. One uniform vertical column of 40px
  square buttons - global group (Play, Fandoms, Community, Search, Theme, Profile) then a thin
  divider then the space group (Space home, Browse, Music, Members, Shows, Fandom, About). Plain
  icon buttons, no borders, muted color, even rhythm; hover = subtle wash; each has a title
  tooltip + aria-label. The expand chevron sits at the top. Section icons link to the section's
  first child so they navigate.
- COMPUTED-STYLE PROOF at 1440 collapsed: sidebar position=sticky, width=60px, side.right=140 <
  main.left=180 (overlap=false), cover.left=170 (no bleed), rail buttons all 40x40 (theme
  toggle's base min-width:44 overridden to 40).

## DEFAULT STATE PER WIDTH
- >= 1200: OPEN; the collapse chevron folds to the icon rail (deliberate click, no hover).
- 768-1199: the icon rail by default (static; expand chevron hidden).
- < 768: off-canvas DRAWER (hamburger + scrim) showing the full open column - a MOBILE overlay,
  which the mission allows; the desktop states never overlay.

## ALSO FIXED
- Breadcrumb now reads the space NAME ("Verse / BTS"), not fandom_name ("ARMY"). (page.tsx)

## FILES
- apps/quiz/src/components/verse/tree/side-nav.tsx  (two states; dedicated uniform rail)
- apps/quiz/src/styles/globals.css                  (in-flow collapsed rail; removed overlay + peek)
- apps/quiz/src/app/verse/[slug]/page.tsx           (breadcrumb -> space name)

## SCREENSHOTS - before/after (docs/proofs/v3nav-rebuild/)
- before/nav-1440-rail-light.png : the old absolute overlay (mismatched boxes, content bleed).
- after/nav-1440-rail-light.png  : the clean 60px in-flow uniform icon rail, content reflowed.
- after/nav-1440-open-light.png  : the OPEN column (unchanged, looks right), breadcrumb "Verse / BTS".
- after/nav-390-drawer-light.png : the mobile drawer (full column over a scrim).
- (before/ and after/ each also hold 1440-open-dark and 1024-rail for completeness.)

## GATES
tsc 0; next build PASS. Play outside /verse byte-identical. Nothing pushed.
