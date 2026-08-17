# V-REPAIR - the real debt pass

## Claude Code Implementation Prompt

---

Owner-approved 2026-08-01, after V-HARMONY-1. Pay down the accumulated
real debt surfaced by QA-PRELAUNCH-V2 and the workstream closes. This is
a FIX pass: enumerate honestly, fix mechanically, prove each. Launch-facing
first. When a fix needs a migration, a policy call, or real judgment: STOP
and report, do not decide.

Hard rules: NO em dashes. Commit per fix (fix: ...), do NOT push. No new
deps. NO migration expected (STOP if one appears). Play triple-proof
(head byte-diff + layout probe + screenshot) every sweep. Real data only.
Min-gate + no-dead-affordance laws hold.

## Sweep A - ISR page-defining reads that swallow errors (launch-facing first)

The class that has baked a lie into an hour-long cache 3+ times (404'd
song, empty awards, empty deck, the QA getSceneEntity fix). A
page-defining server read on an ISR/static Verse route that fails-soft on
a transient DB error bakes a degraded/wrong page as truth until the next
revalidate.

1. ENUMERATE every server read on every ISR/static Verse route
   (getSpace, quests, directory, awards, deck, profile, atlas graph,
   entity pages, wiki, essays, threads, collections, timeline...). For
   each, classify: PAGE-DEFINING (its loss changes what the page claims:
   must THROW on query error) vs COSMETIC (its loss only drops a
   thumbnail/nice-to-have: may warn + degrade). Produce the table.
2. FIX: page-defining reads throw on error; cosmetic reads warn. Order
   the fixes LAUNCH-FACING first (routes real launch visitors hit: the 3
   launch spaces + showcases, entity/song/wiki/album pages, space homes),
   then internal/admin.
3. PROVE: for a sample of fixed reads, simulate a query error and confirm
   the route throws to the error boundary instead of rendering a degraded
   page. Commit per batch.

## Sweep B - 1000-row PostgREST caps

An unscoped .in()/.select() over a table that grows unboundedly
(verse_content, verse_page_links, verse_discussions, game_plays, others)
silently drops rows past 1000, so counts under-count and content vanishes
at random once the table grows. The quest-board fix (scope by entity ids)
is the pattern.

1. ENUMERATE every read that could exceed 1000 rows: grep unscoped
   .in()/.select() over the unbounded tables. Named suspects from QA:
   the monthly-pulse fandom-of-month aggregation (top priority),
   admin charts, backlinks/what-links-here, any heatmap.
2. FIX each: scope by known id-set (the getEras/quest pattern), paginate,
   or aggregate server-side, so no read depends on the 1000-row window.
3. PROVE: for the named ones, show the read returns correct totals past a
   simulated/real 1000-row condition (or explain why the table cannot
   reach 1000 and is therefore safe). Commit per fix.

## Sweep C - the deferred audit items (from the workstream closes + QA)

Each is small; fix + prove:
1. In-editor link preview styles every link as verse-cite even for
   INTERNAL hrefs (published output is already correct; the EDITOR
   preview is wrong). Internal = chip style, external = cite style, in
   the editor preview too.
2. Section-surface role microcopy renders as unboxed text (box-law
   ruling). RULING (owner, apply it): role microcopy is a QUIET UNBOXED
   helper line, consistent everywhere (never a boxed card). Make it so.
3. Editor toolbars role=group with all-tab-stops where a roving-tabindex
   toolbar is the richer a11y pattern: convert any remaining editor
   toolbar to roving-tabindex (confirm which still need it).
4. The first-edit tour's document-level Escape listener can steal an
   Escape aimed at an open mention popup: scope the tour Escape so an
   open popup gets it first.
5. Profile legacy-section fail-open nuance (QA post-launch note):
   re-audit the legacy profile sections' visibility read; a failed read
   must default PRIVATE (fail-closed), same law as the resume band.
   Prove.
6. 404 / error pages branded at all breakpoints, both worlds (QA sweep 1
   remainder): verify + fix any unbranded/broken breakpoint.
7. Dev-login 404 in the production build: re-prove all login variants
   404 in a prod build (QA sweep 1 remainder).

## Not in scope (report, do not touch)

- Migration numbering gaps/dupes: cosmetic history, renumbering is
  dangerous. Document the true applied sequence; change nothing.
- The /pt/leaderboard fabricated users: owner-owned decision, standing
  covenant tension, NOT this pass. Leave as-is; it is on the pre-push
  ledger.
- Anything needing a migration or a new policy call: STOP and report.

## Permitted loops (per LOOP-CHARTER)

BUILD-VERIFY-FIX / QA-SWEEP class: enumerate, fix mechanical failures,
re-prove · MAX 6 per sweep · STOP IF a fix needs migration / policy /
judgment / design. REPORT iterations per sweep.

## Verify (exit bar)

- [ ] Sweep A: the full page-defining-vs-cosmetic table delivered; every
      launch-facing page-defining read throws on error (sample proven);
      cosmetic reads degrade gracefully
- [ ] Sweep B: every >1000-row-capable read scoped/paginated or proven
      safe; the named suspects fixed with totals proven
- [ ] Sweep C: all 7 items fixed + proven (or the ones needing judgment
      stopped-and-reported)
- [ ] Play triple-proof holds; tsc, full build, check:routes, token gate
      all green; zero em dashes; no new deps; no migration
- [ ] Fix-commit list small + labeled fix:; nothing non-mechanical
      slipped in

/caveman report per sweep: the enumeration tables (A + B), fixes made
with commits, the fail-closed proofs, exceptions stopped-and-reported.
This is debt paydown: thoroughness over speed, and STOP on any ambiguity.
