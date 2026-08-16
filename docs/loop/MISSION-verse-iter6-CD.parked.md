# MISSION (iteration 6, continued) — PART A done; now B (index), C (templates), D (mobile + footer)

PART A (shell: grey/white separation + light top block + full-bleed) is DONE and accepted. Continue
with B, C, D in order, build + VERIFY each with screenshots, report per part. Scope /verse only; Play
untouched. tsc 0 + build green. Nothing pushed. Light + dark both correct. No cream anywhere.

IMPORTANT: the specs below are AUTHORITATIVE — build directly from them, do NOT block waiting for the
prototype HTML. (Reference only, if present: prototypes/verse-child-templates.html, verse-sidebar-v2.html.)

## PART B — INDEX / auto-list pages redesigned (no more empty boxes)
Every auto-listing index (Members, Discography, Songs, Eras, Tours, TV & Variety, Fandom, BTS Universe,
Awards, Browse everything):
- Under the H1, a short INTRO line (1 sentence: what this index is) + keep the "auto index · N pages" chips.
- Replace the plain box grid with RICH CARDS. Each card (a crawlable <a>):
  * a cover/thumb slot (left), the title, and a mono meta line (release: "2020 · Album"; member: "IDOL /
    role"; era: the years; track: the album). DB-derived meta only, never fabricate.
  * on HOVER: the card lifts (translateY -3px + soft shadow), a one-line description/stat reveals
    (max-height 0 -> auto transition), and a right-aligned "->" arrow fades in. On mobile the meta is
    always visible (no hover), tap = navigate.
  * on the grey/white system: cards are white with a hairline; hover shadow is the lifted state.
- 2-up grid desktop, 1-up mobile. Even 4/8px rhythm.
Verify B: Discography + Members indexes, a hover state captured, light + dark.

## PART C — PER-TYPE page templates (distinct skeleton per page.type)
Branch the tree render on page.type (page.tsx + document-page.tsx). Reuse existing data; never fabricate.
- release: cover hero + fact rail (release date · type · track count · era link) + Overview + a real
  TRACKLIST (numbered, from album_tracks for that album, each track linked to its track page; mark the
  lead single).
- track: compact — a small "on <album> · <date>" strip + Overview + credits-if-present + related.
- era: chapter band + Overview + a "Releases in this chapter" COVER GRID (the era's albums, linked) +
  previous / next chapter nav.
- tour / show: fact rail (tour: years · cities · attendance; show: years · seasons) + Overview.
- award: the data template shell — stat tiles + a sortable year/category/result TABLE (no rows yet; do
  not invent awards).
- member (idol): keep the current photo + fact rail + solo-work structure; inherit the new shell/tokens.
- BU pages (parent bu-index): a violet "lore" accent (--v2-bu #6D4AA6) on eyebrow + links only; same
  white system otherwise.
Verify C: a release (tracklist), an era (cover grid + prev/next), a member, a BU page — light + dark.

## PART D — MOBILE nav + footer (owner-flagged)
D1. On /verse MOBILE, the global Play-app mobile chrome must NOT show: HIDE the global bottom tab bar
    (mobile-tab-bar.tsx) and the global mobile top bar (mobile-top-bar.tsx) on /verse routes only (Play
    keeps them everywhere else). The Verse's OWN nav is the answer on mobile: a clean top bar with the
    hamburger (folded button) that opens the NEW sidebar as an off-canvas DRAWER (grey panel, scrim,
    slide-in, swipe/scrim to close). No bottom tab bar on the Verse. Fix the current hamburger/top-bar
    DISPLAY BUG (it renders half-broken / overlapping in the screenshots) — a single clean verse top bar.
D2. FOOTER: the verse sourcing footer background must be WHITE (--v2-content), not cream. No cream on any
    verse surface, footer included.
Verify D: /verse mobile at 390px — one clean verse top bar + hamburger, NO bottom tab bar, the drawer
opens the new grey sidebar with scrim; and the footer is white. Light + dark.

## GUARDRAILS
Scope strictly to /verse; Play app byte-identical off /verse. Keep in-flow sidebar + accordions + real
logo + crawlable <a> nav + the grey/white separation from Part A. tsc 0 + full build green. Report to
docs/loop/REPORT.md with screenshots per part; BLOCKED.md only for a genuine owner-decision (NOT for the
prototype file — specs above are authoritative). Nothing pushed.
