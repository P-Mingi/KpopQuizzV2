-- kpopquizz-team.sql: declare the kpopquizz account (author of the daily quizzes) as a Team account.
--
-- OWNER-GATED. NOT APPLIED. Apply only after the owner has read docs/seo/strategy-2026-10-27/KPOPQUIZZ-TEAM-IMPACT.md and said go.
--
-- What:   inserts ONE row in public.editorial_accounts for the profile whose username is 'kpopquizz'.
--         display_name 'KpopQuizz Team' (the same text as the profile display name, like the 9 rows already there),
--         beat 'Quiz of the day and every group', active true. created_at takes its default (now()).
-- Why:    the site shows kpopquizz as a normal player (Lv 5 Casual Fan, on the creator boards). With this row it
--         carries the Team badge and leaves the fan boards (full list in KPOPQUIZZ-TEAM-IMPACT.md).
-- Guards: stops (nothing applied) when no profile has the username 'kpopquizz', when that profile has no auth
--         user (editorial_accounts.user_id references auth.users), or when it already has an editorial_accounts row.
-- Beat:   it must NOT contain chart, data, number or stat (lib/editorial/templates.ts:81 and :104): such a beat would
--         make kpopquizz the author of every weekly recap draft and take it out of the comeback topics.
-- Sites:  no site_id is named. Before Run O1's 002a there is no such column; after it the default 'kpop' fills it.
--         The check below stops the transaction if the new row is not a kpop row.
-- Effect: no deploy needed. The Team list is cached 5 minutes (lib/editorial/accounts.ts:30), pages up to 1 hour
--         (ISR), the hub "first quiz" line up to 6 hours.
-- Undo:   kpopquizz-team-rollback.sql
-- Verify: the two selects at the end: one row (KpopQuizz Team | Quiz of the day and every group | true), then 10
--         (9 today plus this one; more if the 31 anime Team accounts of o1 L02-K2 were inserted first).

begin;

do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.profiles where username = 'kpopquizz';
  if v_n <> 1 then
    raise exception 'kpopquizz-team: expected 1 profile with the username kpopquizz, found %, nothing applied', v_n;
  end if;

  if not exists (
    select 1 from auth.users u join public.profiles p on p.id = u.id where p.username = 'kpopquizz'
  ) then
    raise exception 'kpopquizz-team: the kpopquizz profile has no auth user (editorial_accounts.user_id references auth.users), nothing applied';
  end if;

  if exists (
    select 1 from public.editorial_accounts e join public.profiles p on p.id = e.user_id where p.username = 'kpopquizz'
  ) then
    raise exception 'kpopquizz-team: kpopquizz already has an editorial_accounts row, nothing applied';
  end if;

  insert into public.editorial_accounts (user_id, display_name, beat, active)
  select p.id, 'KpopQuizz Team', 'Quiz of the day and every group', true
  from public.profiles p
  where p.username = 'kpopquizz';

  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'kpopquizz-team: expected 1 inserted row, got %, nothing applied', v_n;
  end if;

  -- After Run O1's 002a the row carries site_id (default 'kpop'). Before it, the column does not exist.
  if exists (
    select 1 from public.editorial_accounts e join public.profiles p on p.id = e.user_id
    where p.username = 'kpopquizz' and coalesce(to_jsonb(e) ->> 'site_id', 'kpop') <> 'kpop'
  ) then
    raise exception 'kpopquizz-team: the new row is not a kpop row, nothing applied';
  end if;
end $$;

-- Verify (inside the transaction): expect one row: KpopQuizz Team | Quiz of the day and every group | true
select e.display_name, e.beat, e.active
from public.editorial_accounts e join public.profiles p on p.id = e.user_id
where p.username = 'kpopquizz';

-- Expect 10 active Team accounts (9 before this file; 41 if o1 L02-K2 was applied first).
select count(*) as active_team_accounts from public.editorial_accounts where active;

commit;
