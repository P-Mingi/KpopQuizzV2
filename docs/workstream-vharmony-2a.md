# V-HARMONY-2A - the infinite page loop (content-graph interconnection)

## Claude Code Implementation Prompt

---

Wave 2, dimension 1 (owner-approved 2026-08-01, prototype validated). The
whole fandom is one graph, but the graph is invisible: the nesting DATA
exists (verse_pages.parent_page_id) and is NEVER rendered, the connective
primitives are barely deployed (related-navbox on 2 pages, "More about
this" on 3, breadcrumb on 21 of 42), and only 7 of 42 page files share a
shell. This workstream makes the rabbit hole REAL: every page becomes a
doorway to more, clean at the top and infinite as you dig. Read:
VERSE-PAGES-UNIVERSE.md (Part 2b, the page model), VERSE-V4-DIRECTIVES.md
(infinite-depth law), the V-PAGES + atlas code, the V-HARMONY-1 primitives.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps.
Migration only if per-page doorway presentation truly needs storage: STOP
and ask first (prefer riding existing jsonb). Play triple-proof. The
V-HARMONY-1 primitives + token gate + min-gate + fail-closed + ISR-throw
laws all hold. SEO invariant is LAW here (see below). Dual-skill design.

## The unified page shell (the four doors)

Every reader page (all 42: entity, wiki, essay, thread, album, idol, era,
tour, show, ost, concert...) renders through ONE shell carrying four
doors, each MIN-GATED (absent when empty, never a dead door):

1. WHERE IT SITS: breadcrumb showing real depth (ARMY / Jung Kook /
   Choreography / this page), BreadcrumbList JSON-LD. Universal (fixes the
   21-of-42 gap).
2. PAGES INSIDE THIS: the children via parent_page_id, FINALLY rendered.
   This is the core unlock: a page can contain pages, and the reader can
   browse in. Includes wanted-child red-links in Build mode (create a
   child, contributor+). Render ONE level only (see the cycle guard).
3. MORE ABOUT THIS: entity + attached-page doorways from
   verse_page_links + entity relations (the song, the era, the concert,
   the member this page connects to). Universal (fixes the 3-of-42 gap).
4. WHAT LINKS HERE: the connective footer (related-navbox), pages that
   point back. Universal (fixes the 2-of-42 gap). SCOPE/paginate this
   read: a popular page can have many backlinks (the 1000-row law we just
   fixed in V-REPAIR applies).

Converge the 35 non-shell page files onto this shell (harmonization): if
a page already looks good, keep the look, adopt the shell so the doors
appear consistently.

## Doorway presentation (owner add: personalizable, not just links)

Each doorway is curator-personalizable from a small DOORWAY REGISTRY, the
same philosophy as W-CUSTOM (presentation is config, never raw HTML). Per
doorway (or per doorway-group), the curator picks a FORMAT:
- LINK (quiet inline text, the minimal),
- BUTTON (obvious, tappable),
- CARD (cover art / entity image where legal + title + one line),
- FEATURE (a big hero doorway for the one they most want clicked).
Plus per-doorway options: custom label (override the target title for
display only), an icon, ordering, show/hide. Defaults are sensible
(children = link list, key entities = card) so a curator who sets nothing
still gets a good page.

SEO INVARIANT (LAW): whatever the presentation, the crawlable HTML ALWAYS
contains the real <a href> to the target and the target's true title.
Presentation changes the skin, never the link or the indexable text.
Prove it: rich doorway config vs default config emit the same set of
hrefs + link text. This is the W-CUSTOM parity proof, applied to doors.

## Cycle + depth guards (critical: infinite is the NAVIGATION, not the render)

- Render ONE level of children per page. NEVER recursively expand the
  tree in a single render (page A -> B -> A would infinite-loop). The
  "infinite" is that each CLICK loads the next page's one level; a single
  page never renders the whole graph.
- Self-reference and cycle safe: a page listing itself, or a parent that
  is also a descendant, must not loop or duplicate. Detect and skip.
- Depth/volume caps: a page with many children shows the first N + a
  "see all" index link, never 200 inline doors. Same for what-links-here.

## Steps

1. THE SHELL + the four door components (BreadcrumbShell, PagesInside,
   MoreAboutThis, WhatLinksHere), each min-gated, on the V-DESIGN system +
   V-HARMONY-1 primitives, with the cycle/depth guards built in. Commit.
2. RENDER THE NESTING: wire parent_page_id so PagesInside shows real
   children (published only for readers; wanted red-links in Build mode);
   the wiki create/edit flow lets a contributor set a page's parent (page
   inside page). Prove a 3-level nest renders + is browsable. Commit.
3. UNIVERSAL DOORS: converge all 42 page types onto the shell so
   MoreAboutThis + WhatLinksHere + breadcrumb appear everywhere, min-gated.
   Grep-prove coverage. Commit.
4. THE DOORWAY REGISTRY: the format system (link/button/card/feature) +
   per-doorway options, curator-editable in the studio, defaults sensible.
   If per-page presentation needs storage beyond existing jsonb: STOP and
   ask before migrating. Commit.
5. STOP: owner review. Matrix: a shallow page (doors min-gate cleanly), a
   deep page (the Dallas-2017-style rabbit hole, breadcrumb 4+ deep), the
   four doorway formats, a curator setting a doorway format in the studio,
   3 breakpoints x light/dark.
6. Closing sweep after approval: SEO invariant proof (rich vs default
   doorway config emit identical hrefs + link text + breadcrumb JSON-LD);
   cycle/self-reference proven safe; what-links-here scoped (no 1000-row
   cap); a11y (doors keyboard-navigable, breadcrumb landmark); Play
   triple-proof; full build; em-dash grep; check:routes; token gate.
   Commit.

## Verify

- [ ] parent_page_id children render + are browsable; a 3-level nest works
- [ ] All 42 page types show the four doors via one shell, min-gated
      (grep coverage proof); zero dead doors
- [ ] Doorway formats (link/button/card/feature) all work + are
      curator-set; defaults sensible with zero config
- [ ] SEO invariant proven: presentation never changes the crawlable
      href or link text; BreadcrumbList JSON-LD valid
- [ ] Cycle/self-reference safe (no infinite render, no dup); one level
      per render only
- [ ] what-links-here + children scoped/paginated (no 1000-row cap, no
      200 inline doors)
- [ ] Play triple-proof; tsc/build/routes/token-gate green; zero em
      dashes; no new deps; migration only if owner-approved

/caveman report per step; step 5 is the owner gate. The infinite is in
the clicking: clean page, real doors, and the graph opens forever as you
dig.

## Deferred / future upgrades (owner ruling, step 5)

- PER-PAGE / PER-TARGET doorway overrides are DEFERRED. The doorway
  registry shipped at the space level (per door type: format + label +
  crawlable collapse), riding verse_spaces.presentation with no migration.
  Letting a curator feature ONE specific child, or reorder/label
  INDIVIDUAL backlinks, is per-page config. verse_pages has an `infobox`
  jsonb but entity pages (album/idol/tour/show/ost) have NO jsonb home, so
  per-target config would require a schema migration. Owner decision: keep
  space-level for now; revisit as a future upgrade if per-page control is
  wanted (scope the migration then). See memory: doorway-registry-presentation.
- SHOW/HIDE resolved as a crawlable COLLAPSE (native <details>): the links
  + titles stay in the HTML when collapsed (no link-removing hide - the SEO
  invariant is law). Per-door icons were not added (decorative, low value).
