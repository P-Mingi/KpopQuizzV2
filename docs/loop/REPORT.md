# REPORT - Verse iter-8: finish micro-fixes (hero clearance, hide button, mobile globals) + footer gap

Small surgical mission on top of iter-7 (ab84416 + the hero-overlap follow-up 06f3cc4). Scope /verse
only; tsc 0; route + verse-token gates green; `next build` green. Light + dark. Nothing pushed.
The prototype (prototypes/verse-nav-notion.html) stayed authoritative for placement.

## FIX A - hero title clipped under the fixed top bar
The compact page hero (`.verse-hero`) started flush at the bar's bottom (y=52), so the title sat only
~18px under the 52px bar - visibly tight. Gave the compact hero band the same breathing room the home
cover already has: `margin-top: 1.5rem` (was 0). The title now clears the bar by ~44px on content
pages. The home masthead uses `.vh2-home`/`.vh2-cover` (not `.verse-hero`) and already cleared the bar
by 24px, so it is unaffected. Checked home + content, open + hidden, light + dark.

## FIX B - the HIDE button seated inside the space header row
The header markup was already `[chip][name+meta][hide]` (matching the prototype), but its padding was
too tight (`4px 6px 8px 8px`), jamming the hide button into the sidebar's top-right corner where the
grey panel meets the hero - which read as a floating notch on the edge. Matched the prototype's
generous padding (`12px 6px 10px 6px`, the inner already adds 8px sides), so the button now sits
cleanly inside the row, right-aligned and vertically centred on the chip. No notch element existed in
the code; the fix was purely the spacing. The floating REOPEN tab was left untouched.

## FIX C - mobile drawer global section (Fandoms / Community / theme)
The condensed mobile top bar drops Fandoms + Community + the theme toggle, and the drawer was
space-only, so those were unreachable on mobile. Added a compact global section at the BOTTOM of the
sidebar (side-nav.tsx): a thin divider, then a Fandoms row (`/verse`), a Community row
(`/verse/community`), and a Theme row carrying the ThemeToggle. It is `display:none` on desktop and
revealed only inside the off-canvas drawer (`@media max-width:767px`); the desktop sidebar stays
space-only. Links are crawlable `<a>`.

## EXTRA - the "space between content and footer" you flagged
Root cause: iter-7 left `min-height: 100vh` on `.v-navshell` (a FIX1 remnant). The site already pins
the footer via a ROOT sticky footer (`main.flex-1` inside a `min-h-screen` column), so the extra
`100vh` STACKED a second viewport under the content and shoved the footer up to a full screen below it
(measured 465px of empty band on a page shorter than the viewport). Replaced it: verse `main` is now a
flex column and the page + shell grow to fill exactly the space the sticky footer already reserves
(`main:has(.verse-page){display:flex;flex-direction:column}`, `.verse-page{flex:1 0 auto;...}`,
`.v-navshell{flex:1 0 auto}`). Result on every page: the footer sits directly under the content, the
grey sidebar still runs to it, the body's cream never shows below it. At a normal viewport the gap is
0; only when content is far shorter than the viewport does the standard (white, footer-at-bottom)
sticky-footer space remain. Not in the mission scope but it was the same FIX1 CSS, so folded in here.

## VERIFY (proofs in docs/proofs/iter8-finish/, real headless Chrome)
1. Desktop content page, hero title clears the bar + hide button seated in the header row:
   `01-desktop-content-hero-header-light.png`, `02-...-dark.png`. Home: `03-desktop-home-hero-light.png`.
2. Mobile 390 drawer with the global section (Fandoms / Community / theme) at the bottom:
   `04-mobile-drawer-global-light.png`, `05-...-dark.png`.
3. Footer: short page - footer pinned under the content, grey sidebar reaching it, no double-count
   band, no cream: `06-footer-short-page-light.png`. (Numbers: at viewport 1600 the gap dropped from
   465px to the standard sticky-footer space with the footer AT the screen bottom; at a normal
   viewport the content-to-footer gap is 0.)
Capture harness: `apps/quiz/scripts/proof-iter8-capture.mjs`. (The harness toggles the theme class
post-render, so the dark shots restyle the top bar/hero but not every launch-time token - true dark
was confirmed live via localStorage + reload; the fixes are token-based and theme-agnostic.)

## NOTES
- The two pre-existing site-wide console errors (theme launch-script / hydration, reproduce on Play)
  are unchanged and out of scope.
- tsc 0; check:routes (353) and check:verse-tokens (no raw hex) green; `next build` green. Nothing
  pushed; Cowork reviews the diff.
