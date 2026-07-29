-- 131_verse_aliases.sql
-- Workstream W3K.5 - name-variant aliases + redirects. Run manually in prod; not auto-applied.
--
-- Captures search traffic for alternate names / spellings / romanizations / hangul
-- (e.g. bangtan -> bts, so-nyeo-shi-dae / girls-generation -> snsd). An incoming
-- /verse/{alias} that is not a real group slug 301/308-redirects to the canonical
-- space, consolidating link equity instead of 404ing. v1 targets groups; idol-level
-- aliases can extend later.

CREATE TABLE IF NOT EXISTS public.verse_aliases (
  id          SERIAL PRIMARY KEY,
  alias       TEXT NOT NULL UNIQUE CHECK (alias ~ '^[a-z0-9-]{1,120}$'),  -- normalized incoming slug
  group_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'group' CHECK (kind IN ('group')),
  source      TEXT,                              -- wikidata_altlabel / hangul / romanization / curator
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verse_aliases_group ON public.verse_aliases(group_id);

-- Public read: the redirect resolver runs on the public path.
ALTER TABLE public.verse_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verse_aliases_public_read ON public.verse_aliases;
CREATE POLICY verse_aliases_public_read ON public.verse_aliases FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
