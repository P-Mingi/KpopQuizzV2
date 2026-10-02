-- WHAT: the KPop Demon Hunters soundtrack songs, with their own non-active status 'soundtrack'.
-- WHY: the kpop-demon-hunters blindtest playlist (growth v12, SYSTEM.md 4). The songs of the film's fictional acts
--   (HUNTR/X, Saja Boys, Rumi and Jinu) and the two soundtrack songs by acts that are not in the catalogue
--   (MeloMance, Jokers) must be playable in that playlist only: never in the daily, the all-songs pool, a group
--   playlist, ranked, search or a song count. Every one of those readers asks for status = 'active'
--   (proof: docs/design/growth-v12/run/reports/G2.md, "Reader proof"), so a status of their own keeps them out.
--   The two TWICE songs of the soundtrack are already active TWICE rows; they keep their group and are not touched.
-- ROWS: 1 constraint change (songs.status may also be 'soundtrack'), 10 insert(s) into songs.
-- SOURCE: track list = the label's store pages and the soundtrack's reference article (docs/growth/catalogue/v12-g2-07-kpdh.md);
--   every row value = the public Deezer API.
-- GENERATED: apps/quiz/scripts/v12/catalogue/build-kpdh-sql.mts (anon key, nothing written), 2026-10-02T16:31:06.441Z.
-- IDEMPOTENT: the constraint block drops and re-adds the same check; each insert re-checks deezer_track_id and ends
--   with on conflict do nothing. Safe to run twice.
-- APPLY ORDER: any time, before or after the feat/v12 merge. origin/main (a94d77c) and feat/v12 carry the same
--   readers of `songs`, and none of them can show a row of this status (same proof). With the v12 flag off the
--   rows are simply unread.
-- VERIFY: select status, count(*) from songs where deezer_track_id in (3412534551, 3412534561, 3412534581, 3412534601, 3412534611, 3412534621, 3412534631, 3541756631, 3412534641, 3412534651) group by 1;  -- soundtrack, 10
--   select count(*) from songs where status = 'soundtrack' and (group_id is not null or is_curated);  -- 0
-- UNDO: delete from songs where status = 'soundtrack';
--   then: alter table public.songs drop constraint songs_status_check;
--         alter table public.songs add constraint songs_status_check check (status in ('active', 'inactive', 'review'));

begin;

-- 1. Allow the new status. The check was created inline (status IN ('active', 'inactive', 'review')); it is found
--    by its definition, whatever its name, then re-created under the default name.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.songs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~* '\mstatus\M'
  loop
    execute format('alter table public.songs drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.songs add constraint songs_status_check check (status in ('active', 'inactive', 'review', 'soundtrack'));

-- 2. The songs.

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534551, 'How It’s Done', 'HUNTR/X', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/3/5/0/735284bd0bce17bd5a972d24ca4b2303.mp3?hdnea=exp=1790959565~acl=/api/1/1/7/3/5/0/735284bd0bce17bd5a972d24ca4b2303.mp3*~data=user_id=0,application_id=42~hmac=ce54f4cfe2a9db0bf9d3195bb8f9d855bff563ef309d7c5ec5e2067616b6872f', 176, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 855958
where not exists (select 1 from songs where deezer_track_id = 3412534551)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534561, 'Soda Pop', 'Saja Boys', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/5/8/0/f589f90d66f196a10adfb6c67f5400eb.mp3?hdnea=exp=1790959565~acl=/api/1/1/f/5/8/0/f589f90d66f196a10adfb6c67f5400eb.mp3*~data=user_id=0,application_id=42~hmac=73bcca0679b6b708ff9356825fc4f7b23eeee9a47dad5a359cee9695402d5884', 150, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 806817
where not exists (select 1 from songs where deezer_track_id = 3412534561)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534581, 'Golden', 'HUNTR/X', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/2/4/0/4248b99b2d0450e4cb0e4c811e422d1b.mp3?hdnea=exp=1790959565~acl=/api/1/1/4/2/4/0/4248b99b2d0450e4cb0e4c811e422d1b.mp3*~data=user_id=0,application_id=42~hmac=431166dd389cf2b90d40716cbb700dd5482ca39b849cfeb040d6181fa40505d1', 192, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 979012
where not exists (select 1 from songs where deezer_track_id = 3412534581)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534601, 'Takedown', 'HUNTR/X', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/9/7/0/d972e7cbb1347d1e34a57d4fcaf99c8b.mp3?hdnea=exp=1790959565~acl=/api/1/1/d/9/7/0/d972e7cbb1347d1e34a57d4fcaf99c8b.mp3*~data=user_id=0,application_id=42~hmac=d9966e8c81a268324734ebabb5e5ce515c62002740c48a6401d50e38e8aee3a5', 182, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 832269
where not exists (select 1 from songs where deezer_track_id = 3412534601)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534611, 'Your Idol', 'Saja Boys', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/d/2/0/ed234040dbc27743451ee476b23df85b.mp3?hdnea=exp=1790959566~acl=/api/1/1/e/d/2/0/ed234040dbc27743451ee476b23df85b.mp3*~data=user_id=0,application_id=42~hmac=e8ea906116ee7674ba4d0fac168c1ff99bca7fa7a412e71b0dc43076489bb7fb', 191, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 814735
where not exists (select 1 from songs where deezer_track_id = 3412534611)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534621, 'Free', 'Rumi and Jinu', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/c/9/0/cc9f7a2df799005a405dd9b49fc759ef.mp3?hdnea=exp=1790959566~acl=/api/1/1/c/c/9/0/cc9f7a2df799005a405dd9b49fc759ef.mp3*~data=user_id=0,application_id=42~hmac=3a41255a425f98db220e0e95ce1d74926427f91464e15dc39bbb17c30aa634ec', 187, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 817645
where not exists (select 1 from songs where deezer_track_id = 3412534621)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534631, 'What It Sounds Like', 'HUNTR/X', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/9/6/0/696ad5ce7cdd962cbbc5480cdead1c73.mp3?hdnea=exp=1790959566~acl=/api/1/1/6/9/6/0/696ad5ce7cdd962cbbc5480cdead1c73.mp3*~data=user_id=0,application_id=42~hmac=98ae3eb3d9382992696ddecd06df6c8d9fe28b40a89e7264d47e1402ad2c4054', 250, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 819584
where not exists (select 1 from songs where deezer_track_id = 3412534631)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3541756631, 'Jinu’s Lament', 'Jinu', 'KPop Demon Hunters (Soundtrack from the Netflix Film / Deluxe Version)', 'https://cdn-images.dzcdn.net/images/cover/434f1fffb44056916ce763de4ce3c10a/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/434f1fffb44056916ce763de4ce3c10a/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/434f1fffb44056916ce763de4ce3c10a/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/1/f/0/d1fcadb2d9b43ca4ad3b5d010a649684.mp3?hdnea=exp=1790959566~acl=/api/1/1/d/1/f/0/d1fcadb2d9b43ca4ad3b5d010a649684.mp3*~data=user_id=0,application_id=42~hmac=22fdb4e8c0bbc8687f9a9c6f36b84310c94ac520d760414e5255bdde7792f223', 47, NULL, NULL, NULL, NULL, 2025, NULL, '{}', '{}', 'soundtrack', false, NULL, 423236
where not exists (select 1 from songs where deezer_track_id = 3541756631)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534641, '사랑인가 봐 Love, Maybe', 'MeloMance', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/c/0/0/dc054201c585b816f94a1d8c72ec473e.mp3?hdnea=exp=1790959566~acl=/api/1/1/d/c/0/0/dc054201c585b816f94a1d8c72ec473e.mp3*~data=user_id=0,application_id=42~hmac=b451616c39d48c9a2f37660ef09bc697f10106dcbb89c540b9f2f4c7276f4331', 185, NULL, NULL, NULL, NULL, NULL, 'korean', '{}', '{}', 'soundtrack', false, NULL, 577013
where not exists (select 1 from songs where deezer_track_id = 3412534641)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3412534651, '오솔길 Path', 'Jokers', 'KPop Demon Hunters (Soundtrack from the Netflix Film)', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e54bda0628749119f7a9a05b71b40283/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/3/7/0/237da26c7a5d2e2d44f71c3ecf6bdecd.mp3?hdnea=exp=1790959566~acl=/api/1/1/2/3/7/0/237da26c7a5d2e2d44f71c3ecf6bdecd.mp3*~data=user_id=0,application_id=42~hmac=b75930e7995a0178d0df3b12419926d89b3095ebc705403fb603fe33779cdf1e', 223, NULL, NULL, NULL, NULL, NULL, 'korean', '{}', '{}', 'soundtrack', false, NULL, 510058
where not exists (select 1 from songs where deezer_track_id = 3412534651)
on conflict do nothing;

commit;
