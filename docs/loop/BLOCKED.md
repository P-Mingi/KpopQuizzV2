# BLOCKED (message bus)

The worker writes here ONLY when it hits a real blocker (ambiguity it cannot
resolve from the spec/code, a gate it cannot pass honestly, or a decision that
belongs to the owner) and then STOPS. It never guesses through a gate.

Format for an entry:

```
## <step-id> - <one-line blocker>
- What is blocked: ...
- Why (the specific gate / ambiguity / owner decision): ...
- Options (each with its trade-off): 1) ...  2) ...  3) ...
- Recommendation: ...
- Proof / context: docs/proofs/<step-id>/ (if any)
```

When resolved, the worker clears the entry and continues.

---

## vbuilder3-step4 - the members roster is core Wikidata-sourced real data; there is no curator rail to create/attach/detach idols, and detach conflicts with the member-page SEO gate

- What is blocked: the flagship of step 4 - the entity picker ("attach existing OR
  create <name> in one act") and "Retirer du widget" (detach). The reorder + per-row
  photo/name/link overrides (the draft-jsonb, co-design-7 + image-rail side) are buildable
  now; the ENTITY side is not, because the rail the mission assumes does not exist for idols
  and building it needs owner rulings on real-data governance + one SEO invariant.

- Why (the specific gates / ambiguities / owner decisions):
  1. NO curator idol rail exists. The members block is registry-declared `dataSource:'entity'`
     ("the member grid, straight from the entity roster") = the core `idols` table
     (`idols.group_id`, `.eq('active',true).order('ord')`). The only idol-mutating endpoint is
     `api/admin/verse/action` (GLOBAL ADMIN only: approve `active:true`/`needs_review:false`,
     or hard-delete). The `api/verse/entity` "entity rails" the mission cites are SCENES ONLY
     (tours/shows/ost/awards), never idols. So "add member auto-creates the page via existing
     rails" has no rail to call.
  2. Curator-created idols are a different PROVENANCE CLASS than the entire existing dataset,
     and idols already carry a moderation model. Across 30 sampled idols EVERY row has
     `wikidata_qid`, `birth_date`, `nationality`, `positions` populated (the table was seeded
     from Wikidata). Idols also have `needs_review` + `review_reason`. A curator creating a
     member with only a name ("honest emptiness", real-data law) inserts a QID-less,
     birth_date-less row into a table where nothing else is - and features across the site
     (games, rankings, quality sweeps, SEO) read this table, not just this space. This is the
     same "curators write shared/core data" situation the image rail hit in step 3, which the
     owner governed with a migration + a moderation queue. The equivalent governance for
     curator-created CORE ENTITIES is not defined: needs_review queue vs auto-active? admin
     approval before the page goes indexable? a curator-idol flag/QID convention?
  3. DETACH conflicts with the member-page SEO gate. `getIdol()` filters `.eq('active',true)`,
     so a member page 404s (notFound) the moment its idol is `active:false`. 86 idols are
     already `active:false` and already 404. The mission requires "detach leaves the entity
     AND its page intact" - which contradicts current behavior and would change the indexable
     set (SEO invariant law). Owner must rule: does detach keep the member page indexable
     (then getIdol + sitemap + the members minGate "hidden below 1 active member" all change),
     or is "page intact" satisfied by the row surviving for re-attach while the page
     legitimately drops out of the index?
  4. "Attach existing" is ambiguous under a single-FK model. `idols.group_id` is one group per
     idol; there is no cross-group membership. With 86 detached rows, the only coherent
     "attach existing" is re-activating THIS space's own detached idol - not attaching an idol
     that belongs to another group. Needs confirmation.
  5. Draft-jsonb vs immediate-real-data. Acceptance says "full CRUD persisted in the draft
     jsonb" AND "created page real + navigable". Those pull opposite ways: order + overrides
     belong in the draft (revert on discard), but create/attach/detach mutate real data that
     cannot sit in an unpublished draft (a half-created idol page would be live before
     publish). Owner must rule which ops are draft-staged vs immediate, and whether create is
     gated behind publish.

- Options (each with its trade-off):
  1) OWNER RULES THE GOVERNANCE MODEL (recommended). Owner answers 2-5 above (moderation of
     curator-created idols, detach-vs-index, attach scope, draft-vs-immediate). If a schema
     touch is needed (e.g. a `created_by`/`origin='curator'` column, or a `detached_at` that
     divorces detach from the active/index flag), owner runs the SQL (law 17); I write it to
     docs/pending-migrations/ first. Then I build the full flagship correctly in one pass.
     Trade-off: one round-trip; but it is the same shape as step 3, which landed clean.
  2) BUILD THE PROPS-ONLY SLICE NOW, defer the entity picker + detach. I ship reorder + the
     in-panel accordion + photo/name/link overrides (image rail + Data/Edited + revert),
     persisted in the draft jsonb and rendered through the fail-closed gate - touching NO core
     data - and leave "Add member"/"Detach" as a labelled, disabled "next" affordance.
     Trade-off: real, gated progress this turn, but step 4's headline (the picker) is not met,
     so it is a checkpoint, not a close.
  3) I INVENT the governance (auto-active curator idols, change getIdol to keep detached pages
     indexable, define attach). Trade-off: rejected - it writes curator content into the core
     real-data table and changes the SEO indexable set on my own authority, violating the
     real-data law, the SEO invariant, and "decisions that belong to the owner". Not doing this.

- Recommendation: Option 1 for the flagship, with Option 2 available immediately as a
  no-core-data checkpoint if the owner wants motion this turn. Concretely, the four rulings I
  need: (2) curator-idol moderation model, (3) detach keeps page indexable? y/n, (4) attach =
  re-activate own detached idol? y/n, (5) create is immediate (pre-publish) or draft-staged.
  With those, no further discovery is needed - the UI is fully specced by L-062.

- Proof / context: recon in docs/loop/REPORT.md (step-4 entry). Confirmed by grep/DB read:
  members block `dataSource:'entity'`; idol writes only in `api/admin/verse/action`; getIdol
  `.eq('active',true)`; 86 idols `active:false`; all sampled idols carry wikidata_qid; the
  image-rail precedent (L-063/L-064) for owner-governed shared-data writes.
