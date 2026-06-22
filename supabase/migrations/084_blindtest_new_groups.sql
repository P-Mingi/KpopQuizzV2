-- Add new groups for blindtest expansion + link existing songs to group_ids.
-- Run on the QUIZ project (rdkgouofytwfdpbxbzio).

-- ============================================
-- 1. Insert missing groups
-- ============================================

INSERT INTO public.groups (name, slug, fandom_name, display_color, text_color, is_custom, created_by_user) VALUES
  ('ILLIT',              'illit',           'GLLIT',       '#F5E6F0', '#6B1A5E', false, false),
  ('KISS OF LIFE',       'kiss-of-life',    'KISSY',       '#FFE4E1', '#8B0000', false, false),
  ('BOYNEXTDOOR',        'boynextdoor',     'NEXTIE',      '#E8F0FE', '#1A3D7C', false, false),
  ('RIIZE',              'riize',           'BRIIZE',      '#E6F5E8', '#1A5E2B', false, false),
  ('ZEROBASEONE',        'zerobaseone',     'ZEROSE',      '#F0E6F5', '#3D1A7C', false, false),
  ('P1Harmony',          'p1harmony',       'P1ECE',       '#E6EFF5', '#1A3D5E', false, false),
  ('Billlie',            'billlie',         'Belllie''ve', '#F5F0E6', '#5E4A1A', false, false),
  ('fromis_9',           'fromis-9',        'flover',      '#FFF0F5', '#7C1A3D', false, false),
  ('XIKERS',             'xikers',          'XIKERS',      '#E6E6F5', '#2B1A5E', false, false),
  ('PURPLE KISS',        'purple-kiss',     'Plory',       '#F0E6F5', '#5E1A7C', false, false),
  ('tripleS',            'triples',         'WAV',         '#F5E6EA', '#7C1A3D', false, false),
  ('TWS',                'tws',             'TWogether',   '#E6F0F5', '#1A4A5E', false, false),
  ('Hwasa',              'hwasa',           'TWIT',        '#F5E8E6', '#7C2B1A', false, false),
  ('JEON SOMI',          'jeon-somi',       'GOMIS',       '#FFF5E6', '#7C5E1A', false, false),
  ('BIBI',               'bibi',            'BIBI',        '#E6F5F0', '#1A5E4A', false, false),
  ('Heize',              'heize',           'Heize',       '#F0F5E6', '#3D5E1A', false, false),
  ('2PM',                '2pm',             'HOTTEST',     '#E6E8F5', '#1A2B7C', false, false),
  ('FIFTY FIFTY',        'fifty-fifty',     'FLOVER',      '#F5F5E6', '#5E5E1A', false, false),
  ('KATSEYE',            'katseye',         'EYEKON',      '#E6F5F5', '#1A5E5E', false, false),
  ('Girls'' Generation', 'girls-generation','SONE',        '#FFE4F0', '#8B1A5E', false, false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. Link existing songs to group_ids
--    Songs already have gender/generation set; just need group_id.
-- ============================================

-- Helper: update songs.group_id by matching artist_name to groups.name
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT g.id AS gid, g.name AS gname FROM public.groups g
    WHERE g.slug IN (
      'illit','kiss-of-life','boynextdoor','riize','zerobaseone',
      'p1harmony','billlie','fromis-9','xikers','purple-kiss',
      'triples','tws','hwasa','bibi','heize','2pm',
      'girls-generation','akmu'
    )
  LOOP
    UPDATE public.songs
       SET group_id = r.gid
     WHERE artist_name = r.gname
       AND group_id IS NULL;
  END LOOP;
END;
$$;

-- Special cases where artist_name != group name
UPDATE public.songs SET group_id = (SELECT id FROM public.groups WHERE slug = 'jeon-somi')
  WHERE artist_name = 'Somi' AND group_id IS NULL;

UPDATE public.songs SET group_id = (SELECT id FROM public.groups WHERE slug = 'xikers')
  WHERE artist_name = 'XIKERS' AND group_id IS NULL;

-- BABYMONSTER already has group_id=63, verify
-- AKMU already has group entry id=31
UPDATE public.songs SET group_id = 31
  WHERE artist_name = 'AKMU' AND group_id IS NULL;
