# MISSION (Verse iter-7) — Notion-style nav: global TOP BAR + space-only sidebar + FULL hide

VALIDATED prototype: prototypes/verse-nav-notion.html (in the repo — open it, light + dark, and the
hide/reopen interaction). The owner approved it EXACTLY as-is, content styling included. Build to the
prototype; where prose below and prototype disagree, THE PROTOTYPE WINS.

Context: iter-6 polish shipped (877d9a9: full-height nav column FIX1, cookie fold FIX2, mobile drawer
+ white footer PART D). SEO articles fix shipped (4bc1f02) — do NOT touch it. This mission REPLACES
the FIX2 rail pattern: the icon rail DISAPPEARS entirely. Keep FIX1's full-height/no-gap behaviour and
PART D's mobile drawer + white footer, adapted to the new structure.
Scope /verse ONLY; Play byte-identical off /verse. tsc 0 + next build green. Light + dark. No cream.
Nothing pushed. REPORT with screenshots; Cowork reviews the diff; owner holds the push gate.

## A — GLOBAL TOP BAR (new, /verse only)
A discreet fixed top bar (~52px, hairline bottom border, content bg with slight blur), replacing ALL
global rows currently living in the sidebar:
- Left: real KpopVerse logo (Mascot/Logo component — NEVER an invented mark) + thin divider + Fandoms
  + Community as quiet text links.
- Center: the Verse search field (recessed --v2-nav bg, hairline, placeholder "Search the Verse", ⌘K hint).
- Right: the pink Play pill (kept as the ONE primary CTA), theme toggle, profile/avatar (sign-in state aware).
- The bar is /verse-scoped: Play app chrome elsewhere is untouched.
- Crawlable <a> links; the shell offsets content below the bar (no overlap, no layout shift).

## B — LEFT SIDEBAR becomes SPACE-ONLY
Remove every global row from VerseSideNav (logo row, Play pill, Fandoms/Community rows, search row,
theme, profile — they all moved to the top bar). What remains, per the prototype:
- Space header row: space chip + name + small meta line + the HIDE button (chevron-to-edge icon).
- Space home / Browse everything rows.
- NAVIGATE label + the section accordions (Music/Members/Shows/Fandom/About) exactly as today
  (collapsible, auto-open current section, crawlable links).
- Grey --v2-nav panel, hairline right border, full height down to the footer (keep FIX1: flex row
  min-height 100vh, align-items stretch, sticky inner scroller under the top bar).

## C — FULL HIDE, no icon rail (Notion behaviour)
- The HIDE button collapses the sidebar to width 0 (fully hidden — NO 60px icon rail; delete/retire the
  .v-side-rail state). Content then reads full width, centered.
- When hidden, a small floating REOPEN tab appears top-left under the top bar (chevron-right in a raised
  bordered square, as in the prototype). Clicking it restores the sidebar. Smooth width/margin transition.
- PERSISTENCE: reuse the existing verse_nav cookie machinery from iter-6 FIX2 (blocking script stamps the
  attribute pre-paint, no flash). Values become open|hidden. Defaults when NO cookie: space HOME -> open;
  any deeper content page -> hidden. A manual toggle writes the cookie and wins everywhere after that.
- Crawlability: the sidebar nav links must remain in the SSR HTML in both states (CSS hides, never removes).

## D — MOBILE adaptation
Keep PART D's model, adapted: the global top bar condenses on mobile (logo + search icon + Play + a
hamburger). The hamburger opens the space sidebar as the off-canvas drawer (grey panel, scrim, slide-in,
swipe/scrim to close). Still NO global Play tab bar / mobile top bar on /verse. Footer stays white.

## VERIFY (screenshots per item, light + dark)
1. Desktop content page: top bar + sidebar visible, matches the prototype (spacing, fonts, hairlines).
2. Hide the sidebar -> width 0, reopen tab appears, content full width; reopen restores it.
3. No-cookie defaults: space home open, era/member page hidden; manual choice persists across navigations.
4. FIX1 intact: no dead band above the sidebar or before the footer on a short page.
5. Mobile 390px: condensed top bar + hamburger drawer, no Play chrome, white footer.
6. Crawl check: sidebar links present in SSR HTML when hidden.

## GUARDRAILS
/verse only (top bar component, side-nav, layout, globals.css, middleware only if needed). Play
byte-identical off /verse. Real logo only. tsc 0 + full build green. REPORT to docs/loop/REPORT.md +
ledger entry appended to docs/VERSE-LEDGER.md. BLOCKED.md only for a real owner decision. Nothing pushed.
