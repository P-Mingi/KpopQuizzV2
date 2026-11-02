-- V-L14 (run O1, session.sh J5): after L14-O1-dle-on.sql, the activation of Kpopdle Idol and Otakudle.
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail, a target or a row of a person.
begin transaction read only;
select case when c.ok is true then 'ok' else 'KO' end, g.id || ' : ' || c.what, coalesce(c.got, '-')
from (values ('kpopdle-idol', 'dle_src_kpop_idol'), ('otakudle', 'dle_src_anime_character'), ('otakudle-one-piece', 'dle_src_otakudle_one_piece'), ('otakudle-dragon-ball', 'dle_src_otakudle_dragon_ball')) as g(id, src)
cross join lateral (values
  (1, 'allumé, avec sa date de départ, jamais dans le futur', (select active and epoch is not null and epoch <= public.dle_utc_date(now()) from public.dle_games where id = g.id), null),
  (2, 'la banque tient 365 jours', (select count(*) = 365 and count(distinct bank_day) = 365 from public.dle_schedule where game_id = g.id), (select count(*)::text from public.dle_schedule where game_id = g.id)),
  (3, 'chaque jour de la banque vise une cible du pool', (select count(*) = 0 from public.dle_schedule s left join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id where s.game_id = g.id and (e.entity_id is null or not e.can_be_target or not e.in_pool)), null),
  (4, 'jamais deux fois la même cible dans la fenêtre, cycle compris', (select count(*) = 0 from public.dle_schedule a join public.dle_schedule b on a.game_id = b.game_id and a.entity_id = b.entity_id and a.bank_day < b.bank_day where a.game_id = g.id and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < public.dle_window(g.id)), (select public.dle_window(g.id)::text)),
  (5, 'la banque correspond au pool du jour', (select pool_hash = public.dle_pool_hash(g.id) from public.dle_games where id = g.id), null),
  (6, 'cibles possibles, au moins le minimum du jeu', (select count(*) >= (select min_pool from public.dle_games where id = g.id) from public.dle_entities where game_id = g.id and can_be_target and in_pool), (select count(*)::text from public.dle_entities where game_id = g.id and can_be_target and in_pool)),
  (7, 'la vue reste fermée au navigateur, dle_pool ouvert', (select not has_table_privilege('anon', g.src, 'select') and has_function_privilege('anon', 'public.dle_pool(text)', 'execute')), null)
) as c(n, what, ok, got)
-- The first two games always; a game of one series (CR-023) only once L14 switched it on (under its minimum it stays off: V-L15 says so).
where g.id in ('kpopdle-idol', 'otakudle') or exists (select 1 from public.dle_games a where a.id = g.id and a.active)
order by g.id, c.n;
rollback;
