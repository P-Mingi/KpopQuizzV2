# REPORT - v3 BTS/Verse home (editorial center + white ground + 1120 width)

Presentation rebuild over existing reads. Covenant kept: no fabricated content; the
Overview lede is derived from DB facts only. Nothing pushed to git. Play/quiz untouched.

## STATUS
- Deliverable 1 (editorial CENTER rebuild): DONE + verified.
- Deliverable 3 (pure-white ground): DONE + verified.
- Deliverable 4 (1120 width cluster): DONE + verified.
- Deliverable 2 (persistent foldable LEFT NAV + on-this-page TOC): NOT STARTED (next step).

This commit = the center + ground + width (a coherent, shippable step). The left nav is
a self-contained layout addition committed next.

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

## NEXT
Deliverable 2: the persistent foldable LEFT NAV (space nav from getNavMenu as crawlable
nested <a>) + on-this-page TOC with an IntersectionObserver scroll-spy, in
apps/quiz/src/app/verse/[slug]/layout.tsx, with the >=1200 open / icon-rail+peek / <560 drawer
fold behaviour. The horizontal .vnav then moves into that sidebar.
