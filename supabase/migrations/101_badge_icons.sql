-- 101 - Badge art icons (M1.15 addendum). Adds an `icon` column to
-- badge_definitions and points the 3 EXISTING badges whose meaning exactly
-- matches the owner's staged art at their cleaned PNGs (public/badges/, served
-- at /badges/*.png). Art was de-checkerboarded to real alpha + verified
-- transparent on light and dark surfaces.
--
-- Render still falls back to the current placeholder when icon IS NULL, so this
-- is safe to apply before the render wiring lands (M1.15 proper).

alter table public.badge_definitions
  add column if not exists icon text;  -- public path to transparent PNG, e.g. /badges/perfect_score.png

-- Exact concept matches against the existing seed (mig 009). Safe now.
update public.badge_definitions set icon = '/badges/first_quiz_played.png'  where id = 'first_steps';   -- "Play your first quiz"
update public.badge_definitions set icon = '/badges/first_quiz_created.png' where id = 'quiz_maker';    -- "Create your first quiz"
update public.badge_definitions set icon = '/badges/perfect_score.png'      where id = 'perfect_score';  -- "Score 100% on any quiz"

-- =====================================================================
-- PROPOSAL ONLY - NOT EXECUTED. The remaining 4 staged art files map to
-- NEW concepts the owner described, which have no row in the current seed
-- and (for streak + creator) are TIERED. Creating them needs decisions you
-- own: badge id, display copy, the AWARD rule (threshold/trigger), and for
-- the tiered ones a tier mechanism + 3 renders each (only 1 render exists
-- per tier so far). Left commented so nothing is fabricated.
--
--   staged art                       intended concept            tier?
--   /badges/group_mastered.png       master a single group       no
--   /badges/streak.png               play streak                 yes (7 / 30 / 100)
--   /badges/creator_tier.png         creator milestone           yes (bronze / silver / gold)
--   /badges/founding_fan.png         founding / early fan        no
--
-- Example shape once you confirm ids + award logic (award fn lives in SQL like
-- award_xp in mig 009; not written here):
--
-- insert into public.badge_definitions
--   (id, name, description, icon_type, color_bg, color_stroke, color_text, sort_order, icon) values
--   ('group_master', 'Group master', '<award rule>', 'crown', '#FAEEDA', '#EF9F27', '#633806', 10, '/badges/group_mastered.png'),
--   ('founding_fan',  'Founding fan', '<award rule>', 'gem',   '#FBEAF0', '#ED93B1', '#72243E', 11, '/badges/founding_fan.png')
-- on conflict (id) do update set icon = excluded.icon;
-- =====================================================================
