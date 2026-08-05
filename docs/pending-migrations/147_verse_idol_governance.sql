-- 147_verse_idol_governance.sql
-- Co-design 8 governance annex, owner rulings L-068 (2026-08-05).
-- Curator idol governance for the members editor (V-BUILDER-3 step 4).
-- Reuses existing columns: needs_review, review_reason, active.
-- Adds: origin (wikidata|curator), created_by, detached_at.
-- Semantics (enforced in code, recorded here for the record):
--   create  -> origin='curator', created_by=<uuid>, needs_review=true,
--              active=false (not indexable until admin approval)
--   approve -> active=true, needs_review=false
--   detach  -> active=false, detached_at=now() (page leaves index,
--              row and page data survive for re-attach)
--   attach  -> active=true, detached_at=NULL (same group only)
--   sync    -> a Wikidata re-sync must NEVER re-activate a row where
--              detached_at IS NOT NULL

BEGIN;

ALTER TABLE public.idols
  ADD COLUMN origin text NOT NULL DEFAULT 'wikidata',
  ADD COLUMN created_by uuid,
  ADD COLUMN detached_at timestamptz;

ALTER TABLE public.idols
  ADD CONSTRAINT idols_origin_check CHECK (origin IN ('wikidata', 'curator'));

-- Admin review queue: curator-created idols awaiting approval.
CREATE INDEX idx_idols_curator_review
  ON public.idols (group_id)
  WHERE origin = 'curator' AND needs_review = true;

-- Re-attach picker: this group's curator-detached members.
CREATE INDEX idx_idols_detached
  ON public.idols (group_id)
  WHERE detached_at IS NOT NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
