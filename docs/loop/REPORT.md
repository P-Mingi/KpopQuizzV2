# /caveman report - V-BUILDER-3 step 4 (members editor): BLOCKED at the real-data / SEO gate

Step 4's flagship (the entity picker: attach-existing OR create-a-member-page in one act, plus
detach) assumes an "existing entity rail" that auto-creates member pages. That rail does not
exist for idols, and building it writes to the core, Wikidata-sourced `idols` table and changes
member-page SEO behavior - both owner-governed. I recon'd it fully and STOP for four owner
rulings. Nothing built on core data. See docs/loop/BLOCKED.md. This mirrors step 3, which
correctly blocked at the owner data gate (L-063/L-066).

## Recon (what the members roster actually is)

- The `members` block is registry-declared `dataSource: 'entity'` - "the member grid, straight
  from the entity roster." The roster = `idols WHERE group_id = space AND active` ordered by
  `ord`. It is NOT block props; props only carry order + per-row overrides (photo/name/link).
- Idol writes exist in exactly ONE place: `api/admin/verse/action` (GLOBAL ADMIN: approve
  `active:true` / clear `needs_review`, or hard-delete). No curator create/attach/detach path.
- `api/verse/entity` (the "entity rails") is SCENES only: tours / shows / ost / awards. Never
  idols. `api/verse/entities/search` is a read-only @-mention search.
- Provenance: across 30 sampled idols, every row has `wikidata_qid` + `birth_date` +
  `nationality` + `positions`. The table is a Wikidata-sourced dataset with a `needs_review`
  moderation model. A curator-authored, name-only idol is a new provenance class in it.
- `getIdol()` filters `.eq('active', true)`, so a member page 404s the instant its idol is
  `active:false`. 86 idols are already `active:false` (and already 404). "Detach leaves the
  page intact" therefore contradicts current behavior + the SEO indexable set.

## Why blocked (four owner rulings, not worker guesses)

1. Governance of curator-created CORE entities: needs_review queue vs auto-active; admin
   approval before the page is indexable; the QID-less "honest emptiness" convention. (Same
   class as the step-3 image rail, which the owner governed with a migration + a queue.)
2. Detach vs SEO: does a detached member page stay indexable (then getIdol + sitemap + the
   members minGate change), or is "page intact" the surviving row for re-attach while the page
   drops from the index?
3. "Attach existing" scope under single-FK idols (re-activate this space's own detached idol?).
4. Draft-jsonb vs immediate real-data: which ops stage in the draft (order, overrides) vs hit
   real data now (create/attach/detach), and is create gated behind publish?

If a schema touch resolves it cleanly (e.g. a curator-origin flag, or a `detached_at` that
divorces detach from the active/index flag), I will write the SQL to docs/pending-migrations/
for the owner run (law 17) - never touching the schema myself.

## What is buildable without a ruling (offered, not assumed)

The props-only slice touches NO core data and is ready to build on request: the in-panel
accordion (L-062c), reorder, and photo/name/link overrides via the step-3 image rail +
Data/Edited + "revert to data" (co-design 7), persisted in the draft jsonb, rendered through the
fail-closed gate. It does not meet step 4's headline (the picker), so it is a checkpoint, not a
close - hence I did not half-ship it under the step-4 name.

## STOP

Owner answers the four rulings (BLOCKED.md options + recommendation), then re-invoke: I build
the full members editor in one pass (UI fully specced by L-062), prove it, commit, and continue
to step 5. Nothing committed to core data. Nothing pushed.
