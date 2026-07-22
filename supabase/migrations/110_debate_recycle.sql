-- 110 - Daily Debate recycling.
--
-- The original ensure_daily_debate (mig 108) returned NULL once every question
-- had been used, which hid the debate card forever. Owner wants the bank to
-- loop: after all questions are used, start over from the first and run through
-- them again, until new questions are added.
--
-- Recycle rule = least-recently-used: prefer any unused question, otherwise pick
-- the one used longest ago. Tie-break by created_at (insertion / question-bank
-- order) so the cycle runs 1..N, then 1..N again. used_on < p_date guards
-- against re-picking a question already used earlier the same day.

create or replace function public.ensure_daily_debate(p_date date default current_date)
returns date language plpgsql security definer set search_path = public as $$
declare v_qid uuid;
begin
  if exists (select 1 from public.daily_debates where date = p_date) then return p_date; end if;

  select id into v_qid
  from public.debate_questions
  where used_on is null or used_on < p_date
  order by used_on asc nulls first, created_at asc
  limit 1;

  if v_qid is null then return null; end if;  -- bank truly empty: card hides

  update public.debate_questions set used_on = p_date where id = v_qid;
  insert into public.daily_debates (date, question_id) values (p_date, v_qid)
    on conflict (date) do nothing;
  return p_date;
end $$;
revoke execute on function public.ensure_daily_debate(date) from anon, authenticated;
