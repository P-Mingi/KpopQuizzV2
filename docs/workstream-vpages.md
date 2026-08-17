# V-PAGES - the rabbit hole: custom pages with kinds

## Claude Code Implementation Prompt

---

V3 step 3b, the biggest content-model addition since W1. Read FIRST and
fully: VERSE-PAGES-UNIVERSE.md Parts 2 + 4 (the model and the Palworld
teardown), VERSE-APPLICATION-BLUEPRINT.md sections 1-5 + 9 (the concrete
K-pop application: page inventory, index system, leaf anatomies, tools,
editorial kinds). Those documents ARE the requirements; this prompt is the
build order. Owner decisions locked 2026-07-30: contributor+ creates
DRAFTS, curator publishes (visitors/members use the suggest queue);
images = text-first v1 (official links + click-to-load embeds only, NO
uploads on pages; fan-own-item photos wait for W5.4).

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps (the
block editor, checklist machinery, revisions, discussions, quality engine
all exist; this workstream WIRES, it does not reinvent). ONE migration,
owner-run, stop-and-wait. Living-persons structural exclusions apply to
every kind that can reference an idol. Publish gate + min-gate + sitemap
thin-page protection per the universe doc. Dual-skill design on reader
and creator surfaces. Play byte-untouched.

## The architecture (locked, from the docs)

- KIND REGISTRY as per-verse CONFIG (the V3 law: niche-agnostic core +
  kpop config). v1 kpop kinds: song-story, mv, choreography, item,
  lightstick, concert, comeback, episode, culture-guide, glossary-entry,
  faq, ranked, general. Each kind defines: mini-infobox fields (typed,
  fact fields carry per-field source requirement), suggested section
  scaffold, badge rules (fan-written for culture kinds; methodology
  REQUIRED for ranked, enforced by the form), related-exit rules.
- URLs: /verse/{group}/wiki/{slug}, FLAT slugs unique per space; nesting
  = parent_page + breadcrumbs, never URL depth. Renames create redirects
  (reuse the alias machinery pattern).
- Draft -> review -> published lifecycle on the existing revisions +
  suggest-queue rails; attribution "started by X, maintained by N fans".
- Structure templates gate which kinds are enabled per space (Starter:
  core few; Encyclopedia: all). Kind enablement lives in presentation
  config; the registry itself is code-config.

## Steps

1. MIGRATION (the one): verse_pages (id, space/group ref, kind, slug,
   title, parent_page_id nullable, infobox jsonb, status draft/review/
   published, created_by, timestamps) + any linkage the quality engine
   needs. Design against the docs, keep it minimal, CHECK prod for next
   free number. STOP, owner runs.
2. KIND REGISTRY + validation: config-driven kinds per above; server-side
   validation (unknown kind rejected, fact-fields-without-source rejected,
   ranked-without-methodology rejected, living-persons exclusions
   structural in every idol-capable kind). Unit-prove each gate. Commit.
3. READER SURFACE: the wiki leaf template on the V-DESIGN system per the
   blueprint anatomies (infobox, sections with V-TEXT folding, trust
   footer with last-edited + history + discussion + attribution,
   provenance lines, related exits: curated 6-8 + one index link, NO
   category walls). Breadcrumbs. "Fan-written" badge on culture kinds.
   Commit.
4. THE RABBIT-HOLE WIRING: hover-preview on ALL internal links (extend
   the mention-chip system); "More about this" zones on entity pages
   listing attached custom pages (album -> its versions/MV/choreo pages);
   @-mention of a nonexistent page offers "create this page" (the
   red-link moment, contributor+ only, creates a draft); what-links-here
   feeds the quality engine; wanted pages surface on the quest board.
   Commit.
5. CREATOR SURFACE: "New page" from the space (contributor+), kind picker
   (with honest descriptions), scaffolded editor (existing TipTap +
   infobox forms per kind), draft autosave, submit-for-review, curator
   review queue integration (batch where minor), publish writes revision +
   sitemap inclusion only at published + non-stub. Commit.
6. INDEXES: /wiki index per space (all published pages, faceted by kind,
   live counts, search-within, jump chips per the Palworld patterns) +
   /songs Song Deck + /content router per the blueprint section 2 (these
   read existing entity data; counts-in-titles only where genuinely
   complete). Commit.
7. GO-DEEPER INTEGRATION: the space home explore grid + nav tab
   eligibility (wiki index as a composable tab), template bundles updated
   (Encyclopedia enables all kinds + wiki tab by default). Commit.
8. SEED THE PROOF: as the owner/system account, author 3-5 REAL exemplar
   pages on the founding spaces (e.g. the ARMY Bomb lightstick page from
   the W-SEED sourced entry, one song-story, one glossary entry, one
   culture guide) following every rule (sources on facts, fan-written
   badges, no images). These are the template pages recruits will imitate.
   STOP: owner reviews the exemplars + the full flow screenshots.
9. CLOSING SWEEP after approval: dual-skill audit both surfaces; a11y
   (creator flow keyboard-complete); SEO (leaf JSON-LD Article + breadcrumb
   LD, sitemap correctness incl. stub exclusion proven); living-persons
   gate exercises per kind; SEO parity + Play byte-diff; full build;
   em-dash grep; check:routes. Commit.

## Permitted loops (per LOOP-CHARTER)

BUILD-VERIFY-FIX per step · GOAL tsc + full build + check:routes + the
step's gate tests green · MAX 8 · STOP IF second migration / policy
ambiguity (any living-persons or licensing edge not covered by the docs =
stop and ask, never guess).

## Verify (workstream end)

- [ ] Full journey: contributor drafts a lightstick page -> curator
      reviews -> publishes -> page live with trust footer + attribution ->
      appears in wiki index, "More about this", search, sitemap
- [ ] Draft/stub pages: publicly unreachable, sitemap-excluded (probe)
- [ ] Every kind gate proven: fact-without-source rejected,
      ranked-without-methodology rejected, culture badge renders,
      living-persons exclusions hold per kind
- [ ] Red-link flow: mention nonexistent -> create draft (contributor+);
      visitors see plain text, never a dead affordance
- [ ] Hover previews on internal links; "More about this" on entity pages
      both directions
- [ ] No image upload path exists on pages (grep + UI proof); official
      embeds click-to-load only
- [ ] Rename -> redirect works; no orphaned URLs (what-links-here clean)
- [ ] Exemplar pages approved by owner; every rule visible in them
- [ ] tsc, full build, check:routes green; zero em dashes; no new deps;
      Play byte-untouched; migration budget: exactly one, spent at step 1

/caveman report per step; step 1 STOP (migration), step 8 STOP (owner
reviews exemplars + flow). This is the feature the whole rabbit hole
stands on: thoroughness beats speed, and the docs beat improvisation.
