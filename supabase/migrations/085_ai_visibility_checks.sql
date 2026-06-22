-- AI visibility tracking: manual log of monthly checks across LLM platforms.
-- Run on the QUIZ project (rdkgouofytwfdpbxbzio).

CREATE TABLE IF NOT EXISTS public.ai_visibility_checks (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checked_at    timestamptz NOT NULL DEFAULT now(),
  platform      text NOT NULL,          -- 'chatgpt' | 'perplexity' | 'gemini' | 'google_aio'
  query         text NOT NULL,          -- e.g. 'best kpop quiz'
  mentioned     boolean NOT NULL,       -- was kpopquiz.org mentioned?
  position      smallint,               -- rough rank if mentioned (1 = first, null if not mentioned)
  snippet       text,                   -- the relevant excerpt from the AI response
  notes         text,                   -- free-form observations
  checked_by    uuid REFERENCES auth.users(id)
);

-- RLS: only admins can read/write (service role bypasses RLS anyway,
-- but this prevents accidental exposure via the public API).
ALTER TABLE public.ai_visibility_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_ai_visibility"
  ON public.ai_visibility_checks
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Index for dashboard queries (latest checks per platform+query).
CREATE INDEX idx_ai_visibility_checked_at
  ON public.ai_visibility_checks (checked_at DESC);
