-- B2 guard test: run inside one transaction that is rolled back (nothing persists).
-- o1-transaction: none
\set ON_ERROR_STOP on
begin;
do $$
declare
  creator uuid := (select id from public.profiles order by created_at limit 1);
  kpop_group integer;
  anime_group integer;
  q uuid;
  st text;
begin
  if creator is null then raise exception 'guard test: no profile to act as creator'; end if;
  insert into public.groups (name, slug, display_color, text_color)
    values ('O1 B2 guard kpop', 'o1-b2-guard-kpop', '#111111', '#ffffff') returning id into kpop_group;
  insert into public.groups (name, slug, display_color, text_color, site_id)
    values ('O1 B2 guard anime', 'o1-b2-guard-anime', '#111111', '#ffffff', 'anime') returning id into anime_group;

  -- 1. today's kpop insert (no site_id named): passes
  insert into public.quizzes (creator_id, group_id, title, slug, questions)
    values (creator, kpop_group, 'O1 B2 guard kpop quiz', 'o1-b2-guard-kpop-quiz', '[1,2,3]') returning id into q;
  raise notice 'case 1 kpop quiz in kpop group: inserted, site %', (select site_id from public.quizzes where id = q);

  -- 2. quiz left on kpop (default) under the anime group: refused
  begin
    insert into public.quizzes (creator_id, group_id, title, slug, questions)
      values (creator, anime_group, 'O1 B2 guard mixed quiz', 'o1-b2-guard-mixed-quiz', '[1,2,3]');
    raise exception 'case 2 FAILED: the mixed insert passed';
  exception when check_violation then
    get stacked diagnostics st = returned_sqlstate;
    raise notice 'case 2 kpop quiz in anime group: refused, SQLSTATE %, %', st, sqlerrm;
  end;

  -- 3. anime quiz under the anime group: passes
  insert into public.quizzes (creator_id, group_id, title, slug, questions, site_id)
    values (creator, anime_group, 'O1 B2 guard anime quiz', 'o1-b2-guard-anime-quiz', '[1,2,3]', 'anime');
  raise notice 'case 3 anime quiz in anime group: inserted';

  -- 4. moving the kpop quiz to the anime group: refused
  begin
    update public.quizzes set group_id = anime_group where id = q;
    raise exception 'case 4 FAILED: the mixed update passed';
  exception when check_violation then
    raise notice 'case 4 update kpop quiz to anime group: refused, %', sqlerrm;
  end;

  -- 5. moving the kpop quiz to site anime under its kpop group: refused
  begin
    update public.quizzes set site_id = 'anime' where id = q;
    raise exception 'case 5 FAILED: the site change passed';
  exception when check_violation then
    raise notice 'case 5 update kpop quiz site to anime: refused, %', sqlerrm;
  end;

  -- 6. a counter update (today's play path) does not fire the guard and passes
  update public.quizzes set play_count = play_count + 1 where id = q;
  raise notice 'case 6 play_count update: passed';
end $$;
rollback;
select 'after rollback, guard rows left', count(*) from public.quizzes where slug like 'o1-b2-guard-%';
