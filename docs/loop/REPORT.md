# REPORT - MOBILE RAIL treatment (home + member)

The owner-validated phone fix (prototypes/verse-mobile-rail.html): on mobile the document
comes first, a compact key-facts strip sits under the hero, the data widgets stack BELOW the
document, and the empty photo box is gone. Verified live at 390px + 1280px. On main. NOTHING
PUSHED. No schema. Reused verse-v2 tokens (no new colours/font).

## THE THREE CHANGES (home vh2 rail + member vdoc pages)

### A. Killed the empty photo box (all viewports)
home-rail.tsx: removed the always-on `.vh2-factphoto` placeholder. The slot now renders only
when a real moderated image exists (none today -> nothing, honest emptiness). The fact-sheet
source line gains "A group photo appears here once one is added through the moderated rail."
Member reader pages have no photo slot in the vdoc fact rail, so there was no member box.

### B. Document first on mobile (desktop untouched)
- Home (globals.css @media max-width:960px): `.vh2-doc { order: 1 }`; the whole rail
  (.vh2-railgroup.first/.rest) stacks AFTER. (This reverses the earlier F4.5 fact-first order,
  per the new owner-validated treatment.)
- Member (globals.css @media max-width:900px): `.vdoc-main { order:1 }`, `.vdoc-rail { order:3 }`,
  and the desktop "on this page" jump-nav `.vdoc-toc { display:none }` on mobile.

### C. Compact key-facts strip (mobile only, < 960px)
New components/verse/tree/fact-strip.tsx (FactStrip + factStripRows): a SECOND presentation of
fact rows already computed for the sheet (no new fetch). The home head renders it from
buildGroupFactRail (first 5 rows); the member page renders it from the `facts` prop (drops
'name', which is the title). `.vh2-factstrip` / `.vh2-fpill` CSS, verse-v2 tokens only, shown
only < 960px (the full fact sheet sits in the rail on desktop).

## VERIFIED LIVE (receipts docs/proofs/vfoundation-mobile/)
- home 390px: strip display=flex, pills [Debut, Label, Generation, Origin, Fandom],
  emptyPhotoBox=false, docTop 655 < factSheetTop 7029 (document first, rail below). home-390.png.
- member 390px: strip pills [Born, From, Debut, Years active, Positions], proseBeforeRail=true,
  tocDisplay=none. member-390.png.
- home 1280px (regression): strip display=none, `.vh2-layout` grid = "848px 304px" (two-column
  document + rail unchanged). home-1280-desktop.png. No desktop CSS changed.

## GATES
- tsc --noEmit: EXIT 0.
- full build (check:routes + check:verse-tokens + next build): EXIT 0. check:routes pass (353
  routes); verse-tokens pass; "Compiled successfully".
- em-dash / en-dash scan on the changed files: clean.

## STOP
MOBILE-RAIL complete + verified. Nothing pushed.
