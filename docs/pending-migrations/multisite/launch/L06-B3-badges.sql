-- launch/L06-B3-badges.sql (run O1, lane L1 for B3; manifest.md row 25; BACKLOG 4.1)
--
-- What:   defines the six badges of the anime world in public.badge_definitions, site_id 'anime'. award_world_xp (007) awards a badge
--         only when the world defines it: a row with site_id = p_site and id = p_site || '_' || <rule>, for the six rules it runs
--         (first_steps, dedicated_fan, multi_stan on a play; quiz_maker, prolific_creator on a create; community_star on a like
--         received). Until this file is applied no badge is ever awarded on OtakuQuiz. Same names, texts, glyph types and colours
--         as the kpop badges of the same rule (migration 009), so the shelf reads the same; icon is null (the medallion is drawn).
--         The hub awards no badge at launch: nothing is defined for it.
-- Why:    the contract of 007 (header, "Until a world defines them (launch, L06) no badge is ever awarded") and manifest.md row 25:
--         `select count(*) from badge_definitions where site_id <> 'kpop'` is 0 before launch, 6 after this file.
-- Rows:   6 rows inserted into public.badge_definitions (anime_first_steps, anime_quiz_maker, anime_prolific_creator,
--         anime_multi_stan, anime_dedicated_fan, anime_community_star). A second run rewrites the same values.
-- Verify: select id, name, site_id from public.badge_definitions where site_id <> 'kpop' order by sort_order;   expect the six anime rows
--         select count(*) from public.badge_definitions where site_id = 'kpop' and id like 'anime\_%';   expect 0
-- Undo:   launch/L06-B3-badges.rollback.sql (refused once a member holds one of them).
-- Needs:  L01 (the anime row of sites), 002a (badge_definitions.site_id), 007.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if not exists (select 1 from public.sites where id = 'anime') then
    raise exception 'L06-B3-badges: the anime row of sites is missing (apply L01 first)';
  end if;
  if not exists (select 1 from pg_attribute a where a.attrelid = to_regclass('public.badge_definitions') and a.attname = 'site_id' and not a.attisdropped) then
    raise exception 'L06-B3-badges: badge_definitions.site_id is missing (apply 002a first)';
  end if;
  if exists (select 1 from public.badge_definitions where id like 'anime\_%' and site_id <> 'anime') then
    raise exception 'L06-B3-badges: an anime_ badge id belongs to another site';
  end if;
end $$;

insert into public.badge_definitions (id, name, description, icon_type, color_bg, color_stroke, color_text, sort_order, icon, site_id) values
  ('anime_first_steps',      'First steps',      'Play your first quiz',                  'checkmark', '#EAF3DE', '#97C459', '#27500A', 1, null, 'anime'),
  ('anime_quiz_maker',       'Quiz maker',       'Create your first quiz',                'create',    '#EEEDFE', '#AFA9EC', '#3C3489', 2, null, 'anime'),
  ('anime_prolific_creator', 'Prolific creator', 'Create 10 quizzes',                     'stack',     '#E6F1FB', '#85B7EB', '#0C447C', 5, null, 'anime'),
  ('anime_multi_stan',       'Multi-fan',        'Play quizzes from 10 or more series',   'globe',     '#E1F5EE', '#5DCAA5', '#085041', 7, null, 'anime'),
  ('anime_dedicated_fan',    'Dedicated fan',    'Play 100 quizzes',                      'trophy',    '#FAEEDA', '#EF9F27', '#633806', 8, null, 'anime'),
  ('anime_community_star',   'Community star',   'Receive 100 likes across your quizzes', 'heart',     '#FBEAF0', '#ED93B1', '#72243E', 9, null, 'anime')
on conflict (id) do update
  set name = excluded.name, description = excluded.description, icon_type = excluded.icon_type, color_bg = excluded.color_bg,
      color_stroke = excluded.color_stroke, color_text = excluded.color_text, sort_order = excluded.sort_order,
      icon = excluded.icon, site_id = excluded.site_id
  where public.badge_definitions.site_id = 'anime';

do $$
begin
  if (select count(*) from public.badge_definitions where site_id = 'anime' and id in
        ('anime_first_steps', 'anime_quiz_maker', 'anime_prolific_creator', 'anime_multi_stan', 'anime_dedicated_fan', 'anime_community_star')) <> 6 then
    raise exception 'L06-B3-badges: the six anime badges are not all defined';
  end if;
end $$;
