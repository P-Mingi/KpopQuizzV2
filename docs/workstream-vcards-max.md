# V-CARDS-MAX - the photocard binder + collectible shelf (flagship tools)

## Claude Code Implementation Prompt

---

Per VERSE-V4-DIRECTIVES.md Part 2 (V-CARDS-MAX) and the owner-approved
binder prototype (2026-07-31). This is a specialized-platform
differentiator: a collector TOOL, not a checklist grid. Owner decisions
locked: full binder PRIVATE by default with an opt-in public profile
SHELF (top 3-5 showcase); per-card community counts PUBLIC, counts only,
min-gated below a floor; arrangement = AUTO by set out of the box with
MANUAL drag-arrange on top (the arrangement is part of the expression).

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps. ONE
migration budget (binder layout + shelf + theme storage), owner-run,
stop-and-wait. NO market prices, NO trading/marketplace (standing:
never), NO card-image uploads (text-first until W5.4; the typographic
card faces from the prototype are the design: photocard ratio 5.5:8.5,
owned solid, wanted dashed ghost, set gaps visible). Dual-skill design.
Play triple-proof. Editor parity law: curators manage the catalog, fans
manage their binder, both surfaces ship together. Widget duality law:
binder page + space-home widget, collectible shelf page + widget, each
with its own visual identity.

## The two identities

- PHOTOCARDS = THE BINDER: pages and pockets, the real-binder mental
  model. Auto-organized by set/album; drag to rearrange pockets and
  pages; completion rings per set; the gap in a set stays visible.
- COLLECTIBLES = THE SHELF: lightsticks, albums, merch standing on a
  displayed shelf (its own metaphor and look, NOT a second binder).
  Same own/want machinery, shelf arrangement, typographic-object faces
  (lightstick silhouette drawn as house SVG per generation where the
  catalog names it).

## Steps

1. MIGRATION (the one): binder/shelf layout storage (arrangement,
   page/pocket positions), binder theme choice, profile shelf selection
   + visibility opt-in. Design minimal against existing 136/138 tables
   (photocard_collection/collectible_collection stay the own/want
   truth). CHECK prod for the next free number. STOP, owner runs.
2. THE BINDER PAGE (reader = owner of the binder): auto-by-set pocket
   grid at photocard ratio, owned/wanted/gap states per the prototype,
   pages with honest pagination, completion rings per set + space
   totals, keyboard + touch drag (a11y: reorder announced, buttons as
   fallback for drag), mobile 2x3 pockets. Commit.
3. CARD DETAIL PAGES: /verse/{group}/photocards/{card}: set context,
   sourced catalog facts (orbit chip), community counts ("N fans own it,
   N want it", min-gated floor 5, counts only), own/want actions,
   related exits (set, album, member). Indexable when sourced + catalog
   published; binder views stay auth-private. Commit.
4. BINDER THEMES + SHELF: themes on the preset machinery (Classic,
   Neon, Soft, Scrapbook: Scrapbook unlocks sticker slots inside the
   binder via the existing sticker system); the profile SHELF: pick
   top 3-5 cards, opt-in public toggle (default OFF), renders on the
   profile (feeds V-PROFILE-ONE later). Commit.
5. THE COLLECTIBLE SHELF: the shelf page + object faces + own/want +
   arrangement, its own identity per above. Commit.
6. CURATOR SIDE (parity, same workstream): catalog management surface
   in Build mode: add/edit sets and cards with per-field sources
   (official listings), the same validation gates as everywhere
   (fact-without-source rejected), review flow for contributor
   submissions to the catalog. Commit.
7. WIDGETS (duality): the binder widget (my completion + next wanted
   card) and shelf widget for the space home registry; each visually
   distinct per the identity law. Commit.
8. STOP: owner review. Screenshot matrix: the binder (empty newcomer /
   mid-collection / complete set), drag on desktop + touch, card page,
   themes incl. Scrapbook with stickers, the shelf, curator catalog
   surface, widgets on a space home. 3 breakpoints x light/dark.
9. Closing sweep after approval: dual-skill audit, a11y (drag
   alternatives, rings labeled), SEO (card pages indexable, binder
   noindex/auth, sitemap correct), gate suites, Play triple-proof,
   full build, em-dash grep, check:routes. Commit.

## Verify

- [ ] Binder: auto-by-set correct from zero effort; manual arrangement
      persists and survives reload; drag has keyboard fallback
- [ ] Privacy: binder unreachable logged-out and by other users; shelf
      appears ONLY after explicit opt-in; default OFF proven
- [ ] Counts: real aggregates, floor honored, no names leaked anywhere
- [ ] No price, no trade, no upload path exists (grep + UI proof)
- [ ] Curator catalog: source-gated writes, contributor submissions
      flow through review; parity surfaces shipped together
- [ ] Widgets registered, distinct, min-gated (hide at 0 catalog)
- [ ] Card pages: sourced facts + orbit chips; indexable; binder private
- [ ] Suites green; Play triple-proof; tsc/build/routes green; zero em
      dashes; no new deps; exactly one migration, spent at step 1

/caveman report per step; step 1 STOP (migration), step 8 STOP (owner).
