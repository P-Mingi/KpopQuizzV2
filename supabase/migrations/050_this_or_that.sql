-- This or That tournament game tables

CREATE TABLE public.tot_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  type TEXT NOT NULL CHECK (type IN ('idol', 'group', 'song')),
  pool_size INTEGER NOT NULL DEFAULT 16,
  play_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tot_cat_slug ON public.tot_categories(slug);
CREATE INDEX idx_tot_cat_type ON public.tot_categories(type);

CREATE TABLE public.tot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.tot_categories(id) NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  color TEXT NOT NULL DEFAULT '#2C2C2A',
  tags TEXT[] DEFAULT '{}',
  pick_count INTEGER DEFAULT 0,
  appear_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tot_items_cat ON public.tot_items(category_id);

CREATE TABLE public.tot_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.tot_categories(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  winner_id UUID REFERENCES public.tot_items(id) NOT NULL,
  bracket JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tot_plays_cat ON public.tot_plays(category_id);
CREATE INDEX idx_tot_plays_winner ON public.tot_plays(winner_id);

-- RLS
ALTER TABLE public.tot_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tot_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published categories" ON public.tot_categories FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can read items" ON public.tot_items FOR SELECT USING (true);
CREATE POLICY "Anyone can read plays" ON public.tot_plays FOR SELECT USING (true);
CREATE POLICY "Anyone can insert plays" ON public.tot_plays FOR INSERT WITH CHECK (true);

-- RPCs
CREATE OR REPLACE FUNCTION increment_tot_pick(p_item_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tot_items SET pick_count = pick_count + 1 WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_tot_appear(p_item_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE public.tot_items SET appear_count = appear_count + 1 WHERE id = ANY(p_item_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_tot_category_plays(p_category_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tot_categories SET play_count = play_count + 1 WHERE id = p_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
