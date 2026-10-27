-- Lot (e) part 1, lane K1: branch-only seed for o1-scratch (never a migration, never applied to o1-dev or production).
--
-- What:   inserts the two production rows that 009 and the daily quiz depend on and that a branch without data lacks:
--         the system author of the daily quiz (auth.users and profiles row 00000000-0000-0000-0000-000000000001, username
--         'kpopquizz', as production's migration 039 names it) and the fallback group 'general-kpop' (site kpop).
-- Why:    009 sets sites.system_user_id for kpop (a foreign key to profiles) and the daily equivalence runs the fallback group.
--         Production has both rows already, so no migration creates them.
-- Rows:   2 rows (1 auth user, 1 profile) plus the 1 group; every insert is guarded, a second run changes nothing.
-- Needs:  nothing (works before or after 003: the kpop membership row of the profile is created by 003's trigger when present).
-- Verify: select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001';   expect 1
--         select count(*) from public.groups where slug = 'general-kpop';                            expect 1

set client_min_messages = warning;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'kpopquizz@o1-scratch.invalid', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, username, avatar_bg, avatar_text)
values ('00000000-0000-0000-0000-000000000001', 'kpopquizz', '#222222', 'K')
on conflict (id) do nothing;

insert into public.groups (name, slug, display_color, text_color)
select 'General K-Pop', 'general-kpop', '#7c3aed', '#ffffff'
where not exists (select 1 from public.groups where slug = 'general-kpop');
