-- V-L14 (run O1, session.sh J5): after L14-O1-dle-on.sql, the activation of Kpopdle Idol and Otakudle.
-- Check 4 is the gap G (dle_window) between two days of one target, around the cycle; check 8 is the blocks of CR-027 (019 section 6).
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail, a target or a row of a person.
begin transaction read only;
select case when c.ok is true then 'ok' else 'KO' end, g.id || ' : ' || c.what, coalesce(c.got, '-')
from (values ('kpopdle-idol', 'dle_src_kpop_idol'), ('otakudle', 'dle_src_anime_character'), ('otakudle-one-piece', 'dle_src_otakudle_one_piece'), ('otakudle-dragon-ball', 'dle_src_otakudle_dragon_ball')) as g(id, src)
-- The first day from which the bank reads as blocks of N days (N = the targets, 365 at most), each target once per block (CR-027): the first build
-- starts the blocks on bank day 1, a rebuild on the bank day of that morning. None found: null.
cross join lateral (
  select min(a.d) as start from generate_series(1, 365) as a(d)
  where not exists (
    select 1 from public.dle_schedule s where s.game_id = g.id
    group by s.entity_id, ((s.bank_day - a.d + 365) % 365) / greatest(1, least(365, (select count(*) from public.dle_entities e where e.game_id = g.id and e.can_be_target and e.in_pool)))
    having count(*) > 1)
) as bl
cross join lateral (values
  (1, 'allumé, avec sa date de départ, jamais dans le futur', (select active and epoch is not null and epoch <= public.dle_utc_date(now()) from public.dle_games where id = g.id), null),
  (2, 'la banque tient 365 jours', (select count(*) = 365 and count(distinct bank_day) = 365 from public.dle_schedule where game_id = g.id), (select count(*)::text from public.dle_schedule where game_id = g.id)),
  (3, 'chaque jour de la banque vise une cible du pool', (select count(*) = 0 from public.dle_schedule s left join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id where s.game_id = g.id and (e.entity_id is null or not e.can_be_target or not e.in_pool)), null),
  (4, 'jamais deux fois la même cible dans la fenêtre, cycle compris', (select count(*) = 0 from public.dle_schedule a join public.dle_schedule b on a.game_id = b.game_id and a.entity_id = b.entity_id and a.bank_day < b.bank_day where a.game_id = g.id and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < public.dle_window(g.id)), (select public.dle_window(g.id)::text)),
  (5, 'la banque correspond au pool du jour', (select pool_hash = public.dle_pool_hash(g.id) from public.dle_games where id = g.id), null),
  (6, 'cibles possibles, au moins le minimum du jeu', (select count(*) >= (select min_pool from public.dle_games where id = g.id) from public.dle_entities where game_id = g.id and can_be_target and in_pool), (select count(*)::text from public.dle_entities where game_id = g.id and can_be_target and in_pool)),
  (7, 'la vue reste fermée au navigateur, dle_pool ouvert', (select not has_table_privilege('anon', g.src, 'select') and has_function_privilege('anon', 'public.dle_pool(text)', 'execute')), null),
  (8, 'chaque cible une seule fois par bloc de N jours, avant qu''aucune ne revienne (jour de départ des blocs)', bl.start is not null, bl.start::text)
) as c(n, what, ok, got)
-- The first two games always; a game of one series (CR-023) only once L14 switched it on (under its minimum it stays off: V-L15 says so).
where g.id in ('kpopdle-idol', 'otakudle') or exists (select 1 from public.dle_games a where a.id = g.id and a.active)
order by g.id, c.n;
rollback;
