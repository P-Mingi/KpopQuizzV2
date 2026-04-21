-- ============================================================
-- Migration 060: Fancard System (dev_ prefix tables)
-- Card collection gacha with Byeol currency
-- ============================================================

-- 1. dev_cards
CREATE TABLE IF NOT EXISTS public.dev_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number INTEGER UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  idol_name TEXT,
  group_name TEXT NOT NULL,
  group_slug TEXT NOT NULL,
  position TEXT,
  era TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  rarity TEXT NOT NULL CHECK (rarity IN ('R', 'S', 'SS', 'SSS')),
  art_url TEXT,
  idol_info JSONB DEFAULT '{}',
  is_limited BOOLEAN DEFAULT false,
  limited_until TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_cards_group ON public.dev_cards(group_slug);
CREATE INDEX IF NOT EXISTS idx_dev_cards_rarity ON public.dev_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_dev_cards_number ON public.dev_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_dev_cards_slug ON public.dev_cards(slug);

ALTER TABLE public.dev_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read published cards" ON public.dev_cards;
CREATE POLICY "Anyone can read published cards" ON public.dev_cards FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Service role can manage cards" ON public.dev_cards;
CREATE POLICY "Service role can manage cards" ON public.dev_cards FOR ALL USING (auth.role() = 'service_role');

-- 2. dev_card_packs
CREATE TABLE IF NOT EXISTS public.dev_card_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pack_type TEXT NOT NULL CHECK (pack_type IN ('standard', 'group', 'event')),
  group_slug TEXT,
  cost INTEGER NOT NULL,
  card_count INTEGER DEFAULT 5,
  r_rate NUMERIC DEFAULT 0.60,
  s_rate NUMERIC DEFAULT 0.28,
  ss_rate NUMERIC DEFAULT 0.10,
  sss_rate NUMERIC DEFAULT 0.02,
  is_active BOOLEAN DEFAULT false,
  rotation_order INTEGER,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dev_card_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read packs" ON public.dev_card_packs;
CREATE POLICY "Anyone can read packs" ON public.dev_card_packs FOR SELECT USING (true);

-- 3. dev_user_cards
CREATE TABLE IF NOT EXISTS public.dev_user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  card_id UUID REFERENCES public.dev_cards(id) NOT NULL,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL,
  pack_open_id UUID,
  UNIQUE(user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_user_cards_user ON public.dev_user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_user_cards_card ON public.dev_user_cards(card_id);

ALTER TABLE public.dev_user_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own cards" ON public.dev_user_cards;
CREATE POLICY "Users read own cards" ON public.dev_user_cards FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert cards" ON public.dev_user_cards;
CREATE POLICY "System can insert cards" ON public.dev_user_cards FOR INSERT WITH CHECK (true);

-- 4. dev_user_byeol
CREATE TABLE IF NOT EXISTS public.dev_user_byeol (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  total_packs_opened INTEGER DEFAULT 0,
  total_cards_collected INTEGER DEFAULT 0,
  consecutive_dup_packs INTEGER DEFAULT 0,
  login_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  xp_byeol_checkpoint INTEGER DEFAULT 0,
  has_opened_starter BOOLEAN DEFAULT false,
  has_opened_first_pack BOOLEAN DEFAULT false,
  featured_card_id UUID REFERENCES public.dev_cards(id),
  completed_groups TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dev_user_byeol ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own byeol" ON public.dev_user_byeol;
CREATE POLICY "Users read own byeol" ON public.dev_user_byeol FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own byeol" ON public.dev_user_byeol;
CREATE POLICY "Users can update own byeol" ON public.dev_user_byeol FOR UPDATE USING (auth.uid() = user_id);

-- 5. dev_byeol_transactions
CREATE TABLE IF NOT EXISTS public.dev_byeol_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_byeol_tx_user ON public.dev_byeol_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_byeol_tx_created ON public.dev_byeol_transactions(created_at DESC);

ALTER TABLE public.dev_byeol_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own txns" ON public.dev_byeol_transactions;
CREATE POLICY "Users read own txns" ON public.dev_byeol_transactions FOR SELECT USING (auth.uid() = user_id);

-- 6. dev_pack_opens
CREATE TABLE IF NOT EXISTS public.dev_pack_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  pack_slug TEXT NOT NULL,
  cards_pulled JSONB NOT NULL,
  best_rarity TEXT NOT NULL,
  total_new INTEGER DEFAULT 0,
  total_duplicates INTEGER DEFAULT 0,
  byeol_refunded INTEGER DEFAULT 0,
  pity_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_pack_opens_user ON public.dev_pack_opens(user_id);

ALTER TABLE public.dev_pack_opens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own pack opens" ON public.dev_pack_opens;
CREATE POLICY "Users read own pack opens" ON public.dev_pack_opens FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- RPCs
-- ============================================================

-- Award Byeol
CREATE OR REPLACE FUNCTION dev_award_byeol(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_reference_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO public.dev_user_byeol (user_id, balance, total_earned)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = dev_user_byeol.balance + p_amount,
      total_earned = dev_user_byeol.total_earned + p_amount;

  SELECT balance INTO v_new_balance FROM public.dev_user_byeol WHERE user_id = p_user_id;

  INSERT INTO public.dev_byeol_transactions (user_id, amount, source, reference_id, balance_after)
    VALUES (p_user_id, p_amount, p_source, p_reference_id, v_new_balance);

  RETURN jsonb_build_object('new_balance', v_new_balance, 'awarded', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Open starter pack
CREATE OR REPLACE FUNCTION dev_open_starter_pack(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_has_opened BOOLEAN;
  v_cards JSONB := '[]'::jsonb;
  v_card RECORD;
  v_starter_slugs TEXT[] := ARRAY['jungkook-base', 'jennie-base', 'karina-base', 'bangchan-base', 'minji-base'];
  v_slug TEXT;
BEGIN
  SELECT has_opened_starter INTO v_has_opened FROM public.dev_user_byeol WHERE user_id = p_user_id;

  IF v_has_opened IS NULL THEN
    INSERT INTO public.dev_user_byeol (user_id, has_opened_starter) VALUES (p_user_id, true);
  ELSIF v_has_opened THEN
    RETURN jsonb_build_object('already_opened', true);
  ELSE
    UPDATE public.dev_user_byeol SET has_opened_starter = true WHERE user_id = p_user_id;
  END IF;

  FOREACH v_slug IN ARRAY v_starter_slugs
  LOOP
    SELECT * INTO v_card FROM public.dev_cards WHERE slug = v_slug;
    IF v_card.id IS NOT NULL THEN
      INSERT INTO public.dev_user_cards (user_id, card_id, source)
        VALUES (p_user_id, v_card.id, 'starter')
        ON CONFLICT (user_id, card_id) DO NOTHING;

      v_cards := v_cards || jsonb_build_object(
        'card_id', v_card.id, 'card_number', v_card.card_number,
        'name', v_card.name, 'rarity', v_card.rarity,
        'is_new', true, 'duplicate_refund', 0,
        'group_slug', v_card.group_slug, 'group_name', v_card.group_name,
        'slug', v_card.slug, 'art_url', v_card.art_url,
        'tags', to_jsonb(v_card.tags), 'position', v_card.position
      );
    END IF;
  END LOOP;

  UPDATE public.dev_user_byeol SET total_cards_collected = total_cards_collected + 5
    WHERE user_id = p_user_id;

  RETURN jsonb_build_object('cards', v_cards, 'is_starter', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Open card pack (full gacha logic)
CREATE OR REPLACE FUNCTION dev_open_card_pack(
  p_user_id UUID,
  p_pack_slug TEXT
) RETURNS JSONB AS $$
DECLARE
  v_pack RECORD;
  v_balance INTEGER;
  v_cards JSONB := '[]'::jsonb;
  v_card RECORD;
  v_rarity TEXT;
  v_roll NUMERIC;
  v_is_new BOOLEAN;
  v_refund INTEGER := 0;
  v_total_new INTEGER := 0;
  v_total_dup INTEGER := 0;
  v_total_refund INTEGER := 0;
  v_best_rarity TEXT := 'R';
  v_best_order INTEGER := 0;
  v_guarantee_met BOOLEAN := false;
  v_pack_open_id UUID;
  v_is_first_pack BOOLEAN;
  v_pity_active BOOLEAN := false;
  v_consecutive_dups INTEGER;
  v_rarity_order JSONB := '{"R":1,"S":2,"SS":3,"SSS":4}'::jsonb;
  v_dup_refunds JSONB := '{"R":15,"S":30,"SS":60,"SSS":200}'::jsonb;
  v_user_card_ids UUID[];
  i INTEGER;
BEGIN
  SELECT * INTO v_pack FROM public.dev_card_packs WHERE slug = p_pack_slug;
  IF v_pack IS NULL THEN RAISE EXCEPTION 'Pack not found: %', p_pack_slug; END IF;

  SELECT balance INTO v_balance FROM public.dev_user_byeol WHERE user_id = p_user_id;
  IF v_balance IS NULL THEN
    INSERT INTO public.dev_user_byeol (user_id, balance) VALUES (p_user_id, 0);
    v_balance := 0;
  END IF;
  IF v_balance < v_pack.cost THEN RAISE EXCEPTION 'Not enough Byeol. Need %, have %', v_pack.cost, v_balance; END IF;

  SELECT NOT has_opened_first_pack INTO v_is_first_pack FROM public.dev_user_byeol WHERE user_id = p_user_id;
  SELECT consecutive_dup_packs INTO v_consecutive_dups FROM public.dev_user_byeol WHERE user_id = p_user_id;
  v_pity_active := (v_consecutive_dups >= 3);

  SELECT ARRAY_AGG(card_id) INTO v_user_card_ids FROM public.dev_user_cards WHERE user_id = p_user_id;
  IF v_user_card_ids IS NULL THEN v_user_card_ids := ARRAY[]::UUID[]; END IF;

  UPDATE public.dev_user_byeol SET
    balance = balance - v_pack.cost,
    total_spent = total_spent + v_pack.cost,
    total_packs_opened = total_packs_opened + 1
  WHERE user_id = p_user_id;

  v_pack_open_id := gen_random_uuid();

  FOR i IN 1..v_pack.card_count LOOP
    v_roll := random();
    IF v_roll < v_pack.sss_rate THEN v_rarity := 'SSS';
    ELSIF v_roll < v_pack.sss_rate + v_pack.ss_rate THEN v_rarity := 'SS';
    ELSIF v_roll < v_pack.sss_rate + v_pack.ss_rate + v_pack.s_rate THEN v_rarity := 'S';
    ELSE v_rarity := 'R';
    END IF;

    IF v_is_first_pack AND i = v_pack.card_count AND NOT v_guarantee_met THEN
      v_rarity := 'S';
    END IF;

    IF i = v_pack.card_count AND NOT v_guarantee_met THEN
      IF v_rarity = 'R' THEN v_rarity := 'S'; END IF;
    END IF;

    IF v_rarity IN ('S', 'SS', 'SSS') THEN v_guarantee_met := true; END IF;

    -- Find a card at the rolled rarity, falling back to lower if none exist
    v_card := NULL;
    LOOP
      IF v_pack.group_slug IS NOT NULL THEN
        SELECT * INTO v_card FROM public.dev_cards
          WHERE rarity = v_rarity AND group_slug = v_pack.group_slug AND is_published = true
          ORDER BY random() LIMIT 1;
      ELSE
        SELECT * INTO v_card FROM public.dev_cards
          WHERE rarity = v_rarity AND is_published = true
          ORDER BY random() LIMIT 1;
      END IF;

      IF v_card.id IS NOT NULL THEN EXIT; END IF;
      IF v_rarity = 'SSS' THEN v_rarity := 'SS';
      ELSIF v_rarity = 'SS' THEN v_rarity := 'S';
      ELSIF v_rarity = 'S' THEN v_rarity := 'R';
      ELSE EXIT;
      END IF;
    END LOOP;

    IF v_card.id IS NULL THEN CONTINUE; END IF;

    -- Pity: first card of pack guaranteed new if 3+ all-dup packs in a row
    IF v_pity_active AND i = 1 THEN
      IF v_pack.group_slug IS NOT NULL THEN
        SELECT * INTO v_card FROM public.dev_cards
          WHERE rarity = v_rarity AND group_slug = v_pack.group_slug AND is_published = true
          AND id != ALL(v_user_card_ids) ORDER BY random() LIMIT 1;
      ELSE
        SELECT * INTO v_card FROM public.dev_cards
          WHERE rarity = v_rarity AND is_published = true
          AND id != ALL(v_user_card_ids) ORDER BY random() LIMIT 1;
      END IF;
      IF v_card.id IS NULL THEN
        SELECT * INTO v_card FROM public.dev_cards
          WHERE is_published = true AND id != ALL(v_user_card_ids)
          ORDER BY random() LIMIT 1;
        IF v_card.id IS NOT NULL THEN v_rarity := v_card.rarity; END IF;
      END IF;
      IF v_card.id IS NULL THEN
        SELECT * INTO v_card FROM public.dev_cards
          WHERE rarity = v_rarity AND is_published = true ORDER BY random() LIMIT 1;
      END IF;
    END IF;

    v_is_new := NOT (v_card.id = ANY(v_user_card_ids));

    v_refund := 0;
    IF v_is_new THEN
      INSERT INTO public.dev_user_cards (user_id, card_id, source, pack_open_id)
        VALUES (p_user_id, v_card.id, 'pack_' || v_pack.pack_type, v_pack_open_id);
      v_user_card_ids := array_append(v_user_card_ids, v_card.id);
      v_total_new := v_total_new + 1;
      UPDATE public.dev_user_byeol SET total_cards_collected = total_cards_collected + 1
        WHERE user_id = p_user_id;
    ELSE
      v_refund := (v_dup_refunds ->> v_rarity)::integer;
      v_total_dup := v_total_dup + 1;
      v_total_refund := v_total_refund + v_refund;
    END IF;

    IF (v_rarity_order ->> v_rarity)::integer > v_best_order THEN
      v_best_order := (v_rarity_order ->> v_rarity)::integer;
      v_best_rarity := v_rarity;
    END IF;

    v_cards := v_cards || jsonb_build_object(
      'card_id', v_card.id, 'card_number', v_card.card_number,
      'name', v_card.name, 'rarity', v_rarity,
      'is_new', v_is_new, 'duplicate_refund', v_refund,
      'group_slug', v_card.group_slug, 'group_name', v_card.group_name,
      'slug', v_card.slug, 'art_url', v_card.art_url,
      'tags', to_jsonb(v_card.tags), 'position', v_card.position
    );
  END LOOP;

  IF v_total_refund > 0 THEN
    UPDATE public.dev_user_byeol SET
      balance = balance + v_total_refund,
      total_earned = total_earned + v_total_refund
    WHERE user_id = p_user_id;
  END IF;

  IF v_total_new = 0 THEN
    UPDATE public.dev_user_byeol SET consecutive_dup_packs = consecutive_dup_packs + 1
      WHERE user_id = p_user_id;
  ELSE
    UPDATE public.dev_user_byeol SET consecutive_dup_packs = 0
      WHERE user_id = p_user_id;
  END IF;

  IF v_is_first_pack THEN
    UPDATE public.dev_user_byeol SET has_opened_first_pack = true WHERE user_id = p_user_id;
  END IF;

  -- Check group completion
  DECLARE
    v_group TEXT;
    v_group_total INTEGER;
    v_group_owned INTEGER;
  BEGIN
    FOR v_group IN SELECT DISTINCT group_slug FROM public.dev_cards WHERE is_published = true
    LOOP
      SELECT COUNT(*) INTO v_group_total FROM public.dev_cards WHERE group_slug = v_group AND is_published = true;
      SELECT COUNT(*) INTO v_group_owned FROM public.dev_user_cards uc
        JOIN public.dev_cards c ON uc.card_id = c.id
        WHERE uc.user_id = p_user_id AND c.group_slug = v_group;
      IF v_group_owned = v_group_total THEN
        UPDATE public.dev_user_byeol SET
          completed_groups = array_append(array_remove(completed_groups, v_group), v_group)
        WHERE user_id = p_user_id;
      END IF;
    END LOOP;
  END;

  -- Log transactions
  INSERT INTO public.dev_byeol_transactions (user_id, amount, source, reference_id, balance_after)
    VALUES (p_user_id, -v_pack.cost, 'pack_purchase', v_pack_open_id::text,
      (SELECT balance FROM public.dev_user_byeol WHERE user_id = p_user_id));

  IF v_total_refund > 0 THEN
    INSERT INTO public.dev_byeol_transactions (user_id, amount, source, reference_id, balance_after)
      VALUES (p_user_id, v_total_refund, 'duplicate_refund', v_pack_open_id::text,
        (SELECT balance FROM public.dev_user_byeol WHERE user_id = p_user_id));
  END IF;

  INSERT INTO public.dev_pack_opens (id, user_id, pack_slug, cards_pulled, best_rarity, total_new, total_duplicates, byeol_refunded, pity_triggered)
    VALUES (v_pack_open_id, p_user_id, p_pack_slug, v_cards, v_best_rarity, v_total_new, v_total_dup, v_total_refund, v_pity_active AND v_total_new > 0);

  RETURN jsonb_build_object(
    'pack_open_id', v_pack_open_id,
    'cards', v_cards,
    'best_rarity', v_best_rarity,
    'total_new', v_total_new,
    'total_duplicates', v_total_dup,
    'byeol_refunded', v_total_refund,
    'pity_triggered', v_pity_active AND v_total_new > 0,
    'new_balance', (SELECT balance FROM public.dev_user_byeol WHERE user_id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Seed data: Packs
-- ============================================================

INSERT INTO public.dev_card_packs (slug, name, pack_type, group_slug, cost, is_active, r_rate, s_rate, ss_rate, sss_rate, rotation_order) VALUES
('standard', 'Standard Pack', 'standard', NULL, 100, true, 0.60, 0.28, 0.10, 0.02, NULL),
('bts-group', 'BTS Pack', 'group', 'bts', 150, false, 0.50, 0.30, 0.15, 0.05, 0),
('blackpink-group', 'BLACKPINK Pack', 'group', 'blackpink', 150, false, 0.50, 0.30, 0.15, 0.05, 1),
('aespa-group', 'aespa Pack', 'group', 'aespa', 150, false, 0.50, 0.30, 0.15, 0.05, 2),
('skz-group', 'Stray Kids Pack', 'group', 'stray-kids', 150, false, 0.50, 0.30, 0.15, 0.05, 3),
('nj-group', 'NewJeans Pack', 'group', 'newjeans', 150, false, 0.50, 0.30, 0.15, 0.05, 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed data: 52 cards (28 R + 24 S)
-- ============================================================

INSERT INTO public.dev_cards (card_number, slug, name, idol_name, group_name, group_slug, position, era, tags, rarity, description) VALUES
-- BTS: 7 R + 5 S = 12 cards
(1, 'jungkook-base', 'Jungkook', 'Jungkook', 'BTS', 'bts', 'Main vocal, Center', 'Base', ARRAY['3rd gen','Golden maknae'], 'R', 'Jeon Jungkook is the main vocalist, lead dancer, and center of BTS. Known as the Golden Maknae for his versatility across all performance areas.'),
(2, 'v-base', 'V', 'V', 'BTS', 'bts', 'Vocal, Visual', 'Base', ARRAY['3rd gen','Taehyung'], 'R', 'Kim Taehyung, known as V, is a vocalist and visual of BTS. Famous for his unique deep vocal tone and artistic sensibility.'),
(3, 'jimin-base', 'Jimin', 'Jimin', 'BTS', 'bts', 'Main dancer, Vocal', 'Base', ARRAY['3rd gen','Contemporary'], 'R', 'Park Jimin is the main dancer and vocalist of BTS. Renowned for his contemporary dance background and emotional performances.'),
(4, 'suga-base', 'SUGA', 'SUGA', 'BTS', 'bts', 'Rapper, Producer', 'Base', ARRAY['3rd gen','Agust D'], 'R', 'Min Yoongi, known as SUGA, is a rapper and lead producer of BTS. His solo project Agust D has critical acclaim.'),
(5, 'jin-base', 'Jin', 'Jin', 'BTS', 'bts', 'Vocal, Visual', 'Base', ARRAY['3rd gen','Worldwide handsome'], 'R', 'Kim Seokjin is a vocalist and visual of BTS. Known for his powerful vocals and charismatic personality.'),
(6, 'rm-base', 'RM', 'RM', 'BTS', 'bts', 'Leader, Rapper', 'Base', ARRAY['3rd gen','Producer'], 'R', 'Kim Namjoon, known as RM, is the leader and main rapper of BTS. A prolific songwriter and producer who speaks fluent English.'),
(7, 'jhope-base', 'j-hope', 'j-hope', 'BTS', 'bts', 'Main dancer, Rapper', 'Base', ARRAY['3rd gen','Sunshine'], 'R', 'Jung Hoseok, known as j-hope, is the main dancer and rapper of BTS. Known for his precise dance skills and positive energy.'),
(8, 'jungkook-seven', 'Jungkook -- Seven', 'Jungkook', 'BTS', 'bts', 'Main vocal, Center', 'Seven (2023)', ARRAY['Solo','Billboard #1'], 'S', 'Jungkook''s solo single Seven featuring Latto debuted at #1 on the Billboard Hot 100, making history.'),
(9, 'v-layover', 'V -- Layover', 'V', 'BTS', 'bts', 'Vocal, Visual', 'Layover (2023)', ARRAY['Solo','R&B'], 'S', 'V''s debut solo album Layover showcased his smooth R&B style and artistic vision with tracks like Slow Dancing.'),
(10, 'jimin-face', 'Jimin -- FACE', 'Jimin', 'BTS', 'bts', 'Main dancer, Vocal', 'FACE (2023)', ARRAY['Solo','Like Crazy'], 'S', 'Jimin''s first solo album FACE featured the global hit Like Crazy, debuting at #1 on the Billboard Hot 100.'),
(11, 'suga-dday', 'SUGA -- D-Day', 'SUGA', 'BTS', 'bts', 'Rapper, Producer', 'D-Day (2023)', ARRAY['Agust D','World tour'], 'S', 'The final chapter of SUGA''s Agust D trilogy, accompanied by his first-ever solo world tour.'),
(12, 'bts-dynamite', 'BTS -- Dynamite', NULL, 'BTS', 'bts', NULL, 'Dynamite (2020)', ARRAY['Group','Billboard #1'], 'S', 'BTS''s first fully English-language single, Dynamite became their first Billboard Hot 100 #1 hit.'),

-- BLACKPINK: 4 R + 5 S = 9 cards
(13, 'jennie-base', 'Jennie', 'Jennie', 'BLACKPINK', 'blackpink', 'Rapper, Vocal', 'Base', ARRAY['3rd gen','YG','It girl'], 'R', 'Jennie Kim is a rapper and vocalist of BLACKPINK. The first member to debut solo with the hit SOLO.'),
(14, 'jisoo-base', 'Jisoo', 'Jisoo', 'BLACKPINK', 'blackpink', 'Vocal, Visual', 'Base', ARRAY['3rd gen','Actress'], 'R', 'Kim Jisoo is a vocalist and visual of BLACKPINK. Also an accomplished actress starring in the K-drama Snowdrop.'),
(15, 'rose-base', 'Rose', 'Rose', 'BLACKPINK', 'blackpink', 'Main vocal, Dancer', 'Base', ARRAY['3rd gen','Australian'], 'R', 'Roseanne Park, known as Rose, is the main vocalist of BLACKPINK. Born in New Zealand, raised in Australia.'),
(16, 'lisa-base', 'Lisa', 'Lisa', 'BLACKPINK', 'blackpink', 'Main dancer, Rapper', 'Base', ARRAY['3rd gen','Thai'], 'R', 'Lalisa Manobal, known as Lisa, is the main dancer and lead rapper of BLACKPINK. The first Thai artist to top global charts.'),
(17, 'jennie-solo', 'Jennie -- SOLO', 'Jennie', 'BLACKPINK', 'blackpink', 'Rapper, Vocal', 'SOLO (2018)', ARRAY['First solo','Iconic'], 'S', 'Jennie''s debut solo single SOLO was a cultural moment, becoming the first solo K-pop track by a female idol to reach massive global success.'),
(18, 'rose-otg', 'Rose -- On The Ground', 'Rose', 'BLACKPINK', 'blackpink', 'Main vocal', 'R (2021)', ARRAY['Solo','Billboard'], 'S', 'Rose''s solo debut with On The Ground broke records and showcased her distinctive vocal color.'),
(19, 'lisa-lalisa', 'Lisa -- LALISA', 'Lisa', 'BLACKPINK', 'blackpink', 'Main dancer, Rapper', 'LALISA (2021)', ARRAY['Solo','Record-breaking'], 'S', 'Lisa''s solo debut LALISA broke the record for most-viewed music video by a solo artist in 24 hours at release.'),
(20, 'jisoo-flower', 'Jisoo -- FLOWER', 'Jisoo', 'BLACKPINK', 'blackpink', 'Vocal, Visual', 'ME (2023)', ARRAY['Solo','FLOWER'], 'S', 'Jisoo''s solo debut album ME featured the viral hit FLOWER with its iconic choreography.'),
(21, 'bp-hylt', 'BLACKPINK -- HYLT', NULL, 'BLACKPINK', 'blackpink', NULL, 'HYLT (2020)', ARRAY['Group','Summer anthem'], 'S', 'How You Like That was BLACKPINK''s record-breaking pre-release single and summer anthem of 2020.'),

-- aespa: 4 R + 5 S = 9 cards
(22, 'karina-base', 'Karina', 'Karina', 'aespa', 'aespa', 'Leader, Main dancer', 'Base', ARRAY['4th gen','SM','Center'], 'R', 'Yoo Jimin, known as Karina, is the leader and main dancer of aespa. Recognized for her powerful stage presence and visuals.'),
(23, 'winter-base', 'Winter', 'Winter', 'aespa', 'aespa', 'Main vocal, Dancer', 'Base', ARRAY['4th gen','Ace'], 'R', 'Kim Minjeong, known as Winter, is the main vocalist and dancer of aespa. Considered an all-rounder ace.'),
(24, 'giselle-base', 'Giselle', 'Giselle', 'aespa', 'aespa', 'Rapper, Vocal', 'Base', ARRAY['4th gen','Trilingual'], 'R', 'Uchinaga Aeri, known as Giselle, is the rapper and vocalist of aespa. Fluent in Korean, Japanese, and English.'),
(25, 'ningning-base', 'NingNing', 'NingNing', 'aespa', 'aespa', 'Main vocal', 'Base', ARRAY['4th gen','Powerhouse'], 'R', 'Ning Yizhuo, known as NingNing, is the main vocalist of aespa. Known for her powerful high notes and vocal range.'),
(26, 'karina-supernova', 'Karina -- Supernova', 'Karina', 'aespa', 'aespa', 'Leader, Main dancer', 'Supernova (2024)', ARRAY['Viral','Center'], 'S', 'Karina''s center presence in Supernova helped make it aespa''s most viral hit, dominating charts globally.'),
(27, 'winter-whiplash', 'Winter -- Whiplash', 'Winter', 'aespa', 'aespa', 'Main vocal, Dancer', 'Whiplash (2024)', ARRAY['Solo','Performance'], 'S', 'Winter''s solo single Whiplash showcased her dance ability and cemented her status as aespa''s ace.'),
(28, 'aespa-nextlevel', 'aespa -- Next Level', NULL, 'aespa', 'aespa', NULL, 'Next Level (2021)', ARRAY['Group','Breakthrough'], 'S', 'Next Level was aespa''s commercial breakthrough, with its genre-shifting structure becoming a massive hit.'),
(29, 'aespa-savage', 'aespa -- Savage', NULL, 'aespa', 'aespa', NULL, 'Savage (2021)', ARRAY['Group','First mini'], 'S', 'Savage was aespa''s first mini album, establishing their unique KWANGYA universe lore and powerful concept.'),
(30, 'karina-drama', 'Karina -- Drama', 'Karina', 'aespa', 'aespa', 'Leader, Main dancer', 'Drama (2023)', ARRAY['Title track','Concept'], 'S', 'The Drama era showcased Karina''s duality between elegant and fierce concepts.'),

-- Stray Kids: 8 R + 4 S = 12 cards
(31, 'bangchan-base', 'Bang Chan', 'Bang Chan', 'Stray Kids', 'stray-kids', 'Leader, Producer', 'Base', ARRAY['4th gen','JYP','Leader'], 'R', 'Christopher Bang, known as Bang Chan, is the leader and producer of Stray Kids. Trained for 7 years and created the group''s identity through 3RACHA.'),
(32, 'leeknow-base', 'Lee Know', 'Lee Know', 'Stray Kids', 'stray-kids', 'Main dancer, Vocal', 'Base', ARRAY['4th gen','Dance machine'], 'R', 'Lee Minho, known as Lee Know, is the main dancer of Stray Kids. Famous for his precise technique and cat-loving personality.'),
(33, 'changbin-base', 'Changbin', 'Changbin', 'Stray Kids', 'stray-kids', 'Main rapper, Producer', 'Base', ARRAY['4th gen','3RACHA'], 'R', 'Seo Changbin is the main rapper and a key producer of Stray Kids through 3RACHA. Known for his powerful delivery.'),
(34, 'hyunjin-base', 'Hyunjin', 'Hyunjin', 'Stray Kids', 'stray-kids', 'Main dancer, Visual', 'Base', ARRAY['4th gen','Performance','Art'], 'R', 'Hwang Hyunjin is the main dancer and visual of Stray Kids. Also a talented visual artist and painter.'),
(35, 'han-base', 'Han', 'Han', 'Stray Kids', 'stray-kids', 'Rapper, Vocal, Producer', 'Base', ARRAY['4th gen','3RACHA','All-rounder'], 'R', 'Han Jisung, known as Han, is a rapper, vocalist, and producer. One of the most versatile members and key songwriter.'),
(36, 'felix-base', 'Felix', 'Felix', 'Stray Kids', 'stray-kids', 'Dancer, Rapper', 'Base', ARRAY['4th gen','Australian','Deep voice'], 'R', 'Lee Felix is a dancer and rapper known for his remarkably deep voice contrasting his youthful appearance. Born in Sydney.'),
(37, 'seungmin-base', 'Seungmin', 'Seungmin', 'Stray Kids', 'stray-kids', 'Main vocal', 'Base', ARRAY['4th gen','Vocal'], 'R', 'Kim Seungmin is the main vocalist of Stray Kids. Known for his stable and clear vocal technique.'),
(38, 'in-base', 'I.N', 'I.N', 'Stray Kids', 'stray-kids', 'Vocal, Maknae', 'Base', ARRAY['4th gen','Maknae'], 'R', 'Yang Jeongin, known as I.N, is the vocalist and maknae (youngest) of Stray Kids.'),
(39, 'hyunjin-maxident', 'Hyunjin -- MAXIDENT', 'Hyunjin', 'Stray Kids', 'stray-kids', 'Main dancer, Visual', 'MAXIDENT (2022)', ARRAY['Era','Visual'], 'S', 'Hyunjin''s visuals during the MAXIDENT era were iconic, with fans praising his styling and stage presence.'),
(40, 'felix-deepvoice', 'Felix -- Deep Voice', 'Felix', 'Stray Kids', 'stray-kids', 'Dancer, Rapper', 'Iconic Voice', ARRAY['Deep voice','Signature'], 'S', 'A card celebrating Felix''s signature deep voice that became one of K-pop''s most recognizable vocal characteristics.'),
(41, 'han-genius', 'Han -- Genius', 'Han', 'Stray Kids', 'stray-kids', 'Rapper, Vocal, Producer', '3RACHA', ARRAY['Producer','Songwriter'], 'S', 'Celebrating Han''s role as one of the youngest and most prolific songwriters in K-pop through 3RACHA.'),
(42, 'skz-godsmenu', 'SKZ -- God''s Menu', NULL, 'Stray Kids', 'stray-kids', NULL, 'God''s Menu (2020)', ARRAY['Group','Breakthrough'], 'S', 'God''s Menu was Stray Kids'' commercial breakthrough, establishing their signature hard-hitting self-produced style.'),

-- NewJeans: 5 R + 5 S = 10 cards
(43, 'minji-base', 'Minji', 'Minji', 'NewJeans', 'newjeans', 'Leader, Vocal, Dancer', 'Base', ARRAY['4th gen','All-rounder'], 'R', 'Kim Minji is the leader of NewJeans. Known for her charisma, all-round talent, and elegant stage presence.'),
(44, 'hanni-base', 'Hanni', 'Hanni', 'NewJeans', 'newjeans', 'Vocal, Dancer', 'Base', ARRAY['4th gen','Vietnamese-Australian'], 'R', 'Pham Ngoc Han, known as Hanni, is a vocalist and dancer born in Vietnam and raised in Australia.'),
(45, 'danielle-base', 'Danielle', 'Danielle', 'NewJeans', 'newjeans', 'Vocal, Dancer', 'Base', ARRAY['4th gen','Korean-Australian'], 'R', 'Mo Danielle is a Korean-Australian vocalist and dancer known for her bright energy and bilingual charm.'),
(46, 'haerin-base', 'Haerin', 'Haerin', 'NewJeans', 'newjeans', 'Vocal, Dancer', 'Base', ARRAY['4th gen','Cat-like'], 'R', 'Kang Haerin is a vocalist and dancer of NewJeans. Famous for her calm cat-like demeanor and sharp visuals.'),
(47, 'hyein-base', 'Hyein', 'Hyein', 'NewJeans', 'newjeans', 'Vocal, Dancer, Maknae', 'Base', ARRAY['4th gen','Youngest'], 'R', 'Lee Hyein is the youngest member and maknae of NewJeans. Despite her age, she holds her own as a performer.'),
(48, 'minji-supershy', 'Minji -- Super Shy', 'Minji', 'NewJeans', 'newjeans', 'Leader, Vocal', 'Super Shy (2023)', ARRAY['Center','Viral'], 'S', 'Minji''s center performance in Super Shy became one of the defining moments of 2023 K-pop.'),
(49, 'hanni-omg', 'Hanni -- OMG', 'Hanni', 'NewJeans', 'newjeans', 'Vocal, Dancer', 'OMG (2023)', ARRAY['Center','Hit song'], 'S', 'Hanni''s performance in OMG helped propel the song to become one of NewJeans'' biggest hits.'),
(50, 'haerin-cat', 'Haerin -- Cat Girl', 'Haerin', 'NewJeans', 'newjeans', 'Vocal, Dancer', 'Fan Concept', ARRAY['Cat-like','Fan favorite'], 'S', 'A fan-favorite concept card celebrating Haerin''s iconic cat-like expressions that became a beloved meme.'),
(51, 'nj-attention', 'NewJeans -- Attention', NULL, 'NewJeans', 'newjeans', NULL, 'Attention (2022)', ARRAY['Group','Debut'], 'S', 'Attention was NewJeans'' debut single that broke the mold with its fresh, retro-inspired sound and minimal choreography approach.'),
(52, 'danielle-hypeboy', 'Danielle -- Hype Boy', 'Danielle', 'NewJeans', 'newjeans', 'Vocal, Dancer', 'Hype Boy (2022)', ARRAY['Debut','Iconic'], 'S', 'Danielle''s charm in the Hype Boy performance version made it one of the most-watched K-pop debut videos.')
ON CONFLICT (slug) DO NOTHING;
