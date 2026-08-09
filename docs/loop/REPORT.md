# REPORT - iteration 6 PART A: the SHELL (grey/white separation + light top block + full-bleed)

PART A of the validated Verse design system. Scoped to /verse; Play untouched. tsc 0; next build
green. Built from the mission's detailed spec (the verse-sidebar-v2.html prototype is not in the
repo - exact tokens/behaviours were given; owner: flag any deviation from the prototype). Nothing
pushed. PARTS B (index redesign) and C (per-type templates) are the next steps.

## A1 - SEPARATION: recessed grey nav vs white content
- New token pair on .verse-v2 (light: --v2-nav #F7F7F7 / --v2-content #FFFFFF / --v2-raised #FFFFFF;
  dark: --v2-nav #161616 / --v2-content #1E1E1E / --v2-raised #262626). Never cream.
- The sidebar is now a full-height RECESSED grey panel (.v-sidenav: background --v2-nav, 1px right
  border) with a sticky inner (.v-sidenav-inner) that scrolls. The content beside it is the white
  canvas (--v2-content). Verified full-height (grey extends past the fold) on open + rail.
- Raised elements inside the grey nav are white with a hairline + tiny shadow so they read lifted:
  the search field, the space chip, nav row hover/active (a white pill), and the rail buttons.
  Applies to BOTH the open sidebar AND the collapsed 60px icon rail.

## A2 - TOP BLOCK de-cluttered to ONE primary CTA
- Play stays the filled pink pill (full-width, the only primary CTA).
- Fandoms + Community are light transparent nav rows (icon + label); hover = a lifted white pill.
- Search is a raised white field with the theme toggle as a 40px white square on its right (one row).
- Sign in / profile is a QUIET GHOST (outline) control, secondary to Play (no heavy grey fill).
- Even spacing, one type scale (unchanged from iteration 5's rhythm, now on the grey ground).

## A3 - FULL-BLEED on ALL verse pages
- Dropped the 1360 max-width cap and the shell's horizontal padding for every verse page (desktop;
  mobile drawer keeps its padding). The app row fills the viewport: grey nav flush at x=0, white
  content to the right edge. The reading cluster inside content is capped ~1120 and centered
  (.v-navmain > .mt-6). Every verse surface is white (content) / neutral-grey (nav) - no cream.
- .verse-page.verse-scope now paints --v2-content (white) on ALL verse pages, not just the home.

## VERIFY A (docs/proofs/v3nav-iter6a/)
- home-open-light.png / home-open-dark.png : grey nav vs white content, raised elements, light top block.
- home-rail-light.png                      : the collapsed grey icon rail (separation preserved).
- index-open-light.png                     : Discography index - full-bleed, grey/white, Music auto-open.
- member-open-light.png / member-open-dark : Jungkook - the 3-col member layout on the new shell, both themes.
All show the grey/white separation, no cream, full-bleed, the light top block; light + dark both correct.

## FILES
- apps/quiz/src/styles/globals.css                     (token pair; grey nav panel; raised elements; full-bleed)
- apps/quiz/src/components/verse/tree/side-nav.tsx      (the .v-sidenav-inner sticky wrapper)

## GATES
tsc 0; next build PASS. Play outside /verse byte-identical. Real logo only. Nothing pushed.

## NEXT
PART B: redesign the auto-list index pages (intro line + rich hover cards) from
verse-child-templates.html. PART C: per-type page templates (release tracklist, era cover grid +
prev/next, award table shell, BU violet accent). I will need verse-child-templates.html for B/C to
match exactly - it is not in the repo; requesting it from Cowork / the owner before building those.
