-- V-DLE-KEPT (run O1, session.sh J5; each morning, VERIFY "V-DLE", RUNBOOK L6): a target that left the pool on a kept day of the bank.
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, a target or a row of a person.
-- A rebuild keeps today and the 7 days after it. A kept day whose target is no longer in the pool cannot be won: dle_guess refuses that name, players can only give up.
-- CR-027: such a day is the only thing that breaks the blocks of the bank (the target whose place it takes is missing from that block, the counts then differ by more than 1 by the number found here); the gap between two days of a target holds.
begin transaction read only;
select case when count(k.d) = 0 then 'ok' else 'KO' end, g.id || ' : jours gardés dont la cible a quitté le pool (0 attendu)', count(k.d)::text
from public.dle_games g
left join lateral (
  select d.d
  from generate_series(public.dle_utc_date(now()), public.dle_utc_date(now()) + 7, interval '1 day') as d(d)
  join public.dle_schedule s on s.game_id = g.id and s.bank_day = public.dle_bank_day(g.epoch, d.d::date)
  left join public.dle_daily_stats st on st.game_id = g.id and st.play_date = d.d::date
  join public.dle_entities e on e.game_id = g.id and e.entity_id = coalesce(st.entity_id, s.entity_id)
  where not e.in_pool
) k on true
where g.active
group by g.id
order by g.id;
rollback;
