# V-BUILDER-3 - BLOCK EDITORS (owner directives D1 + D2, L-046/L-047)

## Claude Code Implementation Prompt

Read VERSE-BUILDER-BLUEPRINT.md + docs/VERSE-V6-DIRECTIVES.md first.
Naming: V-BUILDER-3 = per-block CONTENT editors (this doc). The grid /
patterns / entity pages = V-BUILDER-4 (blueprint Phase 3), later.
Deferred items from docs/vbuilder2-deferred.md tagged V-BUILDER-3 land
in their matching steps below; width/span tags move to V-BUILDER-4.

Goal: every block becomes editable in DEPTH from the builder: a
CONTENT tab beside Style, one editor per BlockSpec, defined as data.
"Recreate every existing component from scratch in the editor."

Hard rules: all standing laws (verse-laws), loop contract, proofs as
files, commit-not-push, no new deps (hand-rolled first), migrations
owner-run via docs/pending-migrations/, prototype-first: any step
marked [CO-DESIGN] must NOT build UI until the ledger records the
lock; if the lock is missing, write BLOCKED.md and stop that step.

IMAGE LAW for this workstream (owner ruling L-047): any image source
allowed BUT always ingest-COPIED into our storage (never hotlink),
post-hoc moderation queue with one-click takedown, DMCA page +
process. Owner runs any SQL.

## Steps

1. EDITOR SCHEMA FOUNDATION (invisible, start now). BlockSpec gains
   editorSchema: typed field defs (text, richtext, image, url, link,
   entityRef, enum, number, date, list-of-{...} for repeatable rows).
   Author schemas for wave 1: hero/identity, vitals bar, members,
   image, youtube embed, data (In Numbers), timeline, quote, doorway.
   COMPONENT INVENTORY deliverable: docs/vbuilder3-block-inventory.md
   naming EVERY visible component on a space (including vitals bar,
   discography teaser, all zone widgets) -> block name -> editorSchema
   status. Validator extended to clamp content payloads per schema
   (human sentences). No UI. Proofs: schema completeness vs registry,
   validator gates, published byte-identical. Commit.
2. CONTENT TAB PLUMBING [CO-DESIGN 7 lock required for the UI]. The
   right panel becomes two tabs: Contenu | Style. Contenu renders
   generic field editors from editorSchema (text input, enum select,
   list rows with add/remove/reorder, entity picker), optimistic +
   validated save through the draft rail, per-field revert on 422.
   Proofs: 3 different specs render exactly their schema, hostile
   payload clamped + reverted, published byte-identical. Commit.
3. IMAGE RAIL (L-047). Reuse/extend the existing upload storage
   (sticker rail) for block images: upload from computer + paste a
   URL (server fetches and COPIES, rejects >N MB, strips EXIF,
   dedupes by hash); GIF ok. Moderation queue: if a new table is
   required, WRITE THE SQL to docs/pending-migrations/ and STOP for
   the owner run (BLOCKED.md), then continue: queue lists every new
   image, one-click hide/remove; /dmca page + contact path linked in
   the footer. Proofs: ingest-copy proven (no external URL in
   rendered HTML), queue works, takedown works, privacy fail-closed.
4. MEMBERS EDITOR, the flagship [CO-DESIGN 8 lock required]. Per
   member row: photo (image rail), name, link; reorder rows; add
   member -> AUTO-CREATES the member page (existing entity rails) and
   links it, link editable afterwards; remove = detach not delete
   (entity survives, real-data law). Proofs: full CRUD round-trip,
   auto-page created + navigable, reorder ids stable, published
   parity (indexable set = the members' names + links, unchanged
   shape). Commit.
5. HERO/IDENTITY EDITOR [same CO-DESIGN 8 lock]. Banner image input,
   space profile picture, editable header fields (display name,
   tagline); data-driven chips (member count, fandom name) get
   per-field override with reset-to-data. Vitals bar chips editable
   per item. Proofs: image rail path, overrides round-trip, one-H1 +
   hero semantics unchanged, SEO parity. Commit.
6. EDITORS WAVE 2. Image block (caption, alt REQUIRED, link, size
   step within column), youtube embed (paste URL -> official-embed
   click-to-load facade, title fetched honestly), text/H2 options
   (size step, weight, token color: reuse marks pipeline; fonts stay
   the theme's: no free font field, token law), data block (label +
   value + source per row, honest zeros law), timeline (era rows:
   date, title, text, image), quote (text, author, source). Inline
   text extended to the remaining text-capable blocks (deferred item:
   SECTION_FOR generalized). doorwayFormat per-door editor (deferred
   item). Library hint copy pass per data source (deferred item).
   Proofs per editor: round-trip, clamps, published parity. Commit
   per coherent chunk.
7. STICKERS [CO-DESIGN 9 lock required]. The micro-lattice system
   (L-047 Q2): per-block decorative layer on a fine square lattice
   (sticker = NxN cells, drag on desktop, tap-to-place on phone),
   caps per block + per page, aria-hidden decorative, NEVER in
   reading order, zero indexable impact (parity proof), reuses the
   existing sticker packs + upload policy. Commit.
8. STOP: OWNER GATE. Full matrix: all step proofs + SEO parity +
   Play triple-proof + suites + build + em-dash + routes + a11y pass
   on all new editor UI + owner walkthrough (edit every wave-1 block
   end to end, desktop + phone). 
9. Closing sweep after approval: gates on final HEAD, deferred
   handoff to V-BUILDER-4, task board DONE, memory/ledger update.

## Verify

- [ ] Every registry block has an editorSchema or a dated deferral
- [ ] Content edits: optimistic + validated + reconcile, ids stable
- [ ] No external image URL ever rendered; queue + DMCA live
- [ ] Auto-created member pages real + sourced (real-data law)
- [ ] Stickers: zero SEO/a11y footprint, caps enforced
- [ ] All co-design locks recorded in the ledger BEFORE their UI
- [ ] No new deps; migrations only via pending-migrations owner runs
- [ ] Play triple-proof; all suites green; published parity per step

/caveman report per step via docs/loop/REPORT.md. Step 8 = owner
gate. This phase turns the canvas into a true website builder.
