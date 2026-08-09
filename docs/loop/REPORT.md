# REPORT - iteration 4: polish the OPEN sidebar (reformat global block + collapsible NAVIGATE)

Two OPEN-sidebar refinements on top of the in-flow rebuild. Scoped to /verse; Play untouched.
tsc 0; next build green. Iteration 3 not regressed (in-flow, uniform 60px rail, real logo,
breadcrumb = space name). Nothing pushed.

## FIX 1 - the folded-in global controls are now ONE sidebar system
Before, the top block mixed three UIs (top-nav underline-TABS for Fandoms/Community, bordered
pills for Search/Sign-in, the pink Play pill). Now a single tidy stack:
- KEPT: the real KpopVerse logo (top-left) + the collapse chevron (top-right); the Play pink
  CTA pill (it is the jump to the game and should stand out) - now full-width in .v-side-cta.
- Fandoms / Community: normal sidebar NAV ROWS (icon + label, the same .v-side-row style as
  Space home / Members). The top-nav tab markup (top-nav-links.tsx) is no longer used in the
  sidebar (verified: 0 `top-nav-tabs` in the served HTML). Active = the shared accent pill/tint.
- Search: a clean soft-filled FIELD row (wash bg, search icon, muted label) with the theme
  toggle as a small 38px icon control aligned on the same row (.v-side-searchrow).
- Sign in / profile: a clean full-width ROW (the reused TopNavProfile keeps its hrefs/auth
  fetch; its inline pill chrome is overridden to a plain sidebar row).
Only presentation changed - every control reuses the existing component hrefs/handlers.

## FIX 2 - NAVIGATE sections are collapsible accordions
`NavAccordion` (a client island; usePathname works in SSR too, so links render crawlable with
the right state - no flash). Each parent with children (Music, Shows, Fandom, About) is a native
`<details>` toggle with a right-side chevron that rotates; Members (no children) stays a plain row.
- COLLAPSED by default. AUTO-EXPANDS the section that contains the current page (verified:
  /verse/bts/discography-index opens Music with Discography marked active; the home /verse/bts
  shows every section collapsed).
- Crawlable: every child `<a>` stays in the DOM even when collapsed (10 `v-side-link` anchors in
  the served HTML regardless of open state) - `<details>` hides visually, never removes.
- Native `<details>` toggling (click the parent) - no JS beyond computing the initial open state.
  Subtle eased reveal on expand; prefers-reduced-motion disables it.

## FILES
- apps/quiz/src/components/verse/tree/side-nav.tsx        (restructured OPEN column)
- apps/quiz/src/components/verse/tree/side-nav-rows.tsx   (NEW client: GlobalNavRows + NavAccordion)
- apps/quiz/src/components/verse/tree/side-nav-icons.tsx  (NEW shared: icons + href helpers)
- apps/quiz/src/styles/globals.css                        (global-block reformat + accordion/active CSS)

## SCREENSHOTS (docs/proofs/v3nav-iter4/)
- open-accordion-collapsed.png : reformatted global block; NAVIGATE collapsed by default.
- open-accordion-expanded.png  : a Music sub-page - Music auto-expanded, Discography active.
- icon-rail.png                : the 60px in-flow uniform icon rail (unchanged from iteration 3).

## GATES
tsc 0; next build PASS. Play outside /verse byte-identical. Nothing pushed.
