-- 002d-quiz-site-guard.sql (run O1, lane B2; manifest.md row 6; BACKLOG 4.1 row 5, DANGEROUS: on the kpop insert
-- path, two R-SQL reviewers; schema.sql "@file 002d-quiz-site-guard")
--
-- What:   the trigger function public.quizzes_site_guard() and its trigger trg_quizzes_site_guard, BEFORE INSERT OR
--         UPDATE OF site_id, group_id ON public.quizzes: it raises (SQLSTATE 23514, check_violation) when the
--         quiz's site_id differs from the site_id of its group.
-- Why:    a quiz of one site must never hang off a group of another site (an anime quiz under a kpop group would
--         show on kpop group pages, and the reverse).
-- Equivalence: every kpop insert and update of today passes unchanged: today's writers never name site_id, so the
--         quiz reads 'kpop' (002a's default) and so does its group. The cost is one primary key read of groups per
--         inserted quiz and per update that sets site_id or group_id; play, like and counter updates never fire it.
--         A group_id without a group is left to quizzes_group_id_fkey, which reports it as today.
-- Rows:   no row read or written by this file. 1 function, 1 trigger.
-- Verify: select tgname, tgenabled from pg_trigger where tgrelid = 'public.quizzes'::regclass
--           and tgname = 'trg_quizzes_site_guard';                                                expect 1 row, O
--         select prosecdef, proconfig from pg_proc where oid = 'public.quizzes_site_guard()'::regprocedure;
--           expect t | {search_path=public}
--         select has_function_privilege('anon', 'public.quizzes_site_guard()', 'execute');           expect f
--         In a transaction rolled back: an insert of a quiz whose site differs from its group's raises 23514.
-- Undo:   002d-quiz-site-guard.rollback.sql (drops the trigger, then the function).
-- Needs:  002c-site-indexes.sql (manifest order; the guard reads groups.site_id of 002a).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '3s';
set client_min_messages = warning;

create or replace function public.quizzes_site_guard() returns trigger
  language plpgsql security definer set search_path = public
  as $$
declare
  group_site text;
begin
  if new.group_id is null then
    return new;
  end if;
  select g.site_id into group_site from public.groups g where g.id = new.group_id;
  if not found then
    return new;
  end if;
  if new.site_id is distinct from group_site then
    raise exception 'quiz site % differs from the site % of its group %', new.site_id, group_site, new.group_id
      using errcode = '23514', hint = 'a quiz and its group belong to the same site (trg_quizzes_site_guard)';
  end if;
  return new;
end
$$;

revoke all on function public.quizzes_site_guard() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgrelid = 'public.quizzes'::regclass and tgname = 'trg_quizzes_site_guard'
  ) then
    create trigger trg_quizzes_site_guard before insert or update of site_id, group_id on public.quizzes
      for each row execute function public.quizzes_site_guard();
  end if;
end $$;
