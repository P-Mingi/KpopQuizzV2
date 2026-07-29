-- 135_verse_essays.sql
-- Workstream W4.12 - fan features: curated member essays per space. Run manually in the
-- prod SQL editor; NOT auto-applied.
--
-- Essays are long-form member-written pieces about a group (an era retrospective, a
-- concept deep-dive). This is NOT a free blog: a member drafts and submits; a curator
-- reviews and either FEATURES it (public) or rejects it. Only featured essays are public.
-- Reuses the living-persons stance: essays are about the group's work/artistry; the same
-- content rules the editor enforces apply at review time (curator judgement + patrol).

CREATE TABLE IF NOT EXISTS public.verse_essays (
  id           SERIAL PRIMARY KEY,
  group_id     INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author       UUID NOT NULL,
  title        TEXT NOT NULL,
  slug         TEXT CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{1,120}$'),
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- constrained TipTap doc (same renderer)
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'featured', 'rejected')),
  reviewed_by  UUID,
  reviewed_at  TIMESTAMPTZ,
  review_note  TEXT,
  featured_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verse_essays_featured ON public.verse_essays(group_id, featured_at DESC) WHERE status = 'featured';
CREATE INDEX IF NOT EXISTS idx_verse_essays_author ON public.verse_essays(author);
CREATE INDEX IF NOT EXISTS idx_verse_essays_queue ON public.verse_essays(group_id, status) WHERE status = 'submitted';

-- Public read of FEATURED essays only (the moderation gate). Drafts / submissions / rejects
-- are visible only through the service-role client (author's own editor + curator review).
ALTER TABLE public.verse_essays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verse_essays_public_read ON public.verse_essays;
CREATE POLICY verse_essays_public_read ON public.verse_essays FOR SELECT USING (status = 'featured');

NOTIFY pgrst, 'reload schema';
