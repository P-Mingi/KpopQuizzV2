-- kpopquizz-team-rollback.sql: undo kpopquizz-team.sql (kpopquizz goes back to a normal account).
--
-- OWNER-GATED. NOT APPLIED. Apply only if kpopquizz-team.sql was applied and the owner wants it undone.
--
-- What:   deletes the ONE editorial_accounts row of the profile whose username is 'kpopquizz'.
-- Why a delete and not active = false: a retired row (active false) still counts as Team in some places:
--         duel votes and the "Fans picked" ranking (lib/duel/server.ts:167 and :222, lib/duel/weekly-splits.ts:35),
--         old community posts (lib/ux-v1/p8/people.ts:75), and on the o1 branch the hub Top fans
--         (lib/site/hub/data/top-fans.ts:93) and the account deletion refusal (lib/passport/deletion/account.ts:134).
--         Only the delete brings back exactly today's state.
-- Guards: stops (nothing applied) when no profile has the username 'kpopquizz', when it has no editorial_accounts
--         row, or when the editorial pipeline already used it: a draft (editorial_drafts.account_id, ON DELETE
--         RESTRICT) or a published post (editorial_posts.author, ON DELETE SET NULL would leave the post without
--         author). In that case retire it instead (update ... set active = false) and accept the leftovers above.
-- Effect: same delays as the insert (5 minutes for the Team list, up to 1 hour for pages, 6 hours for the hub line).
-- Verify: the select at the end: 0 rows, then 9 (40 if o1 L02-K2 was applied).

begin;

do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.profiles where username = 'kpopquizz';
  if v_n <> 1 then
    raise exception 'kpopquizz-team-rollback: expected 1 profile with the username kpopquizz, found %, nothing applied', v_n;
  end if;

  if not exists (
    select 1 from public.editorial_accounts e join public.profiles p on p.id = e.user_id where p.username = 'kpopquizz'
  ) then
    raise exception 'kpopquizz-team-rollback: kpopquizz has no editorial_accounts row, nothing to undo';
  end if;

  if exists (
    select 1 from public.editorial_drafts d join public.profiles p on p.id = d.account_id where p.username = 'kpopquizz'
  ) then
    raise exception 'kpopquizz-team-rollback: an editorial draft uses kpopquizz, nothing applied (retire it with active = false instead)';
  end if;

  if exists (
    select 1 from public.editorial_posts ep join public.profiles p on p.id = ep.author where p.username = 'kpopquizz'
  ) then
    raise exception 'kpopquizz-team-rollback: an editorial post is signed kpopquizz, nothing applied (retire it with active = false instead)';
  end if;

  delete from public.editorial_accounts e
  using public.profiles p
  where p.id = e.user_id and p.username = 'kpopquizz';

  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'kpopquizz-team-rollback: expected 1 deleted row, got %, nothing applied', v_n;
  end if;
end $$;

-- Verify (inside the transaction): expect 0 rows.
select e.display_name, e.beat, e.active
from public.editorial_accounts e join public.profiles p on p.id = e.user_id
where p.username = 'kpopquizz';

-- Expect 9 active Team accounts again (40 if o1 L02-K2 was applied).
select count(*) as active_team_accounts from public.editorial_accounts where active;

commit;
