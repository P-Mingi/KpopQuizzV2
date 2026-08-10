# REPORT - Verse iter-7: Notion-style nav (global top bar + space-only sidebar + FULL hide)

Built to the VALIDATED prototype `prototypes/verse-nav-notion.html` (owner approved as-is; where prose
and prototype disagreed, the prototype won). This REPLACES the iter-6 FIX2 icon-rail pattern: the rail
is gone entirely. Kept FIX1 (full-height nav column, no dead band) and PART D's white footer, adapted
to the new structure. Scope /verse only; Play byte-identical off /verse. tsc 0; route + verse-token
gates green; `next build` green. Light + dark both checked. No cream on any verse surface. Nothing
pushed; Cowork reviews the diff.

## A - the global TOP BAR (new, /verse only)
New component `components/verse/tree/verse-topbar.tsx`: a discreet fixed 52px bar (hairline bottom
border, `--v2-content` background at 88% + `blur(10px)`), rendered once in `verse/[slug]/layout.tsx`.
It carries every global control that used to live in the sidebar:
- Left: the REAL KpopVerse logo (`VerseLogo` -> `OrbitLockup`, never an invented mark) + a thin
  divider + Fandoms + Community as quiet text links (crawlable `<a>`).
- Center: the Verse search field (recessed `--v2-nav`, hairline, "Search the Verse").
- Right: the pink Play pill (`WorldToggle`, the one primary CTA), the theme toggle, the profile/avatar
  (`TopNavProfile`, sign-in aware).
The shell offsets content below the bar (`.v-navshell { padding-top: 52px }`, sticky inner scroller at
`top: 52px`), so there is no overlap and no layout shift. The bar is `.verse-page`-scoped; Play chrome
elsewhere is untouched.

## B - the LEFT sidebar becomes SPACE-ONLY
`components/verse/tree/side-nav.tsx` rewritten. Removed every global row (logo, Play, Fandoms/Community,
search, theme, profile - all now in the top bar). What remains, per the prototype:
- Space header row: chip + name + a small meta line (`ARMY - 3rd Gen - 7 members`) + the HIDE button
  (chevron-to-edge icon).
- Space home / Browse everything rows.
- NAVIGATE label + the section accordions (Music / Members / Shows / Fandom / About): collapsible,
  auto-open the current section, crawlable links (unchanged behaviour from iter-6).
Grey `--v2-nav` panel, hairline right border, full height to the footer.

## C - FULL HIDE, no icon rail
The HIDE button collapses the sidebar to width 0 (`flex-basis:0; width:0; opacity:0; pointer-events:none`;
`.v-side-rail` and all its CSS deleted). Content then reads full width, centered (the 1120 reading
cluster re-centers in the now-full `.v-navmain`). A floating REOPEN tab (chevron-right in a raised
bordered square) appears top-left under the top bar and restores it. Smooth width/margin transition
(`cubic-bezier(.22,.61,.36,1)`).
PERSISTENCE reuses the iter-6 `verse_nav` cookie machinery, values now `open|hidden`: the blocking
inline script in `verse/layout.tsx` stamps `data-verse-nav` pre-paint (no flash, pages stay static/ISR);
`nav-toggle.tsx` writes the cookie + attribute on click. Defaults with NO cookie: space home -> open;
any deeper content page -> hidden (pure CSS: `html:not([data-verse-nav]) .verse-page:not(:has(.vh2-home))`).
A manual toggle wins on every route after that. Both DOM states stay server-rendered; CSS hides, never
removes - so the nav links are crawlable in both states.

## D - MOBILE
The top bar condenses (<768): the Fandoms/Community links, the wide search field, and the theme toggle
drop out, leaving logo + search icon + Play + a hamburger (+ Sign in for auth). The hamburger opens the
space sidebar as an off-canvas drawer (grey 288px panel, scrim, slide-in, scrim-to-close) via the same
pure-CSS checkbox. Still NO global Play tab bar / mobile top bar on /verse. Footer stays white.

## FIX 1 preserved (measured, not eyeballed)
On a short page (`/verse/bts/tv-index`, doc height 1114, viewport 820): the fixed top bar sits at y=0
(52px); the sidebar and the content BOTH start at y=52 (flush under the bar, no dead band above); the
grey sidebar's bottom = the footer's top = y=820 (gap 0, no dead band below); footer background is pure
white `rgb(255,255,255)`. `.v-navshell { min-height:100vh; align-items:stretch }` drives the full-height
column.

## VERIFY (proofs in docs/proofs/iter7-notion-nav/, real headless Chrome, light + dark)
1. Desktop content page, top bar + space sidebar, accordion auto-open + active section:
   `01-desktop-content-open-light.png` (light), `06-desktop-content-open-dark.png` (dark).
2. FULL HIDE -> width 0 + floating reopen tab + content centered:
   `02-desktop-content-hidden-light.png`, `07-desktop-content-hidden-dark.png`. Reopen restores it
   (verified: setting the attribute back to `open` returns the panel to 264px, reopen tab hides).
3. No-cookie defaults: space home OPEN (`03-desktop-home-default-open-light.png`) vs a deeper content
   page HIDDEN (`04-desktop-content-default-hidden-light.png`). Manual toggle writes cookie=open +
   `data-verse-nav=open` and persists (verified live).
4. FIX1 intact on a short page - grey sidebar runs full height to the white footer, no dead band above
   or below: `05-desktop-short-fix1-footer-light.png` (+ the numeric measurements above).
5. Mobile 390: condensed top bar (`08-mobile-topbar-light.png`, `10-mobile-topbar-dark.png`), hamburger
   drawer (`09-mobile-drawer-open-light.png`), no Play bottom bar, white footer.
6. Crawl check (SSR HTML of the hidden-by-default `/verse/bts/discography-index`): the `v-sidenav`
   aside, the "Navigate" accordion, all section sub-links (discography/eras/members/tours/fandom/big-hit)
   and 10 `v-side-link`s are all in the server HTML with NO forced `data-verse-nav` - CSS alone hides
   the visible panel. Verified by curl.

Capture harness: `apps/quiz/scripts/proof-iter7-capture.mjs` (headless Chrome over --remote-debugging-pipe;
the browser pane misrenders fixed elements + 1280 emulation).

## DEVIATIONS (flagged)
- MOBILE theme toggle hidden. The mission/prototype specify the condensed mobile bar as
  "logo + search icon + Play + hamburger". The prototype has no mobile media query, so Part D prose
  governs. Keeping theme + profile + Sign in all in a 390px bar clipped "Sign in". I dropped the theme
  toggle on mobile (theme is launch-time via `themeScheme`, so losing its live toggle there costs
  nothing) and kept Sign in (auth is essential). Owner can restore it.
- Content measure stays 1120, not the prototype's 760. Our content pages carry rails/grids (the home is
  3-column) that need the wider cluster; the prototype's 760 is a single prose column. "Full width,
  centered" is honoured - the 1120 cluster centers in the full viewport when the sidebar is hidden.
- Cookie machinery (not server-side cookies()) reused verbatim from iter-6 FIX2, for the same reason:
  cookies() is a Dynamic API and would opt every Verse reader page out of static/ISR.

## NOTES
- Two console errors ("script tag while rendering", "Hydration failed") are PRE-EXISTING and site-wide:
  they reproduce identically on Play pages (`/quizzes`) that never touch the verse layout or the nav
  script. They stem from the site's launch-time theme script + hydration pattern (reskin v2), not from
  iter-7. Left untouched (out of scope).
- Deleted all retired rail + global-chrome CSS (`.v-side-rail`, `.v-railbtn*`, `.v-rail-*`, `.v-side-top`,
  `.v-side-chip*`, `.v-side-cta`, `.v-side-search*`, `.v-side-theme*`, `.v-side-profile*`,
  `.v-navtopbar*`); no orphan class references remain in src.
- SEO articles commit (4bc1f02) untouched. No SQL/migrations run. Nothing pushed.
