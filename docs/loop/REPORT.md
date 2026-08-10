# REPORT - Verse iter-6 polish: sidebar full-height, auto-fold + persistence, mobile + white footer

Scope kept to /verse (layout, side-nav, globals.css, the two global mobile chrome gates, the Verse
footer). Play byte-identical off /verse. tsc 0; next build green. Light + dark both checked. No
cream on any verse surface. Nothing pushed; Cowork reviews the diff.

## FIX 1 - the nav column runs the full page height (measured, not eyeballed)
Symptom reproduced and measured BEFORE: a 32px white strip above the sidebar (it started at y=32,
not y=0) and a constant 64px dead band between the sidebar bottom and the footer; on a short page
(/verse/bts/jamais-vu, doc height 1100) the grey column stopped at y=741, well short of the footer.
Cause: the shell's vertical padding (verse-page py-8 = 32px top + 32px bottom, plus main's md:pb-8)
sat outside the flex row, and the row's height was driven purely by the content.
Fix (desktop): zero the shell's vertical padding (the hero band is full-bleed by design, so flush
to the top is correct) and give the flex row `min-height: 100vh` with `align-items: stretch`.

| Page | sidebar top | gap to footer | before |
|---|---|---|---|
| /verse/bts (home) | 0 | 0 | 32 / 64 |
| /verse/bts/jamais-vu (short) | 0 | 0 | 32 / 64 |
| /verse/bts/love-yourself | 0 | 0 | 32 / 64 |

Proof: after/short-page-sidebar-to-footer.png - the grey rail runs from the top edge down to the
footer with no dead band, on a page whose article is only a few paragraphs.

## FIX 2 - per-route fold default + persistent manual override
The fold is no longer a bare checkbox with no memory. Base style is OPEN; the RAIL applies under
exactly two mutually exclusive conditions, so no rule has to undo another:
- no saved preference AND not the space home -> content pages fold by default (the home is
  identified by `.vh2-home`, which only the portal home renders);
- saved preference is 'rail' -> wins on every route, home included.
`data-verse-nav` is stamped on `<html>` before first paint by a blocking script in the verse world
layout, reading the `verse_nav` cookie; the toggle (a small client button) writes that cookie and
sets the attribute so the choice survives navigation.

Verified with a scripted run (scripts/proof-iter6-nav-state-verify.mjs):

| Step | Result |
|---|---|
| /verse/bts, no cookie | OPEN, sidebar 250px, content starts x=290 |
| /verse/bts/jamais-vu, no cookie | RAIL, sidebar 60px, content starts x=100 |
| /verse/bts/love-yourself, no cookie | RAIL, content x=100 |
| click expand on a content page | OPEN, cookie written (data-verse-nav="open") |
| navigate to another content page | STILL OPEN (preference survived navigation) |
| fold again, then open the home | RAIL on the home too (the saved choice wins) |

Content width on a folded content page: the reading column starts at x=100 instead of x=290, so the
article is visibly wider and centred rather than shoved right.

### One deliberate deviation, flagged for the owner
The mission specified reading the cookie server-side in the /verse layout. I did NOT do that:
`cookies()` is a Next Dynamic API and using it in that layout opts EVERY Verse reader page out of
static/ISR rendering, which contradicts the repo's ISR law and would undercut the SEO batch this
work is meant to ship with. The blocking-script route gives the same user-visible result (state
applied before first paint, no flash) while keeping the pages static. Say the word if you want the
server-read version anyway and I will switch it, accepting the dynamic-rendering cost.

## PART D - mobile nav + footer
- D1: the global Play mobile chrome is now fully hidden on /verse. The mobile top bar was already
  gated (iteration 2); the bottom tab bar (mobile-tab-bar.tsx) is now gated the same way. Play keeps
  both everywhere else (verified: the Play home still ships its top nav and tab bar).
  The Verse's own mobile bar was rebuilt as ONE clean bar: full-bleed, sticky (a wiki page is long,
  so the nav has to stay reachable), white ground with a hairline, hamburger opening the grey drawer
  over a scrim. The "half-broken/overlapping" symptom was the global bottom tab bar sitting on top
  of the Verse chrome; with it gone and the bar made full-bleed the overlap is resolved.
- D2: the Verse footer is WHITE (#FFFFFF light / #1E1E1E dark), not cream. It renders in the ROOT
  layout, outside the `.verse-v2` token scope, so an inline `var(--v2-content)` would not have
  resolved; the colour is set from a `.verse-footer` rule in globals.css instead. Measured
  footerBg after the change: rgb(255, 255, 255) on every verse page checked.

## CRAWLABILITY + SCOPE
Both fold states stay server-rendered on a content page whose default is the rail: 10 crawlable
`v-side-link` sub-links and 30 rail icon links in the served HTML; only CSS chooses which shows.
The obsolete `#v-nav-collapse` checkbox is gone; the mobile drawer keeps its pure-CSS checkbox.
Play off /verse: top nav present, tab bar present, zero verse sidenav leak.

## FILES
- apps/quiz/src/styles/globals.css (full-height row, fold defaults + cookie override, mobile top
  bar, white footer, focus rings on the new buttons)
- apps/quiz/src/components/verse/tree/nav-toggle.tsx (NEW client toggle: cookie + data attribute)
- apps/quiz/src/components/verse/tree/side-nav.tsx (uses the toggle)
- apps/quiz/src/app/verse/layout.tsx (no-flash blocking script)
- apps/quiz/src/app/verse/[slug]/layout.tsx (dropped the collapse checkbox)
- apps/quiz/src/components/layout/mobile-tab-bar.tsx (verse gate)
- apps/quiz/src/components/verse/verse-footer.tsx (.verse-footer class, inline bg removed)

## SCREENSHOTS (docs/proofs/iter6-polish/)
before/short-era-page.png, before/mobile-390.png (the 32px strip, the 64px gap, the cream footer,
the global bottom tab bar) versus after/short-page-sidebar-to-footer.png,
after/content-page-folded-wide.png, after/home-open.png, after/content-page-folded-dark.png,
after/mobile-390-closed.png, after/mobile-390-dark.png, after/mobile-390-drawer.png.

## GATES
tsc 0; next build PASS. Nothing pushed.
