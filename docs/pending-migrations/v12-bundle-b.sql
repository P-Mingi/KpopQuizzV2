-- V12 bundle B (owner request, 2026-10-03). Run it AFTER v12-bundle-a.sql (file 6 resolves group ids from the
-- groups and songs of files 4 and 5). Three files of docs/design/growth-v12/run/SQL-PENDING.md, in this order, each
-- in its own transaction (each file opens and commits its own), copied verbatim between "FILE" markers:
--   6  v12-g2-03b-releases-2026-filtered.sql  (the 2026 releases without the 5 titles the owner left out)
--   9  v12-g2-06-title-tracks.sql              (run again, so the title tracks of the new 2026 songs are flagged)
--   8  v12-g2-05-years-backfill.sql            (owner go, 2026-10-03, after the 30-row sample)
-- Every file is idempotent. The SQL editor stops at the first error: the files before it stay applied; fix and re-run
-- from that file. The verification grid at the end is read only; every line should read ok = true.

-- ====================================================================================================
-- FILE 6: v12-g2-03b-releases-2026-filtered.sql
-- ====================================================================================================
-- FILTERED (owner, 2026-10-03): this is v12-g2-03-releases-2026.sql without the 5 titles the owner left out:
--   4093308791 FIFTY FIFTY, My Wonder (TV soundtrack)
--   4093308781 FIFTY FIFTY, Hopping (TV soundtrack)
--   3789861432 FIFTY FIFTY, Still In Time (drama soundtrack)
--   4275199122 KISS OF LIFE, Was It You (Japanese EP)
--   4130517771 YOUNG POSSE, title with a swear word
-- Apply this file INSTEAD of v12-g2-03-releases-2026.sql, after v12-g2-01 and v12-g2-02.
-- WHAT: 2026 releases of the groups already in the catalogue
-- WHY: No song has year = 2026, so the kpop-hits-2026 playlist is empty (growth v12, SYSTEM.md 3 and 4).
-- ROWS: 141 insert(s) into songs, 0 update statement(s) linking stored songs to their group row.
--   Source of every row: the public Deezer API (track id, title, album, cover, preview, rank, release year).
-- GENERATED: apps/quiz/scripts/ingest-blindtest-songs.mts, dry run with the anon key, 2026-10-02T16:46:21.590Z.
--   Nothing was written to the database by the script. Report: the .md file of the same name in docs/growth/catalogue/.
-- IDEMPOTENT: each insert re-checks deezer_track_id (unique) and ends with on conflict do nothing; each update only
--   touches rows whose group_id is still null. Safe to run twice.
-- APPLY ORDER: after v12-g2-01-groups.sql and v12-g2-02-songs-new-groups.sql (rows of NCT WISH and Hearts2Hearts resolve their group from the slug).
-- VERIFY: select count(*) from songs where deezer_track_id in (4090868561, 4070183671, 4090868571, 4265679302, 4265679292, 4265679332, 4140165301, 4270604242, 3775213592, 4149903382, 4270077462, 4198523812, 3920191761, 3920191731, 3920191771, 4143495621, 4173826002, 4173826032, 4027935751, 4027935761, 4027935781, 3986645071, 3986645031, 4056495431, 4223081212, 3866248801, 4311096852, 4311096862, 4311096962, 4076508981, 3907717251, 4235827392, 4235827382, 4285321022, 4285321042, 4285321052, 4232461262, 4232461242, 4232461272, 3770700232, 3770700242, 3770700282, 4157622882, 4157622942, 4157622932, 4306345672, 3878249061, 4197249182, 4258073911, 4283728522, 4166644212, 3928303661, 4021131311, 4021131291, 4021131301, 4018650521, 4184612222, 4184600862, 4157200522, 4157200552, 4157200532, 4159582602, 4208732332, 4208732352, 3928840871, 3928840861, 3928840881, 4204204872, 4204204882, 4204204862, 4164951472, 4164951482, 4274980322, 4076509001, 4274980332, 4264198082, 4258718131, 4258718151, 4296041062, 4293635102, 4208809742, 4208809762, 4208809752, 3946155691, 3946155701, 3946155731, 4284865992, 4284865982, 4284866022, 4223440872, 4223441002, 4223441012, 4142993731, 4142993741, 4237086082, 3939893671, 4248967941, 3929165981, 4289476362, 4178965332, 4178965352, 4178965342, 4275029852, 4275029862, 4275029882, 4051286221, 4051286231, 4174060712, 3856634281, 4236763352, 4236763332, 4236763382, 4063867901, 4063867911, 4063867921, 4204153972, 4103855641, 4204153982, 4049214851, 4049214881, 4049214861, 4233237592, 4217012982, 4172467752, 4179963532, 4179963542, 4073624071, 4212946562, 4212946572, 3950788701, 4260806001, 4289452762, 4258150901, 4173621912, 4173621922, 4173621942, 4293055462, 4130517741, 4167244632, 4167244612, 3802892402);  -- expect 141
-- UNDO: delete from songs where deezer_track_id in (4090868561, 4070183671, 4090868571, 4265679302, 4265679292, 4265679332, 4140165301, 4270604242, 3775213592, 4149903382, 4270077462, 4198523812, 3920191761, 3920191731, 3920191771, 4143495621, 4173826002, 4173826032, 4027935751, 4027935761, 4027935781, 3986645071, 3986645031, 4056495431, 4223081212, 3866248801, 4311096852, 4311096862, 4311096962, 4076508981, 3907717251, 4235827392, 4235827382, 4285321022, 4285321042, 4285321052, 4232461262, 4232461242, 4232461272, 3770700232, 3770700242, 3770700282, 4157622882, 4157622942, 4157622932, 4306345672, 3878249061, 4197249182, 4258073911, 4283728522, 4166644212, 3928303661, 4021131311, 4021131291, 4021131301, 4018650521, 4184612222, 4184600862, 4157200522, 4157200552, 4157200532, 4159582602, 4208732332, 4208732352, 3928840871, 3928840861, 3928840881, 4204204872, 4204204882, 4204204862, 4164951472, 4164951482, 4274980322, 4076509001, 4274980332, 4264198082, 4258718131, 4258718151, 4296041062, 4293635102, 4208809742, 4208809762, 4208809752, 3946155691, 3946155701, 3946155731, 4284865992, 4284865982, 4284866022, 4223440872, 4223441002, 4223441012, 4142993731, 4142993741, 4237086082, 3939893671, 4248967941, 3929165981, 4289476362, 4178965332, 4178965352, 4178965342, 4275029852, 4275029862, 4275029882, 4051286221, 4051286231, 4174060712, 3856634281, 4236763352, 4236763332, 4236763382, 4063867901, 4063867911, 4063867921, 4204153972, 4103855641, 4204153982, 4049214851, 4049214881, 4049214861, 4233237592, 4217012982, 4172467752, 4179963532, 4179963542, 4073624071, 4212946562, 4212946572, 3950788701, 4260806001, 4289452762, 4258150901, 4173621912, 4173621922, 4173621942, 4293055462, 4130517741, 4167244632, 4167244612, 3802892402);

begin;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4090868561, 'Gimme Dat Love', '(G)I-DLE', 'We made', 'https://cdn-images.dzcdn.net/images/cover/8c12bc2e91893940b45a31415e60245b/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c12bc2e91893940b45a31415e60245b/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c12bc2e91893940b45a31415e60245b/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/4/1/0/041e3f2e8f9946ad25f6ec605449ece8.mp3?hdnea=exp=1790960307~acl=/api/1/1/0/4/1/0/041e3f2e8f9946ad25f6ec605449ece8.mp3*~data=user_id=0,application_id=42~hmac=12eeb21332aded432b074eb8f0827a600ed9e9fbabeec4d559fbf4f703e1c6bc', 146, (select id from groups where slug = 'g-i-dle'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 531757
where not exists (select 1 from songs where deezer_track_id = 4090868561)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4070183671, 'Crow', '(G)I-DLE', 'Crow', 'https://cdn-images.dzcdn.net/images/cover/e166540b3bf9db11e3d3b4999e2dfd29/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e166540b3bf9db11e3d3b4999e2dfd29/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e166540b3bf9db11e3d3b4999e2dfd29/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/2/b/0/52b52672353760406b7162d48b72aab0.mp3?hdnea=exp=1790960307~acl=/api/1/1/5/2/b/0/52b52672353760406b7162d48b72aab0.mp3*~data=user_id=0,application_id=42~hmac=2e3285ff46e7af61ef4be012357a71f3b2b00e1b4d9a26df71bc7043bd733f34', 191, (select id from groups where slug = 'g-i-dle'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 491156
where not exists (select 1 from songs where deezer_track_id = 4070183671)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4090868571, 'Morning', '(G)I-DLE', 'We made', 'https://cdn-images.dzcdn.net/images/cover/8c12bc2e91893940b45a31415e60245b/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c12bc2e91893940b45a31415e60245b/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c12bc2e91893940b45a31415e60245b/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/7/b/0/17b36245e525b8ee0c201266d2ce91b9.mp3?hdnea=exp=1790960307~acl=/api/1/1/1/7/b/0/17b36245e525b8ee0c201266d2ce91b9.mp3*~data=user_id=0,application_id=42~hmac=0bca525f940827f0ad271205a07582ce782b6a8f4b25c69f1eec332c2859250f', 170, (select id from groups where slug = 'g-i-dle'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 460120
where not exists (select 1 from songs where deezer_track_id = 4090868571)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4265679302, 'Good Boy', '&TEAM', 'Mark on Me', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/0/d/0/00dffb7852b4b7f74a104294b51538b3.mp3?hdnea=exp=1790960308~acl=/api/1/1/0/0/d/0/00dffb7852b4b7f74a104294b51538b3.mp3*~data=user_id=0,application_id=42~hmac=5371e782c715b1ed3e7e9ddaa1e71352314d146f286c53f246adc8edd195adc0', 153, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 633903
where not exists (select 1 from songs where deezer_track_id = 4265679302)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4265679292, 'Mark on Me', '&TEAM', 'Mark on Me', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/1/3/0/213d8158443f0265c011f2527153318d.mp3?hdnea=exp=1790960308~acl=/api/1/1/2/1/3/0/213d8158443f0265c011f2527153318d.mp3*~data=user_id=0,application_id=42~hmac=79b7ee7e0fc5381f8eb7249226ac51e43a01b569f35c0119b10a992a90197a84', 171, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 562108
where not exists (select 1 from songs where deezer_track_id = 4265679292)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4265679332, 'Empty', '&TEAM', 'Mark on Me', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7237e436636a40759f505d25a1fdd6f/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/a/2/0/aa2d11a0bacf6c4e8d615c240929b479.mp3?hdnea=exp=1790960308~acl=/api/1/1/a/a/2/0/aa2d11a0bacf6c4e8d615c240929b479.mp3*~data=user_id=0,application_id=42~hmac=8bcee7083e544e8785d8dd616a3cb8ce045346c0ff984a85c7869b213af449ae', 176, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 459942
where not exists (select 1 from songs where deezer_track_id = 4265679332)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4140165301, 'Stagefright', '8TURN', '[8.X]', 'https://cdn-images.dzcdn.net/images/cover/4259c0191e4e0522073692e1fe62f76f/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/4259c0191e4e0522073692e1fe62f76f/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/4259c0191e4e0522073692e1fe62f76f/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/f/a/0/ffac3a220fead12467dd5123808b7570.mp3?hdnea=exp=1790960311~acl=/api/1/1/f/f/a/0/ffac3a220fead12467dd5123808b7570.mp3*~data=user_id=0,application_id=42~hmac=24543afc71dc85e1c161d504ee4d46bce3d9205a8d84f2f5b2e1966fc890ad38', 160, NULL, 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 366988
where not exists (select 1 from songs where deezer_track_id = 4140165301)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4270604242, 'BESAME', '8TURN', 'BESAME', 'https://cdn-images.dzcdn.net/images/cover/d8371b7c7fb7a9ad04a22df57ec531de/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/d8371b7c7fb7a9ad04a22df57ec531de/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/d8371b7c7fb7a9ad04a22df57ec531de/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/8/8/0/3887342ffbae47dcd25225147cb72735.mp3?hdnea=exp=1790960311~acl=/api/1/1/3/8/8/0/3887342ffbae47dcd25225147cb72735.mp3*~data=user_id=0,application_id=42~hmac=cfafb79939183a4cdfa17e016a52e3f9d1f669747c78fc082508b554c57dfdcb', 144, NULL, 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 294284
where not exists (select 1 from songs where deezer_track_id = 4270604242)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3775213592, 'BRUISE', '8TURN', 'The 3rd Digital Single BRUISE', 'https://cdn-images.dzcdn.net/images/cover/3ef3425770d5ded18ee315f1a58631c1/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3ef3425770d5ded18ee315f1a58631c1/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3ef3425770d5ded18ee315f1a58631c1/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/2/5/0/125e739cfe0fa3942886d0335d60991f.mp3?hdnea=exp=1790960311~acl=/api/1/1/1/2/5/0/125e739cfe0fa3942886d0335d60991f.mp3*~data=user_id=0,application_id=42~hmac=a13a170d7aaea547ab51dcd3cd5b958509595a0f8f5311961a2c1aff799dd956', 197, NULL, 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 271215
where not exists (select 1 from songs where deezer_track_id = 3775213592)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4149903382, 'KISS N TELL', 'aespa', 'KISS N TELL', 'https://cdn-images.dzcdn.net/images/cover/faa35c36c513d1725a680ebc73db86b5/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/faa35c36c513d1725a680ebc73db86b5/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/faa35c36c513d1725a680ebc73db86b5/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/6/0/0/460250c237f873bdd332adfeee7939a0.mp3?hdnea=exp=1790960315~acl=/api/1/1/4/6/0/0/460250c237f873bdd332adfeee7939a0.mp3*~data=user_id=0,application_id=42~hmac=2784ee2f27ab4887f55a472352ff2b29941aad43e96de36c4a17426f798e88a1', 166, (select id from groups where slug = 'aespa'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 734455
where not exists (select 1 from songs where deezer_track_id = 4149903382)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4270077462, '16 Bit (KARINA Solo)', 'aespa', 'SYNK : COMPLaeXITY - 2026 Special Digital Single', 'https://cdn-images.dzcdn.net/images/cover/89c7b3859738acc81759a6f24e067095/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/89c7b3859738acc81759a6f24e067095/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/89c7b3859738acc81759a6f24e067095/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/7/c/0/07c1975e79bb40dc9c78d10a88e46c34.mp3?hdnea=exp=1790960314~acl=/api/1/1/0/7/c/0/07c1975e79bb40dc9c78d10a88e46c34.mp3*~data=user_id=0,application_id=42~hmac=faa08433c0f905cde1d8a20d1fe0961ac11ad3ff7221bfe12a651442b3d44261', 228, (select id from groups where slug = 'aespa'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 555731
where not exists (select 1 from songs where deezer_track_id = 4270077462)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4198523812, 'Serenade (KARINA & WINTER)', 'aespa', 'SYNK : aeXIS LINE - 2026 Special Digital Single', 'https://cdn-images.dzcdn.net/images/cover/396110622850291fea8f28ee2cc48916/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/396110622850291fea8f28ee2cc48916/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/396110622850291fea8f28ee2cc48916/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/3/4/0/73430045042bfc15c75f8786985e844a.mp3?hdnea=exp=1790960315~acl=/api/1/1/7/3/4/0/73430045042bfc15c75f8786985e844a.mp3*~data=user_id=0,application_id=42~hmac=a03932eb2821c13d4ccfdc9c76d3a4f2508f81a6e34cea19549ec85a0f0627cc', 185, (select id from groups where slug = 'aespa'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 553946
where not exists (select 1 from songs where deezer_track_id = 4198523812)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3920191761, 'Joy, Sorrow, A Beautiful Heart', 'AKMU', 'FLOWERING', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/3/5/0/f35ea168b29206f4c86410af94349928.mp3?hdnea=exp=1790960317~acl=/api/1/1/f/3/5/0/f35ea168b29206f4c86410af94349928.mp3*~data=user_id=0,application_id=42~hmac=2208c646bbf5ecb699094cb3b68166add4c7733f9dd63fb67f70589a9b34e52f', 277, (select id from groups where slug = 'akmu'), 'coed', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 233930
where not exists (select 1 from songs where deezer_track_id = 3920191761)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3920191731, 'Paradise of Rumors', 'AKMU', 'FLOWERING', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/a/3/0/8a315cc705e2495e606fc89359efbde8.mp3?hdnea=exp=1790960317~acl=/api/1/1/8/a/3/0/8a315cc705e2495e606fc89359efbde8.mp3*~data=user_id=0,application_id=42~hmac=18839ccb7f82c0f93cecafce545a48ed7c94783d3462f8f09abc56647a5770a2', 218, (select id from groups where slug = 'akmu'), 'coed', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 224734
where not exists (select 1 from songs where deezer_track_id = 3920191731)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3920191771, 'Sunshine Bless You', 'AKMU', 'FLOWERING', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/1ab5ef459a29b087d0f85cea0e64c3a4/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/6/e/0/f6e38c1ee1ab58b9e8ae6d79281bc31b.mp3?hdnea=exp=1790960317~acl=/api/1/1/f/6/e/0/f6e38c1ee1ab58b9e8ae6d79281bc31b.mp3*~data=user_id=0,application_id=42~hmac=0e43eb87b4a37350250becccd3d78a812292b460ef9c41f7dc83077176611332', 231, (select id from groups where slug = 'akmu'), 'coed', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 191656
where not exists (select 1 from songs where deezer_track_id = 3920191771)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4143495621, 'Born Stunner', 'ARTMS', '<Born Stunner>', 'https://cdn-images.dzcdn.net/images/cover/4694e72220cdf64f895ae7ce25d5c63d/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/4694e72220cdf64f895ae7ce25d5c63d/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/4694e72220cdf64f895ae7ce25d5c63d/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/8/0/0/7807a699beec46180edff94fff20c61a.mp3?hdnea=exp=1790960320~acl=/api/1/1/7/8/0/0/7807a699beec46180edff94fff20c61a.mp3*~data=user_id=0,application_id=42~hmac=9ff4b5463a026ac35f2376ae28f190f2d430e2a4dd9028d471ac08337b6caae7', 150, (select id from groups where slug = 'artms'), 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 431058
where not exists (select 1 from songs where deezer_track_id = 4143495621)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4173826002, 'Blue Blood', 'ARTMS', '<Hyper-Ego>', 'https://cdn-images.dzcdn.net/images/cover/070ae96398453dff31382322a362b92e/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/070ae96398453dff31382322a362b92e/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/070ae96398453dff31382322a362b92e/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/9/7/0/7970b08f9fbe6afc0730be9726d37b8f.mp3?hdnea=exp=1790960320~acl=/api/1/1/7/9/7/0/7970b08f9fbe6afc0730be9726d37b8f.mp3*~data=user_id=0,application_id=42~hmac=82d184d30655529da937998de619c84fd9281d63cbdfe690d84fb17cef6902c0', 147, (select id from groups where slug = 'artms'), 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 408446
where not exists (select 1 from songs where deezer_track_id = 4173826002)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4173826032, 'Pixel Memory', 'ARTMS', '<Hyper-Ego>', 'https://cdn-images.dzcdn.net/images/cover/070ae96398453dff31382322a362b92e/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/070ae96398453dff31382322a362b92e/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/070ae96398453dff31382322a362b92e/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/a/4/0/0a4fc6baffad28735c29170fd97e978f.mp3?hdnea=exp=1790960320~acl=/api/1/1/0/a/4/0/0a4fc6baffad28735c29170fd97e978f.mp3*~data=user_id=0,application_id=42~hmac=87f07705070d94efad0ba1d93bc19e33e7e1ed632f62a770bd383cdfef56c19e', 177, (select id from groups where slug = 'artms'), 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 290817
where not exists (select 1 from songs where deezer_track_id = 4173826032)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4027935751, 'BAD', 'ATEEZ', 'GOLDEN HOUR : Part.5', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/9/4/c/0/94ce1231621f668a46cfe560cc8abe90.mp3?hdnea=exp=1790960321~acl=/api/1/1/9/4/c/0/94ce1231621f668a46cfe560cc8abe90.mp3*~data=user_id=0,application_id=42~hmac=12ec959daa3b573bb2620561314709daf07b3673f8dadaaa880a11cccb755498', 156, (select id from groups where slug = 'ateez'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 861386
where not exists (select 1 from songs where deezer_track_id = 4027935751)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4027935761, 'MAMACITA', 'ATEEZ', 'GOLDEN HOUR : Part.5', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/5/f/0/c5f19d4be0e3374cd11bf395ea9b7906.mp3?hdnea=exp=1790960321~acl=/api/1/1/c/5/f/0/c5f19d4be0e3374cd11bf395ea9b7906.mp3*~data=user_id=0,application_id=42~hmac=8aacf3c80b6aae12d5440923d7feb3a691e8eb6f5ba31bfba3ad0a2e1315df22', 189, (select id from groups where slug = 'ateez'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 623990
where not exists (select 1 from songs where deezer_track_id = 4027935761)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4027935781, 'Fallin''', 'ATEEZ', 'GOLDEN HOUR : Part.5', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f7e668fbadd214da3e3c694539845aa2/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/9/8/a/0/98af0086cc2ca7458f8f3a3e91f1deae.mp3?hdnea=exp=1790960321~acl=/api/1/1/9/8/a/0/98af0086cc2ca7458f8f3a3e91f1deae.mp3*~data=user_id=0,application_id=42~hmac=90436be5d78d6570d0e61db06893f2ac5dd6feebabee79f6776cb0807d60294e', 198, (select id from groups where slug = 'ateez'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 549535
where not exists (select 1 from songs where deezer_track_id = 4027935781)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3986645071, 'CHOOM', 'BABYMONSTER', '춤 (CHOOM)', 'https://cdn-images.dzcdn.net/images/cover/e7096154e400af2dad487e6237be3dd2/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e7096154e400af2dad487e6237be3dd2/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e7096154e400af2dad487e6237be3dd2/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/9/2/0/092a226d44fc39c5520cc7006395fb96.mp3?hdnea=exp=1790960325~acl=/api/1/1/0/9/2/0/092a226d44fc39c5520cc7006395fb96.mp3*~data=user_id=0,application_id=42~hmac=77501ac9ab4a18592368c3330723a206955529bab5c495f5b69da7ae135ae546', 178, (select id from groups where slug = 'babymonster'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 734229
where not exists (select 1 from songs where deezer_track_id = 3986645071)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3986645031, 'MOON', 'BABYMONSTER', '춤 (CHOOM)', 'https://cdn-images.dzcdn.net/images/cover/e7096154e400af2dad487e6237be3dd2/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e7096154e400af2dad487e6237be3dd2/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e7096154e400af2dad487e6237be3dd2/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/3/b/0/f3b087ee76431fb90c1b11a66e55f370.mp3?hdnea=exp=1790960325~acl=/api/1/1/f/3/b/0/f3b087ee76431fb90c1b11a66e55f370.mp3*~data=user_id=0,application_id=42~hmac=8de2b2b5592bc8212a1d8141a819115d00ce2664249131a7e2e8a46a69b37f0f', 166, (select id from groups where slug = 'babymonster'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 694526
where not exists (select 1 from songs where deezer_track_id = 3986645031)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4056495431, 'SUGAR HONEY ICE TEA', 'BABYMONSTER', 'SUGAR HONEY ICE TEA', 'https://cdn-images.dzcdn.net/images/cover/378cc060ff322a5c9c6301fc53f28aa2/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/378cc060ff322a5c9c6301fc53f28aa2/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/378cc060ff322a5c9c6301fc53f28aa2/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/c/c/0/5cc308d72b9d8b7e1cbe4c04fba9336d.mp3?hdnea=exp=1790960325~acl=/api/1/1/5/c/c/0/5cc308d72b9d8b7e1cbe4c04fba9336d.mp3*~data=user_id=0,application_id=42~hmac=5b01ef221874f6ed764d5c51ce2ccf53f68f55bdaf45857c1829f4a6f570cc35', 178, (select id from groups where slug = 'babymonster'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 688673
where not exists (select 1 from songs where deezer_track_id = 4056495431)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4223081212, 'BiiiG', 'BIGBANG', 'BiiiG', 'https://cdn-images.dzcdn.net/images/cover/b9cc78746a7c814d49711bd69f768037/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b9cc78746a7c814d49711bd69f768037/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b9cc78746a7c814d49711bd69f768037/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/d/b/0/3db438a5d5026da92088328d185e0631.mp3?hdnea=exp=1790960326~acl=/api/1/1/3/d/b/0/3db438a5d5026da92088328d185e0631.mp3*~data=user_id=0,application_id=42~hmac=4a97140f3534de5baf5f71fd67178523415c5ef690a7c1d581d41c304ee7b33d', 164, (select id from groups where slug = 'bigbang'), 'bg', '2nd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 615488
where not exists (select 1 from songs where deezer_track_id = 4223081212)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3866248801, 'Fxxxboy', 'BLACKPINK', 'DEADLINE', 'https://cdn-images.dzcdn.net/images/cover/8c2012eb608224b71d6b35f9092714ac/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c2012eb608224b71d6b35f9092714ac/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8c2012eb608224b71d6b35f9092714ac/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/c/f/0/0cf983f213b940da5a301ee130d0378b.mp3?hdnea=exp=1790960327~acl=/api/1/1/0/c/f/0/0cf983f213b940da5a301ee130d0378b.mp3*~data=user_id=0,application_id=42~hmac=c7f93ed9dad8b8e44c9557681bfabbce0e8c6d10ee3dcf0dac71d271b97d67c7', 187, (select id from groups where slug = 'blackpink'), 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 505840
where not exists (select 1 from songs where deezer_track_id = 3866248801)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4311096852, 'ANIMAL', 'BOYNEXTDOOR', 'HOME: DELUXE', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/4/6/0/14620734cb4e8f9e330fb648dae090da.mp3?hdnea=exp=1790960329~acl=/api/1/1/1/4/6/0/14620734cb4e8f9e330fb648dae090da.mp3*~data=user_id=0,application_id=42~hmac=8aa08cf7573be0a95eff30918070fe0447f7037994135ac7c8434ddba9614d04', 146, (select id from groups where slug = 'boynextdoor'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 631939
where not exists (select 1 from songs where deezer_track_id = 4311096852)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4311096862, 'CLICHE', 'BOYNEXTDOOR', 'HOME: DELUXE', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/e/d/0/4ed96326430d3652a57eb6189f1b7367.mp3?hdnea=exp=1790960329~acl=/api/1/1/4/e/d/0/4ed96326430d3652a57eb6189f1b7367.mp3*~data=user_id=0,application_id=42~hmac=48cb0041305dca412d1ea406d6e219fbf827ec2899287cc8d57305d3fa7032e7', 165, (select id from groups where slug = 'boynextdoor'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 579598
where not exists (select 1 from songs where deezer_track_id = 4311096862)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4311096962, '400 Years', 'BOYNEXTDOOR', 'HOME: DELUXE', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a5ea096b4843c5088637568122f34b59/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/f/2/0/7f284a5ff07ca14d2ef9287a3eafe134.mp3?hdnea=exp=1790960329~acl=/api/1/1/7/f/2/0/7f284a5ff07ca14d2ef9287a3eafe134.mp3*~data=user_id=0,application_id=42~hmac=f103dd253964e05a45039df6cb597c1c97cb983d1389f96dd0cf0d0540b055db', 148, (select id from groups where slug = 'boynextdoor'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 493120
where not exists (select 1 from songs where deezer_track_id = 4311096962)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4076508981, 'Come Over', 'BTS', 'Come Over', 'https://cdn-images.dzcdn.net/images/cover/9eb6749e7318572f9ee3d2a292ee17df/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9eb6749e7318572f9ee3d2a292ee17df/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9eb6749e7318572f9ee3d2a292ee17df/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/a/5/0/8a5af9f0c03948c9a8c18677f0254cbc.mp3?hdnea=exp=1790960338~acl=/api/1/1/8/a/5/0/8a5af9f0c03948c9a8c18677f0254cbc.mp3*~data=user_id=0,application_id=42~hmac=05bc9f507db88f985a1b9e5cdef4731cfd44f58a3e4f27309952f5909d808302', 178, (select id from groups where slug = 'bts'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 799281
where not exists (select 1 from songs where deezer_track_id = 4076508981)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3907717251, 'No. 29', 'BTS', 'ARIRANG', 'https://cdn-images.dzcdn.net/images/cover/a3b8e9462db0c02e082c706c624f9811/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a3b8e9462db0c02e082c706c624f9811/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a3b8e9462db0c02e082c706c624f9811/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/c/9/0/5c995f8637f311fddb067e8a2e6deb4c.mp3?hdnea=exp=1790960332~acl=/api/1/1/5/c/9/0/5c995f8637f311fddb067e8a2e6deb4c.mp3*~data=user_id=0,application_id=42~hmac=508062d0bc884876b5a7d6070e684457e1e030a99b190fef427b30250b097299', 98, (select id from groups where slug = 'bts'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 635945
where not exists (select 1 from songs where deezer_track_id = 3907717251)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4235827392, 'MONEYMONEYMONEY', 'Cortis', 'GREENGREEN_playextended', 'https://cdn-images.dzcdn.net/images/cover/10407b27dd835c6d24d05a3484b49709/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/10407b27dd835c6d24d05a3484b49709/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/10407b27dd835c6d24d05a3484b49709/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/8/9/0/489612f2d5452cf1e98e766d96997bf5.mp3?hdnea=exp=1790960344~acl=/api/1/1/4/8/9/0/489612f2d5452cf1e98e766d96997bf5.mp3*~data=user_id=0,application_id=42~hmac=fecb12fe073bc32812fb13da7a6ac1561a7e85901545522b1538343bccb87adf', 139, (select id from groups where slug = 'cortis'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 683936
where not exists (select 1 from songs where deezer_track_id = 4235827392)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4235827382, 'PACK IT UP', 'Cortis', 'GREENGREEN_playextended', 'https://cdn-images.dzcdn.net/images/cover/10407b27dd835c6d24d05a3484b49709/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/10407b27dd835c6d24d05a3484b49709/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/10407b27dd835c6d24d05a3484b49709/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/9/7/f/0/97f00bd4029a8edb286692d9f8dba324.mp3?hdnea=exp=1790960344~acl=/api/1/1/9/7/f/0/97f00bd4029a8edb286692d9f8dba324.mp3*~data=user_id=0,application_id=42~hmac=45b22269c61623c9ce09e0479e912a9dc31b00ec7b0fe5dbb1f5c4fbe8da7e64', 112, (select id from groups where slug = 'cortis'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 577286
where not exists (select 1 from songs where deezer_track_id = 4235827382)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4285321022, 'LOUDER', 'CRAVITY', 'sonorous', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/d/5/0/5d57271bc6cdfe51d68616231ce7d14c.mp3?hdnea=exp=1790960346~acl=/api/1/1/5/d/5/0/5d57271bc6cdfe51d68616231ce7d14c.mp3*~data=user_id=0,application_id=42~hmac=d1014bd2c079480922f622f67904bc98d1d3ae3963bc7d011620bd93e3d98952', 182, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 409978
where not exists (select 1 from songs where deezer_track_id = 4285321022)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4285321042, 'LOVE ME', 'CRAVITY', 'sonorous', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/4/a/0/c4aaed0211702f61b2594f227ae0cb32.mp3?hdnea=exp=1790960346~acl=/api/1/1/c/4/a/0/c4aaed0211702f61b2594f227ae0cb32.mp3*~data=user_id=0,application_id=42~hmac=e4e2435102c8e491dfe73a805472b6b604da58cdba3b66f7a834859b2ea6f08a', 186, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 386103
where not exists (select 1 from songs where deezer_track_id = 4285321042)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4285321052, 'Seize The Night', 'CRAVITY', 'sonorous', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7005c61fe339effb67c7d9948eba1340/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/8/b/0/68b508a3efa0b65313529753faf7e193.mp3?hdnea=exp=1790960346~acl=/api/1/1/6/8/b/0/68b508a3efa0b65313529753faf7e193.mp3*~data=user_id=0,application_id=42~hmac=83761f055425f259a4f57b2d5b8ea8a903538d730957127d6e6bd7dbaf6eab39', 176, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 377807
where not exists (select 1 from songs where deezer_track_id = 4285321052)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4232461262, 'Bloody Paradise', 'ENHYPEN', 'THE SIN : BLISS', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/b/9/0/4b9c745c95bf43f59b690bfe03099351.mp3?hdnea=exp=1790960357~acl=/api/1/1/4/b/9/0/4b9c745c95bf43f59b690bfe03099351.mp3*~data=user_id=0,application_id=42~hmac=3a9f2d269c9b424e6c056cf264c0cac7a7b4e7b63f10418c5158ab7ab76d506b', 131, (select id from groups where slug = 'enhypen'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 895242
where not exists (select 1 from songs where deezer_track_id = 4232461262)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4232461242, 'Stuck', 'ENHYPEN', 'THE SIN : BLISS', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/4/9/0/549ff746d3980c44b128e21af5dca885.mp3?hdnea=exp=1790960357~acl=/api/1/1/5/4/9/0/549ff746d3980c44b128e21af5dca885.mp3*~data=user_id=0,application_id=42~hmac=dd60afaa1fcf1e0009faf17ae0c99917d4281b52afda0e423e80c06b03399452', 152, (select id from groups where slug = 'enhypen'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 667905
where not exists (select 1 from songs where deezer_track_id = 4232461242)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4232461272, 'Checkmate', 'ENHYPEN', 'THE SIN : BLISS', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0ac06aa38546c01bac1a4b9959bf8531/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/6/9/0/a690ae04f19dfbb86bc1b77e5ef69e30.mp3?hdnea=exp=1790960357~acl=/api/1/1/a/6/9/0/a690ae04f19dfbb86bc1b77e5ef69e30.mp3*~data=user_id=0,application_id=42~hmac=625e4ffbf0282184c81bf34ccdfc1802d4ccd997308c799d4cab98d6191307f4', 143, (select id from groups where slug = 'enhypen'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 617556
where not exists (select 1 from songs where deezer_track_id = 4232461272)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3770700232, 'Suffocate', 'EXO', 'REVERXE - The 8th Album', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/6/b/0/86b97a281d2663db513150b9bc3fd015.mp3?hdnea=exp=1790960368~acl=/api/1/1/8/6/b/0/86b97a281d2663db513150b9bc3fd015.mp3*~data=user_id=0,application_id=42~hmac=33398c9536276f00c813ba4837632432515d677d5203ba3d8fba826822ed0e1a', 178, (select id from groups where slug = 'exo'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 360190
where not exists (select 1 from songs where deezer_track_id = 3770700232)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3770700242, 'Moonlight Shadows', 'EXO', 'REVERXE - The 8th Album', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/e/0/0/ce078fb3d464815f393d72166c3dc52a.mp3?hdnea=exp=1790960368~acl=/api/1/1/c/e/0/0/ce078fb3d464815f393d72166c3dc52a.mp3*~data=user_id=0,application_id=42~hmac=4c4465221937e0a4ac550cfc68dc5152c4eecd1d5ed831d05cd697f0d2bc5256', 161, (select id from groups where slug = 'exo'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 301369
where not exists (select 1 from songs where deezer_track_id = 3770700242)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3770700282, 'I’m Home', 'EXO', 'REVERXE - The 8th Album', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9d0d18f4dd824700992b9fbe72f7d8bd/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/5/1/0/651fc8e95a5156b1b5580f368d59107a.mp3?hdnea=exp=1790960368~acl=/api/1/1/6/5/1/0/651fc8e95a5156b1b5580f368d59107a.mp3*~data=user_id=0,application_id=42~hmac=e98b245e821ae471b65f72740f813f889d6565fb82ec8fb1b0daa620c485fe3c', 209, (select id from groups where slug = 'exo'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 300211
where not exists (select 1 from songs where deezer_track_id = 3770700282)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4157622882, 'Vitamin ME', 'fromis_9', 'Glow ME', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/1/f/0/f1f3dd107a74b2e79fe668648d15c184.mp3?hdnea=exp=1790960372~acl=/api/1/1/f/1/f/0/f1f3dd107a74b2e79fe668648d15c184.mp3*~data=user_id=0,application_id=42~hmac=ed1fd8e87bc4f355b2ddba96f5b3a04d4ea021d3b95f1ef3bcf5d3062d86d6db', 190, (select id from groups where slug = 'fromis-9'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 377081
where not exists (select 1 from songs where deezer_track_id = 4157622882)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4157622942, 'Why do I cry?', 'fromis_9', 'Glow ME', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/e/7/0/3e7182a3a529446f2e2d227cb865e0f6.mp3?hdnea=exp=1790960372~acl=/api/1/1/3/e/7/0/3e7182a3a529446f2e2d227cb865e0f6.mp3*~data=user_id=0,application_id=42~hmac=97ebae47f54bac974de2f2a14d00d36de8ba3760d4393220a3a3b14e074dd2ba', 150, (select id from groups where slug = 'fromis-9'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 270904
where not exists (select 1 from songs where deezer_track_id = 4157622942)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4157622932, 'Cold Blood', 'fromis_9', 'Glow ME', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/33bfb96d3eea863117f4c2ad5c13b8d6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/2/e/0/62eec0bb2acfcf31ad156e6536c82190.mp3?hdnea=exp=1790960372~acl=/api/1/1/6/2/e/0/62eec0bb2acfcf31ad156e6536c82190.mp3*~data=user_id=0,application_id=42~hmac=6bd952a49d311c59cfeea47ec9eb6b7c9b7d9746cf7ce7c99fa1dfe7a71c141a', 169, (select id from groups where slug = 'fromis-9'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 219398
where not exists (select 1 from songs where deezer_track_id = 4157622932)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4306345672, 'Like The First Day', 'FT Island', 'Like The First Day', 'https://cdn-images.dzcdn.net/images/cover/dbe83b4b2dc7c4b5af45fbb6f963b76e/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/dbe83b4b2dc7c4b5af45fbb6f963b76e/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/dbe83b4b2dc7c4b5af45fbb6f963b76e/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/9/b/0/d9baca23cdc129b6e65121bfc2fb02fb.mp3?hdnea=exp=1790960380~acl=/api/1/1/d/9/b/0/d9baca23cdc129b6e65121bfc2fb02fb.mp3*~data=user_id=0,application_id=42~hmac=a19e7721d8e1a28c70375539e1b40426d0b7b80f00e0c6f66dd108f3c39f7595', 230, NULL, 'bg', '2nd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 269941
where not exists (select 1 from songs where deezer_track_id = 4306345672)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3878249061, 'To. My First Love', 'H1-KEY', 'LOVECHAPTER', 'https://cdn-images.dzcdn.net/images/cover/fa6187971e7c896b52339f178640eb13/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/fa6187971e7c896b52339f178640eb13/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/fa6187971e7c896b52339f178640eb13/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/2/a/0/22ad6b059583c96202dddaf84515b1a3.mp3?hdnea=exp=1790960391~acl=/api/1/1/2/2/a/0/22ad6b059583c96202dddaf84515b1a3.mp3*~data=user_id=0,application_id=42~hmac=cb0b7503ffa8b26af7c2f58271148346b8e5ae9cd3bb57d11f70a06e01e0468e', 210, NULL, 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 167764
where not exists (select 1 from songs where deezer_track_id = 3878249061)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4197249182, 'ICONIC HEART', 'Hearts2Hearts', 'ICONIC HEART', 'https://cdn-images.dzcdn.net/images/cover/339242b9287fd4cb84886891ab079750/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/339242b9287fd4cb84886891ab079750/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/339242b9287fd4cb84886891ab079750/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/c/e/0/5cea0fca8a14da7e361fe7369548680f.mp3?hdnea=exp=1790960392~acl=/api/1/1/5/c/e/0/5cea0fca8a14da7e361fe7369548680f.mp3*~data=user_id=0,application_id=42~hmac=7301daf7546add2deea32bf42b280ce82ed1c25f6b7a2a5a63c39d4f77f97e71', 189, (select id from groups where slug = 'hearts2hearts'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 576987
where not exists (select 1 from songs where deezer_track_id = 4197249182)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4258073911, 'Moonride', 'Hearts2Hearts', 'Moonride', 'https://cdn-images.dzcdn.net/images/cover/fe47439ae8a87478841ff7fcf5038791/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/fe47439ae8a87478841ff7fcf5038791/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/fe47439ae8a87478841ff7fcf5038791/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/d/d/0/eddd03df28f8716db333e5c676e79391.mp3?hdnea=exp=1790960392~acl=/api/1/1/e/d/d/0/eddd03df28f8716db333e5c676e79391.mp3*~data=user_id=0,application_id=42~hmac=19b5295d5ad76d03bcf8208a8a6cb068c83f3e1900c64b2f645925c9707086d5', 176, (select id from groups where slug = 'hearts2hearts'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 508827
where not exists (select 1 from songs where deezer_track_id = 4258073911)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4283728522, 'Swingin’ Magic', 'ILLIT', 'Swingin’ Magic', 'https://cdn-images.dzcdn.net/images/cover/7c589e550f1a3a82990e7c6dc84a6852/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7c589e550f1a3a82990e7c6dc84a6852/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7c589e550f1a3a82990e7c6dc84a6852/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/b/2/0/7b2fac2f94e3a01c55be60f095681e4e.mp3?hdnea=exp=1790960395~acl=/api/1/1/7/b/2/0/7b2fac2f94e3a01c55be60f095681e4e.mp3*~data=user_id=0,application_id=42~hmac=da44a82a3241526c052e180b4f8b32d44e79628230483f29c8fffb1e9045ae8f', 177, (select id from groups where slug = 'illit'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 573518
where not exists (select 1 from songs where deezer_track_id = 4283728522)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4166644212, 'I Got Your Back (Feat. JISOO, MOMOKA of HANA)', 'ILLIT', 'I Got Your Back', 'https://cdn-images.dzcdn.net/images/cover/725c8972a899eac6e57e3c5dab3f67a4/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/725c8972a899eac6e57e3c5dab3f67a4/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/725c8972a899eac6e57e3c5dab3f67a4/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/2/b/0/22b59a4e7122b68272af78c9d9f8ff12.mp3?hdnea=exp=1790960395~acl=/api/1/1/2/2/b/0/22b59a4e7122b68272af78c9d9f8ff12.mp3*~data=user_id=0,application_id=42~hmac=aec0bc42e88ace4fd67902ce9bbcce8d388a8834607979d7db20ee06b71a0482', 142, (select id from groups where slug = 'illit'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 560791
where not exists (select 1 from songs where deezer_track_id = 4166644212)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3928303661, 'Bubee', 'ILLIT', 'Bubee', 'https://cdn-images.dzcdn.net/images/cover/62fa7670d4fd2108eaecac37e5e37fa6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/62fa7670d4fd2108eaecac37e5e37fa6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/62fa7670d4fd2108eaecac37e5e37fa6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/e/b/0/8eb08223d43cb779f4dbca14d05b5d80.mp3?hdnea=exp=1790960395~acl=/api/1/1/8/e/b/0/8eb08223d43cb779f4dbca14d05b5d80.mp3*~data=user_id=0,application_id=42~hmac=2735541d705a7e6d5b0f43191e72831e21e2d4f4dae33c5db6d57efb8c9dc6da', 182, (select id from groups where slug = 'illit'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 375072
where not exists (select 1 from songs where deezer_track_id = 3928303661)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4021131311, 'Undefined (CHAERYEONG)', 'ITZY', 'Motto', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/4/0/0/1405e059ba8965c77f21a641808cf5ab.mp3?hdnea=exp=1790960397~acl=/api/1/1/1/4/0/0/1405e059ba8965c77f21a641808cf5ab.mp3*~data=user_id=0,application_id=42~hmac=e54ef3b1d5bad20e5c63000bacdd937c6a556204a88c27a5a8d9d2644c047c9c', 160, (select id from groups where slug = 'itzy'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 377895
where not exists (select 1 from songs where deezer_track_id = 4021131311)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4021131291, 'Asylum (LIA)', 'ITZY', 'Motto', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/b/e/2/0/be2ded0f2feda18747f00068cb68eb71.mp3?hdnea=exp=1790960397~acl=/api/1/1/b/e/2/0/be2ded0f2feda18747f00068cb68eb71.mp3*~data=user_id=0,application_id=42~hmac=e40e7b17cdcc0d4faa5da8e804f692b89780df9d43893a256e17ef67f0c540a2', 215, (select id from groups where slug = 'itzy'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 365076
where not exists (select 1 from songs where deezer_track_id = 4021131291)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4021131301, 'LOOK (RYUJIN)', 'ITZY', 'Motto', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b69cb6e41c5cb42f877f0fbe78d7bcca/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/2/3/0/f232b20a27215cf71098b997d2b61818.mp3?hdnea=exp=1790960397~acl=/api/1/1/f/2/3/0/f232b20a27215cf71098b997d2b61818.mp3*~data=user_id=0,application_id=42~hmac=62debc5aa5b4cd8284862116f15275f778a3a6e2c0e51bca6567f3ff930d8dc3', 126, (select id from groups where slug = 'itzy'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 349843
where not exists (select 1 from songs where deezer_track_id = 4021131301)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4018650521, 'LUCID DREAM', 'IVE', 'LUCID DREAM', 'https://cdn-images.dzcdn.net/images/cover/ef78cf999f7f14126252c20350aadd1e/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ef78cf999f7f14126252c20350aadd1e/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ef78cf999f7f14126252c20350aadd1e/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/5/1/0/45120acd9d093a5419a734c3c381048d.mp3?hdnea=exp=1790960398~acl=/api/1/1/4/5/1/0/45120acd9d093a5419a734c3c381048d.mp3*~data=user_id=0,application_id=42~hmac=5494019c96aa0a48fd67d5050944041242c530751e2ed679846c9a572c12bd00', 207, (select id from groups where slug = 'ive'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 287033
where not exists (select 1 from songs where deezer_track_id = 4018650521)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4184612222, 'HEADACHE', 'izna', 'HANDLE WITH CARE', 'https://cdn-images.dzcdn.net/images/cover/824fb8003724afaf34628a654f376c80/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/824fb8003724afaf34628a654f376c80/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/824fb8003724afaf34628a654f376c80/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/5/d/0/f5d1f777f8ff7e59f174d5b6e7610ea1.mp3?hdnea=exp=1790960400~acl=/api/1/1/f/5/d/0/f5d1f777f8ff7e59f174d5b6e7610ea1.mp3*~data=user_id=0,application_id=42~hmac=9f209456c38935d63e8eb3cf0278cccd9bee1decd9c2bfa8973791737d8df8d7', 172, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 334950
where not exists (select 1 from songs where deezer_track_id = 4184612222)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4184600862, 'DUMB HOT!', 'izna', 'DUMB HOT!', 'https://cdn-images.dzcdn.net/images/cover/824fb8003724afaf34628a654f376c80/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/824fb8003724afaf34628a654f376c80/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/824fb8003724afaf34628a654f376c80/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/8/f/0/48f64accab7c6527c63b17f998172f04.mp3?hdnea=exp=1790960400~acl=/api/1/1/4/8/f/0/48f64accab7c6527c63b17f998172f04.mp3*~data=user_id=0,application_id=42~hmac=e706651edb3f8bd95ad999ab192e068f3193becb72b0803662cec1baa0cddd82', 141, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 244370
where not exists (select 1 from songs where deezer_track_id = 4184600862)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4157200522, 'Back To Life', 'KARD', 'KARD 1st Album ''Where To Now? (Part.2) : NOWHERE''', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/1/6/0/516d4891f5076462a67ebc2b13a3699c.mp3?hdnea=exp=1790960403~acl=/api/1/1/5/1/6/0/516d4891f5076462a67ebc2b13a3699c.mp3*~data=user_id=0,application_id=42~hmac=f2fcf33cb9057d150bac95c5c7478807680b445177d1e24576c5eb42b55c6f6b', 160, NULL, 'coed', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 528118
where not exists (select 1 from songs where deezer_track_id = 4157200522)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4157200552, 'Signal', 'KARD', 'KARD 1st Album ''Where To Now? (Part.2) : NOWHERE''', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/0/7/0/50732f202ddf4701c875eeb8c47f3e07.mp3?hdnea=exp=1790960403~acl=/api/1/1/5/0/7/0/50732f202ddf4701c875eeb8c47f3e07.mp3*~data=user_id=0,application_id=42~hmac=df69386dbfe0df7187e0c3f4188a5ed43a03a31605b761bf58caf0dbd8edb88c', 177, NULL, 'coed', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 398343
where not exists (select 1 from songs where deezer_track_id = 4157200552)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4157200532, 'Armor', 'KARD', 'KARD 1st Album ''Where To Now? (Part.2) : NOWHERE''', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/701f7de57962c29e4a51681a4df8559a/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/9/5/0/e957573c3f7931e753d3f35624fa5323.mp3?hdnea=exp=1790960403~acl=/api/1/1/e/9/5/0/e957573c3f7931e753d3f35624fa5323.mp3*~data=user_id=0,application_id=42~hmac=79184580a937721290d7fc36ca9b77ed87b6d65b95c089fdda6f7514b4dc820b', 190, NULL, 'coed', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 308790
where not exists (select 1 from songs where deezer_track_id = 4157200532)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4159582602, 'Animal', 'KATSEYE', 'Animal', 'https://cdn-images.dzcdn.net/images/cover/7d2094a163bfe016e981381f97ccfd25/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7d2094a163bfe016e981381f97ccfd25/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7d2094a163bfe016e981381f97ccfd25/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/0/7/0/507329ba45b65da1633b605eea1fd920.mp3?hdnea=exp=1790960404~acl=/api/1/1/5/0/7/0/507329ba45b65da1633b605eea1fd920.mp3*~data=user_id=0,application_id=42~hmac=13c38efde025e2a52968dd251f44a8eb6e11ab045e4884d8e8a6a1cb2b5e3bf4', 158, (select id from groups where slug = 'katseye'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 993175
where not exists (select 1 from songs where deezer_track_id = 4159582602)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4208732332, 'Hootie Frutti', 'KATSEYE', 'WILD', 'https://cdn-images.dzcdn.net/images/cover/5386f47fd2360d8de97854fb57540010/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/5386f47fd2360d8de97854fb57540010/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/5386f47fd2360d8de97854fb57540010/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/6/e/0/66e99388117a8923fb6b7970320f84b6.mp3?hdnea=exp=1790960403~acl=/api/1/1/6/6/e/0/66e99388117a8923fb6b7970320f84b6.mp3*~data=user_id=0,application_id=42~hmac=e7ea46efea59725817985cc24fa7c639928dea8ddafc6b9228f0871958e5a318', 140, (select id from groups where slug = 'katseye'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 957634
where not exists (select 1 from songs where deezer_track_id = 4208732332)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4208732352, 'That Way', 'KATSEYE', 'WILD', 'https://cdn-images.dzcdn.net/images/cover/5386f47fd2360d8de97854fb57540010/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/5386f47fd2360d8de97854fb57540010/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/5386f47fd2360d8de97854fb57540010/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/2/c/0/c2cea6abad4a1b317243ed95f79e1381.mp3?hdnea=exp=1790960403~acl=/api/1/1/c/2/c/0/c2cea6abad4a1b317243ed95f79e1381.mp3*~data=user_id=0,application_id=42~hmac=523438e7e347c1bea52bc937d75535c280148fd8bdc81a623c2640fab87f68e0', 176, (select id from groups where slug = 'katseye'), 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 770387
where not exists (select 1 from songs where deezer_track_id = 4208732352)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3928840871, 'KILLA (Face the other me)', 'Kep1er', 'CRACK CODE', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/e/8/0/7e8d8381f0bdd826ed6d133819d29431.mp3?hdnea=exp=1790960407~acl=/api/1/1/7/e/8/0/7e8d8381f0bdd826ed6d133819d29431.mp3*~data=user_id=0,application_id=42~hmac=dc9e20894add2648088f81e215be9b660f018d57d292ba23fe6d21e4bc7d9f20', 176, (select id from groups where slug = 'kep1er'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 361551
where not exists (select 1 from songs where deezer_track_id = 3928840871)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3928840861, 'I am Kep1', 'Kep1er', 'CRACK CODE', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/1/8/0/318f92e763c25b0f96d6ade827946242.mp3?hdnea=exp=1790960407~acl=/api/1/1/3/1/8/0/318f92e763c25b0f96d6ade827946242.mp3*~data=user_id=0,application_id=42~hmac=a0bb76844a0043d48f2a2d0efd3165142b39473131684b709c069473938e14cb', 150, (select id from groups where slug = 'kep1er'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 262680
where not exists (select 1 from songs where deezer_track_id = 3928840861)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3928840881, 'MIC CHECK', 'Kep1er', 'CRACK CODE', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/f3bce4eb4a7153886ff7050771f570af/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/5/1/0/8517a0f3da2c1edc0783a88f8e86ed9d.mp3?hdnea=exp=1790960407~acl=/api/1/1/8/5/1/0/8517a0f3da2c1edc0783a88f8e86ed9d.mp3*~data=user_id=0,application_id=42~hmac=9b0b100363b4c687fdd6d2e92af0fc92a9eaf01255ff9af1f088953c52b09d5a', 171, (select id from groups where slug = 'kep1er'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 173437
where not exists (select 1 from songs where deezer_track_id = 3928840881)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4204204872, 'Pop Off Pop Off', 'KiiiKiii', 'WhyKiiiKiii', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/9/f/1/0/9f1c758e1f54313cab1aa29562f65755.mp3?hdnea=exp=1790960407~acl=/api/1/1/9/f/1/0/9f1c758e1f54313cab1aa29562f65755.mp3*~data=user_id=0,application_id=42~hmac=1e7fef1149a41b92ff6c04edb28bd258556bf5fbdf58917f9d7b260917647de1', 141, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 671717
where not exists (select 1 from songs where deezer_track_id = 4204204872)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4204204882, 'SWEET SOUR', 'KiiiKiii', 'WhyKiiiKiii', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/3/2/0/0324b5891d4708587a7cc4d96adf3344.mp3?hdnea=exp=1790960407~acl=/api/1/1/0/3/2/0/0324b5891d4708587a7cc4d96adf3344.mp3*~data=user_id=0,application_id=42~hmac=0d7da64cad89fb2bd36291449265daa49565452bf89bdb6ce027b35c7eb9f304', 177, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 452546
where not exists (select 1 from songs where deezer_track_id = 4204204882)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4204204862, 'Hey Hi', 'KiiiKiii', 'WhyKiiiKiii', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61024fc58a125ad7f416eee268bf4ae4/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/9/1/0/f91cecad1484e834ac906f6c6416aed2.mp3?hdnea=exp=1790960407~acl=/api/1/1/f/9/1/0/f91cecad1484e834ac906f6c6416aed2.mp3*~data=user_id=0,application_id=42~hmac=4d79fcc01b09a5ab3b0f206f67c44381883ee88c964ab124dbec9bd7566868a4', 170, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 447967
where not exists (select 1 from songs where deezer_track_id = 4204204862)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4164951472, 'SWEAT', 'KISS OF LIFE', 'SWEAT', 'https://cdn-images.dzcdn.net/images/cover/e9990c0b6f95bed4dcfb1b1449c19df3/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e9990c0b6f95bed4dcfb1b1449c19df3/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e9990c0b6f95bed4dcfb1b1449c19df3/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/9/1/0/691ca574eaed627e8f51f1dcda075694.mp3?hdnea=exp=1790960413~acl=/api/1/1/6/9/1/0/691ca574eaed627e8f51f1dcda075694.mp3*~data=user_id=0,application_id=42~hmac=6d6359dfafc9788cb9e9aa715166527df919508f80e5a27e29a94bf4a6bba4d3', 173, (select id from groups where slug = 'kiss-of-life'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 549308
where not exists (select 1 from songs where deezer_track_id = 4164951472)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4164951482, 'WHAT!', 'KISS OF LIFE', 'SWEAT', 'https://cdn-images.dzcdn.net/images/cover/e9990c0b6f95bed4dcfb1b1449c19df3/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e9990c0b6f95bed4dcfb1b1449c19df3/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e9990c0b6f95bed4dcfb1b1449c19df3/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/b/1/1/0/b11af6f864bb3257ee7a3c7d7fa1a513.mp3?hdnea=exp=1790960413~acl=/api/1/1/b/1/1/0/b11af6f864bb3257ee7a3c7d7fa1a513.mp3*~data=user_id=0,application_id=42~hmac=437f6b503660221ab39166cc02404afe958d063d209d02ad163231b7227471ec', 151, (select id from groups where slug = 'kiss-of-life'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 387793
where not exists (select 1 from songs where deezer_track_id = 4164951482)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4274980322, 'Made My Night', 'LE SSERAFIM', 'Made My Night', 'https://cdn-images.dzcdn.net/images/cover/8d94990afb2563a58584cf8aaa808032/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8d94990afb2563a58584cf8aaa808032/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8d94990afb2563a58584cf8aaa808032/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/a/9/0/4a9d468fdf267732eea20f79893e2d6f.mp3?hdnea=exp=1790960419~acl=/api/1/1/4/a/9/0/4a9d468fdf267732eea20f79893e2d6f.mp3*~data=user_id=0,application_id=42~hmac=0b566d157a92eac19cb14fc56e9ce9e6936c0eb3430a841c9b0be030ebd7fc6b', 126, (select id from groups where slug = 'le-sserafim'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 736316
where not exists (select 1 from songs where deezer_track_id = 4274980322)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4076509001, 'ICONIC BY MISTAKE', 'LE SSERAFIM', 'ICONIC BY MISTAKE', 'https://cdn-images.dzcdn.net/images/cover/0c22c441eb7f5519886c8a386a963e7c/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0c22c441eb7f5519886c8a386a963e7c/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0c22c441eb7f5519886c8a386a963e7c/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/9/e/0/39e22734e357e0abf79e2e52e5b67797.mp3?hdnea=exp=1790960419~acl=/api/1/1/3/9/e/0/39e22734e357e0abf79e2e52e5b67797.mp3*~data=user_id=0,application_id=42~hmac=56517dd363459fd6610433e4049fa4b6b9ab928fae77a7931bf8345127d70282', 177, (select id from groups where slug = 'le-sserafim'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 589661
where not exists (select 1 from songs where deezer_track_id = 4076509001)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4274980332, 'AEIOU', 'LE SSERAFIM', 'Made My Night', 'https://cdn-images.dzcdn.net/images/cover/8d94990afb2563a58584cf8aaa808032/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8d94990afb2563a58584cf8aaa808032/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/8d94990afb2563a58584cf8aaa808032/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/9/3/0/a93fba1adbeac84c29565485dfad8d1c.mp3?hdnea=exp=1790960419~acl=/api/1/1/a/9/3/0/a93fba1adbeac84c29565485dfad8d1c.mp3*~data=user_id=0,application_id=42~hmac=237f8911209826951c5d703747096554fe23fce8160b8955ce7ad2059595f5e2', 147, (select id from groups where slug = 'le-sserafim'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 539431
where not exists (select 1 from songs where deezer_track_id = 4274980332)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4264198082, 'Doshite', 'LIGHTSUM', 'Re:idol', 'https://cdn-images.dzcdn.net/images/cover/16cdf2684da808e5daaa9df536e0e0c8/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/16cdf2684da808e5daaa9df536e0e0c8/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/16cdf2684da808e5daaa9df536e0e0c8/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/1/8/0/a18deb9c2f52803927f4ec479e7d0452.mp3?hdnea=exp=1790960421~acl=/api/1/1/a/1/8/0/a18deb9c2f52803927f4ec479e7d0452.mp3*~data=user_id=0,application_id=42~hmac=59ffb439daefcd4e1a57193aa11e94f6bf915be70ce18c83b0193f98f704bc70', 196, NULL, 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 151987
where not exists (select 1 from songs where deezer_track_id = 4264198082)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4258718131, 'MAGIC', 'MONSTA X', 'The Phase', 'https://cdn-images.dzcdn.net/images/cover/9c79e0c0daeb9db2d5b210dae4e5379b/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9c79e0c0daeb9db2d5b210dae4e5379b/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9c79e0c0daeb9db2d5b210dae4e5379b/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/9/9/0/199e6c5c52f03c76a31972bcb595ecbb.mp3?hdnea=exp=1790960426~acl=/api/1/1/1/9/9/0/199e6c5c52f03c76a31972bcb595ecbb.mp3*~data=user_id=0,application_id=42~hmac=7da75c0b7d2fb1fc0a436fbad621e47f34539e6d42963f5e384ff4328f88ad65', 157, (select id from groups where slug = 'monsta-x'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 498628
where not exists (select 1 from songs where deezer_track_id = 4258718131)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4258718151, 'SURVIVOR', 'MONSTA X', 'The Phase', 'https://cdn-images.dzcdn.net/images/cover/9c79e0c0daeb9db2d5b210dae4e5379b/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9c79e0c0daeb9db2d5b210dae4e5379b/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/9c79e0c0daeb9db2d5b210dae4e5379b/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/7/3/0/67328bbe32a6a681066a134889e6edde.mp3?hdnea=exp=1790960426~acl=/api/1/1/6/7/3/0/67328bbe32a6a681066a134889e6edde.mp3*~data=user_id=0,application_id=42~hmac=d64ae6d38fbabbe93b65b1e08d2f75430570524ade6e049543c127245c4aa61e', 149, (select id from groups where slug = 'monsta-x'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 437759
where not exists (select 1 from songs where deezer_track_id = 4258718151)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4296041062, 'Trespass (Rerecorded)', 'MONSTA X', 'NOW PROJECT vol.2', 'https://cdn-images.dzcdn.net/images/cover/10bc2a6ef8c6d51597b62f6f08f7b515/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/10bc2a6ef8c6d51597b62f6f08f7b515/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/10bc2a6ef8c6d51597b62f6f08f7b515/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/a/a/0/1aaa22a01ed914fee252a17551a7fada.mp3?hdnea=exp=1790960426~acl=/api/1/1/1/a/a/0/1aaa22a01ed914fee252a17551a7fada.mp3*~data=user_id=0,application_id=42~hmac=b1f77c7b9a594b2f6351aedb56508b00228be8c6beddb17d281b0cd4c85f0203', 205, (select id from groups where slug = 'monsta-x'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 384553
where not exists (select 1 from songs where deezer_track_id = 4296041062)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4293635102, 'Our Ending', 'N.Flying', 'Our Ending', 'https://cdn-images.dzcdn.net/images/cover/b35e309401833ae2de97ade4f5121b0c/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b35e309401833ae2de97ade4f5121b0c/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b35e309401833ae2de97ade4f5121b0c/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/9/f/8/0/9f8f7d3bb7b7ace62ca9b059174af893.mp3?hdnea=exp=1790960427~acl=/api/1/1/9/f/8/0/9f8f7d3bb7b7ace62ca9b059174af893.mp3*~data=user_id=0,application_id=42~hmac=246838654313ac986028827784286eca2475c3f6edd2234235e230a354fd757b', 154, NULL, 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 264924
where not exists (select 1 from songs where deezer_track_id = 4293635102)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4208809742, 'Blingy', 'NCT 127', 'BLINGY - The 7th Album', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/b/a/0/5bae6f4ebc3242e989c3d507b6db7f55.mp3?hdnea=exp=1790960428~acl=/api/1/1/5/b/a/0/5bae6f4ebc3242e989c3d507b6db7f55.mp3*~data=user_id=0,application_id=42~hmac=73e76c377d0d567ba8e86fe6349cdc8135531190e552d6380bd6cbbef8b62091', 201, (select id from groups where slug = 'nct-127'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 524650
where not exists (select 1 from songs where deezer_track_id = 4208809742)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4208809762, 'Piñata', 'NCT 127', 'BLINGY - The 7th Album', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/0/6/0/206dbfb98bca034eac39479b628b3b0b.mp3?hdnea=exp=1790960428~acl=/api/1/1/2/0/6/0/206dbfb98bca034eac39479b628b3b0b.mp3*~data=user_id=0,application_id=42~hmac=60e9b5c664e137a071f2211a7bf4336909ded54789262d25eb6371abe99a2d81', 153, (select id from groups where slug = 'nct-127'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 356520
where not exists (select 1 from songs where deezer_track_id = 4208809762)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4208809752, 'Legacy', 'NCT 127', 'BLINGY - The 7th Album', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3961b1f2b54e0eeb6422c90ed777b5bc/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/6/3/0/7632e5633d6de69d38e6574ba6f2e3a0.mp3?hdnea=exp=1790960428~acl=/api/1/1/7/6/3/0/7632e5633d6de69d38e6574ba6f2e3a0.mp3*~data=user_id=0,application_id=42~hmac=72bfba4691c326b8c0b16be55da60153e2d0ecc75c5fffbb483bdf7aec4b972a', 180, (select id from groups where slug = 'nct-127'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 350547
where not exists (select 1 from songs where deezer_track_id = 4208809752)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3946155691, '여우비 Crush', 'NCT WISH', 'Ode to Love - The 1st Album', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/b/d/9/0/bd99ad558e861361b6fa4eb3434286ef.mp3?hdnea=exp=1790960429~acl=/api/1/1/b/d/9/0/bd99ad558e861361b6fa4eb3434286ef.mp3*~data=user_id=0,application_id=42~hmac=0cd3c09bfe08af52cb59f0481b8d0f85276916e33e0acc64a18d4c38e5326398', 201, (select id from groups where slug = 'nct-wish'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 238267
where not exists (select 1 from songs where deezer_track_id = 3946155691)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3946155701, 'Street (2AM)', 'NCT WISH', 'Ode to Love - The 1st Album', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/d/d/0/5ddf58719e3915089af0a1f2e827d811.mp3?hdnea=exp=1790960429~acl=/api/1/1/5/d/d/0/5ddf58719e3915089af0a1f2e827d811.mp3*~data=user_id=0,application_id=42~hmac=62383814e15c30ed76f48d8d588134614cbafc8e7082d3ce839973e1b082c5de', 185, (select id from groups where slug = 'nct-wish'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 225002
where not exists (select 1 from songs where deezer_track_id = 3946155701)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3946155731, 'Don''t Say You Love Me', 'NCT WISH', 'Ode to Love - The 1st Album', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ad2c5e6973a82d33318e04f17df13e02/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/4/f/0/54f6abc3107ca0454f718981a30f8c3f.mp3?hdnea=exp=1790960429~acl=/api/1/1/5/4/f/0/54f6abc3107ca0454f718981a30f8c3f.mp3*~data=user_id=0,application_id=42~hmac=90918957f0262cc636f0bc3af3d894ada99754af051599b1e8e5076c873996e6', 168, (select id from groups where slug = 'nct-wish'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 207258
where not exists (select 1 from songs where deezer_track_id = 3946155731)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4284865992, 'Say Yes!', 'ONEUS', 'FIRST LIGHT : 井', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/a/5/0/ea557fb62f5e6b79a9d959dc2b59329a.mp3?hdnea=exp=1790960434~acl=/api/1/1/e/a/5/0/ea557fb62f5e6b79a9d959dc2b59329a.mp3*~data=user_id=0,application_id=42~hmac=d219bd44fb161a570fcb1ca91286f64808492e26df61747117ac7525a477c6c1', 184, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 448944
where not exists (select 1 from songs where deezer_track_id = 4284865992)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4284865982, 'Runaway', 'ONEUS', 'FIRST LIGHT : 井', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/d/5/0/dd5fa7863bf8cd8ecca0de4f1f89b542.mp3?hdnea=exp=1790960434~acl=/api/1/1/d/d/5/0/dd5fa7863bf8cd8ecca0de4f1f89b542.mp3*~data=user_id=0,application_id=42~hmac=06fe8e35338bf4dc22f89134d34444381b3ddf13d748287e1c83c2838c322f45', 118, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 355537
where not exists (select 1 from songs where deezer_track_id = 4284865982)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4284866022, 'We run for youth', 'ONEUS', 'FIRST LIGHT : 井', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ac1fe20332cf7879e958ab0d24ff772a/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/9/b/0/0/9b0da6c3e0a30d87d45bf2fa55ab8f73.mp3?hdnea=exp=1790960434~acl=/api/1/1/9/b/0/0/9b0da6c3e0a30d87d45bf2fa55ab8f73.mp3*~data=user_id=0,application_id=42~hmac=d68d5f929442e5e11a2f814e61b29db11ab1f66e1667539461d38e71571cc447', 159, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 323691
where not exists (select 1 from songs where deezer_track_id = 4284866022)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4223440872, 'Scenario', 'ONEWE', '面 : Unknown Atlas', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/1/d/0/d1df797051830eadfce7512b0fb818c3.mp3?hdnea=exp=1790960435~acl=/api/1/1/d/1/d/0/d1df797051830eadfce7512b0fb818c3.mp3*~data=user_id=0,application_id=42~hmac=7583542a9d91099042d95e32216735376fe5402c1a484e2a99301ba86eaadba2', 223, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 190013
where not exists (select 1 from songs where deezer_track_id = 4223440872)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4223441002, 'Beautiful Runaway', 'ONEWE', '面 : Unknown Atlas', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/8/1/0/081956d34c7040f7e8034070e39a73a0.mp3?hdnea=exp=1790960435~acl=/api/1/1/0/8/1/0/081956d34c7040f7e8034070e39a73a0.mp3*~data=user_id=0,application_id=42~hmac=a29813a405fa42e99ba0f32057741943a58810a4cf0bd873290877fba6e2f23c', 208, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 175950
where not exists (select 1 from songs where deezer_track_id = 4223441002)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4223441012, 'Just You', 'ONEWE', '面 : Unknown Atlas', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e0377465c8206ae0de996ad28e287e72/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/d/2/0/8d254438c26d2a90820fc2fbfbe5d152.mp3?hdnea=exp=1790960435~acl=/api/1/1/8/d/2/0/8d254438c26d2a90820fc2fbfbe5d152.mp3*~data=user_id=0,application_id=42~hmac=f591b610efd5353b1fe722578f35b0b224ade73436de07237b2ed4a8b921770f', 230, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 161234
where not exists (select 1 from songs where deezer_track_id = 4223441012)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4142993731, 'VELVET', 'P1Harmony', 'UNIQUE Japan Edition (Selected Version)', 'https://cdn-images.dzcdn.net/images/cover/b5f29ee9545cbc4ed22e4d7b0808b090/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b5f29ee9545cbc4ed22e4d7b0808b090/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b5f29ee9545cbc4ed22e4d7b0808b090/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/f/d/0/4fd975182b858383d145ddf14d0e89ab.mp3?hdnea=exp=1790960436~acl=/api/1/1/4/f/d/0/4fd975182b858383d145ddf14d0e89ab.mp3*~data=user_id=0,application_id=42~hmac=397e39782e5335844e3a3b5bf14d728f5017af649200a66372febc785fd1ddb0', 167, (select id from groups where slug = 'p1harmony'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 355190
where not exists (select 1 from songs where deezer_track_id = 4142993731)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4142993741, '1 SECOND', 'P1Harmony', 'UNIQUE Japan Edition (Selected Version)', 'https://cdn-images.dzcdn.net/images/cover/b5f29ee9545cbc4ed22e4d7b0808b090/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b5f29ee9545cbc4ed22e4d7b0808b090/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b5f29ee9545cbc4ed22e4d7b0808b090/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/d/7/0/4d7c27956bb6904696d790a60b7575d8.mp3?hdnea=exp=1790960436~acl=/api/1/1/4/d/7/0/4d7c27956bb6904696d790a60b7575d8.mp3*~data=user_id=0,application_id=42~hmac=6a41ddb2dae0f5faf4fe1b4e2b98bf18d1658b94404263dfb127eb8b3927812e', 150, (select id from groups where slug = 'p1harmony'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 292392
where not exists (select 1 from songs where deezer_track_id = 4142993741)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4237086082, 'Coward', 'PENTAGON', 'Coward', 'https://cdn-images.dzcdn.net/images/cover/a4093d07c5358b2f07a95a52a58ed27b/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a4093d07c5358b2f07a95a52a58ed27b/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a4093d07c5358b2f07a95a52a58ed27b/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/a/9/0/ea9073dee636f5a988f83adaa343167f.mp3?hdnea=exp=1790960437~acl=/api/1/1/e/a/9/0/ea9073dee636f5a988f83adaa343167f.mp3*~data=user_id=0,application_id=42~hmac=38b3de2cf4a8cd063d924f0222d33016a2225a0818bea157dc4a812198aa88c3', 212, (select id from groups where slug = 'pentagon'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 401393
where not exists (select 1 from songs where deezer_track_id = 4237086082)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3939893671, 'Born Savage', 'PLAVE', 'Caligo Pt.2', 'https://cdn-images.dzcdn.net/images/cover/d74f24eb7f813968aa30c89bd3163913/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/d74f24eb7f813968aa30c89bd3163913/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/d74f24eb7f813968aa30c89bd3163913/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/9/8/0/7989282ed8a4c4a95d5f164f1d94990c.mp3?hdnea=exp=1790960438~acl=/api/1/1/7/9/8/0/7989282ed8a4c4a95d5f164f1d94990c.mp3*~data=user_id=0,application_id=42~hmac=a772af44a9fee345cc3b98ea4d067482600ffaca978bb6386fcae45d297dfd6e', 172, NULL, 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 341712
where not exists (select 1 from songs where deezer_track_id = 3939893671)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4248967941, 'Flame', 'PLAVE', 'Flame', 'https://cdn-images.dzcdn.net/images/cover/705b2d0fa80e6627293bba0690f7ac9f/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/705b2d0fa80e6627293bba0690f7ac9f/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/705b2d0fa80e6627293bba0690f7ac9f/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/d/c/0/6dcb8725d644868548fe1b5db898b4cf.mp3?hdnea=exp=1790960438~acl=/api/1/1/6/d/c/0/6dcb8725d644868548fe1b5db898b4cf.mp3*~data=user_id=0,application_id=42~hmac=eec56be1a76087c4e7bd2c18f7ab22b50c909ae3f816cdc08500558fceb34128', 187, NULL, 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 183207
where not exists (select 1 from songs where deezer_track_id = 4248967941)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3929165981, 'HMPH! (feat. SOLE)', 'PLAVE', 'HMPH! (feat. SOLE)', 'https://cdn-images.dzcdn.net/images/cover/918c94031641b999ac9122f0ad326dd5/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/918c94031641b999ac9122f0ad326dd5/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/918c94031641b999ac9122f0ad326dd5/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/e/9/0/ce92e7cdfb67aceb27fa160927b14542.mp3?hdnea=exp=1790960438~acl=/api/1/1/c/e/9/0/ce92e7cdfb67aceb27fa160927b14542.mp3*~data=user_id=0,application_id=42~hmac=690d8c29809b04f5a493d8029ca26708697da0aaaf820d51922acd895ee87547', 180, NULL, 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 164994
where not exists (select 1 from songs where deezer_track_id = 3929165981)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4289476362, 'Dreamer', 'QWER', 'Special Single ''Dreamer & Picaresque''', 'https://cdn-images.dzcdn.net/images/cover/7e7c4cf109841e9c12048cec7ad04522/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7e7c4cf109841e9c12048cec7ad04522/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7e7c4cf109841e9c12048cec7ad04522/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/9/c/8/0/9c85980e512da477ee35b3aa87cfd259.mp3?hdnea=exp=1790960440~acl=/api/1/1/9/c/8/0/9c85980e512da477ee35b3aa87cfd259.mp3*~data=user_id=0,application_id=42~hmac=88a2cdaffd494f4a904133f4f1812026c6c2fd8636471411291334ac48e0b0aa', 187, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 161998
where not exists (select 1 from songs where deezer_track_id = 4289476362)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4178965332, 'Surfin'' Boy', 'Red Velvet', 'Velvet Summer - Summer Mini Album', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/c/d/0/dcd9e8d33aa9833dcd3a01735b8a18f3.mp3?hdnea=exp=1790960440~acl=/api/1/1/d/c/d/0/dcd9e8d33aa9833dcd3a01735b8a18f3.mp3*~data=user_id=0,application_id=42~hmac=9aae26fd3ca93a4a3c45242eba82718c43e15e197618ad1e81aeed55282e7ed6', 168, (select id from groups where slug = 'red-velvet'), 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 557087
where not exists (select 1 from songs where deezer_track_id = 4178965332)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4178965352, 'Orchestra', 'Red Velvet', 'Velvet Summer - Summer Mini Album', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/b/a/0/2bae7a90f205f5983abf56e2ffa230fa.mp3?hdnea=exp=1790960440~acl=/api/1/1/2/b/a/0/2bae7a90f205f5983abf56e2ffa230fa.mp3*~data=user_id=0,application_id=42~hmac=39a695e71125d8341e0386ff2095923591658e629935768cdfb5442713599685', 177, (select id from groups where slug = 'red-velvet'), 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 425156
where not exists (select 1 from songs where deezer_track_id = 4178965352)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4178965342, 'Hot Girls Cold Vibe', 'Red Velvet', 'Velvet Summer - Summer Mini Album', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3d833a2c1c6a9fd7c1b34571ac6d61b6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/b/3/0/7b3d0739d8c9758cd2255eb956a432dc.mp3?hdnea=exp=1790960440~acl=/api/1/1/7/b/3/0/7b3d0739d8c9758cd2255eb956a432dc.mp3*~data=user_id=0,application_id=42~hmac=35eed7e79e2f00961f459ac514560ed5113edc6519d63509de50f9ee9578cc64', 219, (select id from groups where slug = 'red-velvet'), 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 360272
where not exists (select 1 from songs where deezer_track_id = 4178965342)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4275029852, 'Cheetah', 'Red Velvet - IRENE & SEULGI', 'Cheetah', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/3/3/0/73370c46f8759c6da50083f5dbafb7c0.mp3?hdnea=exp=1790960441~acl=/api/1/1/7/3/3/0/73370c46f8759c6da50083f5dbafb7c0.mp3*~data=user_id=0,application_id=42~hmac=c0403cc896c7df4dddf847a300f170f8bd31b66411b83e0c1a70cc608fdebfff', 148, NULL, 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 390857
where not exists (select 1 from songs where deezer_track_id = 4275029852)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4275029862, 'Fall 4 U', 'Red Velvet - IRENE & SEULGI', 'Cheetah', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/0/4/0/e0443d30b6765e6e6b046a22e0ceb7f3.mp3?hdnea=exp=1790960441~acl=/api/1/1/e/0/4/0/e0443d30b6765e6e6b046a22e0ceb7f3.mp3*~data=user_id=0,application_id=42~hmac=0d8cee8764e919129e6ffe602e0cf5e0bec43b34c1b3a5d968567296eb415dd5', 170, NULL, 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 372861
where not exists (select 1 from songs where deezer_track_id = 4275029862)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4275029882, 'Wave', 'Red Velvet - IRENE & SEULGI', 'Cheetah', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/30c17b3e33684324ebd442c6a0e7baf1/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/c/5/0/7c5953431c8ecde5382855ec8670ef7a.mp3?hdnea=exp=1790960441~acl=/api/1/1/7/c/5/0/7c5953431c8ecde5382855ec8670ef7a.mp3*~data=user_id=0,application_id=42~hmac=5316ef494fa76a6d8f5fa1d5686be61f9bfb6664e5b7401dd3b55eb2b38df6a4', 188, NULL, 'gg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 343898
where not exists (select 1 from songs where deezer_track_id = 4275029882)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4051286221, 'Do your dance', 'RIIZE', 'Ⅱ - The 2nd Mini Album', 'https://cdn-images.dzcdn.net/images/cover/21406d669c88de1c99a24e6a0075b4a0/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/21406d669c88de1c99a24e6a0075b4a0/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/21406d669c88de1c99a24e6a0075b4a0/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/a/5/0/2a552fbeae6797ec3102eb0c8af5d9f1.mp3?hdnea=exp=1790960442~acl=/api/1/1/2/a/5/0/2a552fbeae6797ec3102eb0c8af5d9f1.mp3*~data=user_id=0,application_id=42~hmac=215b819f9b4fb8f44417d888be34d96baec581054cb009b3963ce8825a82990e', 177, (select id from groups where slug = 'riize'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 423704
where not exists (select 1 from songs where deezer_track_id = 4051286221)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4051286231, 'D-D-Done', 'RIIZE', 'Ⅱ - The 2nd Mini Album', 'https://cdn-images.dzcdn.net/images/cover/21406d669c88de1c99a24e6a0075b4a0/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/21406d669c88de1c99a24e6a0075b4a0/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/21406d669c88de1c99a24e6a0075b4a0/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/4/e/0/64e4d99b0998fa15e98c5e5fda52ca14.mp3?hdnea=exp=1790960442~acl=/api/1/1/6/4/e/0/64e4d99b0998fa15e98c5e5fda52ca14.mp3*~data=user_id=0,application_id=42~hmac=d09be702c3df615e7835a44e0527df428a07a2b11ad8036d67af896f356ecea3', 170, (select id from groups where slug = 'riize'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 327122
where not exists (select 1 from songs where deezer_track_id = 4051286231)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4174060712, 'Sunburst', 'RIIZE', 'Sunburst', 'https://cdn-images.dzcdn.net/images/cover/12bfea8679177d7ab6609f11469e111f/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/12bfea8679177d7ab6609f11469e111f/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/12bfea8679177d7ab6609f11469e111f/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/9/a/f/0/9af9e676346cac8671ba6c39d1ac03fb.mp3?hdnea=exp=1790960442~acl=/api/1/1/9/a/f/0/9af9e676346cac8671ba6c39d1ac03fb.mp3*~data=user_id=0,application_id=42~hmac=cb31e4750d597c82b1bd67e07b9d2207c51bb71d13938e92775757700395896d', 196, (select id from groups where slug = 'riize'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 260437
where not exists (select 1 from songs where deezer_track_id = 4174060712)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3856634281, 'Tiny Light', 'SEVENTEEN', 'Tiny Light', 'https://cdn-images.dzcdn.net/images/cover/5074721e22838594375577567ac31881/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/5074721e22838594375577567ac31881/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/5074721e22838594375577567ac31881/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/4/f/0/d4f1e388cb41a65d06ae479968cfafaa.mp3?hdnea=exp=1790960445~acl=/api/1/1/d/4/f/0/d4f1e388cb41a65d06ae479968cfafaa.mp3*~data=user_id=0,application_id=42~hmac=5f7f073c467618d993042257ca9bc2e0850fae756be5df40b60023adeba7c359', 207, (select id from groups where slug = 'seventeen'), 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 345031
where not exists (select 1 from songs where deezer_track_id = 3856634281)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4236763352, 'PRESSURE', 'SF9', 'TENACITY', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/d/0/0/dd0dbb8ee4aa5b9eb0c9ccab218176d4.mp3?hdnea=exp=1790960446~acl=/api/1/1/d/d/0/0/dd0dbb8ee4aa5b9eb0c9ccab218176d4.mp3*~data=user_id=0,application_id=42~hmac=cea867e93ab33cc0a7f5e66d1fecabc1164104a42df92c4c03fdb737bafef947', 171, NULL, 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 274357
where not exists (select 1 from songs where deezer_track_id = 4236763352)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4236763332, 'Without Wings', 'SF9', 'TENACITY', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/e/f/0/feffa9670ae4070f970ffbf21c67976f.mp3?hdnea=exp=1790960446~acl=/api/1/1/f/e/f/0/feffa9670ae4070f970ffbf21c67976f.mp3*~data=user_id=0,application_id=42~hmac=fa5e3e36632b1f7f9dd5d9ac9b623f2d8cc90af03c2a332e0657f350a2621b54', 170, NULL, 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 265953
where not exists (select 1 from songs where deezer_track_id = 4236763332)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4236763382, 'Too Easily', 'SF9', 'TENACITY', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/61f2ee7c16868cbf55ef61bb0fcdd850/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/4/f/0/a4f323e8035c27d9127e0b393a03e8ba.mp3?hdnea=exp=1790960446~acl=/api/1/1/a/4/f/0/a4f323e8035c27d9127e0b393a03e8ba.mp3*~data=user_id=0,application_id=42~hmac=af10f2f935c82300caf6ce7fbef53b316061783e9c1e1b6d7ad3948a345ccca1', 148, NULL, 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 256739
where not exists (select 1 from songs where deezer_track_id = 4236763382)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4063867901, '2 L0VE', 'STAYC', '2:LOVE', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/e/3/0/0e3cc39e4cff871ae2468b4f80dabdbd.mp3?hdnea=exp=1790960449~acl=/api/1/1/0/e/3/0/0e3cc39e4cff871ae2468b4f80dabdbd.mp3*~data=user_id=0,application_id=42~hmac=45c121e65c0c9daaa94b731c20b2d8e5a2e9e025823f2a19497f6b9f96851424', 181, (select id from groups where slug = 'stayc'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 327044
where not exists (select 1 from songs where deezer_track_id = 4063867901)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4063867911, 'WHERE YOU AT?', 'STAYC', '2:LOVE', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/f/0/f/0/f0f76222c80d9d764d166696ec3d5555.mp3?hdnea=exp=1790960449~acl=/api/1/1/f/0/f/0/f0f76222c80d9d764d166696ec3d5555.mp3*~data=user_id=0,application_id=42~hmac=b8d9f93c38ea81dd1e5db74c9b8fae7a474ae1172a639dfbf9290250adef6c54', 181, (select id from groups where slug = 'stayc'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 223247
where not exists (select 1 from songs where deezer_track_id = 4063867911)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4063867921, 'SORRY', 'STAYC', '2:LOVE', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/b655c61342bb1e8607a8e71013b8c053/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/c/0/0/ac03eea18d074c6244228e7d4172403a.mp3?hdnea=exp=1790960449~acl=/api/1/1/a/c/0/0/ac03eea18d074c6244228e7d4172403a.mp3*~data=user_id=0,application_id=42~hmac=a665e08e7e340855861517fe3322f3e02d7bf1e26f4f4d5260bb510c71919f5b', 173, (select id from groups where slug = 'stayc'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 220032
where not exists (select 1 from songs where deezer_track_id = 4063867921)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4204153972, 'This & That', 'Stray Kids', 'THIS & THAT', 'https://cdn-images.dzcdn.net/images/cover/84ed07b8a200ffbf6676eba8cbb1647c/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/84ed07b8a200ffbf6676eba8cbb1647c/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/84ed07b8a200ffbf6676eba8cbb1647c/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/e/4/a/0/e4a1dcf4ba2e2a1803927b822bc39e63.mp3?hdnea=exp=1790960450~acl=/api/1/1/e/4/a/0/e4a1dcf4ba2e2a1803927b822bc39e63.mp3*~data=user_id=0,application_id=42~hmac=beecc300f5c95eb74687dbf5b142cfe48c4367cf7053319da8911a54c85fb479', 185, (select id from groups where slug = 'stray-kids'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 887299
where not exists (select 1 from songs where deezer_track_id = 4204153972)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4103855641, 'RUN IT', 'Stray Kids', 'RUN IT', 'https://cdn-images.dzcdn.net/images/cover/1eac8cefb3a2e789a00e0a305f1ac770/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/1eac8cefb3a2e789a00e0a305f1ac770/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/1eac8cefb3a2e789a00e0a305f1ac770/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/f/b/0/4fb749403320735bb320902cec3c8192.mp3?hdnea=exp=1790960451~acl=/api/1/1/4/f/b/0/4fb749403320735bb320902cec3c8192.mp3*~data=user_id=0,application_id=42~hmac=993d8253734fb5db7570a403c703e0430821f98fd74d8ee2c709c0e970c7baa7', 209, (select id from groups where slug = 'stray-kids'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 808895
where not exists (select 1 from songs where deezer_track_id = 4103855641)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4204153982, 'After You', 'Stray Kids', 'THIS & THAT', 'https://cdn-images.dzcdn.net/images/cover/84ed07b8a200ffbf6676eba8cbb1647c/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/84ed07b8a200ffbf6676eba8cbb1647c/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/84ed07b8a200ffbf6676eba8cbb1647c/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/7/4/0/274958cac9184eaff87752b71cb0fec1.mp3?hdnea=exp=1790960450~acl=/api/1/1/2/7/4/0/274958cac9184eaff87752b71cb0fec1.mp3*~data=user_id=0,application_id=42~hmac=0c005b02d733b20dcdaf18c1568672ac4fb6dbff89df43b0e40733e2d12d3eae', 172, (select id from groups where slug = 'stray-kids'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 762318
where not exists (select 1 from songs where deezer_track_id = 4204153982)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4049214851, 'IF I', 'TREASURE', '4th MINI ALBUM [NEW WAV]', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/9/1/0/391fc5bc6ef75180d529f741d499242f.mp3?hdnea=exp=1790960461~acl=/api/1/1/3/9/1/0/391fc5bc6ef75180d529f741d499242f.mp3*~data=user_id=0,application_id=42~hmac=0abf6da7712c785bf01153b9e11a63a8ac6d0eecc3a7486462548971458f1cdb', 179, (select id from groups where slug = 'treasure'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 390205
where not exists (select 1 from songs where deezer_track_id = 4049214851)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4049214881, 'DANGER', 'TREASURE', '4th MINI ALBUM [NEW WAV]', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/a/0/0/1a0eaa1713c15d2dac8cf0a1649bca1f.mp3?hdnea=exp=1790960461~acl=/api/1/1/1/a/0/0/1a0eaa1713c15d2dac8cf0a1649bca1f.mp3*~data=user_id=0,application_id=42~hmac=4219edb44bcb032eb0de81d55770e5e01afd34c08d033c2c49467bccda472dc0', 157, (select id from groups where slug = 'treasure'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 308025
where not exists (select 1 from songs where deezer_track_id = 4049214881)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4049214861, 'ZOOM ZOOM', 'TREASURE', '4th MINI ALBUM [NEW WAV]', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/ca3236b650b5188dca059c31001926e8/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/0/b/0/a0b19a31902f4c79dd31acafd255bb61.mp3?hdnea=exp=1790960461~acl=/api/1/1/a/0/b/0/a0b19a31902f4c79dd31acafd255bb61.mp3*~data=user_id=0,application_id=42~hmac=d4d5655f0919057caa080e3f24fb4d8f7076f55c7582de21acd86447f69ab484', 179, (select id from groups where slug = 'treasure'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 306046
where not exists (select 1 from songs where deezer_track_id = 4049214861)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4233237592, 'DNA (Dream N Access)', 'tripleS', '<DNA>', 'https://cdn-images.dzcdn.net/images/cover/2bd033ab0556b7f98a2b7b478664c4e1/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/2bd033ab0556b7f98a2b7b478664c4e1/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/2bd033ab0556b7f98a2b7b478664c4e1/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/3/b/d/0/3bde7f81f47993a724c0052b597e1a5c.mp3?hdnea=exp=1790960462~acl=/api/1/1/3/b/d/0/3bde7f81f47993a724c0052b597e1a5c.mp3*~data=user_id=0,application_id=42~hmac=ebb3b40964d8b8bc6130df65c7c0fde91e406b2ddc2b26a6ab15ca4565b9b9d2', 162, (select id from groups where slug = 'triples'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 247517
where not exists (select 1 from songs where deezer_track_id = 4233237592)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4217012982, 'World Wild Women', 'tripleS', '<World Wild Women>', 'https://cdn-images.dzcdn.net/images/cover/2a537fd49f13f119ffe06e3f0a45a3e3/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/2a537fd49f13f119ffe06e3f0a45a3e3/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/2a537fd49f13f119ffe06e3f0a45a3e3/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/5/6/0/8567adbc7db08aea2cf9a3aa89097594.mp3?hdnea=exp=1790960462~acl=/api/1/1/8/5/6/0/8567adbc7db08aea2cf9a3aa89097594.mp3*~data=user_id=0,application_id=42~hmac=62fbf283ce7e0cc4ac7bf209eeb4b3154695ad5649ebb85d5597f4531b687ee4', 163, (select id from groups where slug = 'triples'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 211788
where not exists (select 1 from songs where deezer_track_id = 4217012982)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4172467752, 'Dream Dress', 'tripleS', 'Dream Dress', 'https://cdn-images.dzcdn.net/images/cover/376003d9cec501af43cbef1343540a46/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/376003d9cec501af43cbef1343540a46/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/376003d9cec501af43cbef1343540a46/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/6/8/2/0/6828cb518e76423ec46dc091d4d3e6aa.mp3?hdnea=exp=1790960463~acl=/api/1/1/6/8/2/0/6828cb518e76423ec46dc091d4d3e6aa.mp3*~data=user_id=0,application_id=42~hmac=3634a55b523b0697c67bc2563e63e2962a3cf6d126c972c5ae3f470047dbf0ef', 189, (select id from groups where slug = 'triples'), 'gg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 198982
where not exists (select 1 from songs where deezer_track_id = 4172467752)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4179963532, 'SODA SODA', 'TWS', 'SODA SODA', 'https://cdn-images.dzcdn.net/images/cover/067a766540041decd04708b7aaa560eb/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/067a766540041decd04708b7aaa560eb/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/067a766540041decd04708b7aaa560eb/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/7/9/5/0/7957171e03beb888f1ef0e84670d6f4a.mp3?hdnea=exp=1790960466~acl=/api/1/1/7/9/5/0/7957171e03beb888f1ef0e84670d6f4a.mp3*~data=user_id=0,application_id=42~hmac=80786874e4eadb25039590fd142fb1c3b6e9bb5cc8f8c2e3519314e6ee85cff0', 192, (select id from groups where slug = 'tws'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 258532
where not exists (select 1 from songs where deezer_track_id = 4179963532)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4179963542, 'Palm Tree', 'TWS', 'SODA SODA', 'https://cdn-images.dzcdn.net/images/cover/067a766540041decd04708b7aaa560eb/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/067a766540041decd04708b7aaa560eb/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/067a766540041decd04708b7aaa560eb/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/b/f/6/0/bf6a14035c51ad7aa0c8029f2f0eee58.mp3?hdnea=exp=1790960466~acl=/api/1/1/b/f/6/0/bf6a14035c51ad7aa0c8029f2f0eee58.mp3*~data=user_id=0,application_id=42~hmac=797972019f329ba4a9cb22b803685294ae204fdae0ce96b6c584323ef6b64c36', 172, (select id from groups where slug = 'tws'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 235263
where not exists (select 1 from songs where deezer_track_id = 4179963542)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4073624071, 'Dream With Us', 'TWS', 'Dream With Us', 'https://cdn-images.dzcdn.net/images/cover/28195ed78babd18b3cd39af834d3ef64/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/28195ed78babd18b3cd39af834d3ef64/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/28195ed78babd18b3cd39af834d3ef64/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/c/b/0/4cb94694363091823e66f067b1ebd20d.mp3?hdnea=exp=1790960466~acl=/api/1/1/4/c/b/0/4cb94694363091823e66f067b1ebd20d.mp3*~data=user_id=0,application_id=42~hmac=54030b5aefdd045bcca810697b59009a9987c9e3980d030a30143b90222ecfb1', 168, (select id from groups where slug = 'tws'), 'bg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 167097
where not exists (select 1 from songs where deezer_track_id = 4073624071)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4212946562, 'Setsuna Hanabi', 'TXT', 'Setsuna Hanabi', 'https://cdn-images.dzcdn.net/images/cover/a1d5938cc0f96c46192e492e6d0bcf1b/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a1d5938cc0f96c46192e492e6d0bcf1b/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a1d5938cc0f96c46192e492e6d0bcf1b/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/4/7/0/147ebcd75f3854e6b3d5102201e1bc11.mp3?hdnea=exp=1790960467~acl=/api/1/1/1/4/7/0/147ebcd75f3854e6b3d5102201e1bc11.mp3*~data=user_id=0,application_id=42~hmac=245cfa494017def15733957790468a8039bf68ac8b0bc5500ace320a5601a05c', 173, (select id from groups where slug = 'txt'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 714219
where not exists (select 1 from songs where deezer_track_id = 4212946562)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4212946572, 'Silence', 'TXT', 'Setsuna Hanabi', 'https://cdn-images.dzcdn.net/images/cover/a1d5938cc0f96c46192e492e6d0bcf1b/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a1d5938cc0f96c46192e492e6d0bcf1b/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a1d5938cc0f96c46192e492e6d0bcf1b/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/a/c/a/0/acab0d99a8a7a2958a573552ace8a627.mp3?hdnea=exp=1790960467~acl=/api/1/1/a/c/a/0/acab0d99a8a7a2958a573552ace8a627.mp3*~data=user_id=0,application_id=42~hmac=395f42d51f6a1371546e08a1d74124bc7543fbcb0fafbd0facbae25c99e56f60', 201, (select id from groups where slug = 'txt'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 451774
where not exists (select 1 from songs where deezer_track_id = 4212946572)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3950788701, 'Bed of Thorns', 'TXT', '7TH YEAR: A Moment of Stillness in the Thorns', 'https://cdn-images.dzcdn.net/images/cover/3ed6b0d3dcf5c2921a5dad7c5fc7cfc0/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3ed6b0d3dcf5c2921a5dad7c5fc7cfc0/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3ed6b0d3dcf5c2921a5dad7c5fc7cfc0/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/8/e/1/0/8e1679602e320af365f6799ca7fcdaf9.mp3?hdnea=exp=1790960468~acl=/api/1/1/8/e/1/0/8e1679602e320af365f6799ca7fcdaf9.mp3*~data=user_id=0,application_id=42~hmac=68c8c7c8d9d72cb1eba897d987b49658352a8a5daf041293c2a54d6f248baca8', 168, (select id from groups where slug = 'txt'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 446329
where not exists (select 1 from songs where deezer_track_id = 3950788701)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4260806001, 'Sky Land, Star Land', 'UNIS', 'Sky Land, Star Land', 'https://cdn-images.dzcdn.net/images/cover/0709ae9c367d569861717b2b2678995e/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0709ae9c367d569861717b2b2678995e/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/0709ae9c367d569861717b2b2678995e/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/2/9/8/0/298f7cd04dc7255383d7d69e0be4b352.mp3?hdnea=exp=1790960470~acl=/api/1/1/2/9/8/0/298f7cd04dc7255383d7d69e0be4b352.mp3*~data=user_id=0,application_id=42~hmac=047542f92dcc3925ac6296747c3e1deb8a79b311ecf4e4e5c5c42760d7297bec', 219, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 497189
where not exists (select 1 from songs where deezer_track_id = 4260806001)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4289452762, 'Milky Way', 'UNIS', 'Milky Way', 'https://cdn-images.dzcdn.net/images/cover/e441de8e7a519428060669ad799ac3c7/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e441de8e7a519428060669ad799ac3c7/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/e441de8e7a519428060669ad799ac3c7/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/0/2/2/0/02237d16482f877d38fe2090cd95c138.mp3?hdnea=exp=1790960469~acl=/api/1/1/0/2/2/0/02237d16482f877d38fe2090cd95c138.mp3*~data=user_id=0,application_id=42~hmac=a1be2c0fef9188379c2b1d33873d5f68ede18bf546a319cd88df4e3a620ddc55', 215, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 360122
where not exists (select 1 from songs where deezer_track_id = 4289452762)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4258150901, 'Don''t Panic!', 'VERIVERY', 'CONFETTI', 'https://cdn-images.dzcdn.net/images/cover/7ca530dd7d95c3fd07920ce5fbc076d2/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7ca530dd7d95c3fd07920ce5fbc076d2/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7ca530dd7d95c3fd07920ce5fbc076d2/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/0/6/0/4063ce653c1e376790952951e9af22cc.mp3?hdnea=exp=1790960472~acl=/api/1/1/4/0/6/0/4063ce653c1e376790952951e9af22cc.mp3*~data=user_id=0,application_id=42~hmac=4a3d2ca1b2adb44c1a71e2954a947dbe7cd0d77332db03eb5bcbb5f27a8a0d78', 157, NULL, 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 358551
where not exists (select 1 from songs where deezer_track_id = 4258150901)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4173621912, '鸢 Vision Wings', 'WayV', 'Vision Wings - The 8th Mini Album', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/4/1/0/441eefdc48f66c95288cc0686545b661.mp3?hdnea=exp=1790960474~acl=/api/1/1/4/4/1/0/441eefdc48f66c95288cc0686545b661.mp3*~data=user_id=0,application_id=42~hmac=c4f90356422864b1b84abb8c471151ed2c40a0104d3cf6141cd2617131e9713c', 222, NULL, 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'iconic', 452441
where not exists (select 1 from songs where deezer_track_id = 4173621912)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4173621922, '焰光蓝 Blue Fever', 'WayV', 'Vision Wings - The 8th Mini Album', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/c/3/6/0/c36223fb7296bea089951483577f1547.mp3?hdnea=exp=1790960474~acl=/api/1/1/c/3/6/0/c36223fb7296bea089951483577f1547.mp3*~data=user_id=0,application_id=42~hmac=361c198365196b6f46470a2eeace6e82791fff2619a29971a251413bf1dc874f', 200, NULL, 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 306976
where not exists (select 1 from songs where deezer_track_id = 4173621922)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4173621942, '主场 Icon', 'WayV', 'Vision Wings - The 8th Mini Album', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/437fc4501bc8d4b4fed857691f971984/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/d/3/5/0/d356ebec9a423b74ec886e7d23d5dee4.mp3?hdnea=exp=1790960474~acl=/api/1/1/d/3/5/0/d356ebec9a423b74ec886e7d23d5dee4.mp3*~data=user_id=0,application_id=42~hmac=ca86c939cafc993fdd62437d2e26c732d0b4e59dd677df49fd8f6d64f37e009d', 204, NULL, 'bg', '3rd', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'popular', 289821
where not exists (select 1 from songs where deezer_track_id = 4173621942)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4293055462, 'Haze (SUNHYE, JIANA, DOEUN)', 'YOUNG POSSE', 'Haze', 'https://cdn-images.dzcdn.net/images/cover/3d76cd46bbde7f9a96a791a2f8016627/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3d76cd46bbde7f9a96a791a2f8016627/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/3d76cd46bbde7f9a96a791a2f8016627/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/3/b/0/53b8449628ae7348f19c093fe5adf0e5.mp3?hdnea=exp=1790960479~acl=/api/1/1/5/3/b/0/53b8449628ae7348f19c093fe5adf0e5.mp3*~data=user_id=0,application_id=42~hmac=c35dd62dd640c5e21bc59c1edf6fc52be0411f216d3614a75c7e52a9e2fd900e', 208, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 200110
where not exists (select 1 from songs where deezer_track_id = 4293055462)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4130517741, 'Mr 2026', 'YOUNG POSSE', 'young tape', 'https://cdn-images.dzcdn.net/images/cover/a1436c323705764b884ad3e4c07aa480/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a1436c323705764b884ad3e4c07aa480/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/a1436c323705764b884ad3e4c07aa480/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/4/6/3/0/463529d02bfe03657b7b752c0ba90d5b.mp3?hdnea=exp=1790960479~acl=/api/1/1/4/6/3/0/463529d02bfe03657b7b752c0ba90d5b.mp3*~data=user_id=0,application_id=42~hmac=eca73c3ec68723b640f19427a0cb1b0fcf6981133fba34856bd191559a24dbbb', 148, NULL, 'gg', '5th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'medium', 197810
where not exists (select 1 from songs where deezer_track_id = 4130517741)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4167244632, 'Aphrodite', 'ZEROBASEONE', 'KAIKILOVE', 'https://cdn-images.dzcdn.net/images/cover/7fc5235bc6ca10e9742b0ea5c8544e76/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7fc5235bc6ca10e9742b0ea5c8544e76/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7fc5235bc6ca10e9742b0ea5c8544e76/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/5/5/0/0/5509b4ea0be5e0b8a748d5482b8d5b6e.mp3?hdnea=exp=1790960481~acl=/api/1/1/5/5/0/0/5509b4ea0be5e0b8a748d5482b8d5b6e.mp3*~data=user_id=0,application_id=42~hmac=c580f78463a841b4c1807f53f60086730583b098ad84e1a1b9b0bc1ca62946c4', 167, (select id from groups where slug = 'zerobaseone'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 216033
where not exists (select 1 from songs where deezer_track_id = 4167244632)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 4167244612, 'Existence', 'ZEROBASEONE', 'KAIKILOVE', 'https://cdn-images.dzcdn.net/images/cover/7fc5235bc6ca10e9742b0ea5c8544e76/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7fc5235bc6ca10e9742b0ea5c8544e76/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/7fc5235bc6ca10e9742b0ea5c8544e76/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/a/3/0/1a32d78198a400a4ee0980e1d3560577.mp3?hdnea=exp=1790960481~acl=/api/1/1/1/a/3/0/1a32d78198a400a4ee0980e1d3560577.mp3*~data=user_id=0,application_id=42~hmac=fc3386d47f8da14252974bf1a277650f5a0a114c2b4fe0701b0aff30fe40f524', 213, (select id from groups where slug = 'zerobaseone'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 208387
where not exists (select 1 from songs where deezer_track_id = 4167244612)
on conflict do nothing;

insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)
select 3802892402, 'ROSES', 'ZEROBASEONE', 'RE-FLOW', 'https://cdn-images.dzcdn.net/images/cover/5377b841dc4837175208dd0daabd90a6/56x56-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/5377b841dc4837175208dd0daabd90a6/250x250-000000-80-0-0.jpg', 'https://cdn-images.dzcdn.net/images/cover/5377b841dc4837175208dd0daabd90a6/500x500-000000-80-0-0.jpg', 'https://cdnt-preview.dzcdn.net/api/1/1/1/f/7/0/1f7101ff988e923faafd7eaa5c40726f.mp3?hdnea=exp=1790960481~acl=/api/1/1/1/f/7/0/1f7101ff988e923faafd7eaa5c40726f.mp3*~data=user_id=0,application_id=42~hmac=e993a0209a0ea23993673fc74cca783451f4a1f617d652baecd2f1a7ba775f55', 141, (select id from groups where slug = 'zerobaseone'), 'bg', '4th', NULL, 2026, 'korean', '{}', '{}', 'active', true, 'hard', 166057
where not exists (select 1 from songs where deezer_track_id = 3802892402)
on conflict do nothing;
commit;

-- ====================================================================================================
-- FILE 9: v12-g2-06-title-tracks.sql
-- ====================================================================================================
-- WHAT: flag sourced title tracks (songs.is_title_track = true).
-- WHY: only 45 songs are flagged today and none of them is in the curated subset, so the "Title tracks only" playlist
--   is empty (v11 decision 33). Growth v12 flags the title tracks of the new songs and of the hits playlists, each from a
--   cited source (SYSTEM.md 3). A full backfill of the catalogue needs a sourced list and stays an owner decision.
-- ROWS: 41 update(s), one per song. No insert, no delete. A song that is not in the table yet (it comes with
--   v12-g2-02 or v12-g2-03) is simply not matched if those files are not applied first.
-- SOURCES: one public page per song, quoted in docs/growth/catalogue/v12-g2-06-title-tracks.md. Every page was fetched
--   and the quoted words were found on it (apps/quiz/scripts/v12/catalogue/verify-source.mts).
-- GENERATED: apps/quiz/scripts/v12/catalogue/build-title-tracks-sql.mts (anon key, nothing written), 2026-10-02T16:54:44.810Z.
-- IDEMPOTENT: each update only touches a row that is not flagged yet. Safe to run twice.
-- APPLY ORDER: after v12-g2-02-songs-new-groups.sql and v12-g2-03-releases-2026.sql.
-- VERIFY: select count(*) from songs where is_title_track and deezer_track_id in (3234208281, 3407280351, 3570464781, 3827375541, 4087604431, 3188858011, 3561319281, 3937976471, 2722856182, 2966352091, 3211215061, 3426703371, 3622618822, 3651343562, 2671407212, 2842874062, 2990968051, 3293899871, 3514912991, 3946155661, 4089668491, 4131564511, 4232461262, 4204153972, 4103855641, 4027935751, 4149903382, 3986645071, 4204204872, 4178965332, 4090868561, 4208809742, 4258718131, 4143495621, 4051286221, 4285321022, 4049214851, 4157622882, 4018650521, 3920191761, 4223440872);  -- 41
-- UNDO: update songs set is_title_track = null where deezer_track_id in (<the same ids>);
--   (the rows held NULL or false before; the report lists the previous value of each stored row)

begin;

-- Hearts2Hearts, The Chase. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3234208281 and is_title_track is distinct from true;

-- Hearts2Hearts, STYLE. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3407280351 and is_title_track is distinct from true;

-- Hearts2Hearts, FOCUS. Source: https://en.wikipedia.org/wiki/Focus_(Hearts2Hearts_EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3570464781 and is_title_track is distinct from true;

-- Hearts2Hearts, RUDE!. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3827375541 and is_title_track is distinct from true;

-- Hearts2Hearts, Lemon Tang. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4087604431 and is_title_track is distinct from true;

-- KickFlip, Mama Said. Source: https://en.wikipedia.org/wiki/KickFlip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3188858011 and is_title_track is distinct from true;

-- KickFlip, My First Love Song. Source: https://kpop.fandom.com/wiki/My_First_Flip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3561319281 and is_title_track is distinct from true;

-- KickFlip, Eye-Poppin'. Source: https://en.wikipedia.org/wiki/KickFlip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3937976471 and is_title_track is distinct from true;

-- RESCENE, UhUh. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2722856182 and is_title_track is distinct from true;

-- RESCENE, LOVE ATTACK. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2966352091 and is_title_track is distinct from true;

-- RESCENE, Glow Up. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3211215061 and is_title_track is distinct from true;

-- RESCENE, Deja Vu. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3426703371 and is_title_track is distinct from true;

-- RESCENE, Heart Drop. Source: https://www.koreatimes.co.kr/amp/entertainment/k-pop/20251125/rescene-bottles-up-berry-scent-on-new-mini-album-lip-bomb
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3622618822 and is_title_track is distinct from true;

-- RESCENE, Bloom. Source: https://www.koreatimes.co.kr/amp/entertainment/k-pop/20251125/rescene-bottles-up-berry-scent-on-new-mini-album-lip-bomb
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3651343562 and is_title_track is distinct from true;

-- NCT WISH, WISH (Korean Ver.). Source: https://en.wikipedia.org/wiki/Wish_(NCT_Wish_song)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2671407212 and is_title_track is distinct from true;

-- NCT WISH, Songbird (Korean Version). Source: https://en.wikipedia.org/wiki/NCT_Wish
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2842874062 and is_title_track is distinct from true;

-- NCT WISH, Steady. Source: https://en.wikipedia.org/wiki/Steady_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2990968051 and is_title_track is distinct from true;

-- NCT WISH, poppop. Source: https://kpop.fandom.com/wiki/Poppop
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3293899871 and is_title_track is distinct from true;

-- NCT WISH, COLOR. Source: https://kpop.fandom.com/wiki/Color_(NCT_WISH)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3514912991 and is_title_track is distinct from true;

-- NCT WISH, Ode to Love. Source: https://kpop.fandom.com/wiki/Ode_to_Love
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3946155661 and is_title_track is distinct from true;

-- NCT WISH, BOY MEETS GIRL. Source: https://www.smentertainment.com/newsroom/nct-wish-%e6%97%a5-%ec%8b%b1%ea%b8%80-%eb%8d%94%eb%b8%94-%ed%83%80%ec%9d%b4%ed%8b%80%ea%b3%a1-boy-meets-girl-%ec%98%a4%eb%8a%9822%ec%9d%bc-%eb%b0%9c%eb%a7%a4-%ed%99%94%ec%a0%9c/
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4089668491 and is_title_track is distinct from true;

-- NCT WISH, YO-I-DON!. Source: https://www.smentertainment.com/newsroom/nct-wish-%e6%97%a5-%ed%8c%ac%eb%af%b8%ed%8c%85-%ec%a0%84%ec%84%9d-%eb%a7%a4%ec%a7%84-%e2%86%92-%ec%8b%a0%ea%b3%a1-yo-i-don-%ec%98%a4%eb%8a%9813%ec%9d%bc-%ea%b3%b5%ea%b0%9c/
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4131564511 and is_title_track is distinct from true;

-- ENHYPEN, Bloody Paradise. Source: https://en.wikipedia.org/wiki/The_Sin:_Bliss
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4232461262 and is_title_track is distinct from true;

-- Stray Kids, This & That. Source: https://en.wikipedia.org/wiki/This_%26_That_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4204153972 and is_title_track is distinct from true;

-- Stray Kids, RUN IT. Source: https://en.wikipedia.org/wiki/Stray_Kids
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4103855641 and is_title_track is distinct from true;

-- ATEEZ, BAD. Source: https://en.wikipedia.org/wiki/Ateez
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4027935751 and is_title_track is distinct from true;

-- aespa, KISS N TELL. Source: https://en.wikipedia.org/wiki/Aespa
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4149903382 and is_title_track is distinct from true;

-- BABYMONSTER, CHOOM. Source: https://en.wikipedia.org/wiki/Choom_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3986645071 and is_title_track is distinct from true;

-- KiiiKiii, Pop Off Pop Off. Source: https://en.wikipedia.org/wiki/WhyKiiiKiii
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4204204872 and is_title_track is distinct from true;

-- Red Velvet, Surfin' Boy. Source: https://en.wikipedia.org/wiki/Velvet_Summer
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4178965332 and is_title_track is distinct from true;

-- (G)I-DLE, Gimme Dat Love. Source: https://en.wikipedia.org/wiki/We_Made
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4090868561 and is_title_track is distinct from true;

-- NCT 127, Blingy. Source: https://en.wikipedia.org/wiki/Blingy
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4208809742 and is_title_track is distinct from true;

-- MONSTA X, MAGIC. Source: https://en.wikipedia.org/wiki/The_Phase_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4258718131 and is_title_track is distinct from true;

-- ARTMS, Born Stunner. Source: https://en.wikipedia.org/wiki/Artms
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4143495621 and is_title_track is distinct from true;

-- RIIZE, Do your dance. Source: https://en.wikipedia.org/wiki/Riize
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4051286221 and is_title_track is distinct from true;

-- CRAVITY, LOUDER. Source: https://en.wikipedia.org/wiki/Cravity
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4285321022 and is_title_track is distinct from true;

-- TREASURE, IF I. Source: https://en.wikipedia.org/wiki/Treasure_(band)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4049214851 and is_title_track is distinct from true;

-- fromis_9, Vitamin ME. Source: https://en.wikipedia.org/wiki/Fromis_9
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4157622882 and is_title_track is distinct from true;

-- IVE, LUCID DREAM. Source: https://en.wikipedia.org/wiki/Ive_(group)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4018650521 and is_title_track is distinct from true;

-- AKMU, Joy, Sorrow, A Beautiful Heart. Source: https://en.wikipedia.org/wiki/Flowering_(album)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3920191761 and is_title_track is distinct from true;

-- ONEWE, Scenario. Source: https://en.wikipedia.org/wiki/面:_Unknown_Atlas
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4223440872 and is_title_track is distinct from true;

commit;

-- ====================================================================================================
-- FILE 8: v12-g2-05-years-backfill.sql
-- ====================================================================================================
-- WHAT: fill songs.year where it is NULL
-- WHY: generate now serves year ranges (kpop-hits-2026, kpop-hits-2025, recent-hits, kpop-legends). The year column
--   is NULL on 3,964 of 4,120 songs, and the 156 rows the ingestion script wrote before V12 carry the act's debut
--   year instead of the release year (growth v12, SYSTEM.md 3; v11 decision 33).
-- ROWS: 3076 update(s) of songs.year. No insert, no delete.
-- SOURCE: the public Deezer API, per track: release_date and ISRC. A year is written only when the release year is
--   the ISRC registration year; every other track is left untouched.
-- GENERATED: apps/quiz/scripts/v12/catalogue/build-years-sql.mts (anon key, nothing written), 2026-10-02T16:42:47.559Z.
--   Report: docs/growth/catalogue/v12-g2-04-05-years.md.
-- OWNER DECISION: this is a backfill of most of the catalogue. It is what makes kpop-legends playable and makes
--   recent-hits and the hits playlists complete. It also makes the "Year" line appear on the song pages
--   (/verse/<group>/songs/<id> prints the year when there is one), with the flags on or off.
-- IDEMPOTENT: only rows whose year is still NULL are touched; a second run matches nothing.
-- APPLY ORDER: any time. Independent of the other v12-g2 files.
-- VERIFY: select count(*) filter (where year is null) as no_year, count(*) filter (where year <= 2017) as legends from songs;
-- UNDO: update songs set year = null where deezer_track_id in (select d from (values (..)) v(d));  -- the ids of the list below

begin;
update songs s set year = v.year, updated_at = now()
from (values
  (1614402282, 2022),
  (1918592987, 2018),
  (2295595895, 2023),
  (3991672021, 2026),
  (3086861671, 2024),
  (1864677117, 2016),
  (1772764597, 2016),
  (766187932, 2019),
  (1513773902, 2021),
  (1016503522, 2020),
  (2986254641, 2019),
  (1536520922, 2021),
  (3946385831, 2019),
  (1684801257, 2022),
  (3030102541, 2024),
  (1866048787, 2018),
  (2320250915, 2023),
  (1355896192, 2021),
  (1900661967, 2017),
  (1754132047, 2022),
  (121589228, 2016),
  (1848896967, 2022),
  (641230712, 2019),
  (2286368877, 2023),
  (2826599452, 2024),
  (3477348891, 2022),
  (1449387922, 2021),
  (775042242, 2019),
  (2018541107, 2022),
  (997256992, 2020),
  (3389702161, 2018),
  (3514965081, 2025),
  (2640612502, 2024),
  (2018541097, 2022),
  (3033654921, 2024),
  (1804318467, 2022),
  (1885908747, 2007),
  (1536520932, 2021),
  (3973347911, 2026),
  (1034544342, 2017),
  (3305008351, 2025),
  (1857880987, 2017),
  (1080246712, 2020),
  (1515103182, 2021),
  (3702871042, 2021),
  (2853677102, 2024),
  (1894301847, 2016),
  (727825742, 2018),
  (2671436232, 2019),
  (1097366452, 2020),
  (1034544272, 2018),
  (3165067881, 2022),
  (1813779407, 2022),
  (1278127622, 2021),
  (1453644262, 2021),
  (1865869887, 2018),
  (1975318787, 2022),
  (1397732492, 2021),
  (1854909687, 2011),
  (3677114382, 2025),
  (2726027891, 2024),
  (1889850077, 2022),
  (3038782421, 2024),
  (4052286161, 2026),
  (3112513961, 2019),
  (2936891671, 2024),
  (3991672011, 2026),
  (1872064977, 2022),
  (2373775155, 2023),
  (2513111831, 2021),
  (3124177221, 2019),
  (1249505632, 2021),
  (1811341327, 2021),
  (1259815602, 2017),
  (3907717321, 2026),
  (3528439201, 2025),
  (2964350131, 2024),
  (1017174762, 2013),
  (3114776991, 2024),
  (4009047311, 2026),
  (616306322, 2012),
  (949814002, 2020),
  (1459197152, 2021),
  (1695004937, 2022),
  (1146132672, 2020),
  (728232212, 2018),
  (3100088681, 2024),
  (1005823842, 2017),
  (3339397501, 2025),
  (3272541221, 2025),
  (1763386577, 2022),
  (3702580592, 2025),
  (2786435002, 2024),
  (779646712, 2019),
  (2968143471, 2020),
  (1996599537, 2012),
  (2016706927, 2022),
  (727835812, 2018),
  (2015261097, 2022),
  (1834824457, 2022),
  (3344518671, 2025),
  (1855980917, 2013),
  (3976720991, 2026),
  (4015091781, 2026),
  (142341145, 2017),
  (2516790961, 2016),
  (2377843665, 2022),
  (1811341317, 2021),
  (1259864062, 2011),
  (2993262571, 2024),
  (4000252291, 2026),
  (1141182492, 2020),
  (3910166341, 2026),
  (3559389181, 2025),
  (1345071182, 2021),
  (3664415402, 2025),
  (130030766, 2016),
  (2613233272, 2021),
  (3547069241, 2025),
  (1901042427, 2017),
  (1846207697, 2012),
  (989408602, 2020),
  (1345071172, 2021),
  (1737159087, 2022),
  (727835722, 2019),
  (2402913845, 2023),
  (2903113091, 2024),
  (129531282, 2016),
  (1881805967, 2022),
  (2844933232, 2024),
  (2510923001, 2023),
  (1391738502, 2021),
  (2978661041, 2024),
  (3286967641, 2018),
  (1869061877, 2018),
  (3420412591, 2025),
  (1887731517, 2012),
  (1099539492, 2020),
  (1996599487, 2012),
  (98612334, 2009),
  (1466941852, 2021),
  (775877112, 2019),
  (1229377342, 2020),
  (841853442, 2010),
  (3870760681, 2019),
  (1402345162, 2021),
  (3068214091, 2024),
  (3412534541, 2025),
  (1752621817, 2022),
  (3561186891, 2024),
  (1215090882, 2021),
  (1846227757, 2012),
  (1700308447, 2022),
  (1072850152, 2020),
  (142341147, 2017),
  (2543049201, 2023),
  (1822423867, 2012),
  (916778152, 2020),
  (3979805121, 2026),
  (2375753455, 2021),
  (2378007735, 2022),
  (929503122, 2020),
  (3863933711, 2026),
  (3436468351, 2023),
  (674131162, 2017),
  (1032505452, 2016),
  (728199992, 2018),
  (2722445152, 2023),
  (3315051671, 2025),
  (1557884832, 2021),
  (728706262, 2008),
  (3360599881, 2025),
  (2232907067, 2016),
  (728071662, 2016),
  (3605065172, 2025),
  (826315082, 2019),
  (1730381517, 2022),
  (2883618912, 2024),
  (3861478861, 2026),
  (682110222, 2019),
  (2514947041, 2023),
  (2613229892, 2019),
  (4006888191, 2026),
  (3561187011, 2023),
  (4035574601, 2026),
  (3328583481, 2025),
  (3286363741, 2017),
  (3498716131, 2025),
  (2344534105, 2023),
  (1886050017, 2010),
  (3124823391, 2024),
  (2344534085, 2023),
  (2413240615, 2023),
  (2043898637, 2022),
  (2945278761, 2024),
  (2721747822, 2024),
  (1513773892, 2021),
  (1870918187, 2019),
  (2720832982, 2024),
  (2217259597, 2023),
  (728710012, 2016),
  (2169805077, 2023),
  (1297748532, 2021),
  (3520921381, 2025),
  (3979805111, 2026),
  (2857895772, 2024),
  (1488403992, 2021),
  (3282147311, 2023),
  (3432082921, 2025),
  (2864195882, 2016),
  (2806220842, 2024),
  (1107300642, 2020),
  (1913051417, 2018),
  (3664415392, 2025),
  (4008782471, 2026),
  (943081302, 2018),
  (1672902377, 2022),
  (3076552471, 2024),
  (3648916542, 2025),
  (4006888171, 2026),
  (3959336881, 2022),
  (982983882, 2020),
  (1662545982, 2022),
  (3373459991, 2025),
  (1017162602, 2012),
  (2551832922, 2023),
  (1713368817, 2022),
  (1126100452, 2020),
  (1263967812, 2020),
  (1327076862, 2021),
  (2826599432, 2024),
  (4035574581, 2026),
  (1017174622, 2017),
  (1870918167, 2019),
  (2441734025, 2023),
  (3863933831, 2026),
  (3270807521, 2025),
  (1515103142, 2021),
  (1829014327, 2022),
  (1859559547, 2016),
  (1885976057, 2012),
  (4004609281, 2026),
  (3848537541, 2026),
  (989732312, 2020),
  (3944844411, 2026),
  (3652691542, 2025),
  (3044885771, 2024),
  (1272979642, 2021),
  (1341998632, 2021),
  (878493942, 2020),
  (2471380401, 2023),
  (863372032, 2020),
  (1030437912, 2020),
  (1556470622, 2021),
  (569305102, 2018),
  (2671546252, 2022),
  (1330032082, 2021),
  (3991730701, 2026),
  (4000252311, 2026),
  (2731643871, 2016),
  (4039231961, 2026),
  (3262816591, 2025),
  (127531055, 2016),
  (2939850241, 2024),
  (1824012107, 2012),
  (2043650297, 2022),
  (3459413601, 2025),
  (2677820132, 2024),
  (728236682, 2018),
  (1259852952, 2010),
  (2672074572, 2022),
  (739820662, 2019),
  (1245925952, 2021),
  (3112422061, 2021),
  (1996599577, 2012),
  (2027388047, 2022),
  (1694790877, 2022),
  (1343758892, 2021),
  (1881805987, 2022),
  (2179956027, 2023),
  (1852948397, 2016),
  (1936902617, 2022),
  (3863933791, 2026),
  (3124823301, 2024),
  (1536520942, 2021),
  (1543877942, 2017),
  (2338812365, 2023),
  (3442856531, 2025),
  (2633284812, 2024),
  (3991672051, 2026),
  (1846224327, 2012),
  (728533762, 2015),
  (1062149422, 2020),
  (3190029251, 2025),
  (3462560441, 2025),
  (1343758882, 2021),
  (2731596141, 2013),
  (1103084522, 2020),
  (1900294787, 2022),
  (2847328582, 2024),
  (877102472, 2010),
  (3379300651, 2025),
  (689875602, 2019),
  (2534146951, 2023),
  (1809475807, 2022),
  (1032505462, 2016),
  (1431758402, 2021),
  (2847328602, 2024),
  (866661622, 2020),
  (1833627527, 2020),
  (1084418202, 2020),
  (782384262, 2019),
  (1915471147, 2022),
  (1263961512, 2020),
  (3677114372, 2025),
  (3233571181, 2025),
  (130136839, 2016),
  (2936891701, 2024),
  (3889137251, 2026),
  (3310050171, 2025),
  (4021131261, 2026),
  (1555151102, 2021),
  (2793622462, 2024),
  (1084317612, 2020),
  (2512363261, 2023),
  (3940158781, 2026),
  (1863010707, 2018),
  (3618409072, 2025),
  (3262816661, 2025),
  (1016728422, 2017),
  (2722449532, 2022),
  (3979805131, 2026),
  (2505653461, 2016),
  (728270622, 2012),
  (2864196772, 2020),
  (3929297881, 2026),
  (2062079467, 2022),
  (2967914541, 2024),
  (2583451292, 2017),
  (1017276712, 2018),
  (1410411132, 2021),
  (2143167457, 2023),
  (3265957011, 2025),
  (2373775145, 2023),
  (3907717311, 2026),
  (2958303701, 2024),
  (2516791001, 2016),
  (2762104921, 2024),
  (2413514885, 2023),
  (444800542, 2017),
  (1215090912, 2021),
  (2571366712, 2023),
  (3344518661, 2025),
  (1031570362, 2018),
  (1016503512, 2020),
  (1807368497, 2022),
  (939273722, 2020),
  (3039163081, 2024),
  (3616701342, 2025),
  (3961514901, 2026),
  (424373662, 2017),
  (1215090872, 2021),
  (1940133607, 2018),
  (1076199242, 2020),
  (1962896187, 2022),
  (3386137971, 2025),
  (3056600411, 2024),
  (873934652, 2020),
  (2938583161, 2024),
  (1203786912, 2021),
  (2866450262, 2024),
  (1483154852, 2021),
  (1236541952, 2021),
  (3907717211, 2026),
  (3265957041, 2025),
  (1880777647, 2011),
  (2672979022, 2023),
  (2323865765, 2023),
  (727827342, 2019),
  (1913850197, 2022),
  (727826502, 2019),
  (2813349872, 2024),
  (2507581051, 2017),
  (1892726077, 2016),
  (2694355742, 2024),
  (2953024031, 2019),
  (2724263772, 2024),
  (1263967782, 2020),
  (3643559852, 2025),
  (3376163391, 2025),
  (3948194961, 2023),
  (2507581061, 2017),
  (1890899217, 2013),
  (2458759595, 2023),
  (799590312, 2019),
  (2767457711, 2024),
  (3051293071, 2024),
  (1936418647, 2022),
  (2373775125, 2023),
  (2169683067, 2023),
  (3366124751, 2025),
  (2238692397, 2023),
  (4037009461, 2026),
  (2494537161, 2023),
  (3879889301, 2026),
  (3989506211, 2026),
  (2471380361, 2023),
  (3547069251, 2025),
  (2194921867, 2023),
  (2731574641, 2012),
  (943830732, 2019),
  (3112507251, 2018),
  (811037132, 2019),
  (2295618865, 2023),
  (1843514417, 2022),
  (1276777492, 2021),
  (1473590642, 2021),
  (1119271772, 2020),
  (4052159051, 2026),
  (799590282, 2019),
  (2215853527, 2023),
  (1839029167, 2022),
  (2471964771, 2023),
  (3038865831, 2024),
  (1084418232, 2020),
  (3662824092, 2025),
  (692669152, 2019),
  (1108179822, 2020),
  (3497815281, 2018),
  (1486563892, 2021),
  (3529563731, 2025),
  (4009047341, 2026),
  (2102623517, 2023),
  (775877212, 2019),
  (1188895142, 2014),
  (1009351772, 2020),
  (3251687551, 2025),
  (862373732, 2020),
  (1244887652, 2021),
  (2526644791, 2023),
  (1913966037, 2022),
  (3251065581, 2025),
  (1084418222, 2020),
  (728536382, 2015),
  (970051222, 2019),
  (2526644781, 2023),
  (1892281917, 2016),
  (3991730691, 2026),
  (883010072, 2020),
  (3262816601, 2025),
  (24225031, 2009),
  (736954282, 2019),
  (728233022, 2016),
  (1483154822, 2021),
  (1562508402, 2021),
  (1480703562, 2021),
  (2870451282, 2024),
  (3648916552, 2025),
  (2793494102, 2024),
  (2466655415, 2023),
  (728724572, 2016),
  (1905394957, 2017),
  (1276777462, 2021),
  (2613211842, 2021),
  (943081332, 2018),
  (1244275762, 2021),
  (3999943161, 2026),
  (1174049032, 2020),
  (3910158261, 2026),
  (1345060562, 2021),
  (3653514412, 2025),
  (1084418122, 2020),
  (938054122, 2020),
  (3948195101, 2020),
  (3334081251, 2025),
  (3792746862, 2026),
  (3320597111, 2025),
  (967691052, 2020),
  (2887742512, 2024),
  (3929166481, 2026),
  (3870767881, 2019),
  (2473512571, 2023),
  (996031392, 2020),
  (4021131251, 2026),
  (1855002957, 2014),
  (2540613121, 2023),
  (3423179041, 2025),
  (1483191352, 2021),
  (3991671991, 2026),
  (3605170782, 2025),
  (2585394352, 2024),
  (841864642, 2017),
  (3945945221, 2026),
  (3929166471, 2026),
  (2077513537, 2022),
  (759241362, 2019),
  (2893837481, 2024),
  (1452080312, 2021),
  (1286394312, 2021),
  (3547069221, 2025),
  (3929019241, 2026),
  (4061324961, 2026),
  (2311014655, 2023),
  (3802892412, 2026),
  (1122912842, 2020),
  (1789592657, 2022),
  (2813349802, 2024),
  (2181535617, 2023),
  (2257513467, 2023),
  (727833732, 2018),
  (2508380051, 2017),
  (3233571231, 2025),
  (2169683117, 2023),
  (1466941862, 2021),
  (127531053, 2016),
  (3964032861, 2026),
  (1900909507, 2015),
  (2656078332, 2017),
  (766187962, 2019),
  (2731641561, 2015),
  (2508380081, 2017),
  (3928782661, 2026),
  (728262542, 2017),
  (3112502441, 2019),
  (1861934537, 2018),
  (1918592977, 2018),
  (3412611901, 2025),
  (2851819352, 2024),
  (884177772, 2010),
  (2323865715, 2023),
  (1915565977, 2022),
  (1062228022, 2020),
  (4008923701, 2026),
  (1730381537, 2022),
  (4052159071, 2026),
  (1017174872, 2013),
  (3866248781, 2026),
  (2982115291, 2022),
  (1084418112, 2020),
  (2864196682, 2020),
  (2295618905, 2023),
  (1909873757, 2018),
  (1466941922, 2021),
  (1370230952, 2021),
  (1047707842, 2020),
  (1101744232, 2019),
  (2656078342, 2017),
  (3423720751, 2025),
  (2961411791, 2019),
  (2308366865, 2020),
  (568846222, 2018),
  (2983270321, 2023),
  (3547069321, 2025),
  (1830292767, 2022),
  (1174045762, 2020),
  (1981060237, 2022),
  (844533162, 2017),
  (728728802, 2015),
  (3561186871, 2024),
  (479740982, 2018),
  (1069773062, 2020),
  (2491593081, 2023),
  (2441497295, 2023),
  (1890840857, 2017),
  (2571646482, 2023),
  (3346172151, 2025),
  (2655600902, 2016),
  (1016744802, 2014),
  (3251711181, 2025),
  (3907717231, 2026),
  (1669976232, 2022),
  (1410390692, 2021),
  (13969171, 2011),
  (4004883141, 2026),
  (3039211951, 2024),
  (900681632, 2020),
  (2319776245, 2020),
  (3420412601, 2025),
  (2893837431, 2024),
  (683646812, 2019),
  (3907717241, 2026),
  (1816660547, 2021),
  (4008782491, 2026),
  (985138722, 2020),
  (1122912832, 2020),
  (1672902407, 2022),
  (1683067087, 2022),
  (3536844891, 2025),
  (3105385221, 2016),
  (1822494757, 2012),
  (424373672, 2017),
  (674131172, 2017),
  (3451046521, 2025),
  (2525191001, 2023),
  (2826599482, 2024),
  (4001291181, 2026),
  (2952999191, 2019),
  (3285838941, 2019),
  (3651302642, 2025),
  (2512363221, 2023),
  (2893833601, 2024),
  (1857894657, 2022),
  (1856898167, 2017),
  (1357186312, 2021),
  (3929019261, 2026),
  (1483141942, 2019),
  (4035574611, 2026),
  (3377344661, 2025),
  (1857813027, 2017),
  (3910158271, 2026),
  (3217601431, 2025),
  (1102853422, 2020),
  (1872307597, 2017),
  (3459413631, 2025),
  (1535789472, 2021),
  (2391949045, 2023),
  (2945278791, 2024),
  (3437953911, 2025),
  (1259855492, 2011),
  (2967699641, 2024),
  (4037009411, 2026),
  (2671436212, 2019),
  (2512028291, 2023),
  (2384416515, 2023),
  (989408622, 2020),
  (2181806907, 2023),
  (1894159707, 2016),
  (2945278731, 2024),
  (3460743341, 2025),
  (3412823841, 2025),
  (825435092, 2019),
  (2079242467, 2019),
  (2670101592, 2024),
  (3677094332, 2025),
  (1086474832, 2020),
  (3136668961, 2024),
  (3365288501, 2025),
  (1259855582, 2011),
  (1064277092, 2020),
  (877102802, 2011),
  (2671807822, 2022),
  (1881806047, 2022),
  (1772719807, 2022),
  (1881108087, 2022),
  (3961514911, 2026),
  (3454351531, 2025),
  (2623468192, 2024),
  (1684880997, 2022),
  (1036530722, 2020),
  (2355180055, 2023),
  (4009947481, 2026),
  (1343758922, 2021),
  (2471380371, 2023),
  (3057138211, 2019),
  (1868855617, 2017),
  (2981911961, 2024),
  (2133583957, 2021),
  (4000252271, 2026),
  (3041140841, 2024),
  (3703151672, 2016),
  (1575247622, 2021),
  (3428068831, 2025),
  (1822570677, 2012),
  (1900765227, 2017),
  (1341998602, 2021),
  (3310050161, 2025),
  (1424288472, 2021),
  (2179956047, 2023),
  (1418379852, 2021),
  (1827796327, 2022),
  (2870676672, 2024),
  (3948119581, 2026),
  (1543687192, 2021),
  (3950575921, 2024),
  (3412823861, 2025),
  (3616665192, 2025),
  (1099615972, 2020),
  (2523324981, 2023),
  (1948539997, 2022),
  (1809475827, 2022),
  (2813640112, 2024),
  (3125530581, 2024),
  (3261000061, 2022),
  (3122966811, 2024),
  (2375231995, 2023),
  (1909873707, 2018),
  (1265655262, 2021),
  (2583250262, 2019),
  (3281051581, 2022),
  (728724962, 2013),
  (2883618942, 2024),
  (1730381527, 2022),
  (3310050121, 2025),
  (1528273532, 2021),
  (3624896262, 2025),
  (3481014691, 2025),
  (1528374942, 2021),
  (1905674757, 2017),
  (3396403341, 2023),
  (1141182462, 2020),
  (1626560772, 2022),
  (3117795881, 2024),
  (1528273522, 2021),
  (3265957001, 2025),
  (2857895762, 2024),
  (1919406697, 2018),
  (125833721, 2016),
  (1815222867, 2010),
  (694748942, 2019),
  (3989506181, 2026),
  (1887496077, 2009),
  (2731684681, 2022),
  (1609692362, 2017),
  (1872193897, 2009),
  (2864196052, 2017),
  (4008782521, 2026),
  (3400461701, 2025),
  (862373722, 2020),
  (4008782511, 2026),
  (3516241231, 2025),
  (1017162632, 2019),
  (2653231912, 2024),
  (3991671981, 2026),
  (3004201171, 2024),
  (2748152501, 2024),
  (3165077571, 2015),
  (1792117327, 2022),
  (98612330, 2009),
  (2502732211, 2023),
  (1843514387, 2022),
  (1785072377, 2022),
  (2102623527, 2023),
  (3286967701, 2018),
  (2713293071, 2024),
  (2639733202, 2024),
  (2844933252, 2024),
  (3905312981, 2026),
  (1357186282, 2021),
  (2493764401, 2023),
  (1885850597, 2011),
  (2351753425, 2023),
  (1662546002, 2022),
  (1752243537, 2022),
  (1195066072, 2019),
  (3015395891, 2022),
  (3256605631, 2025),
  (3370458691, 2017),
  (1410411172, 2021),
  (2963932861, 2017),
  (1131249172, 2020),
  (3453329161, 2025),
  (805016292, 2019),
  (2412207645, 2023),
  (1260368542, 2017),
  (1609686502, 2017),
  (1268107592, 2021),
  (1042029052, 2016),
  (3299048121, 2025),
  (2140939567, 2023),
  (1854706177, 2017),
  (3242533581, 2025),
  (779646722, 2019),
  (1984296937, 2022),
  (1824160737, 2012),
  (1631661742, 2022),
  (1515103192, 2021),
  (3365288511, 2025),
  (2632089522, 2024),
  (2724263762, 2024),
  (3366124721, 2025),
  (3370621961, 2019),
  (841869142, 2018),
  (1110906832, 2020),
  (4037009401, 2026),
  (3410990811, 2025),
  (1481264762, 2017),
  (2851819342, 2024),
  (2354707745, 2023),
  (11522950, 2008),
  (3015387411, 2022),
  (1872064997, 2022),
  (3034645801, 2023),
  (2871148922, 2024),
  (1201012622, 2018),
  (1364930812, 2020),
  (727975042, 2018),
  (938054112, 2020),
  (1220675332, 2021),
  (1046082152, 2020),
  (1940133597, 2018),
  (2551821482, 2023),
  (727838942, 2018),
  (2016608317, 2022),
  (763313572, 2019),
  (1892629517, 2016),
  (3423284161, 2025),
  (727837202, 2019),
  (1897579897, 2016),
  (2843016012, 2024),
  (996031402, 2020),
  (1149714822, 2020),
  (1341998622, 2021),
  (1508770802, 2021),
  (2843016002, 2024),
  (1899741207, 2017),
  (3282147171, 2022),
  (1007967492, 2020),
  (2735364201, 2024),
  (2180030847, 2023),
  (686603852, 2019),
  (2512347751, 2023),
  (3541879171, 2025),
  (3991672061, 2026),
  (3561186911, 2024),
  (2958303711, 2024),
  (3591706042, 2025),
  (3070241291, 2014),
  (3490958301, 2025),
  (2471380381, 2023),
  (1021374322, 2020),
  (3492238581, 2025),
  (1672902417, 2022),
  (2311014675, 2023),
  (1188899422, 2012),
  (4038165181, 2026),
  (4052159061, 2026),
  (2016706907, 2022),
  (13034331, 2011),
  (3792746842, 2026),
  (2253917227, 2023),
  (4052159141, 2026),
  (2169805057, 2023),
  (2334260045, 2023),
  (2665806752, 2017),
  (727838912, 2018),
  (3938727511, 2026),
  (3863349421, 2026),
  (3614444782, 2025),
  (945773572, 2020),
  (2421785045, 2023),
  (3387815401, 2018),
  (2373775175, 2023),
  (3681439632, 2025),
  (3321304391, 2025),
  (1477121712, 2021),
  (2506369211, 2023),
  (3653514422, 2025),
  (3268752431, 2025),
  (994789832, 2020),
  (3365976541, 2025),
  (3114777001, 2024),
  (3222462941, 2025),
  (3376163381, 2025),
  (995831502, 2020),
  (3710063512, 2020),
  (970051182, 2019),
  (1015331122, 2020),
  (3957250191, 2023),
  (3039163071, 2024),
  (727970882, 2017),
  (3863933741, 2026),
  (2253917237, 2023),
  (2071104987, 2022),
  (2264621327, 2023),
  (2466655435, 2023),
  (877085012, 2010),
  (1914447367, 2018),
  (2864196622, 2020),
  (3168502041, 2025),
  (2031050967, 2022),
  (1887727837, 2013),
  (3124823351, 2024),
  (1904240177, 2017),
  (2656078382, 2017),
  (1755779947, 2022),
  (125833727, 2016),
  (2364618815, 2023),
  (1583904522, 2021),
  (3866248771, 2026),
  (1863344417, 2018),
  (3247353291, 2025),
  (1830292727, 2022),
  (2466655445, 2023),
  (728553172, 2015),
  (2672979032, 2023),
  (1009351802, 2020),
  (4008782401, 2026),
  (1055057622, 2020),
  (1585522972, 2021),
  (3160911041, 2022),
  (3336180251, 2025),
  (2180030837, 2023),
  (1856973117, 2015),
  (811112942, 2019),
  (3165090681, 2019),
  (3407926841, 2025),
  (1677164977, 2022),
  (1863344387, 2018),
  (3038865791, 2024),
  (2420010575, 2023),
  (2232905047, 2018),
  (3667806702, 2025),
  (2274024387, 2023),
  (3991730731, 2026),
  (1187981722, 2020),
  (794774722, 2019),
  (3703084372, 2012),
  (3373459931, 2025),
  (4061445021, 2026),
  (1515103172, 2021),
  (2757000931, 2024),
  (3284233841, 2025),
  (3559389201, 2025),
  (2843016022, 2024),
  (1275335022, 2021),
  (728199932, 2018),
  (547270972, 2018),
  (1034544362, 2017),
  (959705052, 2020),
  (1099543692, 2020),
  (2791367092, 2024),
  (2020808137, 2022),
  (1662545992, 2022),
  (1148437172, 2020),
  (2128683807, 2023),
  (3379300641, 2025),
  (3030348751, 2024),
  (1898961707, 2015),
  (4022926911, 2026),
  (2731622071, 2017),
  (2377809795, 2022),
  (1912421437, 2022),
  (2516790981, 2016),
  (727827352, 2019),
  (2670101602, 2024),
  (1080246742, 2020),
  (1890899207, 2013),
  (1284878432, 2021),
  (1856934847, 2017),
  (2334260035, 2023),
  (3419949571, 2025),
  (955370012, 2020),
  (872932702, 2020),
  (1224474572, 2021),
  (3561429971, 2021),
  (4016273191, 2026),
  (986387932, 2020),
  (1885857737, 2015),
  (1032528322, 2016),
  (3573891341, 2020),
  (728538832, 2015),
  (728597422, 2015),
  (1215090892, 2021),
  (1854895677, 2011),
  (4039232011, 2026),
  (2515416311, 2023),
  (3370622001, 2019),
  (2217204137, 2023),
  (3870632591, 2026),
  (1472321442, 2021),
  (3991730751, 2026),
  (3861478781, 2026),
  (3284803781, 2025),
  (3547069291, 2025),
  (2533921691, 2023),
  (3964418911, 2026),
  (2043459767, 2022),
  (1230752412, 2021),
  (3013629971, 2022),
  (2895855911, 2024),
  (1119271782, 2020),
  (3362760961, 2024),
  (2748195481, 2024),
  (1824195817, 2012),
  (3015108221, 2023),
  (2893604731, 2024),
  (2247330907, 2023),
  (1396569742, 2021),
  (3030605431, 2024),
  (3547069231, 2025),
  (2510922981, 2023),
  (3538437971, 2025),
  (3770700212, 2026),
  (2169805067, 2023),
  (727827322, 2019),
  (1854942657, 2011),
  (2523324951, 2023),
  (1872064967, 2022),
  (943830742, 2019),
  (3075722491, 2024),
  (1975318747, 2022),
  (3436466201, 2021),
  (970051202, 2019),
  (2438719385, 2023),
  (1901042417, 2017),
  (1494602152, 2021),
  (1868873227, 2017),
  (3344490101, 2025),
  (2884070262, 2024),
  (2724522392, 2024),
  (2813349822, 2024),
  (3863781831, 2026),
  (3976673351, 2026),
  (3967438101, 2026),
  (2311014665, 2023),
  (1427407902, 2021),
  (2953347221, 2024),
  (1020093482, 2020),
  (2384416475, 2023),
  (3647276772, 2025),
  (3281371591, 2025),
  (1996599517, 2012),
  (728203712, 2013),
  (4061444951, 2026),
  (1616329092, 2022),
  (1863618717, 2022),
  (3950788751, 2026),
  (1904269717, 2017),
  (3374138161, 2025),
  (1022024132, 2020),
  (1188902872, 2012),
  (2981739661, 2024),
  (2323865745, 2023),
  (1890800487, 2015),
  (3961514951, 2026),
  (2421785075, 2023),
  (3284055621, 2024),
  (1684881017, 2022),
  (3991730741, 2026),
  (3514965111, 2025),
  (3263142511, 2025),
  (2391949035, 2023),
  (3165077551, 2015),
  (3041140851, 2024),
  (2079242417, 2019),
  (4000252301, 2026),
  (1856008897, 2017),
  (727838902, 2018),
  (3740550702, 2025),
  (1857908487, 2017),
  (2172883807, 2023),
  (579931072, 2018),
  (1853146287, 2016),
  (1413157742, 2021),
  (1887805617, 2014),
  (4000016521, 2026),
  (3266458161, 2024),
  (1195185442, 2007),
  (893623712, 2020),
  (1839212417, 2022),
  (1804771807, 2022),
  (1859766687, 2018),
  (728457612, 2008),
  (3365288521, 2025),
  (3328579271, 2025),
  (1466941912, 2021),
  (2595626982, 2023),
  (1257189912, 2018),
  (4027935851, 2026),
  (2150469467, 2023),
  (727992702, 2017),
  (796697932, 2019),
  (727838952, 2018),
  (2983270171, 2023),
  (1452080292, 2021),
  (144156022, 2017),
  (2864196142, 2017),
  (1936418637, 2022),
  (1049016552, 2020),
  (728063582, 2016),
  (3160760231, 2023),
  (3512907501, 2025),
  (1062108622, 2020),
  (3124177171, 2019),
  (3946385851, 2019),
  (1785076597, 2022),
  (1466941892, 2021),
  (4009047331, 2026),
  (2055966127, 2022),
  (2953062001, 2019),
  (1215090902, 2021),
  (2102623547, 2023),
  (2245342967, 2023),
  (3808434262, 2026),
  (1015493952, 2020),
  (2215853557, 2023),
  (2043459737, 2022),
  (3370460321, 2017),
  (1857617167, 2022),
  (1533348982, 2021),
  (2384416435, 2023),
  (2460431985, 2023),
  (1304031802, 2021),
  (2701335722, 2024),
  (3991672031, 2026),
  (1512751272, 2021),
  (3282147301, 2023),
  (3487283231, 2025),
  (3512907531, 2025),
  (2616642542, 2024),
  (1445560352, 2021),
  (3536844881, 2025),
  (3547069331, 2025),
  (2016755707, 2022),
  (1572136282, 2021),
  (1263960632, 2021),
  (1904931427, 2022),
  (2669974312, 2009),
  (1034544302, 2018),
  (2526016461, 2023),
  (1215100082, 2021),
  (3492238571, 2025),
  (1024558102, 2020),
  (1873466547, 2022),
  (2722445132, 2023),
  (1837647737, 2022),
  (1030484462, 2020),
  (3477415471, 2025),
  (2172883827, 2023),
  (3286301001, 2015),
  (2016755637, 2022),
  (2377176755, 2021),
  (2079242407, 2019),
  (3989506201, 2026),
  (1148437162, 2020),
  (1575340132, 2021),
  (783638222, 2019),
  (1016503492, 2020),
  (3600636242, 2019),
  (1901042377, 2017),
  (2539573901, 2023),
  (1830292737, 2022),
  (2410645425, 2023),
  (3359004381, 2025),
  (1260431322, 2019),
  (3512907491, 2025),
  (2735364131, 2024),
  (3190029301, 2025),
  (824553982, 2019),
  (1846224317, 2012),
  (3818963601, 2026),
  (4009047351, 2026),
  (674131182, 2017),
  (1755721957, 2022),
  (1890717427, 2014),
  (728553232, 2015),
  (716300162, 2019),
  (1896091537, 2016),
  (433421822, 2012),
  (1861743657, 2011),
  (1981181777, 2022),
  (3514965091, 2025),
  (3105385251, 2016),
  (3112513931, 2019),
  (1672902397, 2022),
  (3252229561, 2024),
  (2844933262, 2024),
  (1431758442, 2021),
  (1890717417, 2014),
  (2671527962, 2022),
  (3547069261, 2025),
  (3451046551, 2025),
  (1752243557, 2022),
  (1084418102, 2020),
  (2922530041, 2017),
  (1090175782, 2020),
  (727838452, 2019),
  (2981668631, 2023),
  (3882961091, 2026),
  (1855977247, 2013),
  (806276502, 2019),
  (1017276682, 2018),
  (3255422181, 2025),
  (1010102772, 2020),
  (3528818001, 2025),
  (1843514407, 2022),
  (989408612, 2020),
  (3702871052, 2021),
  (2886708312, 2024),
  (842836582, 2014),
  (1557884792, 2021),
  (1547130432, 2021),
  (1696609927, 2022),
  (2413240575, 2023),
  (3286685211, 2025),
  (518701572, 2018),
  (3451046541, 2025),
  (3991730761, 2026),
  (3310050131, 2025),
  (3536770941, 2025),
  (2344534005, 2023),
  (1130251002, 2020),
  (3999943151, 2026),
  (1141182472, 2020),
  (2981668701, 2024),
  (943830722, 2019),
  (3281647891, 2023),
  (102598080, 2015),
  (923405482, 2020),
  (1866920337, 2009),
  (728149372, 2018),
  (1107300672, 2020),
  (1034544312, 2018),
  (3029482511, 2024),
  (3654621222, 2009),
  (98612338, 2009),
  (1203786962, 2021),
  (1466941822, 2021),
  (1055057582, 2020),
  (3896359941, 2026),
  (3276782981, 2024),
  (1844623017, 2010),
  (1042029062, 2016),
  (2354934025, 2017),
  (2851819362, 2024),
  (3039202621, 2024),
  (2672288122, 2022),
  (1005792012, 2020),
  (3396792431, 2025),
  (3226375011, 2025),
  (3982461801, 2026),
  (13034326, 2011),
  (2722445112, 2023),
  (727838932, 2018),
  (3610237072, 2025),
  (2358937995, 2023),
  (3281371631, 2025),
  (2512028281, 2023),
  (1466944932, 2021),
  (1585522962, 2021),
  (3330162491, 2025),
  (1146925002, 2020),
  (1811341347, 2021),
  (3863933681, 2026),
  (1016503442, 2020),
  (971022962, 2020),
  (1101888332, 2020),
  (3620174972, 2025),
  (1394514792, 2021),
  (1466941872, 2021),
  (2980698031, 2022),
  (3247353301, 2025),
  (1095009672, 2020),
  (1043899022, 2020),
  (3863933721, 2026),
  (3504835381, 2025),
  (3124823321, 2024),
  (2354936425, 2018),
  (1902167447, 2022),
  (1635508592, 2012),
  (2245342977, 2023),
  (986391312, 2020),
  (3242566181, 2025),
  (2508141561, 2017),
  (97732978, 2015),
  (3373460001, 2025),
  (2701632482, 2024),
  (2673090152, 2023),
  (3100088641, 2024),
  (2327175255, 2023),
  (728230562, 2019),
  (1825330187, 2012),
  (1618132132, 2022),
  (1868922957, 2018),
  (2982572631, 2019),
  (1890800497, 2015),
  (1889850087, 2022),
  (2344534075, 2023),
  (1864922187, 2018),
  (1188895232, 2013),
  (1857865457, 2017),
  (2813349842, 2024),
  (101160352, 2015),
  (3124823401, 2024),
  (1195066112, 2019),
  (1902773127, 2017),
  (2633066312, 2024),
  (2982115311, 2022),
  (1161154262, 2020),
  (945808972, 2020),
  (3462515511, 2020),
  (1174049072, 2020),
  (129983162, 2016),
  (1301761132, 2019),
  (2215867137, 2023),
  (2981486781, 2021),
  (13417733, 2011),
  (2135391947, 2023),
  (1319789922, 2021),
  (92731220, 2014),
  (3281371601, 2025),
  (2826599442, 2024),
  (4022865081, 2026),
  (2661770082, 2024),
  (1102960692, 2019),
  (1408001752, 2021),
  (2945212851, 2024),
  (2826599492, 2024),
  (1892604837, 2014),
  (728531842, 2014),
  (916778172, 2020),
  (3751529062, 2026),
  (2701632492, 2024),
  (2943699391, 2023),
  (728143942, 2018),
  (728448062, 2012),
  (2714845042, 2024),
  (1585522982, 2021),
  (1564792312, 2021),
  (3100088631, 2024),
  (1507574452, 2021),
  (4009047301, 2026),
  (3934131461, 2026),
  (1072850162, 2020),
  (1909962907, 2018),
  (1852918927, 2016),
  (766187922, 2019),
  (1379353382, 2021),
  (2366917365, 2014),
  (2224232087, 2023),
  (3406898041, 2025),
  (3950568121, 2023),
  (1536499152, 2021),
  (810242282, 2019),
  (728733972, 2015),
  (970524632, 2020),
  (1913051387, 2018),
  (1404515252, 2021),
  (1854995707, 2014),
  (1621647542, 2022),
  (3419949561, 2025),
  (1284878402, 2021),
  (2893833581, 2024),
  (4009047321, 2026),
  (2714845032, 2024),
  (1110906862, 2020),
  (750206592, 2019),
  (1846193857, 2012),
  (3770673012, 2026),
  (2011228967, 2022),
  (1663762972, 2022),
  (3281051501, 2022),
  (3665701322, 2025),
  (3310050111, 2025),
  (2993262611, 2024),
  (1861712117, 2010),
  (2516791071, 2016),
  (674126992, 2012),
  (2982108781, 2022),
  (3014982811, 2022),
  (986391332, 2020),
  (2609478722, 2024),
  (1846207677, 2012),
  (2377147015, 2021),
  (3547069271, 2025),
  (3449883491, 2025),
  (3233571191, 2025),
  (1435080332, 2021),
  (1130251012, 2020),
  (916778162, 2020),
  (1260368562, 2017),
  (3989506091, 2026),
  (2508380001, 2017),
  (1097366402, 2020),
  (1662633352, 2022),
  (3866248761, 2026),
  (1868922947, 2018),
  (2647755012, 2021),
  (2016706917, 2022),
  (3216398501, 2025),
  (1263961442, 2020),
  (727838922, 2018),
  (2710770392, 2024),
  (1016728442, 2017),
  (3113803131, 2012),
  (1616329122, 2022),
  (763313582, 2019),
  (2906038191, 2024),
  (2813349852, 2024),
  (2232907107, 2016),
  (1017174792, 2013),
  (841864592, 2017),
  (1854941947, 2011),
  (3412823821, 2025),
  (1892488107, 2016),
  (716300182, 2019),
  (2852760252, 2024),
  (1791869577, 2022),
  (1005792002, 2020),
  (3284803801, 2025),
  (3046402771, 2024),
  (1097366392, 2020),
  (3089171091, 2024),
  (4008923711, 2026),
  (2351753445, 2023),
  (2663894712, 2024),
  (3584009891, 2025),
  (3961505811, 2022),
  (728233002, 2016),
  (2847328642, 2024),
  (728730222, 2015),
  (1730381627, 2022),
  (3681379662, 2025),
  (1857908467, 2017),
  (678174052, 2019),
  (3929297851, 2026),
  (3593847642, 2025),
  (2857895782, 2024),
  (532421232, 2018),
  (2711130122, 2024),
  (3825567191, 2026),
  (2343163655, 2023),
  (811083802, 2019),
  (2713293081, 2024),
  (797362032, 2019),
  (1108179842, 2020),
  (2191906887, 2023),
  (1730381577, 2022),
  (3605065192, 2025),
  (1870918197, 2019),
  (2789230982, 2024),
  (943830772, 2019),
  (3272541241, 2025),
  (4032747381, 2026),
  (4048611591, 2026),
  (1515103202, 2021),
  (1918593017, 2018),
  (1921105577, 2019),
  (1345500452, 2021),
  (1913966027, 2022),
  (1103084512, 2020),
  (3374138191, 2025),
  (1725671257, 2022),
  (1452080272, 2021),
  (1612295742, 2022),
  (4018650541, 2026),
  (3054873291, 2024),
  (810242262, 2019),
  (3535270281, 2025),
  (3770700202, 2026),
  (3320548811, 2025),
  (1032512512, 2013),
  (1515103132, 2021),
  (1880777637, 2011),
  (2413240635, 2023),
  (1319789882, 2021),
  (1700308457, 2022),
  (811083772, 2019),
  (3498716151, 2025),
  (2513475541, 2023),
  (2534146931, 2023),
  (2668380772, 2024),
  (1734169587, 2022),
  (2466655385, 2023),
  (2440102425, 2023),
  (2391949025, 2023),
  (1614347932, 2022),
  (1623943362, 2022),
  (1861937117, 2008),
  (884186312, 2017),
  (1913051437, 2018),
  (3419949541, 2025),
  (1868873207, 2017),
  (3293575601, 2025),
  (888701702, 2020),
  (884177792, 2010),
  (1890804277, 2015),
  (3423179061, 2025),
  (2876221022, 2024),
  (739820672, 2019),
  (922471682, 2020),
  (3451173311, 2025),
  (953195082, 2020),
  (3379300631, 2025),
  (3091612661, 2024),
  (3443020141, 2025),
  (1275334982, 2021),
  (728087832, 2016),
  (3948195061, 2021),
  (3242533601, 2025),
  (3265366061, 2025),
  (3559389211, 2025),
  (2613656312, 2024),
  (1936418607, 2022),
  (2015022117, 2022),
  (3863933731, 2026),
  (3344490081, 2025),
  (1718378467, 2022),
  (2893833591, 2024),
  (2493031361, 2023),
  (2673103592, 2023),
  (1851227237, 2015),
  (3991730711, 2026),
  (2503286711, 2023),
  (3226375021, 2025),
  (2683144742, 2019),
  (3548215401, 2025),
  (578717012, 2018),
  (1843514397, 2022),
  (616321592, 2017),
  (3982461811, 2026),
  (3681379672, 2025),
  (3217601441, 2025),
  (3256605641, 2025),
  (3929019271, 2026),
  (2754220391, 2024),
  (1487726872, 2021),
  (1822697327, 2012),
  (3910166351, 2026),
  (2749285291, 2024),
  (1700308437, 2022),
  (2821758282, 2024),
  (1864671247, 2016),
  (1701434357, 2022),
  (3275130421, 2023),
  (3991730681, 2026),
  (1887109947, 2010),
  (824553942, 2019),
  (1899808317, 2015),
  (3510844431, 2025),
  (1481819862, 2017),
  (1926159197, 2022),
  (2820301032, 2024),
  (1887595277, 2012),
  (2724263792, 2024),
  (878493962, 2020),
  (1131249182, 2020),
  (2355180015, 2023),
  (2670088912, 2024),
  (2613209332, 2020),
  (1775314577, 2022),
  (2516791101, 2016),
  (2663894692, 2024),
  (3320597091, 2025),
  (1009351792, 2020),
  (2652525892, 2024),
  (1055634672, 2011),
  (3474695861, 2025),
  (1558068232, 2021),
  (2454986555, 2023),
  (3929019311, 2026),
  (1084418132, 2020),
  (1198445252, 2017),
  (2510922991, 2023),
  (1418467732, 2021),
  (2864196482, 2019),
  (1799425877, 2022),
  (3910174371, 2026),
  (2289924375, 2023),
  (1872193907, 2009),
  (3948195031, 2021),
  (3863933701, 2026),
  (728552752, 2015),
  (2355180075, 2023),
  (728552672, 2015),
  (2847466682, 2024),
  (2169805087, 2023),
  (2354796715, 2019),
  (1527140152, 2021),
  (4052159151, 2026),
  (728539552, 2015),
  (2670367462, 2021),
  (2349092255, 2023),
  (3989506131, 2026),
  (1649359532, 2022),
  (2534146841, 2023),
  (2505512231, 2023),
  (4061445011, 2026),
  (3528817921, 2025),
  (2466655375, 2023),
  (1005101192, 2020),
  (2245342987, 2023),
  (825435072, 2019),
  (2711894931, 2024),
  (2843015982, 2024),
  (1739183877, 2022),
  (2790852212, 2024),
  (727838492, 2019),
  (2513752311, 2023),
  (727835802, 2018),
  (3262816621, 2025),
  (1361622442, 2021),
  (3370621971, 2019),
  (3516241241, 2025),
  (728176772, 2018),
  (1139746122, 2020),
  (3547069301, 2025),
  (2671880652, 2024),
  (2469800175, 2023),
  (3856408081, 2026),
  (3432933071, 2025),
  (1518997902, 2021),
  (1863157567, 2018),
  (1894159667, 2016),
  (1148437152, 2020),
  (3677094342, 2025),
  (3979805141, 2026),
  (2794480752, 2024),
  (728232892, 2017),
  (1036366702, 2020),
  (1830292707, 2022),
  (24225041, 2009),
  (3396792401, 2025),
  (4006888151, 2026),
  (2421238185, 2023),
  (1016728312, 2018),
  (1515103152, 2021),
  (1861611557, 2009),
  (2731643831, 2016),
  (125833719, 2016),
  (1277916382, 2017),
  (967691022, 2020),
  (4038132771, 2026),
  (2523324961, 2023),
  (1087544792, 2020),
  (2323865725, 2023),
  (2923555731, 2024),
  (3217601461, 2025),
  (1396304032, 2021),
  (1887532517, 2009),
  (3938057141, 2026),
  (1822697317, 2012),
  (1903970017, 2017),
  (1827796347, 2022),
  (3376163361, 2025),
  (3160035021, 2020),
  (3070241281, 2014),
  (3458773861, 2025),
  (2672165902, 2021),
  (4035574591, 2026),
  (2320026085, 2023),
  (3551656581, 2025),
  (728725152, 2016),
  (1902605597, 2017),
  (2257513457, 2023),
  (1223062102, 2021),
  (1035409622, 2020),
  (3746136842, 2025),
  (1620978072, 2016),
  (1918593007, 2018),
  (1859766717, 2018),
  (3285935291, 2020),
  (1037536882, 2020),
  (678190632, 2016),
  (2977852971, 2024),
  (3079071041, 2024),
  (2512363211, 2023),
  (1623943372, 2022),
  (4008923691, 2026),
  (1229377632, 2020),
  (3863933811, 2026),
  (3112428171, 2021),
  (2864196862, 2015),
  (843751602, 2019),
  (3490958331, 2025),
  (791707142, 2019),
  (2150506577, 2023),
  (3255422201, 2025),
  (2473397771, 2023),
  (2377147005, 2021),
  (2511578411, 2020),
  (1669976262, 2022),
  (4032818971, 2026),
  (3977529521, 2026),
  (2856445422, 2024),
  (2384416465, 2023),
  (4006888161, 2026),
  (1688660007, 2022),
  (3665701332, 2025),
  (1857824777, 2022),
  (1902293877, 2017),
  (1508770812, 2021),
  (2507322611, 2016),
  (3282147191, 2022),
  (3385076841, 2025),
  (3165077581, 2015),
  (2471706311, 2023),
  (3091913921, 2024),
  (1513792662, 2021),
  (1996599507, 2012),
  (1046082162, 2020),
  (1424125882, 2021),
  (2245584157, 2023),
  (4006888141, 2026),
  (3443020111, 2025),
  (728733982, 2015),
  (652841522, 2014),
  (2945954741, 2024),
  (2724522402, 2024),
  (1870918087, 2019),
  (1102207572, 2019),
  (3451400191, 2025),
  (2223901977, 2023),
  (1016769172, 2016),
  (3113953571, 2024),
  (1891403487, 2016),
  (3103909151, 2024),
  (3004125341, 2024),
  (4045152831, 2026),
  (2748059341, 2022),
  (3407926931, 2025),
  (2683119032, 2018),
  (1764666727, 2022),
  (1920805137, 2018),
  (4076508991, 2026),
  (1213877802, 2021),
  (3124823381, 2024),
  (3160911031, 2022),
  (4032819031, 2026),
  (3030022611, 2024),
  (871319512, 2020),
  (3293889891, 2025),
  (3982461831, 2026),
  (3050380851, 2024),
  (1832224607, 2022),
  (2853677112, 2024),
  (3961514501, 2026),
  (4052159081, 2026),
  (1856925277, 2015),
  (4035574571, 2026),
  (3561186861, 2024),
  (3948119541, 2026),
  (1901042397, 2017),
  (3961514941, 2026),
  (1720875457, 2022),
  (2731607571, 2014),
  (2210724317, 2023),
  (3957204771, 2021),
  (2671436222, 2019),
  (3112434771, 2020),
  (982983852, 2020),
  (3157502751, 2020),
  (728540582, 2015),
  (726249992, 2019),
  (3310050101, 2025),
  (823565502, 2019),
  (872932682, 2020),
  (2939850231, 2024),
  (4052159111, 2026),
  (2714845022, 2024),
  (4060757821, 2026),
  (130030764, 2016),
  (1823654027, 2022),
  (3023998591, 2024),
  (3357897091, 2025),
  (2884070192, 2024),
  (1861772497, 2012),
  (3514965101, 2025),
  (696956922, 2019),
  (1749052577, 2022),
  (775877152, 2019),
  (3313154351, 2025),
  (1229377332, 2020),
  (3286363721, 2017),
  (3593847772, 2025),
  (3190029311, 2025),
  (3412823831, 2025),
  (673998942, 2016),
  (2539905881, 2023),
  (1174049092, 2020),
  (877085102, 2010),
  (3561186921, 2024),
  (3089171041, 2024),
  (2245343037, 2023),
  (1996599527, 2012),
  (4038165211, 2026),
  (3275130441, 2023),
  (3124177331, 2019),
  (2079242507, 2019),
  (2128683897, 2023),
  (1856891597, 2017),
  (4037009421, 2026),
  (2358937935, 2023),
  (2748195411, 2024),
  (1828950527, 2022),
  (1899786097, 2017),
  (1483142032, 2019),
  (4008782461, 2026),
  (3328724911, 2025),
  (728232222, 2018),
  (3961514921, 2026),
  (3323459991, 2025),
  (2245343047, 2023),
  (1854941957, 2011),
  (2551832912, 2023),
  (728235292, 2013),
  (4027935811, 2026),
  (3523311031, 2025),
  (3362741861, 2021),
  (2813349902, 2024),
  (2722445122, 2023),
  (1855964527, 2012),
  (1597143482, 2021),
  (2677958492, 2024),
  (1089311912, 2020),
  (2858218022, 2024),
  (1855977267, 2013),
  (1016736462, 2015),
  (1856003407, 2017),
  (4061445001, 2026),
  (3195491171, 2025),
  (3551656561, 2025),
  (2286368867, 2023),
  (1606338912, 2022),
  (3402149461, 2025),
  (3286363711, 2017),
  (2642821802, 2024),
  (3561186901, 2024),
  (3907717291, 2026),
  (871319562, 2020),
  (2656078412, 2017),
  (3070102191, 2024),
  (3281013531, 2022),
  (1007967512, 2020),
  (2955404471, 2024),
  (2357002005, 2023),
  (674127352, 2012),
  (2955404481, 2024),
  (2253917217, 2023),
  (1015392772, 2020),
  (4000016501, 2026),
  (3328583431, 2025),
  (1519473172, 2019),
  (1856967797, 2017),
  (2862379662, 2021),
  (3879889311, 2026),
  (3330162511, 2025),
  (3098457031, 2024),
  (1606581192, 2021),
  (1483142022, 2019),
  (3231521921, 2025),
  (3089171061, 2024),
  (2512347761, 2023),
  (1203786952, 2021),
  (727826462, 2019),
  (2666631162, 2018),
  (3373459941, 2025),
  (943830792, 2019),
  (2300441615, 2023),
  (1015392752, 2020),
  (2694355732, 2024),
  (1062149492, 2020),
  (982983872, 2020),
  (2232831637, 2023),
  (952261162, 2020),
  (3396792391, 2025),
  (1102207722, 2018),
  (2857895742, 2024),
  (1203786862, 2021),
  (1194973872, 2019),
  (4000016441, 2026),
  (1037536872, 2020),
  (1224474562, 2021),
  (2344534055, 2023),
  (1366547492, 2021),
  (2936891681, 2024),
  (3498716171, 2025),
  (1880762527, 2011),
  (1681300957, 2022),
  (2517780731, 2023),
  (3044885751, 2024),
  (1515103162, 2021),
  (2102623557, 2023),
  (3641465642, 2025),
  (2157686807, 2023),
  (2595402312, 2023),
  (2748195421, 2024),
  (1713368777, 2022),
  (1890877667, 2017),
  (1195505362, 2021),
  (2257513477, 2023),
  (2673090142, 2023),
  (1762289117, 2022),
  (2295576885, 2023),
  (583712262, 2018),
  (98612472, 2010),
  (3282147181, 2022),
  (743817902, 2019),
  (3265399681, 2025),
  (2020808097, 2022),
  (2921668031, 2024),
  (2880561552, 2024),
  (1799790127, 2022),
  (3768410242, 2026),
  (727832632, 2019),
  (62610482, 2012),
  (2724263742, 2024),
  (2864430642, 2024),
  (1858857767, 2022),
  (3907717331, 2026),
  (2893837441, 2024),
  (2802335932, 2024),
  (4000016481, 2026),
  (1275335002, 2021),
  (3677114352, 2025),
  (3275130431, 2023),
  (1662633292, 2022),
  (3616665162, 2025),
  (3366124741, 2025),
  (716300152, 2019),
  (2656078312, 2017),
  (2731681211, 2021),
  (1062108632, 2020),
  (2344534025, 2023),
  (1543687322, 2021),
  (1543877922, 2017),
  (3376163341, 2025),
  (2180030817, 2023),
  (1903969837, 2017),
  (2179956017, 2023),
  (1527097132, 2019),
  (728740062, 2014),
  (923405472, 2020),
  (1063202642, 2020),
  (1397672072, 2021),
  (587374162, 2018),
  (3861351391, 2026),
  (3512907481, 2025),
  (3165090691, 2019),
  (2515399401, 2018),
  (1557884782, 2021),
  (4021345281, 2026),
  (1148437192, 2020),
  (943830712, 2019),
  (2826599462, 2024),
  (2977852991, 2024),
  (1969415467, 2022),
  (2225781897, 2023),
  (982983892, 2020),
  (2515314921, 2023),
  (2533705251, 2023),
  (2512363231, 2023),
  (3955108101, 2026),
  (1866926987, 2015),
  (2150469487, 2023),
  (1257189932, 2018),
  (3889137041, 2026),
  (897780472, 2020),
  (875607302, 2020),
  (2843016032, 2024),
  (1102960772, 2019),
  (1041895212, 2020),
  (1009351812, 2020),
  (507579732, 2018),
  (1541932452, 2021),
  (1107634552, 2020),
  (2698103992, 2024),
  (1229377262, 2019),
  (1924341827, 2022),
  (3423284181, 2025),
  (1488314292, 2021),
  (3419949551, 2025),
  (1004222092, 2020),
  (3948119561, 2026),
  (728127242, 2018),
  (3535731631, 2025),
  (728064912, 2017),
  (3336481291, 2025),
  (3961953251, 2026),
  (728229342, 2018),
  (3861351381, 2026),
  (2148742347, 2023),
  (3490958381, 2025),
  (2673090162, 2023),
  (3614444912, 2025),
  (2344534095, 2023),
  (2413240595, 2023),
  (1374420312, 2021),
  (911976742, 2020),
  (1379353362, 2021),
  (1431758462, 2021),
  (4008923681, 2026),
  (3898561971, 2026),
  (843817062, 2019),
  (3346172131, 2025),
  (1198420302, 2018),
  (1384248502, 2021),
  (3038865761, 2024),
  (1466941902, 2021),
  (2670101652, 2024),
  (4037009391, 2026),
  (3060538941, 2024),
  (693427242, 2019),
  (2660515242, 2024),
  (4027935821, 2026),
  (121589240, 2016),
  (3365288531, 2025),
  (1135931262, 2020),
  (1958747217, 2022),
  (2344534115, 2023),
  (3614510862, 2025),
  (938054102, 2020),
  (2545005721, 2023),
  (3366124781, 2025),
  (2731699311, 2023),
  (4027935831, 2026),
  (1813723957, 2022),
  (144156010, 2017),
  (728262532, 2017),
  (1791869587, 2022),
  (4032819001, 2026),
  (3492238611, 2025),
  (2843016052, 2024),
  (3376163371, 2025),
  (2071660757, 2021),
  (728092462, 2016),
  (2735357691, 2024),
  (2864196352, 2019),
  (728457722, 2008),
  (1713368827, 2022),
  (2665806712, 2017),
  (1915471137, 2022),
  (1286394242, 2021),
  (3561186881, 2024),
  (727827402, 2018),
  (3961672771, 2026),
  (1823714157, 2022),
  (3407138511, 2025),
  (3856408061, 2026),
  (98612458, 2010),
  (3028822241, 2024),
  (2284968257, 2023),
  (3477121141, 2025),
  (4008782431, 2026),
  (674022672, 2015),
  (1700308467, 2022),
  (1684881007, 2022),
  (4027972071, 2026),
  (1139970142, 2020),
  (1543877932, 2017),
  (2643063422, 2024),
  (877102262, 2010),
  (3979805161, 2026),
  (1003381682, 2020),
  (1224474592, 2021),
  (1617749382, 2022),
  (3366124771, 2025),
  (875607322, 2020),
  (2523324971, 2023),
  (2980736011, 2024),
  (4008923721, 2026),
  (1406873922, 2021),
  (3124823371, 2024),
  (1603300922, 2021),
  (1894517147, 2016),
  (842836572, 2014),
  (1513773882, 2021),
  (1483191362, 2021),
  (1431758482, 2021),
  (2238692437, 2023),
  (3066876291, 2024),
  (2358937985, 2023),
  (2481035521, 2023),
  (3318306941, 2025),
  (2258042687, 2023),
  (1614402292, 2022),
  (2391413685, 2022),
  (1114415022, 2020),
  (2653231932, 2024),
  (1854551307, 2016),
  (728080312, 2017),
  (3443020071, 2025),
  (144735132, 2017),
  (728234772, 2017),
  (2910013701, 2018),
  (923405442, 2020),
  (3261000071, 2022),
  (1870874287, 2019),
  (3085337481, 2024),
  (2883618902, 2024),
  (1766012537, 2022),
  (1365292142, 2021),
  (1576169062, 2021),
  (2217204147, 2023),
  (2253917207, 2023),
  (811764622, 2019),
  (2533921701, 2023),
  (1831924437, 2022),
  (2864196802, 2015),
  (1846189277, 2012),
  (1341998592, 2021),
  (780688322, 2019),
  (1669976272, 2022),
  (1020093472, 2020),
  (1918592967, 2018),
  (3677094322, 2025),
  (3359004371, 2025),
  (949958152, 2020),
  (2441497325, 2023),
  (3394948741, 2025),
  (4008782421, 2026),
  (1662545962, 2022),
  (3262816701, 2025),
  (1472351962, 2021),
  (1926285547, 2019),
  (768923952, 2019),
  (1896109997, 2016),
  (696956942, 2019),
  (1872106027, 2017),
  (1754500837, 2022),
  (2677958482, 2024),
  (1902167457, 2022),
  (2282526317, 2023),
  (3524102021, 2025),
  (835295992, 2019),
  (2438719425, 2023),
  (2982107401, 2022),
  (1669976222, 2022),
  (2852760262, 2024),
  (1385902032, 2021),
  (1863189657, 2018),
  (1901042387, 2017),
  (1609686472, 2017),
  (3964418941, 2026),
  (943830762, 2019),
  (1319789892, 2021),
  (1452080342, 2021),
  (2583250282, 2020),
  (2993785131, 2024),
  (3217601451, 2025),
  (4006888201, 2026),
  (2584120102, 2020),
  (2895855901, 2024),
  (2323865735, 2023),
  (1822494797, 2012),
  (1854942647, 2011),
  (3907717301, 2026),
  (1700308427, 2022),
  (2564538852, 2023),
  (2375232005, 2023),
  (978012392, 2020),
  (2749285281, 2024),
  (3305564711, 2025),
  (1229377682, 2019),
  (3281051341, 2024),
  (2247330887, 2023),
  (727827312, 2019),
  (1275288172, 2021),
  (928870732, 2020),
  (2254126457, 2023),
  (834484192, 2019),
  (1913966047, 2022),
  (1887588487, 2012),
  (825435132, 2019),
  (121589232, 2016),
  (4009047291, 2026),
  (3953738291, 2026),
  (3112501251, 2020),
  (2344533965, 2023),
  (967691082, 2020),
  (2843016042, 2024),
  (3362741481, 2022),
  (4004539901, 2026),
  (970051232, 2019),
  (1390398272, 2021),
  (1886132087, 2013),
  (1477121742, 2021),
  (2595877512, 2023),
  (728209342, 2012),
  (834484162, 2019),
  (1084418172, 2020),
  (3614444942, 2025),
  (775042252, 2019),
  (3160786431, 2023),
  (916778122, 2020),
  (1834824467, 2022),
  (1102960742, 2019),
  (4008782481, 2026),
  (986391292, 2020),
  (3498716141, 2025),
  (1922908377, 2019),
  (1084418162, 2020),
  (1863127947, 2018),
  (1345500512, 2021),
  (727841812, 2019),
  (834484152, 2019),
  (1672902387, 2022),
  (1490386722, 2021),
  (728142492, 2019),
  (2377809805, 2022),
  (2516790971, 2016),
  (2870451292, 2024),
  (880257022, 2020),
  (2385357515, 2023),
  (3033849031, 2024),
  (2043459747, 2022),
  (2293799065, 2023),
  (3038842301, 2024),
  (4000113611, 2026),
  (2215853567, 2023),
  (1913966067, 2022),
  (1783386547, 2022),
  (728157542, 2017),
  (3856408091, 2026),
  (1005792032, 2020),
  (2192220267, 2023),
  (1952914507, 2022),
  (3492238631, 2025),
  (2665806722, 2017),
  (1861611577, 2009),
  (783638202, 2019),
  (3653455412, 2014),
  (3262816611, 2025),
  (1654915162, 2022),
  (1532790992, 2021),
  (2523324991, 2023),
  (2126490687, 2023),
  (3216398471, 2025),
  (4008782451, 2026),
  (899224522, 2020),
  (988347102, 2020),
  (1564792322, 2021),
  (1864677137, 2016),
  (3863311491, 2026),
  (2655600932, 2016),
  (1592657861, 2021),
  (1869520477, 2019),
  (501130132, 2018),
  (1900896407, 2017),
  (693747582, 2019),
  (1807368507, 2022),
  (3477121131, 2025),
  (728232172, 2018),
  (3582847281, 2025),
  (4001202541, 2026),
  (1543877912, 2017),
  (1783386567, 2022),
  (3581442421, 2025),
  (3190029241, 2025),
  (1016728432, 2017),
  (2358937975, 2023),
  (4039232111, 2026),
  (673998612, 2016),
  (1016728302, 2018),
  (4027972101, 2026),
  (3508106701, 2025),
  (2583342012, 2017),
  (3454729561, 2025),
  (2413240625, 2023),
  (1119271802, 2020),
  (1795254937, 2022),
  (2253917197, 2023),
  (3667806712, 2025),
  (4035574621, 2026),
  (3409046461, 2025),
  (1408001742, 2021),
  (3444745621, 2025),
  (2179956007, 2023),
  (1609686612, 2018),
  (1466941842, 2021),
  (3528817941, 2025),
  (2613155382, 2021),
  (1890717437, 2014),
  (2384416505, 2023),
  (2993262561, 2024),
  (1890804257, 2015),
  (2441734045, 2023),
  (2981486901, 2024),
  (727841792, 2019),
  (144156012, 2017),
  (2384416485, 2023),
  (1846227767, 2012),
  (918602662, 2020),
  (3948621141, 2020),
  (2351832935, 2021),
  (3410990821, 2025),
  (1885850447, 2013),
  (1886132097, 2013),
  (1453560852, 2021),
  (728063232, 2017),
  (1005791992, 2020),
  (2843364832, 2024),
  (1722331757, 2022),
  (2644449672, 2024),
  (107675570, 2015),
  (1969415487, 2022),
  (2523324941, 2023),
  (1090166692, 2020),
  (2589098342, 2023),
  (613387092, 2013),
  (2526644801, 2023),
  (3536770921, 2025),
  (1872208957, 2009),
  (3982461851, 2026),
  (3085337441, 2024),
  (1009351782, 2020),
  (2179956037, 2023),
  (1684801307, 2022),
  (3428993801, 2025),
  (2722449182, 2023),
  (3373460011, 2025),
  (1889850097, 2022),
  (759241372, 2019),
  (3310050141, 2025),
  (2864195992, 2017),
  (728275132, 2016),
  (1102972642, 2020),
  (2505653471, 2016),
  (3286269481, 2020),
  (1949276357, 2022),
  (726249982, 2019),
  (943683552, 2020),
  (3459413701, 2025),
  (1347589442, 2021),
  (3262816671, 2025),
  (2982104031, 2022),
  (2958303721, 2024),
  (3034645851, 2023),
  (2958303681, 2024),
  (3263154791, 2025),
  (1114774832, 2020),
  (2864196732, 2020),
  (3231134341, 2025),
  (1839456977, 2022),
  (3370327191, 2025),
  (3038782411, 2024),
  (4027935841, 2026),
  (1385902022, 2021),
  (841864422, 2015),
  (4008923741, 2026),
  (3310050151, 2025),
  (2297451185, 2023),
  (2748195401, 2024),
  (1830424427, 2022),
  (2671546282, 2022),
  (1429049172, 2021),
  (775877102, 2019),
  (3863933751, 2026),
  (3407926861, 2025),
  (2703218862, 2024),
  (1287745442, 2021),
  (1156943962, 2020),
  (1614402302, 2022),
  (2245342997, 2023),
  (1861648177, 2010),
  (3216398481, 2025),
  (11004712, 2008),
  (3112513941, 2019),
  (1815359867, 2010),
  (728708332, 2016),
  (3208895561, 2025),
  (2960046491, 2024),
  (3792746852, 2026),
  (728010042, 2017),
  (3251711191, 2025),
  (1936418617, 2022),
  (2722453082, 2023),
  (2982108811, 2022),
  (2158813717, 2020),
  (1272979652, 2021),
  (1730381547, 2022),
  (1920805127, 2018),
  (543392292, 2018),
  (1824160747, 2012),
  (1600037302, 2021),
  (728688562, 2011),
  (4038133761, 2026),
  (127531051, 2016),
  (1563549762, 2021),
  (3407138521, 2025),
  (1558068202, 2021),
  (1502479302, 2021),
  (3281371641, 2025),
  (2592875352, 2023),
  (1536520912, 2021),
  (728706292, 2008),
  (4061444991, 2026),
  (841864582, 2017),
  (1839456937, 2022),
  (763313622, 2019),
  (1855009277, 2014),
  (3907717271, 2026),
  (2391949005, 2023),
  (3348987771, 2025),
  (1809022817, 2022),
  (3889137031, 2026),
  (2358937955, 2023),
  (3459413611, 2025),
  (1254692222, 2021),
  (3289803141, 2020),
  (3265366081, 2025),
  (1046082172, 2020),
  (3961672791, 2026),
  (2752439251, 2024),
  (1097366412, 2020),
  (3991671971, 2026),
  (2102623537, 2023),
  (3573218571, 2025),
  (1498546032, 2021),
  (2764316861, 2024),
  (1869186477, 2016),
  (2188704267, 2023),
  (3515361421, 2025),
  (728191542, 2017),
  (1255925472, 2021),
  (1156943922, 2020),
  (1085185492, 2020),
  (2746913901, 2024),
  (2523324911, 2023),
  (3976069491, 2026),
  (2320139425, 2023),
  (2016755687, 2022),
  (3370621991, 2019),
  (3374138151, 2025),
  (1032505492, 2016),
  (3027749391, 2024),
  (4038165201, 2026),
  (3038865771, 2024),
  (3528817981, 2025),
  (1845391717, 2010),
  (1461248422, 2021),
  (1013127042, 2020),
  (1148437142, 2020),
  (1424288482, 2021),
  (3946020491, 2026),
  (2939850251, 2024),
  (893623722, 2020),
  (3265957031, 2025),
  (2656078372, 2017),
  (1066501052, 2020),
  (2303246835, 2023),
  (2344533975, 2023),
  (1099543702, 2020),
  (2656078392, 2017),
  (1076201912, 2020),
  (3101895161, 2024),
  (2613189612, 2020),
  (3289907451, 2015),
  (2473512591, 2023),
  (2961236101, 2020),
  (3956773751, 2026),
  (811764612, 2019),
  (728553142, 2015),
  (994611272, 2020),
  (106792106, 2015),
  (3777720622, 2026),
  (1872208277, 2009),
  (2523324931, 2023),
  (1909873737, 2018),
  (1434903792, 2021),
  (3755956442, 2026),
  (3171677121, 2025),
  (3286293751, 2016),
  (3616665132, 2025),
  (3669606842, 2025),
  (2466655405, 2023),
  (3275130401, 2023),
  (2665806742, 2017),
  (872987932, 2020),
  (1837647747, 2022),
  (2102623507, 2023),
  (3323460001, 2025),
  (810242242, 2019),
  (1730381607, 2022),
  (1148437182, 2020),
  (3265957051, 2025),
  (1229377212, 2019),
  (1662633302, 2022),
  (1017673922, 2020),
  (678190652, 2016),
  (451742442, 2018),
  (875607312, 2020),
  (3551656571, 2025),
  (3547069311, 2025),
  (1072846632, 2020),
  (3423284201, 2025),
  (1623943402, 2022),
  (1481264862, 2017),
  (3112428201, 2021),
  (3722413412, 2025),
  (3272541201, 2025),
  (1145417432, 2009),
  (2172883797, 2023),
  (1870918157, 2019),
  (1374420292, 2021),
  (2354933985, 2017),
  (813682742, 2019),
  (3362665111, 2021),
  (1099514822, 2020),
  (2391949015, 2023),
  (1884470447, 2015),
  (3112513951, 2019),
  (1222035342, 2021),
  (728080352, 2017),
  (1558068192, 2021),
  (2245342957, 2023),
  (1837647707, 2022),
  (3265957021, 2025),
  (1859559577, 2016),
  (3948621121, 2020),
  (728420572, 2012),
  (577545352, 2018),
  (2754220381, 2024),
  (2967914551, 2024),
  (2666584412, 2018),
  (2503957201, 2023),
  (1229377302, 2020),
  (2655609692, 2016),
  (3216735101, 2024),
  (1913051427, 2018),
  (1016503472, 2020),
  (2441497315, 2023),
  (2789230942, 2024),
  (3991671951, 2026),
  (1651130322, 2022),
  (974572342, 2020),
  (1200685482, 2012),
  (2413240605, 2023),
  (2043459817, 2022),
  (1890547997, 2015),
  (728159102, 2018),
  (3889137051, 2026),
  (2569348502, 2020),
  (1866920387, 2009),
  (1799467037, 2022),
  (3702580582, 2025),
  (3581392901, 2025),
  (728597372, 2015),
  (1513792672, 2021),
  (2258042667, 2023),
  (2509885351, 2020),
  (1885908767, 2007),
  (2722514082, 2023),
  (2351753455, 2023),
  (2533705261, 2023),
  (3536770931, 2025),
  (2354855975, 2023),
  (1107300652, 2020),
  (2344533995, 2023),
  (2389639385, 2023),
  (2354936385, 2018),
  (3339356381, 2025),
  (107675556, 2015),
  (1143767062, 2020),
  (2507322651, 2016),
  (811037122, 2019),
  (3574177601, 2012),
  (3088014071, 2024),
  (3856408071, 2026),
  (1887805607, 2014),
  (1503655562, 2021),
  (779646772, 2019),
  (1708995887, 2022),
  (1319789872, 2021),
  (2389639395, 2023),
  (716300172, 2019),
  (3094874991, 2016),
  (1130250992, 2020),
  (123170452, 2016),
  (3961514931, 2026),
  (2384416445, 2023),
  (4032818991, 2026),
  (3344490141, 2025),
  (3124823311, 2024),
  (3763592532, 2026),
  (3334081191, 2025),
  (4006888181, 2026),
  (3282147161, 2022),
  (1490386732, 2021),
  (727834362, 2018),
  (1394246552, 2021),
  (1086150122, 2020),
  (1013126992, 2020),
  (728597382, 2015),
  (2349092265, 2023),
  (2683165652, 2019),
  (2344534035, 2023),
  (728688552, 2011),
  (775877162, 2019),
  (1051400742, 2020),
  (1870918177, 2019),
  (3328395931, 2025),
  (1822538257, 2012),
  (3328579281, 2025),
  (2077513577, 2022),
  (1861772507, 2012),
  (2215853547, 2023),
  (728163132, 2019),
  (1609686842, 2018),
  (727827362, 2019),
  (728533732, 2015),
  (2180030797, 2023),
  (1244275792, 2021),
  (2295595935, 2023),
  (3419949531, 2025),
  (3948119491, 2026),
  (2043459797, 2022),
  (876461772, 2018),
  (3792746832, 2026),
  (1527140162, 2021),
  (2982108821, 2022),
  (1145417422, 2009),
  (3049682591, 2024),
  (3410990801, 2025),
  (3770700222, 2026),
  (1463425352, 2021),
  (1823654077, 2022),
  (4009047281, 2026),
  (1319789962, 2021),
  (982983862, 2020),
  (1754132057, 2022),
  (3907717191, 2026),
  (727992742, 2017),
  (1481298652, 2019),
  (1854988707, 2014),
  (879302602, 2020),
  (728203702, 2013),
  (1799467057, 2022),
  (766187942, 2019),
  (2449930075, 2023),
  (673998622, 2016),
  (1864677147, 2016),
  (2503957211, 2023),
  (1913051447, 2018),
  (1229377162, 2019),
  (3394948771, 2025),
  (1260431362, 2019),
  (2592875362, 2023),
  (1012946492, 2020),
  (728232992, 2016),
  (2158813707, 2020),
  (825435082, 2019),
  (1931215027, 2022),
  (1263967742, 2020),
  (2172883817, 2023),
  (1369196912, 2021),
  (844533072, 2017),
  (1855960587, 2012),
  (1952914467, 2022),
  (1872064987, 2022),
  (1370230982, 2021),
  (344598911, 2017),
  (2660515232, 2024),
  (3929297861, 2026),
  (2731607681, 2014),
  (1222432102, 2021),
  (2286368887, 2023),
  (2043459757, 2022),
  (3991730771, 2026),
  (728123212, 2018),
  (2735357701, 2024),
  (1037536902, 2020),
  (3069037841, 2024),
  (1804318457, 2022),
  (4038165191, 2026),
  (1483679692, 2021),
  (1715901107, 2022),
  (3323459981, 2025),
  (2508141571, 2017),
  (2731674141, 2020),
  (1669976242, 2022),
  (3421629911, 2025),
  (3089171071, 2024),
  (1846207717, 2012),
  (2936891661, 2024),
  (2726775541, 2024),
  (916778132, 2020),
  (1229377222, 2019),
  (2300441625, 2023),
  (2413240585, 2023),
  (616295022, 2016),
  (2203569707, 2023),
  (2857610322, 2024),
  (2157686797, 2023),
  (3529649011, 2025),
  (1754132027, 2022),
  (3991730721, 2026),
  (2911265681, 2024),
  (1713376467, 2022),
  (3163884991, 2021),
  (1244275802, 2021),
  (1740010157, 2022),
  (1122429772, 2020),
  (1108179782, 2020),
  (3451330071, 2025),
  (1463889022, 2021),
  (3103841251, 2024),
  (728733262, 2015),
  (1626560752, 2022),
  (1393244382, 2021),
  (2826599502, 2024),
  (1701434377, 2022),
  (728191572, 2017),
  (3275130411, 2023),
  (2786435022, 2024),
  (3929297891, 2026),
  (759241352, 2019),
  (129983470, 2016),
  (3458773841, 2025),
  (2731607691, 2014),
  (3089420151, 2024),
  (3563110901, 2025),
  (1034544322, 2018),
  (1284878392, 2021),
  (1616329082, 2022),
  (1846214447, 2012),
  (3459413621, 2025),
  (1855960577, 2012),
  (3426913761, 2023),
  (782384302, 2019),
  (2649061912, 2024),
  (728724972, 2013),
  (2813349862, 2024),
  (3433427401, 2025),
  (3285925791, 2019),
  (1981060207, 2022),
  (3220484111, 2025),
  (1483146182, 2020),
  (1408001762, 2021),
  (1823714147, 2022),
  (1229377152, 2019),
  (1811341337, 2021),
  (1855964587, 2012),
  (1007967482, 2020),
  (2289076065, 2023),
  (1064296282, 2020),
  (727831632, 2019),
  (1284878382, 2021),
  (3547069281, 2025),
  (1880181827, 2022),
  (977015172, 2020),
  (3112434721, 2020),
  (728563352, 2012),
  (1612295762, 2022),
  (2480780911, 2023),
  (2672421542, 2022),
  (3355094441, 2025),
  (2671839232, 2022),
  (3287275901, 2021),
  (727847572, 2018),
  (3357897131, 2025),
  (3512907521, 2025),
  (3703084552, 2012),
  (2188247317, 2023),
  (1108179812, 2020),
  (2884070252, 2024),
  (2830309282, 2024),
  (3270725161, 2025),
  (995831522, 2020),
  (2402913835, 2023),
  (2703218852, 2024),
  (2649451642, 2024),
  (1016503462, 2020),
  (2981486791, 2021),
  (728270612, 2012),
  (3038395741, 2024),
  (2857895752, 2024),
  (3702580572, 2025),
  (1379353352, 2021),
  (1823835587, 2022),
  (2393016505, 2023),
  (4037009371, 2026),
  (1799467067, 2022),
  (2967699621, 2024),
  (2671014522, 2023),
  (2319770695, 2020),
  (129191382, 2016),
  (2043459777, 2022),
  (2983516511, 2021),
  (2338812395, 2023),
  (727836972, 2019),
  (1110906842, 2020),
  (3124823361, 2024),
  (4039231981, 2026),
  (1188895282, 2012),
  (2683165662, 2019),
  (3281371671, 2025),
  (1548405692, 2021),
  (2831648772, 2024),
  (899224532, 2020),
  (3834297131, 2026),
  (3344490051, 2025),
  (3033573701, 2024),
  (1099543712, 2020),
  (1541932422, 2021),
  (3976721011, 2026),
  (2698103982, 2024),
  (2731618391, 2016),
  (3314636911, 2025),
  (3907717281, 2026),
  (3410990831, 2025),
  (1666204192, 2022),
  (1017486032, 2020),
  (4061444981, 2026),
  (1016503502, 2020),
  (2724263752, 2024),
  (1854959157, 2012),
  (1260378552, 2017),
  (1951085907, 2022),
  (1097366432, 2020),
  (1379353372, 2021),
  (1249505692, 2021),
  (1379353392, 2021),
  (3286967841, 2018),
  (872932662, 2020),
  (1055633602, 2012),
  (1263960622, 2021),
  (1648419342, 2022),
  (970051252, 2019),
  (3261000141, 2022),
  (2375850765, 2023),
  (1929442137, 2019),
  (1090149692, 2020),
  (3261000081, 2022),
  (121589236, 2016),
  (806276542, 2019),
  (728597412, 2015),
  (3428993841, 2025),
  (1914011447, 2018),
  (2373775165, 2023),
  (2671546242, 2022),
  (1662633322, 2022),
  (1396569652, 2021),
  (2983516391, 2020),
  (3551656601, 2025),
  (2010937937, 2022),
  (1609686492, 2017),
  (4006889831, 2026),
  (1900661987, 2017),
  (3512907511, 2025),
  (2393016495, 2023),
  (1799467047, 2022),
  (2871148852, 2024),
  (2731588231, 2012),
  (908576692, 2020),
  (1571728252, 2018),
  (810242252, 2019),
  (1562508412, 2021),
  (635271962, 2019),
  (3320597101, 2025),
  (2656078322, 2017),
  (2172883837, 2023),
  (1885791817, 2015),
  (3991672041, 2026),
  (3015108241, 2023),
  (824553952, 2019),
  (1872065007, 2022),
  (3490958451, 2025),
  (1080246732, 2020),
  (4008782501, 2026),
  (3124823291, 2024),
  (727836982, 2019),
  (2739095591, 2024),
  (1887731457, 2012),
  (834484142, 2019),
  (1481281322, 2018),
  (1466941882, 2021),
  (2106960037, 2023),
  (3863933821, 2026),
  (3089171081, 2024),
  (3409046451, 2025),
  (1244275782, 2021),
  (3991671961, 2026),
  (2305557125, 2023),
  (943081342, 2018),
  (3573891281, 2020),
  (2967914571, 2024),
  (1870918107, 2019),
  (2585944272, 2023),
  (3374138171, 2025),
  (811777052, 2019),
  (3241971481, 2025),
  (1037536892, 2020),
  (1822494767, 2012),
  (657797522, 2019),
  (3593847802, 2025),
  (1099609422, 2020),
  (728422182, 2012),
  (13969158, 2011),
  (344598921, 2017),
  (865240172, 2020),
  (2937080551, 2024),
  (1891383607, 2016),
  (3089420141, 2024),
  (1853803417, 2022),
  (2832810862, 2024),
  (1016744512, 2014),
  (1897718737, 2017),
  (2384416495, 2023),
  (3366124731, 2025),
  (841864552, 2017),
  (1108179872, 2020),
  (144156016, 2017),
  (767745552, 2019),
  (4021131271, 2026),
  (1918593037, 2018),
  (133219842, 2016),
  (1663762962, 2022),
  (727827332, 2019),
  (1936418657, 2022),
  (2354623165, 2023),
  (2344534045, 2023),
  (3763592552, 2026),
  (2864195932, 2016),
  (3863933771, 2026),
  (1099615962, 2020),
  (1435941902, 2021),
  (2510923031, 2023),
  (1442464632, 2013),
  (2592844192, 2023),
  (967691072, 2020),
  (1016736492, 2015),
  (2227832217, 2023),
  (2338371075, 2023),
  (2354707725, 2023),
  (2831252712, 2024),
  (1909873747, 2018),
  (3314045411, 2025),
  (1406873932, 2021),
  (982983902, 2020),
  (2375352085, 2023),
  (1359734532, 2021),
  (806276532, 2019),
  (4052159161, 2026),
  (3620174982, 2025),
  (2510923021, 2023),
  (3345776131, 2025),
  (1408001772, 2021),
  (3423284151, 2025),
  (4008782411, 2026),
  (3442915851, 2025),
  (2320299525, 2023),
  (2150469477, 2023),
  (1263961482, 2020),
  (1175193682, 2020),
  (1856898207, 2017),
  (2958303671, 2024),
  (836256752, 2019),
  (3907717201, 2026),
  (1067236242, 2020),
  (2897230071, 2024),
  (1114414982, 2020),
  (3282147151, 2022),
  (2661770112, 2024),
  (3286300961, 2015),
  (2757000901, 2024),
  (4008923731, 2026),
  (1864286017, 2022),
  (1900947817, 2017),
  (3233571211, 2025),
  (3091914031, 2024),
  (2683119012, 2018),
  (137456560, 2016),
  (728233032, 2016),
  (3033562371, 2023),
  (3910158281, 2026),
  (2856445832, 2024),
  (2713293101, 2024),
  (3057778381, 2024),
  (1143838242, 2020),
  (728563322, 2012),
  (3211497581, 2020),
  (2862984562, 2024),
  (759241342, 2019),
  (2505653451, 2016),
  (2492511201, 2023),
  (1889940287, 2015),
  (2514549581, 2023),
  (2384416425, 2023),
  (1108179832, 2020),
  (3039714651, 2024),
  (1466941832, 2021),
  (2138170887, 2023),
  (2180030827, 2023),
  (2377353925, 2022),
  (3907717261, 2026),
  (1900294797, 2022),
  (2722445142, 2023),
  (2826599512, 2024),
  (1799467007, 2022),
  (3834566281, 2026),
  (3458773961, 2025),
  (3233827961, 2025),
  (3963521031, 2026),
  (2375789875, 2021),
  (3304459121, 2021),
  (2147372367, 2023),
  (4000252281, 2026),
  (4037009381, 2026),
  (3124823331, 2024),
  (3241944341, 2025),
  (2534146851, 2023),
  (1684881027, 2022),
  (2656078352, 2017),
  (1046082132, 2020),
  (712994302, 2019),
  (3676526282, 2025),
  (1102978342, 2020),
  (1616534592, 2022),
  (1799467017, 2022),
  (2344533955, 2023),
  (1866920327, 2009),
  (877085062, 2010),
  (538028502, 2018),
  (3462040101, 2025),
  (3376163351, 2025),
  (2354934045, 2017),
  (1663762982, 2022),
  (2521359701, 2023),
  (1936418627, 2022),
  (2814621752, 2024),
  (1512751212, 2021),
  (3477354431, 2022),
  (2746913911, 2024),
  (3681379652, 2025),
  (2694355722, 2024),
  (2356090215, 2023),
  (3514965071, 2025),
  (3982461841, 2026),
  (2583415482, 2023),
  (2169805017, 2023),
  (766187952, 2019),
  (4061444961, 2026),
  (3523824901, 2025),
  (1885858997, 2015),
  (3423720761, 2025),
  (727855132, 2018),
  (1855950187, 2012),
  (1855002967, 2014),
  (3850407121, 2026),
  (3979805151, 2026),
  (1032505512, 2016),
  (1625092552, 2022),
  (2377258695, 2018),
  (2948436721, 2024),
  (2441734035, 2023),
  (3451330061, 2025),
  (1913389577, 2018),
  (728232852, 2017),
  (3112513911, 2019),
  (1854777947, 2017),
  (3051298251, 2024),
  (834484172, 2019),
  (2731681221, 2021),
  (3950575941, 2024),
  (689468162, 2019),
  (3948119551, 2026),
  (1424123902, 2021),
  (2141225757, 2010),
  (3334268611, 2020),
  (1000441052, 2020),
  (1891142297, 2014),
  (3366124711, 2025),
  (2813349912, 2024),
  (3449883501, 2025),
  (1845391727, 2010),
  (2811862352, 2024),
  (728533692, 2015),
  (1984834807, 2022),
  (1032505472, 2016),
  (1854982507, 2014),
  (1830292787, 2022),
  (1866920377, 2009),
  (3982461821, 2026),
  (2045979037, 2022),
  (4061324971, 2026),
  (1046082142, 2020),
  (2864196762, 2020),
  (2864195802, 2016),
  (2726775521, 2024),
  (3330162471, 2025),
  (3616701452, 2025),
  (3991672001, 2026),
  (1799467027, 2022),
  (1014200232, 2020),
  (3950788711, 2026),
  (1839034037, 2022),
  (1461331462, 2021),
  (3964418921, 2026),
  (3961514961, 2026),
  (3614444922, 2025),
  (3049682561, 2024),
  (3046402801, 2024),
  (728143922, 2018),
  (2358937965, 2023),
  (1481246612, 2016)
) as v(deezer_id, year)
where s.deezer_track_id = v.deezer_id and s.year is null;

commit;

-- ====================================================================================================
-- VERIFICATION GRID (read only). One row per check: file, check, expected, actual, ok.
-- ====================================================================================================
SELECT file, check_name, expected, actual, actual = expected AS ok
FROM (VALUES
  (6, 'file 6: the 2026 releases present',
      '141', (SELECT count(*) FROM public.songs WHERE deezer_track_id IN (4090868561, 4070183671, 4090868571, 4265679302, 4265679292, 4265679332, 4140165301, 4270604242, 3775213592, 4149903382, 4270077462, 4198523812, 3920191761, 3920191731, 3920191771, 4143495621, 4173826002, 4173826032, 4027935751, 4027935761, 4027935781, 3986645071, 3986645031, 4056495431, 4223081212, 3866248801, 4311096852, 4311096862, 4311096962, 4076508981, 3907717251, 4235827392, 4235827382, 4285321022, 4285321042, 4285321052, 4232461262, 4232461242, 4232461272, 3770700232, 3770700242, 3770700282, 4157622882, 4157622942, 4157622932, 4306345672, 3878249061, 4197249182, 4258073911, 4283728522, 4166644212, 3928303661, 4021131311, 4021131291, 4021131301, 4018650521, 4184612222, 4184600862, 4157200522, 4157200552, 4157200532, 4159582602, 4208732332, 4208732352, 3928840871, 3928840861, 3928840881, 4204204872, 4204204882, 4204204862, 4164951472, 4164951482, 4274980322, 4076509001, 4274980332, 4264198082, 4258718131, 4258718151, 4296041062, 4293635102, 4208809742, 4208809762, 4208809752, 3946155691, 3946155701, 3946155731, 4284865992, 4284865982, 4284866022, 4223440872, 4223441002, 4223441012, 4142993731, 4142993741, 4237086082, 3939893671, 4248967941, 3929165981, 4289476362, 4178965332, 4178965352, 4178965342, 4275029852, 4275029862, 4275029882, 4051286221, 4051286231, 4174060712, 3856634281, 4236763352, 4236763332, 4236763382, 4063867901, 4063867911, 4063867921, 4204153972, 4103855641, 4204153982, 4049214851, 4049214881, 4049214861, 4233237592, 4217012982, 4172467752, 4179963532, 4179963542, 4073624071, 4212946562, 4212946572, 3950788701, 4260806001, 4289452762, 4258150901, 4173621912, 4173621922, 4173621942, 4293055462, 4130517741, 4167244632, 4167244612, 3802892402))::text),
  (6, 'file 6: none of the 5 left-out titles',
      '0', (SELECT count(*) FROM public.songs WHERE deezer_track_id IN (4093308791, 4093308781, 3789861432, 4275199122, 4130517771))::text),
  (6, 'file 6: every new 2026 song has year 2026',
      '0', (SELECT count(*) FROM public.songs WHERE deezer_track_id IN (4090868561, 4070183671, 4090868571, 4265679302, 4265679292, 4265679332, 4140165301, 4270604242, 3775213592, 4149903382, 4270077462, 4198523812, 3920191761, 3920191731, 3920191771, 4143495621, 4173826002, 4173826032, 4027935751, 4027935761, 4027935781, 3986645071, 3986645031, 4056495431, 4223081212, 3866248801, 4311096852, 4311096862, 4311096962, 4076508981, 3907717251, 4235827392, 4235827382, 4285321022, 4285321042, 4285321052, 4232461262, 4232461242, 4232461272, 3770700232, 3770700242, 3770700282, 4157622882, 4157622942, 4157622932, 4306345672, 3878249061, 4197249182, 4258073911, 4283728522, 4166644212, 3928303661, 4021131311, 4021131291, 4021131301, 4018650521, 4184612222, 4184600862, 4157200522, 4157200552, 4157200532, 4159582602, 4208732332, 4208732352, 3928840871, 3928840861, 3928840881, 4204204872, 4204204882, 4204204862, 4164951472, 4164951482, 4274980322, 4076509001, 4274980332, 4264198082, 4258718131, 4258718151, 4296041062, 4293635102, 4208809742, 4208809762, 4208809752, 3946155691, 3946155701, 3946155731, 4284865992, 4284865982, 4284866022, 4223440872, 4223441002, 4223441012, 4142993731, 4142993741, 4237086082, 3939893671, 4248967941, 3929165981, 4289476362, 4178965332, 4178965352, 4178965342, 4275029852, 4275029862, 4275029882, 4051286221, 4051286231, 4174060712, 3856634281, 4236763352, 4236763332, 4236763382, 4063867901, 4063867911, 4063867921, 4204153972, 4103855641, 4204153982, 4049214851, 4049214881, 4049214861, 4233237592, 4217012982, 4172467752, 4179963532, 4179963542, 4073624071, 4212946562, 4212946572, 3950788701, 4260806001, 4289452762, 4258150901, 4173621912, 4173621922, 4173621942, 4293055462, 4130517741, 4167244632, 4167244612, 3802892402) AND year IS DISTINCT FROM 2026)::text),
  (9, 'file 9: title tracks flagged',
      '41', (SELECT count(*) FROM public.songs WHERE is_title_track AND deezer_track_id IN (3234208281, 3407280351, 3570464781, 3827375541, 4087604431, 3188858011, 3561319281, 3937976471, 2722856182, 2966352091, 3211215061, 3426703371, 3622618822, 3651343562, 2671407212, 2842874062, 2990968051, 3293899871, 3514912991, 3946155661, 4089668491, 4131564511, 4232461262, 4204153972, 4103855641, 4027935751, 4149903382, 3986645071, 4204204872, 4178965332, 4090868561, 4208809742, 4258718131, 4143495621, 4051286221, 4285321022, 4049214851, 4157622882, 4018650521, 3920191761, 4223440872))::text),
  (8, 'file 8: the 3,076 years as written',
      '3076', (SELECT count(*) FROM public.songs s JOIN (VALUES (1614402282,2022), (1918592987,2018), (2295595895,2023), (3991672021,2026), (3086861671,2024), (1864677117,2016), (1772764597,2016), (766187932,2019), (1513773902,2021), (1016503522,2020), (2986254641,2019), (1536520922,2021), (3946385831,2019), (1684801257,2022), (3030102541,2024), (1866048787,2018), (2320250915,2023), (1355896192,2021), (1900661967,2017), (1754132047,2022), (121589228,2016), (1848896967,2022), (641230712,2019), (2286368877,2023), (2826599452,2024), (3477348891,2022), (1449387922,2021), (775042242,2019), (2018541107,2022), (997256992,2020), (3389702161,2018), (3514965081,2025), (2640612502,2024), (2018541097,2022), (3033654921,2024), (1804318467,2022), (1885908747,2007), (1536520932,2021), (3973347911,2026), (1034544342,2017), (3305008351,2025), (1857880987,2017), (1080246712,2020), (1515103182,2021), (3702871042,2021), (2853677102,2024), (1894301847,2016), (727825742,2018), (2671436232,2019), (1097366452,2020), (1034544272,2018), (3165067881,2022), (1813779407,2022), (1278127622,2021), (1453644262,2021), (1865869887,2018), (1975318787,2022), (1397732492,2021), (1854909687,2011), (3677114382,2025), (2726027891,2024), (1889850077,2022), (3038782421,2024), (4052286161,2026), (3112513961,2019), (2936891671,2024), (3991672011,2026), (1872064977,2022), (2373775155,2023), (2513111831,2021), (3124177221,2019), (1249505632,2021), (1811341327,2021), (1259815602,2017), (3907717321,2026), (3528439201,2025), (2964350131,2024), (1017174762,2013), (3114776991,2024), (4009047311,2026), (616306322,2012), (949814002,2020), (1459197152,2021), (1695004937,2022), (1146132672,2020), (728232212,2018), (3100088681,2024), (1005823842,2017), (3339397501,2025), (3272541221,2025), (1763386577,2022), (3702580592,2025), (2786435002,2024), (779646712,2019), (2968143471,2020), (1996599537,2012), (2016706927,2022), (727835812,2018), (2015261097,2022), (1834824457,2022), (3344518671,2025), (1855980917,2013), (3976720991,2026), (4015091781,2026), (142341145,2017), (2516790961,2016), (2377843665,2022), (1811341317,2021), (1259864062,2011), (2993262571,2024), (4000252291,2026), (1141182492,2020), (3910166341,2026), (3559389181,2025), (1345071182,2021), (3664415402,2025), (130030766,2016), (2613233272,2021), (3547069241,2025), (1901042427,2017), (1846207697,2012), (989408602,2020), (1345071172,2021), (1737159087,2022), (727835722,2019), (2402913845,2023), (2903113091,2024), (129531282,2016), (1881805967,2022), (2844933232,2024), (2510923001,2023), (1391738502,2021), (2978661041,2024), (3286967641,2018), (1869061877,2018), (3420412591,2025), (1887731517,2012), (1099539492,2020), (1996599487,2012), (98612334,2009), (1466941852,2021), (775877112,2019), (1229377342,2020), (841853442,2010), (3870760681,2019), (1402345162,2021), (3068214091,2024), (3412534541,2025), (1752621817,2022), (3561186891,2024), (1215090882,2021), (1846227757,2012), (1700308447,2022), (1072850152,2020), (142341147,2017), (2543049201,2023), (1822423867,2012), (916778152,2020), (3979805121,2026), (2375753455,2021), (2378007735,2022), (929503122,2020), (3863933711,2026), (3436468351,2023), (674131162,2017), (1032505452,2016), (728199992,2018), (2722445152,2023), (3315051671,2025), (1557884832,2021), (728706262,2008), (3360599881,2025), (2232907067,2016), (728071662,2016), (3605065172,2025), (826315082,2019), (1730381517,2022), (2883618912,2024), (3861478861,2026), (682110222,2019), (2514947041,2023), (2613229892,2019), (4006888191,2026), (3561187011,2023), (4035574601,2026), (3328583481,2025), (3286363741,2017), (3498716131,2025), (2344534105,2023), (1886050017,2010), (3124823391,2024), (2344534085,2023), (2413240615,2023), (2043898637,2022), (2945278761,2024), (2721747822,2024), (1513773892,2021), (1870918187,2019), (2720832982,2024), (2217259597,2023), (728710012,2016), (2169805077,2023), (1297748532,2021), (3520921381,2025), (3979805111,2026), (2857895772,2024), (1488403992,2021), (3282147311,2023), (3432082921,2025), (2864195882,2016), (2806220842,2024), (1107300642,2020), (1913051417,2018), (3664415392,2025), (4008782471,2026), (943081302,2018), (1672902377,2022), (3076552471,2024), (3648916542,2025), (4006888171,2026), (3959336881,2022), (982983882,2020), (1662545982,2022), (3373459991,2025), (1017162602,2012), (2551832922,2023), (1713368817,2022), (1126100452,2020), (1263967812,2020), (1327076862,2021), (2826599432,2024), (4035574581,2026), (1017174622,2017), (1870918167,2019), (2441734025,2023), (3863933831,2026), (3270807521,2025), (1515103142,2021), (1829014327,2022), (1859559547,2016), (1885976057,2012), (4004609281,2026), (3848537541,2026), (989732312,2020), (3944844411,2026), (3652691542,2025), (3044885771,2024), (1272979642,2021), (1341998632,2021), (878493942,2020), (2471380401,2023), (863372032,2020), (1030437912,2020), (1556470622,2021), (569305102,2018), (2671546252,2022), (1330032082,2021), (3991730701,2026), (4000252311,2026), (2731643871,2016), (4039231961,2026), (3262816591,2025), (127531055,2016), (2939850241,2024), (1824012107,2012), (2043650297,2022), (3459413601,2025), (2677820132,2024), (728236682,2018), (1259852952,2010), (2672074572,2022), (739820662,2019), (1245925952,2021), (3112422061,2021), (1996599577,2012), (2027388047,2022), (1694790877,2022), (1343758892,2021), (1881805987,2022), (2179956027,2023), (1852948397,2016), (1936902617,2022), (3863933791,2026), (3124823301,2024), (1536520942,2021), (1543877942,2017), (2338812365,2023), (3442856531,2025), (2633284812,2024), (3991672051,2026), (1846224327,2012), (728533762,2015), (1062149422,2020), (3190029251,2025), (3462560441,2025), (1343758882,2021), (2731596141,2013), (1103084522,2020), (1900294787,2022), (2847328582,2024), (877102472,2010), (3379300651,2025), (689875602,2019), (2534146951,2023), (1809475807,2022), (1032505462,2016), (1431758402,2021), (2847328602,2024), (866661622,2020), (1833627527,2020), (1084418202,2020), (782384262,2019), (1915471147,2022), (1263961512,2020), (3677114372,2025), (3233571181,2025), (130136839,2016), (2936891701,2024), (3889137251,2026), (3310050171,2025), (4021131261,2026), (1555151102,2021), (2793622462,2024), (1084317612,2020), (2512363261,2023), (3940158781,2026), (1863010707,2018), (3618409072,2025), (3262816661,2025), (1016728422,2017), (2722449532,2022), (3979805131,2026), (2505653461,2016), (728270622,2012), (2864196772,2020), (3929297881,2026), (2062079467,2022), (2967914541,2024), (2583451292,2017), (1017276712,2018), (1410411132,2021), (2143167457,2023), (3265957011,2025), (2373775145,2023), (3907717311,2026), (2958303701,2024), (2516791001,2016), (2762104921,2024), (2413514885,2023), (444800542,2017), (1215090912,2021), (2571366712,2023), (3344518661,2025), (1031570362,2018), (1016503512,2020), (1807368497,2022), (939273722,2020), (3039163081,2024), (3616701342,2025), (3961514901,2026), (424373662,2017), (1215090872,2021), (1940133607,2018), (1076199242,2020), (1962896187,2022), (3386137971,2025), (3056600411,2024), (873934652,2020), (2938583161,2024), (1203786912,2021), (2866450262,2024), (1483154852,2021), (1236541952,2021), (3907717211,2026), (3265957041,2025), (1880777647,2011), (2672979022,2023), (2323865765,2023), (727827342,2019), (1913850197,2022), (727826502,2019), (2813349872,2024), (2507581051,2017), (1892726077,2016), (2694355742,2024), (2953024031,2019), (2724263772,2024), (1263967782,2020), (3643559852,2025), (3376163391,2025), (3948194961,2023), (2507581061,2017), (1890899217,2013), (2458759595,2023), (799590312,2019), (2767457711,2024), (3051293071,2024), (1936418647,2022), (2373775125,2023), (2169683067,2023), (3366124751,2025), (2238692397,2023), (4037009461,2026), (2494537161,2023), (3879889301,2026), (3989506211,2026), (2471380361,2023), (3547069251,2025), (2194921867,2023), (2731574641,2012), (943830732,2019), (3112507251,2018), (811037132,2019), (2295618865,2023), (1843514417,2022), (1276777492,2021), (1473590642,2021), (1119271772,2020), (4052159051,2026), (799590282,2019), (2215853527,2023), (1839029167,2022), (2471964771,2023), (3038865831,2024), (1084418232,2020), (3662824092,2025), (692669152,2019), (1108179822,2020), (3497815281,2018), (1486563892,2021), (3529563731,2025), (4009047341,2026), (2102623517,2023), (775877212,2019), (1188895142,2014), (1009351772,2020), (3251687551,2025), (862373732,2020), (1244887652,2021), (2526644791,2023), (1913966037,2022), (3251065581,2025), (1084418222,2020), (728536382,2015), (970051222,2019), (2526644781,2023), (1892281917,2016), (3991730691,2026), (883010072,2020), (3262816601,2025), (24225031,2009), (736954282,2019), (728233022,2016), (1483154822,2021), (1562508402,2021), (1480703562,2021), (2870451282,2024), (3648916552,2025), (2793494102,2024), (2466655415,2023), (728724572,2016), (1905394957,2017), (1276777462,2021), (2613211842,2021), (943081332,2018), (1244275762,2021), (3999943161,2026), (1174049032,2020), (3910158261,2026), (1345060562,2021), (3653514412,2025), (1084418122,2020), (938054122,2020), (3948195101,2020), (3334081251,2025), (3792746862,2026), (3320597111,2025), (967691052,2020), (2887742512,2024), (3929166481,2026), (3870767881,2019), (2473512571,2023), (996031392,2020), (4021131251,2026), (1855002957,2014), (2540613121,2023), (3423179041,2025), (1483191352,2021), (3991671991,2026), (3605170782,2025), (2585394352,2024), (841864642,2017), (3945945221,2026), (3929166471,2026), (2077513537,2022), (759241362,2019), (2893837481,2024), (1452080312,2021), (1286394312,2021), (3547069221,2025), (3929019241,2026), (4061324961,2026), (2311014655,2023), (3802892412,2026), (1122912842,2020), (1789592657,2022), (2813349802,2024), (2181535617,2023), (2257513467,2023), (727833732,2018), (2508380051,2017), (3233571231,2025), (2169683117,2023), (1466941862,2021), (127531053,2016), (3964032861,2026), (1900909507,2015), (2656078332,2017), (766187962,2019), (2731641561,2015), (2508380081,2017), (3928782661,2026), (728262542,2017), (3112502441,2019), (1861934537,2018), (1918592977,2018), (3412611901,2025), (2851819352,2024), (884177772,2010), (2323865715,2023), (1915565977,2022), (1062228022,2020), (4008923701,2026), (1730381537,2022), (4052159071,2026), (1017174872,2013), (3866248781,2026), (2982115291,2022), (1084418112,2020), (2864196682,2020), (2295618905,2023), (1909873757,2018), (1466941922,2021), (1370230952,2021), (1047707842,2020), (1101744232,2019), (2656078342,2017), (3423720751,2025), (2961411791,2019), (2308366865,2020), (568846222,2018), (2983270321,2023), (3547069321,2025), (1830292767,2022), (1174045762,2020), (1981060237,2022), (844533162,2017), (728728802,2015), (3561186871,2024), (479740982,2018), (1069773062,2020), (2491593081,2023), (2441497295,2023), (1890840857,2017), (2571646482,2023), (3346172151,2025), (2655600902,2016), (1016744802,2014), (3251711181,2025), (3907717231,2026), (1669976232,2022), (1410390692,2021), (13969171,2011), (4004883141,2026), (3039211951,2024), (900681632,2020), (2319776245,2020), (3420412601,2025), (2893837431,2024), (683646812,2019), (3907717241,2026), (1816660547,2021), (4008782491,2026), (985138722,2020), (1122912832,2020), (1672902407,2022), (1683067087,2022), (3536844891,2025), (3105385221,2016), (1822494757,2012), (424373672,2017), (674131172,2017), (3451046521,2025), (2525191001,2023), (2826599482,2024), (4001291181,2026), (2952999191,2019), (3285838941,2019), (3651302642,2025), (2512363221,2023), (2893833601,2024), (1857894657,2022), (1856898167,2017), (1357186312,2021), (3929019261,2026), (1483141942,2019), (4035574611,2026), (3377344661,2025), (1857813027,2017), (3910158271,2026), (3217601431,2025), (1102853422,2020), (1872307597,2017), (3459413631,2025), (1535789472,2021), (2391949045,2023), (2945278791,2024), (3437953911,2025), (1259855492,2011), (2967699641,2024), (4037009411,2026), (2671436212,2019), (2512028291,2023), (2384416515,2023), (989408622,2020), (2181806907,2023), (1894159707,2016), (2945278731,2024), (3460743341,2025), (3412823841,2025), (825435092,2019), (2079242467,2019), (2670101592,2024), (3677094332,2025), (1086474832,2020), (3136668961,2024), (3365288501,2025), (1259855582,2011), (1064277092,2020), (877102802,2011), (2671807822,2022), (1881806047,2022), (1772719807,2022), (1881108087,2022), (3961514911,2026), (3454351531,2025), (2623468192,2024), (1684880997,2022), (1036530722,2020), (2355180055,2023), (4009947481,2026), (1343758922,2021), (2471380371,2023), (3057138211,2019), (1868855617,2017), (2981911961,2024), (2133583957,2021), (4000252271,2026), (3041140841,2024), (3703151672,2016), (1575247622,2021), (3428068831,2025), (1822570677,2012), (1900765227,2017), (1341998602,2021), (3310050161,2025), (1424288472,2021), (2179956047,2023), (1418379852,2021), (1827796327,2022), (2870676672,2024), (3948119581,2026), (1543687192,2021), (3950575921,2024), (3412823861,2025), (3616665192,2025), (1099615972,2020), (2523324981,2023), (1948539997,2022), (1809475827,2022), (2813640112,2024), (3125530581,2024), (3261000061,2022), (3122966811,2024), (2375231995,2023), (1909873707,2018), (1265655262,2021), (2583250262,2019), (3281051581,2022), (728724962,2013), (2883618942,2024), (1730381527,2022), (3310050121,2025), (1528273532,2021), (3624896262,2025), (3481014691,2025), (1528374942,2021), (1905674757,2017), (3396403341,2023), (1141182462,2020), (1626560772,2022), (3117795881,2024), (1528273522,2021), (3265957001,2025), (2857895762,2024), (1919406697,2018), (125833721,2016), (1815222867,2010), (694748942,2019), (3989506181,2026), (1887496077,2009), (2731684681,2022), (1609692362,2017), (1872193897,2009), (2864196052,2017), (4008782521,2026), (3400461701,2025), (862373722,2020), (4008782511,2026), (3516241231,2025), (1017162632,2019), (2653231912,2024), (3991671981,2026), (3004201171,2024), (2748152501,2024), (3165077571,2015), (1792117327,2022), (98612330,2009), (2502732211,2023), (1843514387,2022), (1785072377,2022), (2102623527,2023), (3286967701,2018), (2713293071,2024), (2639733202,2024), (2844933252,2024), (3905312981,2026), (1357186282,2021), (2493764401,2023), (1885850597,2011), (2351753425,2023), (1662546002,2022), (1752243537,2022), (1195066072,2019), (3015395891,2022), (3256605631,2025), (3370458691,2017), (1410411172,2021), (2963932861,2017), (1131249172,2020), (3453329161,2025), (805016292,2019), (2412207645,2023), (1260368542,2017), (1609686502,2017), (1268107592,2021), (1042029052,2016), (3299048121,2025), (2140939567,2023), (1854706177,2017), (3242533581,2025), (779646722,2019), (1984296937,2022), (1824160737,2012), (1631661742,2022), (1515103192,2021), (3365288511,2025), (2632089522,2024), (2724263762,2024), (3366124721,2025), (3370621961,2019), (841869142,2018), (1110906832,2020), (4037009401,2026), (3410990811,2025), (1481264762,2017), (2851819342,2024), (2354707745,2023), (11522950,2008), (3015387411,2022), (1872064997,2022), (3034645801,2023), (2871148922,2024), (1201012622,2018), (1364930812,2020), (727975042,2018), (938054112,2020), (1220675332,2021), (1046082152,2020), (1940133597,2018), (2551821482,2023), (727838942,2018), (2016608317,2022), (763313572,2019), (1892629517,2016), (3423284161,2025), (727837202,2019), (1897579897,2016), (2843016012,2024), (996031402,2020), (1149714822,2020), (1341998622,2021), (1508770802,2021), (2843016002,2024), (1899741207,2017), (3282147171,2022), (1007967492,2020), (2735364201,2024), (2180030847,2023), (686603852,2019), (2512347751,2023), (3541879171,2025), (3991672061,2026), (3561186911,2024), (2958303711,2024), (3591706042,2025), (3070241291,2014), (3490958301,2025), (2471380381,2023), (1021374322,2020), (3492238581,2025), (1672902417,2022), (2311014675,2023), (1188899422,2012), (4038165181,2026), (4052159061,2026), (2016706907,2022), (13034331,2011), (3792746842,2026), (2253917227,2023), (4052159141,2026), (2169805057,2023), (2334260045,2023), (2665806752,2017), (727838912,2018), (3938727511,2026), (3863349421,2026), (3614444782,2025), (945773572,2020), (2421785045,2023), (3387815401,2018), (2373775175,2023), (3681439632,2025), (3321304391,2025), (1477121712,2021), (2506369211,2023), (3653514422,2025), (3268752431,2025), (994789832,2020), (3365976541,2025), (3114777001,2024), (3222462941,2025), (3376163381,2025), (995831502,2020), (3710063512,2020), (970051182,2019), (1015331122,2020), (3957250191,2023), (3039163071,2024), (727970882,2017), (3863933741,2026), (2253917237,2023), (2071104987,2022), (2264621327,2023), (2466655435,2023), (877085012,2010), (1914447367,2018), (2864196622,2020), (3168502041,2025), (2031050967,2022), (1887727837,2013), (3124823351,2024), (1904240177,2017), (2656078382,2017), (1755779947,2022), (125833727,2016), (2364618815,2023), (1583904522,2021), (3866248771,2026), (1863344417,2018), (3247353291,2025), (1830292727,2022), (2466655445,2023), (728553172,2015), (2672979032,2023), (1009351802,2020), (4008782401,2026), (1055057622,2020), (1585522972,2021), (3160911041,2022), (3336180251,2025), (2180030837,2023), (1856973117,2015), (811112942,2019), (3165090681,2019), (3407926841,2025), (1677164977,2022), (1863344387,2018), (3038865791,2024), (2420010575,2023), (2232905047,2018), (3667806702,2025), (2274024387,2023), (3991730731,2026), (1187981722,2020), (794774722,2019), (3703084372,2012), (3373459931,2025), (4061445021,2026), (1515103172,2021), (2757000931,2024), (3284233841,2025), (3559389201,2025), (2843016022,2024), (1275335022,2021), (728199932,2018), (547270972,2018), (1034544362,2017), (959705052,2020), (1099543692,2020), (2791367092,2024), (2020808137,2022), (1662545992,2022), (1148437172,2020), (2128683807,2023), (3379300641,2025), (3030348751,2024), (1898961707,2015), (4022926911,2026), (2731622071,2017), (2377809795,2022), (1912421437,2022), (2516790981,2016), (727827352,2019), (2670101602,2024), (1080246742,2020), (1890899207,2013), (1284878432,2021), (1856934847,2017), (2334260035,2023), (3419949571,2025), (955370012,2020), (872932702,2020), (1224474572,2021), (3561429971,2021), (4016273191,2026), (986387932,2020), (1885857737,2015), (1032528322,2016), (3573891341,2020), (728538832,2015), (728597422,2015), (1215090892,2021), (1854895677,2011), (4039232011,2026), (2515416311,2023), (3370622001,2019), (2217204137,2023), (3870632591,2026), (1472321442,2021), (3991730751,2026), (3861478781,2026), (3284803781,2025), (3547069291,2025), (2533921691,2023), (3964418911,2026), (2043459767,2022), (1230752412,2021), (3013629971,2022), (2895855911,2024), (1119271782,2020), (3362760961,2024), (2748195481,2024), (1824195817,2012), (3015108221,2023), (2893604731,2024), (2247330907,2023), (1396569742,2021), (3030605431,2024), (3547069231,2025), (2510922981,2023), (3538437971,2025), (3770700212,2026), (2169805067,2023), (727827322,2019), (1854942657,2011), (2523324951,2023), (1872064967,2022), (943830742,2019), (3075722491,2024), (1975318747,2022), (3436466201,2021), (970051202,2019), (2438719385,2023), (1901042417,2017), (1494602152,2021), (1868873227,2017), (3344490101,2025), (2884070262,2024), (2724522392,2024), (2813349822,2024), (3863781831,2026), (3976673351,2026), (3967438101,2026), (2311014665,2023), (1427407902,2021), (2953347221,2024), (1020093482,2020), (2384416475,2023), (3647276772,2025), (3281371591,2025), (1996599517,2012), (728203712,2013), (4061444951,2026), (1616329092,2022), (1863618717,2022), (3950788751,2026), (1904269717,2017), (3374138161,2025), (1022024132,2020), (1188902872,2012), (2981739661,2024), (2323865745,2023), (1890800487,2015), (3961514951,2026), (2421785075,2023), (3284055621,2024), (1684881017,2022), (3991730741,2026), (3514965111,2025), (3263142511,2025), (2391949035,2023), (3165077551,2015), (3041140851,2024), (2079242417,2019), (4000252301,2026), (1856008897,2017), (727838902,2018), (3740550702,2025), (1857908487,2017), (2172883807,2023), (579931072,2018), (1853146287,2016), (1413157742,2021), (1887805617,2014), (4000016521,2026), (3266458161,2024), (1195185442,2007), (893623712,2020), (1839212417,2022), (1804771807,2022), (1859766687,2018), (728457612,2008), (3365288521,2025), (3328579271,2025), (1466941912,2021), (2595626982,2023), (1257189912,2018), (4027935851,2026), (2150469467,2023), (727992702,2017), (796697932,2019), (727838952,2018), (2983270171,2023), (1452080292,2021), (144156022,2017), (2864196142,2017), (1936418637,2022), (1049016552,2020), (728063582,2016), (3160760231,2023), (3512907501,2025), (1062108622,2020), (3124177171,2019), (3946385851,2019), (1785076597,2022), (1466941892,2021), (4009047331,2026), (2055966127,2022), (2953062001,2019), (1215090902,2021), (2102623547,2023), (2245342967,2023), (3808434262,2026), (1015493952,2020), (2215853557,2023), (2043459737,2022), (3370460321,2017), (1857617167,2022), (1533348982,2021), (2384416435,2023), (2460431985,2023), (1304031802,2021), (2701335722,2024), (3991672031,2026), (1512751272,2021), (3282147301,2023), (3487283231,2025), (3512907531,2025), (2616642542,2024), (1445560352,2021), (3536844881,2025), (3547069331,2025), (2016755707,2022), (1572136282,2021), (1263960632,2021), (1904931427,2022), (2669974312,2009), (1034544302,2018), (2526016461,2023), (1215100082,2021), (3492238571,2025), (1024558102,2020), (1873466547,2022), (2722445132,2023), (1837647737,2022), (1030484462,2020), (3477415471,2025), (2172883827,2023), (3286301001,2015), (2016755637,2022), (2377176755,2021), (2079242407,2019), (3989506201,2026), (1148437162,2020), (1575340132,2021), (783638222,2019), (1016503492,2020), (3600636242,2019), (1901042377,2017), (2539573901,2023), (1830292737,2022), (2410645425,2023), (3359004381,2025), (1260431322,2019), (3512907491,2025), (2735364131,2024), (3190029301,2025), (824553982,2019), (1846224317,2012), (3818963601,2026), (4009047351,2026), (674131182,2017), (1755721957,2022), (1890717427,2014), (728553232,2015), (716300162,2019), (1896091537,2016), (433421822,2012), (1861743657,2011), (1981181777,2022), (3514965091,2025), (3105385251,2016), (3112513931,2019), (1672902397,2022), (3252229561,2024), (2844933262,2024), (1431758442,2021), (1890717417,2014), (2671527962,2022), (3547069261,2025), (3451046551,2025), (1752243557,2022), (1084418102,2020), (2922530041,2017), (1090175782,2020), (727838452,2019), (2981668631,2023), (3882961091,2026), (1855977247,2013), (806276502,2019), (1017276682,2018), (3255422181,2025), (1010102772,2020), (3528818001,2025), (1843514407,2022), (989408612,2020), (3702871052,2021), (2886708312,2024), (842836582,2014), (1557884792,2021), (1547130432,2021), (1696609927,2022), (2413240575,2023), (3286685211,2025), (518701572,2018), (3451046541,2025), (3991730761,2026), (3310050131,2025), (3536770941,2025), (2344534005,2023), (1130251002,2020), (3999943151,2026), (1141182472,2020), (2981668701,2024), (943830722,2019), (3281647891,2023), (102598080,2015), (923405482,2020), (1866920337,2009), (728149372,2018), (1107300672,2020), (1034544312,2018), (3029482511,2024), (3654621222,2009), (98612338,2009), (1203786962,2021), (1466941822,2021), (1055057582,2020), (3896359941,2026), (3276782981,2024), (1844623017,2010), (1042029062,2016), (2354934025,2017), (2851819362,2024), (3039202621,2024), (2672288122,2022), (1005792012,2020), (3396792431,2025), (3226375011,2025), (3982461801,2026), (13034326,2011), (2722445112,2023), (727838932,2018), (3610237072,2025), (2358937995,2023), (3281371631,2025), (2512028281,2023), (1466944932,2021), (1585522962,2021), (3330162491,2025), (1146925002,2020), (1811341347,2021), (3863933681,2026), (1016503442,2020), (971022962,2020), (1101888332,2020), (3620174972,2025), (1394514792,2021), (1466941872,2021), (2980698031,2022), (3247353301,2025), (1095009672,2020), (1043899022,2020), (3863933721,2026), (3504835381,2025), (3124823321,2024), (2354936425,2018), (1902167447,2022), (1635508592,2012), (2245342977,2023), (986391312,2020), (3242566181,2025), (2508141561,2017), (97732978,2015), (3373460001,2025), (2701632482,2024), (2673090152,2023), (3100088641,2024), (2327175255,2023), (728230562,2019), (1825330187,2012), (1618132132,2022), (1868922957,2018), (2982572631,2019), (1890800497,2015), (1889850087,2022), (2344534075,2023), (1864922187,2018), (1188895232,2013), (1857865457,2017), (2813349842,2024), (101160352,2015), (3124823401,2024), (1195066112,2019), (1902773127,2017), (2633066312,2024), (2982115311,2022), (1161154262,2020), (945808972,2020), (3462515511,2020), (1174049072,2020), (129983162,2016), (1301761132,2019), (2215867137,2023), (2981486781,2021), (13417733,2011), (2135391947,2023), (1319789922,2021), (92731220,2014), (3281371601,2025), (2826599442,2024), (4022865081,2026), (2661770082,2024), (1102960692,2019), (1408001752,2021), (2945212851,2024), (2826599492,2024), (1892604837,2014), (728531842,2014), (916778172,2020), (3751529062,2026), (2701632492,2024), (2943699391,2023), (728143942,2018), (728448062,2012), (2714845042,2024), (1585522982,2021), (1564792312,2021), (3100088631,2024), (1507574452,2021), (4009047301,2026), (3934131461,2026), (1072850162,2020), (1909962907,2018), (1852918927,2016), (766187922,2019), (1379353382,2021), (2366917365,2014), (2224232087,2023), (3406898041,2025), (3950568121,2023), (1536499152,2021), (810242282,2019), (728733972,2015), (970524632,2020), (1913051387,2018), (1404515252,2021), (1854995707,2014), (1621647542,2022), (3419949561,2025), (1284878402,2021), (2893833581,2024), (4009047321,2026), (2714845032,2024), (1110906862,2020), (750206592,2019), (1846193857,2012), (3770673012,2026), (2011228967,2022), (1663762972,2022), (3281051501,2022), (3665701322,2025), (3310050111,2025), (2993262611,2024), (1861712117,2010), (2516791071,2016), (674126992,2012), (2982108781,2022), (3014982811,2022), (986391332,2020), (2609478722,2024), (1846207677,2012), (2377147015,2021), (3547069271,2025), (3449883491,2025), (3233571191,2025), (1435080332,2021), (1130251012,2020), (916778162,2020), (1260368562,2017), (3989506091,2026), (2508380001,2017), (1097366402,2020), (1662633352,2022), (3866248761,2026), (1868922947,2018), (2647755012,2021), (2016706917,2022), (3216398501,2025), (1263961442,2020), (727838922,2018), (2710770392,2024), (1016728442,2017), (3113803131,2012), (1616329122,2022), (763313582,2019), (2906038191,2024), (2813349852,2024), (2232907107,2016), (1017174792,2013), (841864592,2017), (1854941947,2011), (3412823821,2025), (1892488107,2016), (716300182,2019), (2852760252,2024), (1791869577,2022), (1005792002,2020), (3284803801,2025), (3046402771,2024), (1097366392,2020), (3089171091,2024), (4008923711,2026), (2351753445,2023), (2663894712,2024), (3584009891,2025), (3961505811,2022), (728233002,2016), (2847328642,2024), (728730222,2015), (1730381627,2022), (3681379662,2025), (1857908467,2017), (678174052,2019), (3929297851,2026), (3593847642,2025), (2857895782,2024), (532421232,2018), (2711130122,2024), (3825567191,2026), (2343163655,2023), (811083802,2019), (2713293081,2024), (797362032,2019), (1108179842,2020), (2191906887,2023), (1730381577,2022), (3605065192,2025), (1870918197,2019), (2789230982,2024), (943830772,2019), (3272541241,2025), (4032747381,2026), (4048611591,2026), (1515103202,2021), (1918593017,2018), (1921105577,2019), (1345500452,2021), (1913966027,2022), (1103084512,2020), (3374138191,2025), (1725671257,2022), (1452080272,2021), (1612295742,2022), (4018650541,2026), (3054873291,2024), (810242262,2019), (3535270281,2025), (3770700202,2026), (3320548811,2025), (1032512512,2013), (1515103132,2021), (1880777637,2011), (2413240635,2023), (1319789882,2021), (1700308457,2022), (811083772,2019), (3498716151,2025), (2513475541,2023), (2534146931,2023), (2668380772,2024), (1734169587,2022), (2466655385,2023), (2440102425,2023), (2391949025,2023), (1614347932,2022), (1623943362,2022), (1861937117,2008), (884186312,2017), (1913051437,2018), (3419949541,2025), (1868873207,2017), (3293575601,2025), (888701702,2020), (884177792,2010), (1890804277,2015), (3423179061,2025), (2876221022,2024), (739820672,2019), (922471682,2020), (3451173311,2025), (953195082,2020), (3379300631,2025), (3091612661,2024), (3443020141,2025), (1275334982,2021), (728087832,2016), (3948195061,2021), (3242533601,2025), (3265366061,2025), (3559389211,2025), (2613656312,2024), (1936418607,2022), (2015022117,2022), (3863933731,2026), (3344490081,2025), (1718378467,2022), (2893833591,2024), (2493031361,2023), (2673103592,2023), (1851227237,2015), (3991730711,2026), (2503286711,2023), (3226375021,2025), (2683144742,2019), (3548215401,2025), (578717012,2018), (1843514397,2022), (616321592,2017), (3982461811,2026), (3681379672,2025), (3217601441,2025), (3256605641,2025), (3929019271,2026), (2754220391,2024), (1487726872,2021), (1822697327,2012), (3910166351,2026), (2749285291,2024), (1700308437,2022), (2821758282,2024), (1864671247,2016), (1701434357,2022), (3275130421,2023), (3991730681,2026), (1887109947,2010), (824553942,2019), (1899808317,2015), (3510844431,2025), (1481819862,2017), (1926159197,2022), (2820301032,2024), (1887595277,2012), (2724263792,2024), (878493962,2020), (1131249182,2020), (2355180015,2023), (2670088912,2024), (2613209332,2020), (1775314577,2022), (2516791101,2016), (2663894692,2024), (3320597091,2025), (1009351792,2020), (2652525892,2024), (1055634672,2011), (3474695861,2025), (1558068232,2021), (2454986555,2023), (3929019311,2026), (1084418132,2020), (1198445252,2017), (2510922991,2023), (1418467732,2021), (2864196482,2019), (1799425877,2022), (3910174371,2026), (2289924375,2023), (1872193907,2009), (3948195031,2021), (3863933701,2026), (728552752,2015), (2355180075,2023), (728552672,2015), (2847466682,2024), (2169805087,2023), (2354796715,2019), (1527140152,2021), (4052159151,2026), (728539552,2015), (2670367462,2021), (2349092255,2023), (3989506131,2026), (1649359532,2022), (2534146841,2023), (2505512231,2023), (4061445011,2026), (3528817921,2025), (2466655375,2023), (1005101192,2020), (2245342987,2023), (825435072,2019), (2711894931,2024), (2843015982,2024), (1739183877,2022), (2790852212,2024), (727838492,2019), (2513752311,2023), (727835802,2018), (3262816621,2025), (1361622442,2021), (3370621971,2019), (3516241241,2025), (728176772,2018), (1139746122,2020), (3547069301,2025), (2671880652,2024), (2469800175,2023), (3856408081,2026), (3432933071,2025), (1518997902,2021), (1863157567,2018), (1894159667,2016), (1148437152,2020), (3677094342,2025), (3979805141,2026), (2794480752,2024), (728232892,2017), (1036366702,2020), (1830292707,2022), (24225041,2009), (3396792401,2025), (4006888151,2026), (2421238185,2023), (1016728312,2018), (1515103152,2021), (1861611557,2009), (2731643831,2016), (125833719,2016), (1277916382,2017), (967691022,2020), (4038132771,2026), (2523324961,2023), (1087544792,2020), (2323865725,2023), (2923555731,2024), (3217601461,2025), (1396304032,2021), (1887532517,2009), (3938057141,2026), (1822697317,2012), (1903970017,2017), (1827796347,2022), (3376163361,2025), (3160035021,2020), (3070241281,2014), (3458773861,2025), (2672165902,2021), (4035574591,2026), (2320026085,2023), (3551656581,2025), (728725152,2016), (1902605597,2017), (2257513457,2023), (1223062102,2021), (1035409622,2020), (3746136842,2025), (1620978072,2016), (1918593007,2018), (1859766717,2018), (3285935291,2020), (1037536882,2020), (678190632,2016), (2977852971,2024), (3079071041,2024), (2512363211,2023), (1623943372,2022), (4008923691,2026), (1229377632,2020), (3863933811,2026), (3112428171,2021), (2864196862,2015), (843751602,2019), (3490958331,2025), (791707142,2019), (2150506577,2023), (3255422201,2025), (2473397771,2023), (2377147005,2021), (2511578411,2020), (1669976262,2022), (4032818971,2026), (3977529521,2026), (2856445422,2024), (2384416465,2023), (4006888161,2026), (1688660007,2022), (3665701332,2025), (1857824777,2022), (1902293877,2017), (1508770812,2021), (2507322611,2016), (3282147191,2022), (3385076841,2025), (3165077581,2015), (2471706311,2023), (3091913921,2024), (1513792662,2021), (1996599507,2012), (1046082162,2020), (1424125882,2021), (2245584157,2023), (4006888141,2026), (3443020111,2025), (728733982,2015), (652841522,2014), (2945954741,2024), (2724522402,2024), (1870918087,2019), (1102207572,2019), (3451400191,2025), (2223901977,2023), (1016769172,2016), (3113953571,2024), (1891403487,2016), (3103909151,2024), (3004125341,2024), (4045152831,2026), (2748059341,2022), (3407926931,2025), (2683119032,2018), (1764666727,2022), (1920805137,2018), (4076508991,2026), (1213877802,2021), (3124823381,2024), (3160911031,2022), (4032819031,2026), (3030022611,2024), (871319512,2020), (3293889891,2025), (3982461831,2026), (3050380851,2024), (1832224607,2022), (2853677112,2024), (3961514501,2026), (4052159081,2026), (1856925277,2015), (4035574571,2026), (3561186861,2024), (3948119541,2026), (1901042397,2017), (3961514941,2026), (1720875457,2022), (2731607571,2014), (2210724317,2023), (3957204771,2021), (2671436222,2019), (3112434771,2020), (982983852,2020), (3157502751,2020), (728540582,2015), (726249992,2019), (3310050101,2025), (823565502,2019), (872932682,2020), (2939850231,2024), (4052159111,2026), (2714845022,2024), (4060757821,2026), (130030764,2016), (1823654027,2022), (3023998591,2024), (3357897091,2025), (2884070192,2024), (1861772497,2012), (3514965101,2025), (696956922,2019), (1749052577,2022), (775877152,2019), (3313154351,2025), (1229377332,2020), (3286363721,2017), (3593847772,2025), (3190029311,2025), (3412823831,2025), (673998942,2016), (2539905881,2023), (1174049092,2020), (877085102,2010), (3561186921,2024), (3089171041,2024), (2245343037,2023), (1996599527,2012), (4038165211,2026), (3275130441,2023), (3124177331,2019), (2079242507,2019), (2128683897,2023), (1856891597,2017), (4037009421,2026), (2358937935,2023), (2748195411,2024), (1828950527,2022), (1899786097,2017), (1483142032,2019), (4008782461,2026), (3328724911,2025), (728232222,2018), (3961514921,2026), (3323459991,2025), (2245343047,2023), (1854941957,2011), (2551832912,2023), (728235292,2013), (4027935811,2026), (3523311031,2025), (3362741861,2021), (2813349902,2024), (2722445122,2023), (1855964527,2012), (1597143482,2021), (2677958492,2024), (1089311912,2020), (2858218022,2024), (1855977267,2013), (1016736462,2015), (1856003407,2017), (4061445001,2026), (3195491171,2025), (3551656561,2025), (2286368867,2023), (1606338912,2022), (3402149461,2025), (3286363711,2017), (2642821802,2024), (3561186901,2024), (3907717291,2026), (871319562,2020), (2656078412,2017), (3070102191,2024), (3281013531,2022), (1007967512,2020), (2955404471,2024), (2357002005,2023), (674127352,2012), (2955404481,2024), (2253917217,2023), (1015392772,2020), (4000016501,2026), (3328583431,2025), (1519473172,2019), (1856967797,2017), (2862379662,2021), (3879889311,2026), (3330162511,2025), (3098457031,2024), (1606581192,2021), (1483142022,2019), (3231521921,2025), (3089171061,2024), (2512347761,2023), (1203786952,2021), (727826462,2019), (2666631162,2018), (3373459941,2025), (943830792,2019), (2300441615,2023), (1015392752,2020), (2694355732,2024), (1062149492,2020), (982983872,2020), (2232831637,2023), (952261162,2020), (3396792391,2025), (1102207722,2018), (2857895742,2024), (1203786862,2021), (1194973872,2019), (4000016441,2026), (1037536872,2020), (1224474562,2021), (2344534055,2023), (1366547492,2021), (2936891681,2024), (3498716171,2025), (1880762527,2011), (1681300957,2022), (2517780731,2023), (3044885751,2024), (1515103162,2021), (2102623557,2023), (3641465642,2025), (2157686807,2023), (2595402312,2023), (2748195421,2024), (1713368777,2022), (1890877667,2017), (1195505362,2021), (2257513477,2023), (2673090142,2023), (1762289117,2022), (2295576885,2023), (583712262,2018), (98612472,2010), (3282147181,2022), (743817902,2019), (3265399681,2025), (2020808097,2022), (2921668031,2024), (2880561552,2024), (1799790127,2022), (3768410242,2026), (727832632,2019), (62610482,2012), (2724263742,2024), (2864430642,2024), (1858857767,2022), (3907717331,2026), (2893837441,2024), (2802335932,2024), (4000016481,2026), (1275335002,2021), (3677114352,2025), (3275130431,2023), (1662633292,2022), (3616665162,2025), (3366124741,2025), (716300152,2019), (2656078312,2017), (2731681211,2021), (1062108632,2020), (2344534025,2023), (1543687322,2021), (1543877922,2017), (3376163341,2025), (2180030817,2023), (1903969837,2017), (2179956017,2023), (1527097132,2019), (728740062,2014), (923405472,2020), (1063202642,2020), (1397672072,2021), (587374162,2018), (3861351391,2026), (3512907481,2025), (3165090691,2019), (2515399401,2018), (1557884782,2021), (4021345281,2026), (1148437192,2020), (943830712,2019), (2826599462,2024), (2977852991,2024), (1969415467,2022), (2225781897,2023), (982983892,2020), (2515314921,2023), (2533705251,2023), (2512363231,2023), (3955108101,2026), (1866926987,2015), (2150469487,2023), (1257189932,2018), (3889137041,2026), (897780472,2020), (875607302,2020), (2843016032,2024), (1102960772,2019), (1041895212,2020), (1009351812,2020), (507579732,2018), (1541932452,2021), (1107634552,2020), (2698103992,2024), (1229377262,2019), (1924341827,2022), (3423284181,2025), (1488314292,2021), (3419949551,2025), (1004222092,2020), (3948119561,2026), (728127242,2018), (3535731631,2025), (728064912,2017), (3336481291,2025), (3961953251,2026), (728229342,2018), (3861351381,2026), (2148742347,2023), (3490958381,2025), (2673090162,2023), (3614444912,2025), (2344534095,2023), (2413240595,2023), (1374420312,2021), (911976742,2020), (1379353362,2021), (1431758462,2021), (4008923681,2026), (3898561971,2026), (843817062,2019), (3346172131,2025), (1198420302,2018), (1384248502,2021), (3038865761,2024), (1466941902,2021), (2670101652,2024), (4037009391,2026), (3060538941,2024), (693427242,2019), (2660515242,2024), (4027935821,2026), (121589240,2016), (3365288531,2025), (1135931262,2020), (1958747217,2022), (2344534115,2023), (3614510862,2025), (938054102,2020), (2545005721,2023), (3366124781,2025), (2731699311,2023), (4027935831,2026), (1813723957,2022), (144156010,2017), (728262532,2017), (1791869587,2022), (4032819001,2026), (3492238611,2025), (2843016052,2024), (3376163371,2025), (2071660757,2021), (728092462,2016), (2735357691,2024), (2864196352,2019), (728457722,2008), (1713368827,2022), (2665806712,2017), (1915471137,2022), (1286394242,2021), (3561186881,2024), (727827402,2018), (3961672771,2026), (1823714157,2022), (3407138511,2025), (3856408061,2026), (98612458,2010), (3028822241,2024), (2284968257,2023), (3477121141,2025), (4008782431,2026), (674022672,2015), (1700308467,2022), (1684881007,2022), (4027972071,2026), (1139970142,2020), (1543877932,2017), (2643063422,2024), (877102262,2010), (3979805161,2026), (1003381682,2020), (1224474592,2021), (1617749382,2022), (3366124771,2025), (875607322,2020), (2523324971,2023), (2980736011,2024), (4008923721,2026), (1406873922,2021), (3124823371,2024), (1603300922,2021), (1894517147,2016), (842836572,2014), (1513773882,2021), (1483191362,2021), (1431758482,2021), (2238692437,2023), (3066876291,2024), (2358937985,2023), (2481035521,2023), (3318306941,2025), (2258042687,2023), (1614402292,2022), (2391413685,2022), (1114415022,2020), (2653231932,2024), (1854551307,2016), (728080312,2017), (3443020071,2025), (144735132,2017), (728234772,2017), (2910013701,2018), (923405442,2020), (3261000071,2022), (1870874287,2019), (3085337481,2024), (2883618902,2024), (1766012537,2022), (1365292142,2021), (1576169062,2021), (2217204147,2023), (2253917207,2023), (811764622,2019), (2533921701,2023), (1831924437,2022), (2864196802,2015), (1846189277,2012), (1341998592,2021), (780688322,2019), (1669976272,2022), (1020093472,2020), (1918592967,2018), (3677094322,2025), (3359004371,2025), (949958152,2020), (2441497325,2023), (3394948741,2025), (4008782421,2026), (1662545962,2022), (3262816701,2025), (1472351962,2021), (1926285547,2019), (768923952,2019), (1896109997,2016), (696956942,2019), (1872106027,2017), (1754500837,2022), (2677958482,2024), (1902167457,2022), (2282526317,2023), (3524102021,2025), (835295992,2019), (2438719425,2023), (2982107401,2022), (1669976222,2022), (2852760262,2024), (1385902032,2021), (1863189657,2018), (1901042387,2017), (1609686472,2017), (3964418941,2026), (943830762,2019), (1319789892,2021), (1452080342,2021), (2583250282,2020), (2993785131,2024), (3217601451,2025), (4006888201,2026), (2584120102,2020), (2895855901,2024), (2323865735,2023), (1822494797,2012), (1854942647,2011), (3907717301,2026), (1700308427,2022), (2564538852,2023), (2375232005,2023), (978012392,2020), (2749285281,2024), (3305564711,2025), (1229377682,2019), (3281051341,2024), (2247330887,2023), (727827312,2019), (1275288172,2021), (928870732,2020), (2254126457,2023), (834484192,2019), (1913966047,2022), (1887588487,2012), (825435132,2019), (121589232,2016), (4009047291,2026), (3953738291,2026), (3112501251,2020), (2344533965,2023), (967691082,2020), (2843016042,2024), (3362741481,2022), (4004539901,2026), (970051232,2019), (1390398272,2021), (1886132087,2013), (1477121742,2021), (2595877512,2023), (728209342,2012), (834484162,2019), (1084418172,2020), (3614444942,2025), (775042252,2019), (3160786431,2023), (916778122,2020), (1834824467,2022), (1102960742,2019), (4008782481,2026), (986391292,2020), (3498716141,2025), (1922908377,2019), (1084418162,2020), (1863127947,2018), (1345500512,2021), (727841812,2019), (834484152,2019), (1672902387,2022), (1490386722,2021), (728142492,2019), (2377809805,2022), (2516790971,2016), (2870451292,2024), (880257022,2020), (2385357515,2023), (3033849031,2024), (2043459747,2022), (2293799065,2023), (3038842301,2024), (4000113611,2026), (2215853567,2023), (1913966067,2022), (1783386547,2022), (728157542,2017), (3856408091,2026), (1005792032,2020), (2192220267,2023), (1952914507,2022), (3492238631,2025), (2665806722,2017), (1861611577,2009), (783638202,2019), (3653455412,2014), (3262816611,2025), (1654915162,2022), (1532790992,2021), (2523324991,2023), (2126490687,2023), (3216398471,2025), (4008782451,2026), (899224522,2020), (988347102,2020), (1564792322,2021), (1864677137,2016), (3863311491,2026), (2655600932,2016), (1592657861,2021), (1869520477,2019), (501130132,2018), (1900896407,2017), (693747582,2019), (1807368507,2022), (3477121131,2025), (728232172,2018), (3582847281,2025), (4001202541,2026), (1543877912,2017), (1783386567,2022), (3581442421,2025), (3190029241,2025), (1016728432,2017), (2358937975,2023), (4039232111,2026), (673998612,2016), (1016728302,2018), (4027972101,2026), (3508106701,2025), (2583342012,2017), (3454729561,2025), (2413240625,2023), (1119271802,2020), (1795254937,2022), (2253917197,2023), (3667806712,2025), (4035574621,2026), (3409046461,2025), (1408001742,2021), (3444745621,2025), (2179956007,2023), (1609686612,2018), (1466941842,2021), (3528817941,2025), (2613155382,2021), (1890717437,2014), (2384416505,2023), (2993262561,2024), (1890804257,2015), (2441734045,2023), (2981486901,2024), (727841792,2019), (144156012,2017), (2384416485,2023), (1846227767,2012), (918602662,2020), (3948621141,2020), (2351832935,2021), (3410990821,2025), (1885850447,2013), (1886132097,2013), (1453560852,2021), (728063232,2017), (1005791992,2020), (2843364832,2024), (1722331757,2022), (2644449672,2024), (107675570,2015), (1969415487,2022), (2523324941,2023), (1090166692,2020), (2589098342,2023), (613387092,2013), (2526644801,2023), (3536770921,2025), (1872208957,2009), (3982461851,2026), (3085337441,2024), (1009351782,2020), (2179956037,2023), (1684801307,2022), (3428993801,2025), (2722449182,2023), (3373460011,2025), (1889850097,2022), (759241372,2019), (3310050141,2025), (2864195992,2017), (728275132,2016), (1102972642,2020), (2505653471,2016), (3286269481,2020), (1949276357,2022), (726249982,2019), (943683552,2020), (3459413701,2025), (1347589442,2021), (3262816671,2025), (2982104031,2022), (2958303721,2024), (3034645851,2023), (2958303681,2024), (3263154791,2025), (1114774832,2020), (2864196732,2020), (3231134341,2025), (1839456977,2022), (3370327191,2025), (3038782411,2024), (4027935841,2026), (1385902022,2021), (841864422,2015), (4008923741,2026), (3310050151,2025), (2297451185,2023), (2748195401,2024), (1830424427,2022), (2671546282,2022), (1429049172,2021), (775877102,2019), (3863933751,2026), (3407926861,2025), (2703218862,2024), (1287745442,2021), (1156943962,2020), (1614402302,2022), (2245342997,2023), (1861648177,2010), (3216398481,2025), (11004712,2008), (3112513941,2019), (1815359867,2010), (728708332,2016), (3208895561,2025), (2960046491,2024), (3792746852,2026), (728010042,2017), (3251711191,2025), (1936418617,2022), (2722453082,2023), (2982108811,2022), (2158813717,2020), (1272979652,2021), (1730381547,2022), (1920805127,2018), (543392292,2018), (1824160747,2012), (1600037302,2021), (728688562,2011), (4038133761,2026), (127531051,2016), (1563549762,2021), (3407138521,2025), (1558068202,2021), (1502479302,2021), (3281371641,2025), (2592875352,2023), (1536520912,2021), (728706292,2008), (4061444991,2026), (841864582,2017), (1839456937,2022), (763313622,2019), (1855009277,2014), (3907717271,2026), (2391949005,2023), (3348987771,2025), (1809022817,2022), (3889137031,2026), (2358937955,2023), (3459413611,2025), (1254692222,2021), (3289803141,2020), (3265366081,2025), (1046082172,2020), (3961672791,2026), (2752439251,2024), (1097366412,2020), (3991671971,2026), (2102623537,2023), (3573218571,2025), (1498546032,2021), (2764316861,2024), (1869186477,2016), (2188704267,2023), (3515361421,2025), (728191542,2017), (1255925472,2021), (1156943922,2020), (1085185492,2020), (2746913901,2024), (2523324911,2023), (3976069491,2026), (2320139425,2023), (2016755687,2022), (3370621991,2019), (3374138151,2025), (1032505492,2016), (3027749391,2024), (4038165201,2026), (3038865771,2024), (3528817981,2025), (1845391717,2010), (1461248422,2021), (1013127042,2020), (1148437142,2020), (1424288482,2021), (3946020491,2026), (2939850251,2024), (893623722,2020), (3265957031,2025), (2656078372,2017), (1066501052,2020), (2303246835,2023), (2344533975,2023), (1099543702,2020), (2656078392,2017), (1076201912,2020), (3101895161,2024), (2613189612,2020), (3289907451,2015), (2473512591,2023), (2961236101,2020), (3956773751,2026), (811764612,2019), (728553142,2015), (994611272,2020), (106792106,2015), (3777720622,2026), (1872208277,2009), (2523324931,2023), (1909873737,2018), (1434903792,2021), (3755956442,2026), (3171677121,2025), (3286293751,2016), (3616665132,2025), (3669606842,2025), (2466655405,2023), (3275130401,2023), (2665806742,2017), (872987932,2020), (1837647747,2022), (2102623507,2023), (3323460001,2025), (810242242,2019), (1730381607,2022), (1148437182,2020), (3265957051,2025), (1229377212,2019), (1662633302,2022), (1017673922,2020), (678190652,2016), (451742442,2018), (875607312,2020), (3551656571,2025), (3547069311,2025), (1072846632,2020), (3423284201,2025), (1623943402,2022), (1481264862,2017), (3112428201,2021), (3722413412,2025), (3272541201,2025), (1145417432,2009), (2172883797,2023), (1870918157,2019), (1374420292,2021), (2354933985,2017), (813682742,2019), (3362665111,2021), (1099514822,2020), (2391949015,2023), (1884470447,2015), (3112513951,2019), (1222035342,2021), (728080352,2017), (1558068192,2021), (2245342957,2023), (1837647707,2022), (3265957021,2025), (1859559577,2016), (3948621121,2020), (728420572,2012), (577545352,2018), (2754220381,2024), (2967914551,2024), (2666584412,2018), (2503957201,2023), (1229377302,2020), (2655609692,2016), (3216735101,2024), (1913051427,2018), (1016503472,2020), (2441497315,2023), (2789230942,2024), (3991671951,2026), (1651130322,2022), (974572342,2020), (1200685482,2012), (2413240605,2023), (2043459817,2022), (1890547997,2015), (728159102,2018), (3889137051,2026), (2569348502,2020), (1866920387,2009), (1799467037,2022), (3702580582,2025), (3581392901,2025), (728597372,2015), (1513792672,2021), (2258042667,2023), (2509885351,2020), (1885908767,2007), (2722514082,2023), (2351753455,2023), (2533705261,2023), (3536770931,2025), (2354855975,2023), (1107300652,2020), (2344533995,2023), (2389639385,2023), (2354936385,2018), (3339356381,2025), (107675556,2015), (1143767062,2020), (2507322651,2016), (811037122,2019), (3574177601,2012), (3088014071,2024), (3856408071,2026), (1887805607,2014), (1503655562,2021), (779646772,2019), (1708995887,2022), (1319789872,2021), (2389639395,2023), (716300172,2019), (3094874991,2016), (1130250992,2020), (123170452,2016), (3961514931,2026), (2384416445,2023), (4032818991,2026), (3344490141,2025), (3124823311,2024), (3763592532,2026), (3334081191,2025), (4006888181,2026), (3282147161,2022), (1490386732,2021), (727834362,2018), (1394246552,2021), (1086150122,2020), (1013126992,2020), (728597382,2015), (2349092265,2023), (2683165652,2019), (2344534035,2023), (728688552,2011), (775877162,2019), (1051400742,2020), (1870918177,2019), (3328395931,2025), (1822538257,2012), (3328579281,2025), (2077513577,2022), (1861772507,2012), (2215853547,2023), (728163132,2019), (1609686842,2018), (727827362,2019), (728533732,2015), (2180030797,2023), (1244275792,2021), (2295595935,2023), (3419949531,2025), (3948119491,2026), (2043459797,2022), (876461772,2018), (3792746832,2026), (1527140162,2021), (2982108821,2022), (1145417422,2009), (3049682591,2024), (3410990801,2025), (3770700222,2026), (1463425352,2021), (1823654077,2022), (4009047281,2026), (1319789962,2021), (982983862,2020), (1754132057,2022), (3907717191,2026), (727992742,2017), (1481298652,2019), (1854988707,2014), (879302602,2020), (728203702,2013), (1799467057,2022), (766187942,2019), (2449930075,2023), (673998622,2016), (1864677147,2016), (2503957211,2023), (1913051447,2018), (1229377162,2019), (3394948771,2025), (1260431362,2019), (2592875362,2023), (1012946492,2020), (728232992,2016), (2158813707,2020), (825435082,2019), (1931215027,2022), (1263967742,2020), (2172883817,2023), (1369196912,2021), (844533072,2017), (1855960587,2012), (1952914467,2022), (1872064987,2022), (1370230982,2021), (344598911,2017), (2660515232,2024), (3929297861,2026), (2731607681,2014), (1222432102,2021), (2286368887,2023), (2043459757,2022), (3991730771,2026), (728123212,2018), (2735357701,2024), (1037536902,2020), (3069037841,2024), (1804318457,2022), (4038165191,2026), (1483679692,2021), (1715901107,2022), (3323459981,2025), (2508141571,2017), (2731674141,2020), (1669976242,2022), (3421629911,2025), (3089171071,2024), (1846207717,2012), (2936891661,2024), (2726775541,2024), (916778132,2020), (1229377222,2019), (2300441625,2023), (2413240585,2023), (616295022,2016), (2203569707,2023), (2857610322,2024), (2157686797,2023), (3529649011,2025), (1754132027,2022), (3991730721,2026), (2911265681,2024), (1713376467,2022), (3163884991,2021), (1244275802,2021), (1740010157,2022), (1122429772,2020), (1108179782,2020), (3451330071,2025), (1463889022,2021), (3103841251,2024), (728733262,2015), (1626560752,2022), (1393244382,2021), (2826599502,2024), (1701434377,2022), (728191572,2017), (3275130411,2023), (2786435022,2024), (3929297891,2026), (759241352,2019), (129983470,2016), (3458773841,2025), (2731607691,2014), (3089420151,2024), (3563110901,2025), (1034544322,2018), (1284878392,2021), (1616329082,2022), (1846214447,2012), (3459413621,2025), (1855960577,2012), (3426913761,2023), (782384302,2019), (2649061912,2024), (728724972,2013), (2813349862,2024), (3433427401,2025), (3285925791,2019), (1981060207,2022), (3220484111,2025), (1483146182,2020), (1408001762,2021), (1823714147,2022), (1229377152,2019), (1811341337,2021), (1855964587,2012), (1007967482,2020), (2289076065,2023), (1064296282,2020), (727831632,2019), (1284878382,2021), (3547069281,2025), (1880181827,2022), (977015172,2020), (3112434721,2020), (728563352,2012), (1612295762,2022), (2480780911,2023), (2672421542,2022), (3355094441,2025), (2671839232,2022), (3287275901,2021), (727847572,2018), (3357897131,2025), (3512907521,2025), (3703084552,2012), (2188247317,2023), (1108179812,2020), (2884070252,2024), (2830309282,2024), (3270725161,2025), (995831522,2020), (2402913835,2023), (2703218852,2024), (2649451642,2024), (1016503462,2020), (2981486791,2021), (728270612,2012), (3038395741,2024), (2857895752,2024), (3702580572,2025), (1379353352,2021), (1823835587,2022), (2393016505,2023), (4037009371,2026), (1799467067,2022), (2967699621,2024), (2671014522,2023), (2319770695,2020), (129191382,2016), (2043459777,2022), (2983516511,2021), (2338812395,2023), (727836972,2019), (1110906842,2020), (3124823361,2024), (4039231981,2026), (1188895282,2012), (2683165662,2019), (3281371671,2025), (1548405692,2021), (2831648772,2024), (899224532,2020), (3834297131,2026), (3344490051,2025), (3033573701,2024), (1099543712,2020), (1541932422,2021), (3976721011,2026), (2698103982,2024), (2731618391,2016), (3314636911,2025), (3907717281,2026), (3410990831,2025), (1666204192,2022), (1017486032,2020), (4061444981,2026), (1016503502,2020), (2724263752,2024), (1854959157,2012), (1260378552,2017), (1951085907,2022), (1097366432,2020), (1379353372,2021), (1249505692,2021), (1379353392,2021), (3286967841,2018), (872932662,2020), (1055633602,2012), (1263960622,2021), (1648419342,2022), (970051252,2019), (3261000141,2022), (2375850765,2023), (1929442137,2019), (1090149692,2020), (3261000081,2022), (121589236,2016), (806276542,2019), (728597412,2015), (3428993841,2025), (1914011447,2018), (2373775165,2023), (2671546242,2022), (1662633322,2022), (1396569652,2021), (2983516391,2020), (3551656601,2025), (2010937937,2022), (1609686492,2017), (4006889831,2026), (1900661987,2017), (3512907511,2025), (2393016495,2023), (1799467047,2022), (2871148852,2024), (2731588231,2012), (908576692,2020), (1571728252,2018), (810242252,2019), (1562508412,2021), (635271962,2019), (3320597101,2025), (2656078322,2017), (2172883837,2023), (1885791817,2015), (3991672041,2026), (3015108241,2023), (824553952,2019), (1872065007,2022), (3490958451,2025), (1080246732,2020), (4008782501,2026), (3124823291,2024), (727836982,2019), (2739095591,2024), (1887731457,2012), (834484142,2019), (1481281322,2018), (1466941882,2021), (2106960037,2023), (3863933821,2026), (3089171081,2024), (3409046451,2025), (1244275782,2021), (3991671961,2026), (2305557125,2023), (943081342,2018), (3573891281,2020), (2967914571,2024), (1870918107,2019), (2585944272,2023), (3374138171,2025), (811777052,2019), (3241971481,2025), (1037536892,2020), (1822494767,2012), (657797522,2019), (3593847802,2025), (1099609422,2020), (728422182,2012), (13969158,2011), (344598921,2017), (865240172,2020), (2937080551,2024), (1891383607,2016), (3089420141,2024), (1853803417,2022), (2832810862,2024), (1016744512,2014), (1897718737,2017), (2384416495,2023), (3366124731,2025), (841864552,2017), (1108179872,2020), (144156016,2017), (767745552,2019), (4021131271,2026), (1918593037,2018), (133219842,2016), (1663762962,2022), (727827332,2019), (1936418657,2022), (2354623165,2023), (2344534045,2023), (3763592552,2026), (2864195932,2016), (3863933771,2026), (1099615962,2020), (1435941902,2021), (2510923031,2023), (1442464632,2013), (2592844192,2023), (967691072,2020), (1016736492,2015), (2227832217,2023), (2338371075,2023), (2354707725,2023), (2831252712,2024), (1909873747,2018), (3314045411,2025), (1406873932,2021), (982983902,2020), (2375352085,2023), (1359734532,2021), (806276532,2019), (4052159161,2026), (3620174982,2025), (2510923021,2023), (3345776131,2025), (1408001772,2021), (3423284151,2025), (4008782411,2026), (3442915851,2025), (2320299525,2023), (2150469477,2023), (1263961482,2020), (1175193682,2020), (1856898207,2017), (2958303671,2024), (836256752,2019), (3907717201,2026), (1067236242,2020), (2897230071,2024), (1114414982,2020), (3282147151,2022), (2661770112,2024), (3286300961,2015), (2757000901,2024), (4008923731,2026), (1864286017,2022), (1900947817,2017), (3233571211,2025), (3091914031,2024), (2683119012,2018), (137456560,2016), (728233032,2016), (3033562371,2023), (3910158281,2026), (2856445832,2024), (2713293101,2024), (3057778381,2024), (1143838242,2020), (728563322,2012), (3211497581,2020), (2862984562,2024), (759241342,2019), (2505653451,2016), (2492511201,2023), (1889940287,2015), (2514549581,2023), (2384416425,2023), (1108179832,2020), (3039714651,2024), (1466941832,2021), (2138170887,2023), (2180030827,2023), (2377353925,2022), (3907717261,2026), (1900294797,2022), (2722445142,2023), (2826599512,2024), (1799467007,2022), (3834566281,2026), (3458773961,2025), (3233827961,2025), (3963521031,2026), (2375789875,2021), (3304459121,2021), (2147372367,2023), (4000252281,2026), (4037009381,2026), (3124823331,2024), (3241944341,2025), (2534146851,2023), (1684881027,2022), (2656078352,2017), (1046082132,2020), (712994302,2019), (3676526282,2025), (1102978342,2020), (1616534592,2022), (1799467017,2022), (2344533955,2023), (1866920327,2009), (877085062,2010), (538028502,2018), (3462040101,2025), (3376163351,2025), (2354934045,2017), (1663762982,2022), (2521359701,2023), (1936418627,2022), (2814621752,2024), (1512751212,2021), (3477354431,2022), (2746913911,2024), (3681379652,2025), (2694355722,2024), (2356090215,2023), (3514965071,2025), (3982461841,2026), (2583415482,2023), (2169805017,2023), (766187952,2019), (4061444961,2026), (3523824901,2025), (1885858997,2015), (3423720761,2025), (727855132,2018), (1855950187,2012), (1855002967,2014), (3850407121,2026), (3979805151,2026), (1032505512,2016), (1625092552,2022), (2377258695,2018), (2948436721,2024), (2441734035,2023), (3451330061,2025), (1913389577,2018), (728232852,2017), (3112513911,2019), (1854777947,2017), (3051298251,2024), (834484172,2019), (2731681221,2021), (3950575941,2024), (689468162,2019), (3948119551,2026), (1424123902,2021), (2141225757,2010), (3334268611,2020), (1000441052,2020), (1891142297,2014), (3366124711,2025), (2813349912,2024), (3449883501,2025), (1845391727,2010), (2811862352,2024), (728533692,2015), (1984834807,2022), (1032505472,2016), (1854982507,2014), (1830292787,2022), (1866920377,2009), (3982461821,2026), (2045979037,2022), (4061324971,2026), (1046082142,2020), (2864196762,2020), (2864195802,2016), (2726775521,2024), (3330162471,2025), (3616701452,2025), (3991672001,2026), (1799467027,2022), (1014200232,2020), (3950788711,2026), (1839034037,2022), (1461331462,2021), (3964418921,2026), (3961514961,2026), (3614444922,2025), (3049682561,2024), (3046402801,2024), (728143922,2018), (2358937965,2023), (1481246612,2016)) v(d, y) ON s.deezer_track_id = v.d AND s.year = v.y)::text)
) AS g(file, check_name, expected, actual)
ORDER BY file;
