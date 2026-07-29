-- 134_verse_abuse_controls.sql
-- Workstream W4.8 - abuse controls. Run manually in the prod SQL editor; NOT auto-applied.
--
-- Two moderation tables. Rate limits and trust-tier gating are code-only (they read
-- existing signals: recent activity, account age, XP) and need no schema.
--   - verse_banned_terms: an admin/curator-managed list. action 'block' rejects content
--     outright; 'flag' allows it but files a patrol flag for review.
--   - verse_flags: the patrol queue. User reports and auto-flags (banned-term 'flag' hits)
--     on comments / revisions / suggestions, scoped to a space, for curators to resolve.
-- Both are private moderation data: RLS enabled, NO select policy (served only through the
-- service-role client behind curator/admin gates).

CREATE TABLE IF NOT EXISTS public.verse_banned_terms (
  id          SERIAL PRIMARY KEY,
  term        TEXT NOT NULL UNIQUE,                 -- stored lowercased; matched case-insensitively
  action      TEXT NOT NULL DEFAULT 'flag' CHECK (action IN ('block', 'flag')),
  note        TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verse_banned_terms ENABLE ROW LEVEL SECURITY; -- no select policy: private

CREATE TABLE IF NOT EXISTS public.verse_flags (
  id           SERIAL PRIMARY KEY,
  target_type  TEXT NOT NULL CHECK (target_type IN ('comment', 'revision', 'suggestion')),
  target_id    INTEGER NOT NULL,
  group_id     INTEGER REFERENCES public.groups(id) ON DELETE CASCADE, -- the space, for the patrol queue
  reporter     UUID,                                -- null = system auto-flag (banned term)
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by  UUID,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verse_flags_queue ON public.verse_flags(group_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_verse_flags_target ON public.verse_flags(target_type, target_id);
ALTER TABLE public.verse_flags ENABLE ROW LEVEL SECURITY; -- no select policy: private

NOTIFY pgrst, 'reload schema';
