# REPORT - iter-9 PART 5: the Verse TOC RAIL

(SEO indexguard PARTS 1-4 shipped earlier: 9fa1064, 54dd0e5, 6982779, 257aceb - see ledger L-173-176.)

Built to the owner-validated prototype `prototypes/verse-toc-rail.html`. Scope /verse only. tsc 0;
next build green; verse-token gate green. Light + dark. Nothing pushed.

## THE RULE (owner)
- SPACE HOME keeps the "On this page" block IN THE SIDEBAR (the home's own sections). `VerseTocSpy` is
  now gated to the space home by construction: `usePathname()` -> render only when the path is exactly
  two segments (`/verse/{slug}`). Sub-pages (3+ segments) never render it. This KILLS the stale-TOC bug
  by construction - the sidebar TOC cannot survive a client-nav onto a sub-page because it does not
  exist there.
- EVERY OTHER PAGE: the sidebar TOC is gone (above), the document's left "On this page" column is gone
  (DocToc removed from document-page.tsx), and the ONLY TOC is the new floating rail.

## THE RAIL (new `components/verse/tree/toc-rail.tsx`, client)
Fed the SAME server-extracted `toc` items DocToc used, so every anchor is a real crawlable
`<a href="#id">` in the SSR HTML. Ticks (one per h2, varied widths), active tick = BU violet + wider,
others faint (.45). Hover / focus-within (desktop) fades the ticks out and the raised panel in
("ON THIS PAGE · N", one row per section, active row violet + 2px left bar). Scroll-spy (threshold
140px, per prototype) drives the active tick AND row; click = smooth scroll. Pages with 0 or 1 h2
render NOTHING (guarded `items.length < 2`).
MOBILE (<768): the ticks become a thumb-zone pill bottom-right (bottom:84px); tap opens the panel
(via the `.open` class), a scrim closes it; rows are 40px+ touch targets. No hover path on mobile.

## LAYOUT
Removed the left 200px column: `.vdoc` grid is now `minmax(0,1fr) 300px` (prose + fact infobox), and
the prose measure widened 66ch -> 72ch (the freed width flows into the reading line, not an empty
gutter). The fact infobox is untouched.

## OFFSET CHOICE (stated per the mission) + the honest tradeoff
The rail is `position: fixed; right: 18px` (the prototype value). The RESTING rail - the quasi-invisible
ticks - sits in the viewport's right margin, clear of the 300px fact infobox. The prototype's single
prose column had a wide empty right margin; our doc pages carry a fact infobox there. So on hover the
raised PANEL (z-30, shadow - the prototype's own floating-panel model) opens leftward and, on narrower
desktops, briefly layers OVER the infobox's right edge; on wide viewports (>=~1600px) it clears the
infobox entirely. The persistent ticks never overlap. This is the documented tradeoff of putting a
right-edge TOC on a page that already has a right infobox; a wider offset would push the ticks off the
margin, and narrowing the content to clear the panel would undo the "widen the prose" goal.

## VERIFY (docs/proofs/iter9-toc-rail/, light + dark)
1. Content page desktop: no sidebar TOC, no left column, ticks + hover panel, wider measure:
   `01-content-rail-panel-light.png`, `02-...-dark.png` (panel opened via :focus-within).
2. Scroll-spy: the active tick + row (Overview) track the scroll position; threshold 140px in code.
3. Space home: sidebar TOC present and CORRECT (the home's own sections): `03-home-sidebar-toc-light.png`.
4. Mobile 390: the pill + open panel, bottom-right (thumb zone), no collision with the top-bar
   hamburger: `04-mobile-rail-open-light.png`.
5. A 0/1-section page renders NO rail - guaranteed by `items.length < 2` (code), not screenshot-hunted.
6. SSR anchors present: `curl /verse/bts/rm` -> `href="#overview" #his-place-in-bts #solo-work
   #threads-to-follow` in the server HTML; the old `.vdoc-toc` left column is absent.

## NOTES
- `doc-toc.tsx` is now unused (its only importer was document-page.tsx). Left in place as dead code
  this pass rather than deleted; a follow-up can remove it + its `.vdoc-toc` CSS.
- tsc 0; check:verse-tokens green; next build green. Nothing pushed; Cowork reviews the diff.
