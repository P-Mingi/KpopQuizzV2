# V-ESSAYS-MAX - the fan blog platform

## Claude Code Implementation Prompt

---

Per VERSE-V4-DIRECTIVES.md (V-ESSAYS-MAX) and the owner-approved magazine
mock (2026-08-01): featured editorial hero, series shelves, latest rows,
member-gated write CTA. Essays become a first-class publishing platform:
organized, social, profile-logged, curator-moderated. W4.12 law stands:
reviewed and featured by curators, NOT free blogs.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps. ONE
migration budget (series/organization + any reaction storage, fold it
all), owner-run, stop-and-wait. No user-facing AI. Banned-terms + flags +
review rails apply. Dual-skill design. Play triple-proof. Editor parity
law (author tools + curator tools ship together). Widget duality law
(featured-essay widget for the space home + the full magazine index).

## Steps

1. MIGRATION (the one): essay series (id, group, title, slug, created_by,
   ordering) + essay-to-series linkage + essay metadata the index needs
   (featured flag if not already present, cover config jsonb). Reactions:
   REUSE the existing vote/like machinery if a rail fits; if reactions
   need storage, fold into this migration (justify either way). CHECK
   prod for next free number. STOP, owner runs.
2. THE MAGAZINE INDEX per the approved mock: featured hero (editorial
   serif-voice title treatment on the V-DESIGN system, dek, author +
   role badge, reading time, comment count), series shelves with counts,
   latest rows, the write CTA (member-gated per V-MODES; logged-out sees
   the sign-in path, never dead). Min-gates: featured hides without a
   curator pick; series shelf hides below 1 series. Commit.
3. THE ESSAY PAGE on the editorial standard: cover block, display title,
   author card (role badge, profile link), reading time, auto-TOC past 3
   sections, pull-quote block, the fold system, per-essay discussion
   (existing rails) below, reactions (counts only, real users), related
   essays (same series first). Article JSON-LD, indexable when published.
   Commit.
4. THE WRITING TOOL upgrades (parity: author-facing): long-form editor
   with cover picker (policy-legal imagery only: existing entity/space
   assets, no uploads), pull-quote + divider + registry widget blocks
   INSIDE essay bodies (same constrained registry, no raw HTML), chapter
   headings feeding the TOC, series picker (join an existing series or
   propose a new one: curator approves new series), autosave + drafts +
   the existing review flow. Commit.
5. CURATOR SIDE: feature/unfeature (one featured per space at a time),
   series management (create/rename/order, approve proposed), review
   queue integration, unpublish with reason (logged). Commit.
6. PROFILE + WIDGETS: essays list on the author's profile (feeds
   V-PROFILE-ONE; count + latest titles), the featured-essay home widget
   (duality: its own identity, min-gated). Commit.
7. STOP: owner review. Matrix: magazine index (empty / 1 essay / rich),
   essay page (short + long w/ TOC), the writing flow (draft -> submit ->
   review -> publish -> featured), series shelf, profile list, home
   widget. 3 breakpoints x light/dark.
8. Closing sweep after approval: dual-skill audit, a11y (TOC + reactions
   + editor keyboard), SEO (Article LD, series pages, sitemap), gate
   suites, Play triple-proof, full build, em-dash grep, check:routes.
   Commit.

## Verify

- [ ] Full journey: member writes -> curator reviews -> publish ->
      featured -> home widget shows it -> profile logs it
- [ ] Series: create, assign, reorder; new-series proposal needs curator
      approval; empty series impossible to publish visibly
- [ ] Reactions: real users only, counts only, no self-inflation (one
      per user proven)
- [ ] No image-upload path in covers (policy assets only, grep + UI)
- [ ] Widget blocks inside essays render from the registry only; raw
      HTML impossible (gate test)
- [ ] Unpublish logs reason; banned-terms + flags fire on essay bodies
- [ ] Min-gates: featured/series/index all hide honestly when empty
- [ ] Suites green; Play triple-proof; tsc/build/routes green; zero em
      dashes; no new deps; exactly one migration, spent at step 1

/caveman report per step; step 1 STOP (migration), step 7 STOP (owner).
