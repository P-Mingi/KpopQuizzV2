-- ============================================
-- PINTEREST API: Auth tokens + board mapping
-- ============================================

-- Store Pinterest OAuth tokens (single-row table)
CREATE TABLE public.pinterest_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pinterest_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pinterest_auth_admin_all" ON public.pinterest_auth
  FOR ALL USING (true) WITH CHECK (true);

-- Board mapping (Pinterest board ID <-> display name)
CREATE TABLE public.pinterest_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_name TEXT NOT NULL UNIQUE,
  pinterest_board_id TEXT NOT NULL,
  description TEXT,
  pin_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pinterest_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pinterest_boards_admin_all" ON public.pinterest_boards
  FOR ALL USING (true) WITH CHECK (true);

-- Add new columns to pinterest_pins for API posting
ALTER TABLE public.pinterest_pins
  ADD COLUMN IF NOT EXISTS pinterest_pin_id TEXT,
  ADD COLUMN IF NOT EXISTS image_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS image_public_url TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- Update status check to include new statuses
-- (existing: draft, ready, posted; adding: approved, scheduled, failed)
CREATE INDEX IF NOT EXISTS idx_pinterest_scheduled_for ON public.pinterest_pins(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_pinterest_pin_id ON public.pinterest_pins(pinterest_pin_id);
