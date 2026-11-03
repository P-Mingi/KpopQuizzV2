-- prove-bank.sql (run O1, lot DRAW, CR-027): the proof of the bank in blocks on a local Postgres 18 (prove-bank.sh builds it and runs this file).
-- Everything below prints counts and ok or a list of failures; nothing is a real target.
-- Helpers of the proof: a synthetic game of n targets and k balance groups (no entity data: only the bank is under test).
create or replace function public.t_mk(p_id text, p_n int, p_keys int, p_norep int default 120, p_minpool int default 2) returns void language plpgsql as $$
declare v text := 'dle_src_' || replace(p_id, '-', '_');
begin
  execute format($f$create or replace view public.%I as
    select x::text as entity_id, 'Entity ' || x as name, array['entity' || x] as search,
      jsonb_build_object('n', jsonb_build_object('v', x)) as attrs, jsonb_build_object('initial', 'E') as hints,
      null::text as thumb_path, case when %s = 0 then null else 'k' || (x %% %s) end as balance_key, true as can_be_target
    from generate_series(1, %s) as x$f$, v, p_keys, greatest(p_keys,1), p_n);
  insert into public.dle_games (id, universe, entity_kind, source_view, no_repeat_days, min_pool, hint_keys, hint_after)
    values (p_id, 'kpop', 'idol', v, p_norep, p_minpool, '{initial}', '{5}')
    on conflict (id) do update set source_view = excluded.source_view, no_repeat_days = excluded.no_repeat_days, min_pool = excluded.min_pool, epoch = null, active = false, pool_hash = null;
  insert into public.dle_attributes values (p_id, 'n', 'number', 1, 2) on conflict do nothing;
  delete from public.dle_schedule where game_id = p_id;
end $$;

-- analysis: one row per game
create or replace function public.t_stats(p_game text) returns table(n int, maxc int, minc int, win int, mingap int, last_first int, first_repeat int, anchor_ok boolean, anchor int)
language plpgsql as $$
declare v_n int; a int;
begin
  select count(*) into v_n from public.dle_entities where game_id = p_game and can_be_target and in_pool;
  n := v_n;
  select max(c), min(c) into maxc, minc from (select count(s.entity_id) c from public.dle_entities e left join public.dle_schedule s on s.game_id = e.game_id and s.entity_id = e.entity_id where e.game_id = p_game and e.can_be_target and e.in_pool group by e.entity_id) t;
  win := public.dle_window(p_game);
  select min(g) into mingap from (
    select coalesce(lead(bank_day) over w, first_value(bank_day) over w + 365) - bank_day as g
    from public.dle_schedule where game_id = p_game window w as (partition by entity_id order by bank_day rows between unbounded preceding and unbounded following)) y;
  select max(f) into last_first from (select min(bank_day) f from public.dle_schedule where game_id = p_game group by entity_id) t;
  select min(sec) into first_repeat from (select (array_agg(bank_day order by bank_day))[2] sec from public.dle_schedule where game_id = p_game group by entity_id) t;
  anchor_ok := false; anchor := null;
  for a in 1..365 loop
    if not exists (select 1 from public.dle_schedule s where s.game_id = p_game group by s.entity_id, (((s.bank_day - a + 365) % 365) / least(v_n, 365)) having count(*) > 1) then
      anchor_ok := true; anchor := a; exit;
    end if;
  end loop;
  return next;
end $$;

-- check a freshly built bank (anchor = bank day 1): returns a text with the failures, or 'ok'
create or replace function public.t_check(p_game text) returns text language plpgsql as $$
declare s record; v_n int; v_bad int; out text := '';
begin
  select * into s from public.t_stats(p_game);
  v_n := s.n;
  if (select count(*) from public.dle_schedule where game_id = p_game) <> 365 then out := out || ' days'; end if;
  if s.maxc - s.minc > 1 then out := out || ' counts(' || s.minc || '-' || s.maxc || ')'; end if;
  if s.maxc <> (365 + v_n - 1) / v_n then out := out || ' maxc=' || s.maxc; end if;
  if s.mingap < s.win then out := out || ' gap ' || s.mingap || '<' || s.win; end if;
  select count(*) into v_bad from (select 1 from public.dle_schedule where game_id = p_game group by entity_id, (bank_day - 1) / least(v_n, 365) having count(*) > 1) x;
  if v_bad > 0 then out := out || ' blocks(' || v_bad || ')'; end if;
  return case when out = '' then 'ok' else trim(out) end;
end $$;

create or replace function public.t_sweep(p_from int, p_to int, p_step int, p_seed float8, p_norep int default 120, p_keys int default 27) returns table(n int, res text, ms int)
language plpgsql as $$
declare i int; t0 timestamptz; id text;
begin
  i := p_from;
  while i <= p_to loop
    id := 'sw' || i || '-' || (p_seed * 1000)::int;
    perform public.t_mk(id, i, p_keys, p_norep);
    t0 := clock_timestamp();
    begin
      perform public.dle_activate(id, '2026-11-01', p_seed);
      n := i; res := public.t_check(id); ms := (extract(epoch from clock_timestamp() - t0) * 1000)::int;
    exception when others then
      n := i; res := 'ERR ' || sqlerrm; ms := 0;
    end;
    return next;
    i := i + p_step;
  end loop;
end $$;

-- randomness of the blocks of a freshly built bank (anchor 1): mean |shift| of a target between block 1 and 2, and the share of pairs whose order flips (0 identical order, 0.5 independent shuffle)
create or replace function public.t_rand(p_game text) returns table(n int, mean_shift numeric, flips numeric, same_pos numeric)
language plpgsql as $$
declare v_n int;
begin
  select count(*) into v_n from public.dle_entities where game_id = p_game and can_be_target and in_pool;
  n := v_n;
  if v_n >= 365 or 365 / v_n < 2 then mean_shift := null; flips := null; same_pos := null; return next; return; end if;
  select round(avg(abs(b.bank_day - v_n - a.bank_day)), 1), round(avg((b.bank_day - v_n = a.bank_day)::int), 3) into mean_shift, same_pos
  from public.dle_schedule a join public.dle_schedule b on b.game_id = a.game_id and b.entity_id = a.entity_id and a.bank_day <= v_n and b.bank_day > v_n and b.bank_day <= 2 * v_n
  where a.game_id = p_game;
  select round(count(*)::numeric / (v_n::numeric * (v_n - 1) / 2), 3) into flips
  from (select a.bank_day pa, b.bank_day pb from public.dle_schedule a join public.dle_schedule b on b.game_id = a.game_id and b.entity_id = a.entity_id and a.bank_day <= v_n and b.bank_day > v_n and b.bank_day <= 2 * v_n where a.game_id = p_game) x
  join (select a.bank_day pa, b.bank_day pb from public.dle_schedule a join public.dle_schedule b on b.game_id = a.game_id and b.entity_id = a.entity_id and a.bank_day <= v_n and b.bank_day > v_n and b.bank_day <= 2 * v_n where a.game_id = p_game) y on x.pa < y.pa and x.pb > y.pb;
  return next;
end $$;

create or replace function public.t_close(p_game text) returns int language sql as $$
  select count(*)::int from public.dle_schedule a join public.dle_schedule b
    on a.game_id = b.game_id and a.bank_day < b.bank_day and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < 14
  join public.dle_entities ea on ea.game_id = a.game_id and ea.entity_id = a.entity_id
  join public.dle_entities eb on eb.game_id = b.game_id and eb.entity_id = b.entity_id
  where a.game_id = p_game and ea.balance_key = eb.balance_key
$$;

-- change the pool of an existing game to n targets, nothing else
create or replace function public.t_pool(p_id text, p_n int, p_keys int) returns void language plpgsql as $$
declare v text := 'dle_src_' || replace(p_id, '-', '_');
begin
  execute format($f$create or replace view public.%I as
    select x::text as entity_id, 'Entity ' || x as name, array['entity' || x] as search,
      jsonb_build_object('n', jsonb_build_object('v', x)) as attrs, jsonb_build_object('initial', 'E') as hints,
      null::text as thumb_path, case when %s = 0 then null else 'k' || (x %% %s) end as balance_key, true as can_be_target
    from generate_series(1, %s) as x$f$, v, p_keys, greatest(p_keys,1), p_n);
end $$;

-- A rebuild: a game of p_from targets, then its pool becomes p_to targets and the bank is rebuilt on today = epoch + 199 (bank day 200). Says ok
-- when the 8 kept days did not move, the gap holds, the counts differ by 1 + the kept targets that left the pool at most, there are 365 days and no
-- target twice in a block of the blocks that start on bank day 200.
create or replace function public.t_rebuild(p_from int, p_to int, p_seed float8, p_leave boolean default false) returns text language plpgsql as $$
declare v_id text := 'rb' || p_from || '-' || p_to || '-' || (p_seed*100)::int || p_leave::text; v_today date := '2026-11-01'::date + 199; kept text[]; after text[]; s record; v_bad int; v_anchor int; out text := ''; b0 int := 200; a int; v_n int; v_left int;
begin
  perform public.t_mk(v_id, p_from, 27, 120);
  perform public.dle_activate(v_id, '2026-11-01', 0.5);
  select array_agg(entity_id order by bank_day) into kept from public.dle_schedule where game_id = v_id and bank_day between 200 and 207;
  if p_leave then
    -- the pool shrinks: targets > p_to leave (kept days may hold some)
    null;
  end if;
  perform public.t_pool(v_id, p_to, 27);
  perform public.dle_refresh_entities(v_id);
  perform public.dle_build_bank(v_id, v_today, p_seed);
  select array_agg(entity_id order by bank_day) into after from public.dle_schedule where game_id = v_id and bank_day between 200 and 207;
  if kept is distinct from after then out := out || ' keptmoved'; end if;
  select count(*) into v_n from public.dle_entities where game_id = v_id and can_be_target and in_pool;
  select count(*) into v_left from unnest(kept) k where k::int > p_to;
  select * into s from public.t_stats(v_id);
  if s.mingap < s.win then out := out || ' gap ' || s.mingap || '<' || s.win; end if;
  if s.maxc - s.minc > 1 + v_left then out := out || ' counts ' || s.minc || '-' || s.maxc; end if;
  if (select count(*) from public.dle_schedule where game_id = v_id) <> 365 then out := out || ' days'; end if;
  -- blocks from today's bank day (anchor 200)
  select count(*) into v_bad from (select 1 from public.dle_schedule where game_id = v_id and entity_id::int <= p_to group by entity_id, (((bank_day - b0 + 365) % 365) / least(v_n, 365)) having count(*) > 1) x;
  if v_bad > 0 then out := out || ' blocks(' || v_bad || ')'; end if;
  return v_id || ' left=' || v_left || ' anchor200=' || s.anchor_ok::text || '/' || s.anchor || ' ' || case when out = '' then 'ok' else out end;
end $$;


\echo '== 1. the table: the sizes asked for, 5 seeds each (11 37 57 93 50), no_repeat_days 120, min_pool 30, 27 groups; g_dle_window is the gap the bank must hold'
create temp table tt(n int, seed int, maxc int, minc int, win int, mingap int, lastfirst int, firstrep int, chk text);
do $$ declare nn int; sd int; id text; s record; begin
  foreach nn in array array[30,40,48,70,73,100,112,113,178,185,200,365,366,400,750,1200] loop
    foreach sd in array array[11,37,57,93,50] loop
      id := 'tb' || nn || '-' || sd;
      perform public.t_mk(id, nn, 27, 120, 30);
      perform public.dle_activate(id, '2026-11-01', sd / 100.0);
      select * into s from public.t_stats(id);
      insert into tt values (nn, sd, s.maxc, s.minc, s.win, s.mingap, s.last_first, s.first_repeat, public.t_check(id));
    end loop;
  end loop;
end $$;
select n as targets, max(maxc) as max_days_a_target, min(minc) as min_days_a_target, max(win) as g_dle_window, min(mingap) as least_gap_seen,
  max(lastfirst) as last_first_day, min(firstrep) as first_repeat_day, count(*) filter (where chk <> 'ok') as failures from tt group by n order by n;

\echo '== 2. never a dead end, every size from the minimum up (2 to 420, then 450 to 1200 by 50), 3 seeds: builds, ok, slowest build in ms'
select count(*) as builds, count(*) filter (where res = 'ok') as ok, max(ms) as slowest_ms from (
  select * from public.t_sweep(2, 420, 1, 0.11) union all select * from public.t_sweep(450, 1200, 50, 0.11)
  union all select * from public.t_sweep(2, 420, 1, 0.57) union all select * from public.t_sweep(450, 1200, 50, 0.57)
  union all select * from public.t_sweep(2, 420, 1, 0.93) union all select * from public.t_sweep(450, 1200, 50, 0.93)) x;

\echo '== 3. other settings: no balance key, 3 groups, no_repeat_days 14, 364 and 5 (every row must be ok)'
select count(*) as builds, count(*) filter (where res = 'ok') as ok from (
  select * from public.t_sweep(2, 380, 9, 0.12, 120, 0) union all select * from public.t_sweep(2, 380, 9, 0.94, 120, 3)
  union all select * from public.t_sweep(2, 380, 11, 0.41, 14, 27) union all select * from public.t_sweep(2, 380, 11, 0.71, 364, 27)
  union all select * from public.t_sweep(2, 380, 13, 0.31, 5, 40) union all select * from public.t_sweep(30, 380, 7, 0.55, 120, 1)) x;

\echo '== 4. a rebuild with kept days (from -> to targets, left = kept targets that left the pool)'
select public.t_rebuild(112, 130, 0.11) union all select public.t_rebuild(112, 100, 0.37) union all select public.t_rebuild(112, 60, 0.57)
union all select public.t_rebuild(53, 74, 0.93) union all select public.t_rebuild(200, 230, 0.5) union all select public.t_rebuild(178, 170, 0.2)
union all select public.t_rebuild(73, 73, 0.3) union all select public.t_rebuild(40, 750, 0.4) union all select public.t_rebuild(30, 3, 0.6)
union all select public.t_rebuild(113, 113, 0.7) union all select public.t_rebuild(185, 150, 0.15) union all select public.t_rebuild(48, 60, 0.25)
union all select public.t_rebuild(365, 366, 0.35) union all select public.t_rebuild(366, 365, 0.45);

\echo '== 5. the blocks are not the same order every time (pairs that flip between block 1 and 2: 0 same order, 0.5 independent shuffles; same_pos: share of targets in the same place)'
do $$ declare nn int; begin
  foreach nn in array array[30,48,73,100,112,113,150,178] loop
    perform public.t_mk('rd' || nn, nn, 27, 120, 30);
    perform public.dle_activate('rd' || nn, '2026-11-01', 0.5);
  end loop;
end $$;
select r.* from (values ('rd30'), ('rd48'), ('rd73'), ('rd100'), ('rd112'), ('rd113'), ('rd150'), ('rd178')) g(id), lateral public.t_rand(g.id) r;

\echo '== 6. groups: pairs of one group within 14 days of the 365 (116 targets, 27 groups), 20 seeds: least, mean, most'
create temp table cl(close int);
do $$ declare i int; begin
  for i in 1..20 loop
    perform public.t_mk('gb' || i, 116, 27, 120, 30);
    perform public.dle_activate('gb' || i, '2026-11-01', i / 21.0);
    insert into cl values (public.t_close('gb' || i));
  end loop;
end $$;
select min(close) as least, round(avg(close), 1) as mean, max(close) as most from cl;
