# VERSE ROADMAP V2 - the beat-fandom.com plan

Supersedes VERSE-ROADMAP.md phases W3+. Absorbs the full fandom.com platform
teardown (owner-approved, 2026-07-28). W0, W1, W2, W2.x = DONE. No user-facing
AI anywhere (owner decision). All house rules apply to every step.

## Named strategic systems (born from the teardown)

- **SPACE QUEST BOARD:** the wiki that shows its own gaps as playable quests.
  Computed wanted-list per space (missing era stories, albums without notes,
  idols without lore, orphaned pages) rendered as XP-earning tasks. Fandom
  grows on guilt; Verse grows on progression.
- **COMPUTED QUALITY:** stub tags, coverage scores, wanted pages all derive
  from the typed schema automatically. Their maintenance culture = our
  background job.
- **SPACE INSIGHTS:** per-space analytics dashboard for curators (views,
  plays, joins, top pages, their contribution impact). Nobody quits a
  dashboard that shows their numbers going up.

## W3 - THE EDITOR (best-in-category target)

- W3.1 Revision model: revisions table, edit summaries, minor-edit flag,
  author, timestamps. (migration, owner-run)
- W3.2 Block editor core: TipTap, schema-constrained blocks, live preview,
  autosave drafts, edit-conflict handling.
- W3.3 Entity-aware editing: @-mention any idol/album/era with hover preview
  cards; widget blocks (discography embed, stats block, native quiz embed);
  citation helper (paste URL -> formatted source).
- W3.4 Typed infobox editing: field forms, sources required, living-persons
  enforcement structural.
- W3.5 Reading + editing structure: auto-TOC on long pages, section-level
  editing, per-section anchors.
- W3.6 History: full-page history, visual diffs, single-revision undo,
  rollback.
- W3.7 Suggest-an-edit + review queue v1 (summaries enable batch-approve of
  minor edits).
- W3.8 Protection: curator-lockable pages/sections (comeback-week fact locks).

## W3K - KNOWLEDGE EXPANSION (entity breadth = search domination)

- W3K.1 Era system: era entities (name, period, concept, relations),
  auto-scaffold from release clusters, curator narration shells. (migration)
- W3K.2 Timeline v2: era-driven storytelling pages, era color-coding.
- W3K.3 New entity types: tours/concerts, awards (show+category+year+result),
  TV/variety appearances, OST credits. (migration) Wikidata coverage probe
  FIRST per type (W0 pattern: verify before schema).
- W3K.4 New entity pages: /verse/{group}/awards, /tours, /appearances -
  programmatic, sourced, min-gated. Hundreds of new search entry points.
- W3K.5 Aliases + redirects: name variants (hangul, romanizations, old names)
  301/alias to canonical pages. Search capture from data we already hold.
- W3K.6 Disambiguation pages where real collisions exist.
- W3K.7 Tag/category system: typed tags, auto-index pages, min-gated against
  thin-page bloat.
- W3K.8 Related-graph footer: auto-generated navbox equivalent from entity
  relations, every page, both directions verified.
- W3K.9 Discovery: entity-aware search autocomplete, trending pages (real
  views/plays), random page, what-links-here + orphan detection (internal,
  feeds quest board).
- W3K.10 Computed quality engine: coverage score per page, stub markers,
  wanted-list generation (the quest board's data source).

## W4 - COLLABORATION (gated on recruited curators)

- W4.1 Roles migration: Visitor->Member->Contributor->Curator->SpaceAdmin.
- W4.2 Join flow + passport membership badges + member directory.
- W4.3 Curator tools: approve/reject (batch for minor), feature/pin, theme
  editor, masthead, page protection, block-from-space.
- W4.4 SPACE QUEST BOARD: computed tasks -> XP -> contributor progression.
  The centerpiece.
- W4.5 Reputation: editor XP in existing spine, contributor badges, edit
  streaks, per-space contributor ranks, contribution graphs.
- W4.6 Per-page discussions + watchlists (follow page -> notification on
  change) + recent-changes feed (editors).
- W4.7 SPACE INSIGHTS dashboard for curators.
- W4.8 Abuse controls: rate limits, banned-terms, trust-tier gating,
  patrol queue.
- W4.9 Charters + role decay + owner-as-arbiter.
- W4.10 Recruitment kit + founding-curator onboarding (owner-led outreach).
- W4.11 Stage B/C switches per space.
- W4.12 Fan features: curated member essays per space (moderated, featured
  by curators; NOT free blogs).

## W5 - COLLECTIONS + MEDIA

- W5.1 Photocard database schema (curator-entered). (migration)
- W5.2 Personal checklists + passport integration + collection badges.
- W5.3 Merch + lightstick galleries (strict-legal images).
- W5.4 Fan-upload media policy decision (full risk brief -> owner call).

## W6 - LATER (explicitly parked)

PT/i18n for Verse content · mobile apps · Stage C free editing everywhere ·
solo-artist spaces · any user-facing AI (owner: no) · marketplace (never).

## Sequencing law

W3 -> W3K can interleave (editor and entities are parallel tracks). W4 opens
ONLY with real curators. Every phase independently shippable. Migrations
owner-run. Design surfaces get prototype-first treatment with the owner.
