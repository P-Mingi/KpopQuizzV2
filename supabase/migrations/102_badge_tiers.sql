-- 102 - Tiered badge rows + distinct tier art (M1.15 addendum). Seeds the
-- streak (7 / 30 / 100) and creator (bronze / silver / gold) tier badges, each
-- pointing at its OWN keyed, transparent PNG in public/badges (served at
-- /badges/*.png). Art was de-checkerboarded to real alpha (inside + outside the
-- ring) and verified transparent on light and dark surfaces.
--
-- Depends on 101 (adds badge_definitions.icon). Idempotent: re-running only
-- refreshes name/description/colors/icon.
--
-- NOTE: this seeds the DEFINITIONS + icons only. The award rules (the SQL that
-- inserts user_badges when a streak hits 7/30/100 or a creator crosses a tier)
-- are intentionally NOT written here - those thresholds/triggers are yours to
-- confirm, same as the earlier new-badge proposals. The rows are harmless until
-- an award path grants them, and the icons are wired + pinnable now.

insert into public.badge_definitions
  (id, name, description, icon_type, color_bg, color_stroke, color_text, sort_order, icon) values
  ('streak_7',        'Streak: 7 days',     'Reach a 7 day play streak',    'flame', '#F7ECE3', '#C98A5E', '#6B3F1D', 20, '/badges/streak_7.png'),
  ('streak_30',       'Streak: 30 days',    'Reach a 30 day play streak',   'flame', '#EEF1F4', '#9AA7B2', '#3A454E', 21, '/badges/streak_30.png'),
  ('streak_100',      'Streak: 100 days',   'Reach a 100 day play streak',  'flame', '#FBF1D6', '#E0B544', '#6B4E0E', 22, '/badges/streak_100.png'),
  ('creator_bronze',  'Creator: Bronze',    'Bronze creator tier',          'mic',   '#F7ECE3', '#C98A5E', '#6B3F1D', 23, '/badges/creator_bronze.png'),
  ('creator_silver',  'Creator: Silver',    'Silver creator tier',          'mic',   '#EEF1F4', '#9AA7B2', '#3A454E', 24, '/badges/creator_silver.png'),
  ('creator_gold',    'Creator: Gold',      'Gold creator tier',            'mic',   '#FBF1D6', '#E0B544', '#6B4E0E', 25, '/badges/creator_gold.png')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon_type = excluded.icon_type,
  color_bg = excluded.color_bg,
  color_stroke = excluded.color_stroke,
  color_text = excluded.color_text,
  sort_order = excluded.sort_order,
  icon = excluded.icon;
