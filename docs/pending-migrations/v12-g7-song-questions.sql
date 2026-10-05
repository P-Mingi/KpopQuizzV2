-- v12-g7-song-questions.sql  (V12 run, agent G7, SYSTEM.md 5.3)
--
-- WHAT
--   Data only. Gives every group that has enough songs in the catalogue a song
--   question for the This or that bonus card and the "<Fandom> picked" ranking:
--     duel_questions  one row per group: (group_slug, 'songs'), entity_kind 'song',
--                     prompt 'Best <group> song?', min_votes 100.
--     duel_ratings    the songs of that question: the group's 16 most played songs
--                     on Deezer (songs.deezer_rank), one row per title, taken from the
--                     `songs` catalogue. entity_id = songs.id, entity_name = the title,
--                     entity_image = the Deezer cover.
--
-- WHY
--   Only aespa, BLACKPINK and BTS have a song question today (seeded in June from
--   the old This or that items). Without this file the bonus card shows on the
--   quizzes of those three groups only.
--
-- RULES
--   A group gets a question only if it has 8 or more distinct active song titles
--   with a Deezer cover. The hidden quarantine group (zzz-*) and the general-kpop
--   bucket get none. Groups that already have a (group_slug, 'songs') question are
--   left exactly as they are: their question, their songs, their votes.
--   min_votes 100: see lib/duel/fans-picked.ts (about 12 comparisons per song).
--
-- ROWS (counted on production on 2026-10-02, read only)
--   duel_questions  +77   (20 before)
--   duel_ratings    +1,201 (360 before): 67 groups with 16 songs, 3 with 15, 1 with 14,
--                   3 with 13, 2 with 11, 1 with 9.
--   The counts move if the catalogue changes before this file is applied (G2 adds
--   songs in this run): the VERIFY query prints the real ones.
--   duel_votes: untouched. No existing row of any table is updated or deleted.
--
-- ORDER
--   Independent of v12-g7-this-or-that.sql. Until both are applied the card stays
--   hidden for the new groups.
--
-- VERIFY (after applying)
--   select count(*) from public.duel_questions where question_type = 'songs';                  -- 80 expected
--   select q.group_slug, count(*) from public.duel_ratings r
--     join public.duel_questions q on q.id = r.question_id
--     where q.question_type = 'songs' group by 1 order by 2, 1;                               -- 8 to 16 per group
--   select count(*) from public.duel_votes;                                                   -- unchanged
--
-- UNDO (removes only what this file added; the three older questions have ratings
-- whose entity_id is not a songs.id and are not matched)
--   delete from public.duel_questions q
--   where q.question_type = 'songs' and q.min_votes = 100
--     and not exists (select 1 from public.duel_votes v where v.question_id = q.id)
--     and not exists (select 1 from public.duel_ratings r where r.question_id = q.id
--                     and not exists (select 1 from public.songs s where s.id = r.entity_id));
--   (duel_ratings rows go with their question: on delete cascade. A question that
--   already received votes is kept on purpose: votes are never dropped.)
--
-- Idempotent: a second run inserts nothing (the questions exist, so no rating is added).

begin;

with uniq as (
  -- one row per (group, title): the most played version of a title
  select distinct on (s.group_id, lower(btrim(s.title)))
         s.group_id, s.id, s.title, s.album_cover_big, s.deezer_rank
  from public.songs s
  where s.status = 'active'
    and s.group_id is not null
    and s.album_cover_big like 'https://cdn-images.dzcdn.net/%'
  order by s.group_id, lower(btrim(s.title)), s.deezer_rank desc nulls last, s.id
),
top as (
  select u.group_id, u.id, u.title, u.album_cover_big,
         row_number() over (partition by u.group_id order by u.deezer_rank desc nulls last, u.id) as rn,
         count(*) over (partition by u.group_id) as n
  from uniq u
),
new_q as (
  insert into public.duel_questions (group_slug, question_type, prompt, entity_kind, min_votes, is_active)
  select g.slug, 'songs', 'Best ' || g.name || ' song?', 'song', 100, true
  from public.groups g
  where g.slug not like 'zzz-%'
    and g.slug <> 'general-kpop'
    and exists (select 1 from top t where t.group_id = g.id and t.n >= 8)
  on conflict (group_slug, question_type) do nothing
  returning id, group_slug
)
insert into public.duel_ratings (question_id, entity_id, entity_name, entity_image)
select q.id, t.id, t.title, t.album_cover_big
from new_q q
join public.groups g on g.slug = q.group_slug
join top t on t.group_id = g.id and t.rn <= 16
on conflict (question_id, entity_id) do nothing;

commit;
