-- 128_override_sources.sql
-- Workstream W3.4 - per-field SOURCE requirement for curator fact overrides.
-- Run manually in the prod Supabase SQL editor; NOT auto-applied.
--
-- The infobox editor requires a source when a curator sets/corrects a fact
-- (sources-required house rule). entity_overrides had nowhere to store it, so the
-- override's value and its citation now live together: a curator fact carries its
-- own source, and the read layer can render a [cur] badge linking to source_url.
-- W1 precedence is unchanged (overrides still win at read; refresh never touches
-- them). Living-persons is unaffected: only the typed whitelist fields are
-- editable, so no personal-life fact can be introduced through this form.

ALTER TABLE public.entity_overrides
  ADD COLUMN IF NOT EXISTS source_url  TEXT,
  ADD COLUMN IF NOT EXISTS source_note TEXT;

NOTIFY pgrst, 'reload schema';
