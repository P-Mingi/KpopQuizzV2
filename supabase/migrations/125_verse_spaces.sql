-- 125_verse_spaces.sql
-- Workstream W2.0 - Verse space configuration + curator-entered idol fields.
-- Run manually in the prod Supabase SQL editor; NOT auto-applied.
--
-- Adds the per-space config that the public reading experience (W2.1+) renders
-- from, plus the three curator-only idol fields the idol FACTS box needs. All
-- config is real-data / min-gated at render: an unconfigured space still renders
-- an intentional locked skeleton, never fake content.
--
-- LIVING-PERSONS POLICY: the idol fields added here are height / blood type /
-- MBTI only. There is deliberately NO weight column and NO personal-life field
-- (relationships, family, residence, schedules) - those do not exist by design.

-- ---------------------------------------------------------------------------
-- 1. verse_spaces - one config row per group (the space).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_spaces (
  group_id             INTEGER PRIMARY KEY REFERENCES public.groups(id) ON DELETE CASCADE,
  welcome_line         TEXT,                          -- curator masthead welcome
  est_year             INTEGER,                        -- fandom founding year (else debut year at render)
  sns_links            JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{label, url}] curator-entered out-links
  theme                JSONB NOT NULL DEFAULT '{}'::jsonb,   -- optional token overrides (base derives from groups.display_color)
  module_config        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- registry module order/toggles (W4 UI; hand-edited via admin until then)
  former_members_shown BOOLEAN NOT NULL DEFAULT FALSE,       -- former-members section is opt-in per space
  charter_text         TEXT,                           -- About-tab charter (W3/W4); null until written
  is_launch            BOOLEAN NOT NULL DEFAULT FALSE,       -- the owner-picked launch spaces
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verse_spaces_launch ON public.verse_spaces(is_launch) WHERE is_launch = TRUE;

-- ---------------------------------------------------------------------------
-- 2. idols - curator-entered profile fields (nullable). NO weight, ever.
-- ---------------------------------------------------------------------------

ALTER TABLE public.idols
  ADD COLUMN IF NOT EXISTS height_cm  INTEGER,
  ADD COLUMN IF NOT EXISTS blood_type TEXT,
  ADD COLUMN IF NOT EXISTS mbti       TEXT;

-- Constrain to valid enumerations (keeps curator entry clean); nullable.
ALTER TABLE public.idols DROP CONSTRAINT IF EXISTS idols_blood_type_check;
ALTER TABLE public.idols ADD CONSTRAINT idols_blood_type_check
  CHECK (blood_type IS NULL OR blood_type IN ('A', 'B', 'O', 'AB'));
ALTER TABLE public.idols DROP CONSTRAINT IF EXISTS idols_mbti_check;
ALTER TABLE public.idols ADD CONSTRAINT idols_mbti_check
  CHECK (mbti IS NULL OR mbti ~ '^[EI][NS][TF][JP]$');
ALTER TABLE public.idols DROP CONSTRAINT IF EXISTS idols_height_cm_check;
ALTER TABLE public.idols ADD CONSTRAINT idols_height_cm_check
  CHECK (height_cm IS NULL OR (height_cm BETWEEN 120 AND 220));

-- ---------------------------------------------------------------------------
-- 3. RLS. Space config is public (public reading experience); writes via
--    service-role / admin, which bypass RLS. No write policies.
-- ---------------------------------------------------------------------------

ALTER TABLE public.verse_spaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verse_spaces_public_read ON public.verse_spaces;
CREATE POLICY verse_spaces_public_read ON public.verse_spaces FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
