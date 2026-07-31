# V-PAGES app-layer requirements (owner-logged at step 1, 2026-07-31)

Binding on steps 2 and 5. These are behavior rules the schema deliberately does
not encode; the implementations in this directory must satisfy both, with tests.

## 1. Alias vs live-slug collision (step 2 validation + step 5 create/rename)

The LIVE page always wins. Concretely:
- Page CREATE with slug S: if a verse_page_aliases row (group, S) exists, the
  alias row is DELETED in the same operation (the new live page claims the URL;
  no redirect may shadow or race a live page).
- Page RENAME from A to B: writes alias (group, A) -> page, and DELETES any
  alias row (group, B). Renaming onto an existing LIVE slug B is rejected by
  the unique constraint; surface it as a validation error, never auto-suffix.
- Resolution order in the reader route: live slug first, alias second (301),
  404 last. An alias can therefore never mask a live page even if a stale row
  survives a race: the live lookup short-circuits it.
- Alias chains never form: on rename A->B where an alias (group, X) -> page
  already exists, all of the page's aliases keep pointing at the page id (id,
  not slug), so every old URL 301s directly to the current slug in one hop.

## 2. What-links-here must not leak drafts (step 4 wiring + step 5 review UI)

verse_page_links rows are written for ALL sources including draft pages (the
ledger is complete), but every PUBLIC display of the graph filters to sources
whose page status = 'published':
- The reader-facing "what links here" / related surfaces join verse_page_links
  to verse_pages on the SOURCE side and filter status='published' (entity
  sources like 'group'/'album' are inherently public and pass).
- Wanted-pages surfaces (quest board) aggregate by target_slug COUNTS only and
  must not enumerate draft source pages by title or slug.
- A draft page must never be inferable from public surfaces: not via
  what-links-here, not via wanted-page source lists, not via counts that only a
  draft could explain (when in doubt, count published sources only).
- Curator/review surfaces (service role) show the unfiltered ledger.
