# REPORT - v3 BTS/Verse home (editorial center + white ground + 1120 width)

Presentation rebuild over existing reads. Covenant kept: no fabricated content; the
Overview lede is derived from DB facts only. Nothing pushed to git. Play/quiz untouched.

## STATUS - all four deliverables DONE + verified (two commits)
- Deliverable 1 (editorial CENTER rebuild): DONE + verified.  [commit 1]
- Deliverable 3 (pure-white ground): DONE + verified.          [commit 1]
- Deliverable 4 (1120 width cluster): DONE + verified.          [commit 1]
- Deliverable 2 (persistent foldable LEFT NAV + on-this-page TOC): DONE + verified. [commit 2]

Commit 1 = the center + ground + width. Commit 2 = the left foldable nav + TOC scroll-spy.

## DELIVERABLE 1 - the editorial center (from prototypes/bts-home-v2.html)
New server component: apps/quiz/src/components/verse/tree/home-center.tsx (VerseHomeCenter),
wired into apps/quiz/src/app/verse/[slug]/page.tsx in place of the old generic
CompositionRenderer + VerseHomeOverview. In order:
- Overview: the anti-overflow FOLD (reused <Fold>, full text stays in the DOM). Renders the
  authored portal prose (pages.blocks) when present; today that is empty, so a DB-DERIVED
  2-sentence lede shows instead ("BTS, a 3rd generation act, from South Korea, debuted in
  June 2013." + a catalog-size sentence). Honest, sourced, replaceable by authored prose.
- Members: the 7-up grid of the real bound idols, ordered by `ord`, each with photo (real
  idols.photo_url, initials fallback) + name + hangul + positions, linking to the member
  page. Links resolve by (entity_kind='idol', entity_id) -> the real tree page slug, NOT by
  slug-guessing: rm / jin / suga / j-hope / jimin / v / jungkook all resolve.
- Discography: the cover grid of every `albums` row for the group, release_date desc, each a
  gradient placeholder tile (no cover images are stored) + title + year + type, linking to
  its release page by (entity_kind='album', entity_id). 18 releases render; the junk "ARIRANG"
  row is NOT special-cased (it disappears when the owner runs 152_purge_arirang.sql).
- The story so far: the eras timeline (getEras), year column + era name + story excerpt
  (honest empty when no story authored) + a "Now" tag on the newest. 15 eras render.
- Community & Play: two cards - ARMY/fandom links (Community, Fandom) and the top BTS
  quizzes (getQuizzesByGroup 'popular', linked to /q/{slug}).
The page HEAD (cover, icon, eyebrow, H1 + hangul, lede, action pills) and the right data
rail (VerseHomeRail) are unchanged. One H1 per page (the group name, in the head).

## DELIVERABLE 3 - pure-white ground
apps/quiz/src/styles/globals.css: `.verse-page:has(.vh2-home) { background: var(--v2-paper); }`.
--v2-paper is #FFFFFF (light) / #191919 (dark) from the existing .verse-v2 scope. The global
warm --bg (#FAF8F5) is UNTOUCHED, and the :has(.vh2-home) guard scopes the white ground to the
Verse HOME only - every other Verse surface and all of Play render byte-for-byte the same.

## DELIVERABLE 4 - 1120 width cluster
The nav + head + body cluster is capped at max-width 1120px, centered
(`.verse-page:has(.vh2-home) .vnav, .vh2-home, #vh2-body { max-width: 1120px; margin-inline: auto; }`).
The doc+rail grid proportions match the prototype: main minmax(0,1fr) + 300px rail, gap 52px
(edited the base .vh2-layout rule so the <=960px single-column collapse still wins - no
specificity fight; an earlier higher-specificity override broke the mobile collapse and was
removed).

## GATES
- tsc: 0 errors (pnpm exec tsc --noEmit).
- next build: PASS ("Compiled successfully"; 622/622 static pages). The >2MB pinterest-feed
  data-cache warning is pre-existing and unrelated.
- Runtime: /verse/bts HTTP 200; no NEW console/hydration errors. The two dev-overlay "Issues"
  are pre-existing and unrelated to this change (the JSON-LD <script> tag notice, and a
  ThemeToggle sun/moon icon hydration mismatch in the global RootLayout shell). VerseHomeCenter
  is a pure server component with no Date.now()/random()/locale nondeterminism.
- a11y: nav is the existing <nav>; member/release/era/quiz links are real crawlable <a>;
  images carry alt; reduced-motion honoured on the fold.

## SCREENSHOTS (docs/proofs/v3home/, CDP headless capture, full-page)
- home-1440-light.png / home-1440-dark.png  (desktop)
- home-1024-light.png / home-1024-dark.png  (tablet)
- home-390-light.png  / home-390-dark.png   (mobile: single column, members/covers 2-up,
  eras single-column, rail stacked below the document)
Capture harness: apps/quiz/scripts/proof-v3home-capture.mjs.

## DELIVERABLE 2 - the persistent foldable LEFT NAV + on-this-page TOC (commit 2)
New in apps/quiz/src/app/verse/[slug]/layout.tsx: a left sidebar (VerseSideNav) added to the
verse-scope, replacing the old horizontal ReaderMenu (.vnav) on every verse page. Structure:
- brand (-> /verse) + a collapse control + the BTS space chip.
- "Navigate": the getNavMenu space nav (Music > Discography/Songs/Eras, Members, Shows >
  Tours/TV, Fandom > ARMY/BU, About > Company/Awards/Records), rendered as CRAWLABLE nested
  <a> inside native <details> groups - reusing ReaderMenu's ref->href (page -> /verse/{space}/
  {slug}). Verified in the served HTML: 5 section rows + 10 real <a> sub-links, zero client JS.
  Each top section carries a stroke icon (shown in the collapsed rail).
- a divider, then "On this page": VerseTocSpy, a 'use client' component that scans the page's
  [data-toc] sections (SSR'd by the home center: Overview / Members / Discography / The story
  so far / Community & Play), builds the same-page anchor list, and highlights the active
  section with an IntersectionObserver. This is the ONLY client JS. It self-hides on pages with
  no [data-toc] sections (SSR renders null, so no hydration mismatch).
Fold behaviour - PURE CSS, driven by two sibling checkboxes (#v-nav-collapse / #v-nav-drawer):
- >= 1200px: OPEN (244px, labels + TOC). The collapse control folds it to a 64px ICON RAIL
  (glyph flips); hovering the rail PEEKS it back as a floating overlay (a 76px gutter stays
  reserved, so the reading cluster never reflows).
- 560-1199px: starts as the static icon rail.
- < 560px: an off-canvas DRAWER opened by a top-bar hamburger, over a scrim (tap to close).
- prefers-reduced-motion disables the width/transform transitions; the collapse checkbox has a
  focus-visible ring; every control has an aria-label. The 1120 cluster stays centered in
  .v-navmain, so the left nav lives in the gutter and never stretches the reading measure.
Files: apps/quiz/src/components/verse/tree/side-nav.tsx (+ toc-spy.tsx), layout.tsx, globals.css.

## SCREENSHOTS (docs/proofs/v3home/) - add the nav fold states
- nav-1440-open-light.png / nav-1440-open-dark.png  (sidebar OPEN, both themes)
- nav-1440-rail-light.png                            (desktop ICON RAIL, collapse checked)
- nav-1024-rail-light.png                            (tablet auto icon-rail)
- nav-390-drawer-light.png                           (mobile DRAWER open over the scrim)
Capture harness: apps/quiz/scripts/proof-v3nav-capture.mjs.

## GATES (commit 2)
tsc 0; next build PASS ("Compiled successfully"); no new console/hydration errors. Nav links
are SSR/crawlable; the scroll-spy is the only client JS. Nothing pushed.

## DONE
All four deliverables shipped across two commits on main; nothing pushed (owner pushes).
