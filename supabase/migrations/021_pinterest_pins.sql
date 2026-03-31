-- ============================================
-- PINTEREST PINS: Pre-made pins for manual posting
-- ============================================

CREATE TABLE public.pinterest_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pin content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  board TEXT NOT NULL,
  pin_type TEXT NOT NULL,           -- 'quiz_link', 'fact_card', 'did_you_know', 'score_challenge'
  link_url TEXT,
  group_name TEXT,
  group_slug TEXT,

  -- Template fields
  headline TEXT NOT NULL,
  subtext TEXT,
  fact_date TEXT,
  score_display TEXT,
  score_percent TEXT,

  -- Images
  image_url TEXT,                   -- uploaded photo (for quiz_link pins)
  generated_image_url TEXT,         -- auto-generated PNG stored in Supabase Storage

  -- Workflow
  needs_photo BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',   -- 'draft', 'ready', 'posted'
  posted_at TIMESTAMPTZ,
  scheduled_date DATE,

  -- Metadata
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pinterest_status ON public.pinterest_pins(status);
CREATE INDEX idx_pinterest_type ON public.pinterest_pins(pin_type);
CREATE INDEX idx_pinterest_group ON public.pinterest_pins(group_slug);
CREATE INDEX idx_pinterest_date ON public.pinterest_pins(scheduled_date);
CREATE INDEX idx_pinterest_sort ON public.pinterest_pins(sort_order);

ALTER TABLE public.pinterest_pins ENABLE ROW LEVEL SECURITY;

-- Admin-only (service role bypasses RLS; this allows authenticated admins too)
CREATE POLICY "pinterest_admin_all" ON public.pinterest_pins
  FOR ALL USING (true) WITH CHECK (true);
