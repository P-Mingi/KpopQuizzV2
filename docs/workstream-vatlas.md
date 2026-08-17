# V-ATLAS - the fandom's universe, visible

## Claude Code Implementation Prompt

---

Per VERSE-V4-DIRECTIVES.md (V-ATLAS) and the owner-approved prototypes
(2026-08-01): the constellation map + the HYBRID motion model. The mental
model is law: the whole fandom IS the wiki; every page is a node of one
graph; the Atlas is how you SEE it. Owner decisions locked: the tab is
renamed ATLAS (page title "The {fandom} atlas"); readers get the clean
published-only map; Build mode reveals dashed WANTED nodes with
tap-to-create; motion = stable precomputed positions + soft settle
animation on load + grab-and-nudge with spring-back (reduced-motion gets
the instant static map).

Hard rules: NO em dashes. Commit per step, do NOT push. NO new deps (the
hybrid simulation is hand-rolled; the in-chat demo proved ~80 lines
suffices). No migrations expected: the graph derives from
verse_page_links + entity relations already stored; STOP if schema
appears needed. Dual-skill design. Play triple-proof. Widget duality law
(mini-map home widget). SEO: the Index view's crawlable HTML list is the
content; the map is enhancement on top: prove the page serves the full
list without JS.

## The model

- ONE GRAPH: nodes = entity pages (idols, albums, songs, eras, tours,
  concerts...) + wiki pages + tools; edges = entity relations + the
  links ledger (mentions, More-about-this, parent/child).
- NEIGHBORHOOD SCOPING: never render the whole graph. The map shows one
  hub's neighborhood (30-60 nodes max: the hub, its children, one ring
  of context). Clicking a hub TRAVELS (the neighborhood re-centers, a
  breadcrumb trail records the journey). The space home hub is the
  default center.
- LAYOUT: server-computed radial positions per neighborhood (deterministic:
  same map every visit, learnable). The client settle/nudge physics
  never changes the resting positions.
- READERS: published nodes only, complete-feeling constellation. BUILD
  MODE: dashed wanted nodes (from the wanted ledger) appear, tap opens
  create-page with the slug prefilled (contributor+; the red-link law
  holds: no dead affordances for anyone else).
- SEARCH: the atlas header carries the space's deep search (entity-aware
  autocomplete over every published page: "dallas 2017" finds the
  concert page). Same search component as V-HOME, space-scoped.
- MAP / INDEX toggle: Index = the existing wiki index upgraded (faceted,
  counts, the accessible + crawlable path). One page, two views, URL
  stays /verse/{group}/wiki (no URL churn; titles/breadcrumbs say
  Atlas).

## Steps

1. GRAPH SERVICE: one server module computing a neighborhood (nodes,
   edges, positions) from existing data; deterministic layout; unit
   tests on a fixture graph + the real BTS graph (counts sanity).
   Commit.
2. THE MAP: SVG render on the V-DESIGN system (violet hubs, surface
   nodes, dashed wanted in Build mode), the hybrid motion (settle +
   nudge + spring-back, hand-rolled, reduced-motion static), node click
   = navigate, hub click = travel + breadcrumb, keyboard: nodes are
   focusable links in a sane order, travel announced. Commit.
3. THE PAGE: Atlas tab (rename in nav config + templates), header with
   search + Map/Index toggle + honest counts ("1,432 pages · 12
   wanted" - wanted count visible in Build mode only), Index view =
   upgraded wiki index (crawlable HTML always served; map hydrates on
   top). Prove JS-off serves the full index. Commit.
4. BUILD MODE LAYER: wanted nodes from the ledger, tap-to-create with
   prefilled slug (contributor+), the wanted count chip, quest-board
   cross-link ("12 pages wanted" -> quests). Commit.
5. THE MINI-MAP WIDGET: the home-page widget (duality): a small static
   neighborhood render (no physics) + "explore the atlas" + counts,
   min-gated below 10 published pages. Commit.
6. STOP: owner review. Matrix: the map on the real BTS graph (reader +
   Build mode), a travel sequence (3 hops with breadcrumbs), search
   finding a deep page, Index view, the mini-map on the space home,
   mobile (touch nudge + scroll coexisting), 3 breakpoints x
   light/dark + reduced-motion shot.
7. Closing sweep after approval: dual-skill audit, a11y (keyboard
   travel, announced moves, Index parity), SEO (JS-off proof, titles,
   sitemap unchanged), perf (neighborhood payload budget, no layout
   thrash), gate suites, Play triple-proof, full build, em-dash grep,
   check:routes. Commit.

## Verify

- [ ] Deterministic: two loads = identical resting positions (probe)
- [ ] Neighborhood cap holds on the densest hub (Music: 214 tracks ->
      sampled ring + "all 214" exit, never 214 nodes)
- [ ] Readers never see wanted nodes or create affordances (role probe);
      Build mode tap-to-create prefills correctly
- [ ] JS-off: full crawlable index served; map is pure enhancement
- [ ] Keyboard-only: reach any node, travel hubs, hear announcements
- [ ] Touch: nudge works, page scroll not hijacked
- [ ] Reduced-motion: static map, zero animation (probe)
- [ ] Mini-map min-gates; widget identity distinct
- [ ] Suites green; Play triple-proof; tsc/build/routes green; zero em
      dashes; NO new deps; zero migrations

/caveman report per step; step 6 is the owner gate.
