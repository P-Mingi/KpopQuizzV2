# REPORT - iteration 2: consolidate the Verse nav into ONE left sidebar + use the real logo

Targeted corrections on top of the shipped v3 nav (no redesign). Scoped to the Verse; the Play
app outside /verse renders identically. tsc 0; next build passes. Nothing pushed (owner pushes).

## STATUS - all three fixes DONE + verified
- FIX 1 (one nav: hide the global top bar on /verse, move its controls into the sidebar top): DONE.
- FIX 2 (complete the left nav: chip, Space home, Browse everything, full Navigate tree, TOC): DONE.
- FIX 3 (real KpopVerse logo, never a fabricated letter-mark): DONE.

## FIX 1 - ONE nav
- The global top bar is hidden on /verse (not removed for Play):
  - `top-nav-bar.tsx`: `if (worldForPath(pathname) === 'verse') return null;` (desktop TopNav).
  - `mobile-top-bar.tsx`: same guard (mobile top bar). Verified: /verse/bts serves ZERO `.top-nav`
    headers; the Play home (/) still serves its top nav and has NO `.v-sidenav` leak.
- The top bar's GLOBAL controls now live at the TOP of VerseSideNav (side-nav.tsx), reusing the
  existing components (no reimplementation, same hrefs/handlers):
  the real KpopVerse logo, `WorldToggle` (Play door), `TopNavLinks world="verse"` (Fandoms +
  Community), a Search link (/verse?search=1), `ThemeToggle`, and `TopNavProfile`.
- Top-to-bottom in the rail now: [KpopVerse logo] -> Play / Fandoms / Community (+ search, theme,
  profile) -> space chip (BTS) -> Space home / Browse everything -> NAVIGATE (Music > Discography/
  Songs/Eras, Members, Shows > Tours/TV, Fandom > ARMY/BU, About > Company/Awards/Records) ->
  divider -> ON THIS PAGE (scroll-spy TOC).
- The icon-rail / hover-peek / mobile drawer behaviour is preserved. The folded rail shows sensible
  icons for the global links too (Fandoms, Community, search, theme) plus the space-nav icons; the
  two text-only controls (the Play world-door, the profile pill) fold away and return on peek/open/
  drawer. (WorldToggle carries inline `display`, so the rail hides it with `display:none !important`.)
  Verified via computed styles: rail width 66px, WorldToggle display:none, zero overflowing children.

## FIX 2 - complete the left nav
Present and correct: the space chip (BTS), Space home (/verse/bts) and Browse everything (/verse),
the full NAVIGATE tree with every nav_menus section + children (5 sections + 10 real crawlable
sub-links in the served HTML), the divider, and the ON THIS PAGE scroll-spy TOC. The gap the owner
flagged (the missing global links up top) is filled by FIX 1.

## FIX 3 - the real logo
The fabricated letter-mark ("V" tile) is gone. The sidebar brand is the app's real Verse brand:
`<VerseLogo />` (the OrbitLockup - the KpopVerse orbit mark from public/verse/brand/logo-192.png +
the "KpopVerse" wordmark), linking to /verse; the collapsed rail shows `<OrbitMark />` (the same
real mark). No invented or generated logo anywhere.

## GUARDRAILS MET
- Play outside /verse byte-identical (top nav intact, no sidebar leak; verified by curl).
- Real crawlable <a> nav links; aria-labels on the collapse/drawer/search controls; reduced-motion
  honoured; white ground via --v2-paper (global --bg untouched); 1120 content cluster unchanged.
- The relocated top-bar islands (WorldToggle/TopNavLinks/ThemeToggle/TopNavProfile) keep their own
  hrefs + handlers + auth fetch; --world-accent is set to --v2-accent on the sidebar so they tint.
- tsc 0; `next build` PASS ("Compiled successfully"). Nothing pushed.

## FILES
- apps/quiz/src/components/verse/tree/side-nav.tsx  (global chrome relocated in; real logo)
- apps/quiz/src/components/layout/top-nav-bar.tsx    (hide desktop top nav on /verse)
- apps/quiz/src/components/layout/mobile-top-bar.tsx (hide mobile top bar on /verse)
- apps/quiz/src/styles/globals.css                  (sidebar top-chrome CSS + rail :not(:hover) folds)

## SCREENSHOTS (docs/proofs/v3home/)
- nav-1440-open-light.png / nav-1440-open-dark.png  (ONE nav, real logo, global chrome up top)
- nav-1440-rail-light.png                            (icon rail: global + space icons, no overflow)
- nav-1024-rail-light.png                            (tablet auto rail)
- nav-390-drawer-light.png                           (mobile drawer: full consolidated nav + scrim)

## NOTE (not an owner-blocking ambiguity)
The mobile bottom tab bar (MobileTabBar) is a separate global element and was left intact - the
mission scoped FIX 1 to the "global TOP navbar". Say the word to also fold it on /verse.
