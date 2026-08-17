# W3 - the Verse editor (best-in-category target)

## Claude Code Implementation Prompt

---

Build the editing system per VERSE-ROADMAP-V2.md W3.1-W3.8. Read first:
VERSE-MASTER-VISION.md, ROADMAP-V2, LOOP-CHARTER.md (loop rules apply), the W2
codebase. The bar: MediaWiki's editor is 2005 tech; ours is the single most
visible surface for the founding curators we recruit. Dual-skill
/ui-ux-pro-max + /frontend-design mandatory on every editing surface.

Hard rules: NO em dashes. Living-persons structural enforcement in every form.
Sources required on fact edits. No user-facing AI (owner decision: none, not
even assist buttons). TipTap = the one allowed new dependency family (justify
exact packages, smallest set). Commit per step, do NOT push. Migrations =
owner stop-and-wait. check:routes green. Three layouts where surfaces render
for readers; editor itself = desktop-first, mobile-functional.

## Steps

1. W3.1 Revisions migration (owner-run): revisions (entity_type, entity_id,
   section, author, summary, minor bool, content jsonb, created_at), draft
   storage, suggest-queue table. Design for per-section granularity from day
   one. STOP for owner.
2. W3.2 Block editor core: TipTap, schema-constrained block set (paragraph,
   heading, list, table, quote, image-by-policy, divider), live preview,
   autosave drafts (localStorage + server draft), edit-conflict detection
   (base-revision check on save; conflict -> guided merge view).
3. W3.3 Entity-aware editing: @-mention -> entity picker (idols/albums/eras/
   groups) inserting linked chips with hover preview cards; widget blocks:
   discography embed, stats block (real min-gated stats), native quiz embed;
   citation helper (paste URL -> structured source chip; sources render as
   badges like [wd]/[cur]).
4. W3.4 Infobox editing: typed field forms per entity type, per-field source
   requirement, curator overrides writing entity_overrides (W1 precedence
   preserved), no free-text facts.
5. W3.5 Structure: auto-TOC (h2/h3, sticky on desktop), section-level edit
   buttons, per-section anchors, section-scoped revisions.
6. W3.6 History surfaces: page history list (author, summary, minor flag,
   time), visual diff view, single-revision undo (revert one change without
   nuking later ones), full rollback (curator+).
7. W3.7 Suggest-an-edit + review queue v1: visitor/member structured
   suggestions -> queue; reviewer UI with batch-approve for minor edits,
   diff preview per item, approve/reject with reason. (Full curator roles =
   W4; v1 reviewers = owner + admin-flagged users.)
8. W3.8 Protection: lockable pages/sections (reviewer-tier), lock indicator
   for readers, lock log.

## Permitted loops (per LOOP-CHARTER)

- BUILD-VERIFY-FIX per step: GOAL tsc+build+check:routes+step tests green ·
  MAX 8 · STOP IF migration needed beyond W3.1 or design ambiguity.
- QA SWEEP at phase end: editor a11y (keyboard-complete, aria), autosave
  torture (kill mid-edit -> restore), conflict simulation (two sessions),
  em-dash grep, gate exercises · MAX 5 · REPORT iterations used.

## Verify (phase end)

- [ ] Full journey: open page -> edit section -> @-mention an idol -> add
      source -> save with summary -> see revision -> diff -> undo -> restore
- [ ] Conflict: two sessions editing same section -> guided merge, no data loss
- [ ] Suggest flow: anonymous suggestion -> queue -> batch-approve minors ->
      content updates + revision attributed
- [ ] Infobox: fact edit without source = blocked; override survives refresh
      cron (re-prove W1 precedence)
- [ ] Living-persons: no form field can introduce excluded content; grep proof
- [ ] Locked section: edit blocked for non-reviewer, indicator shown
- [ ] a11y: full keyboard editing; TOC/anchors correct; autosave never loses
      >5s of work
- [ ] tsc/build/check:routes green; TipTap packages listed + justified; zero
      em dashes

/caveman report per step: screenshots (editor light/dark), the journey video-
equivalent (stepwise screenshots), loop iterations used, deviations + why.
