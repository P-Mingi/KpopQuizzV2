// Run O1 (owner rule, 2026-11-09): nothing waits for a date or a day change. A launch file that removes a scheduled answer redraws it
// itself, in its one DO block: the days to come that hold an entity which is no longer a valid target get another one, drawn
// deterministically; today and every served date stay as they are; the whole bank of the game is saved first, so the rollback puts the
// exact calendar and pool_hash back. One source for every file that needs it (L21, L22, lot 05 next).
//
// rescheduleSetup()            the statements (table, two functions, privileges) to put at the top of the file's DO block body;
// rescheduleCall(file, games)  the calls after the data changed and dle_refresh_entities ran;
// rescheduleUndoCall(file, games)  the calls of a rollback, after its own data changes and refresh.
//
// The function bodies use their own dollar tag ($rs$) and never the file's tag. A body line never starts with "do $", "set " or
// "end $...$;" (single-do-block.mjs reads those at the start of a line), and `set search_path` stays on the language line.

import { q } from '../a2/corrections/engine.mjs';

export function rescheduleSetup() {
  return [
    `-- Redraw of the scheduled answers a file removes (owner rule 2026-11-09: no waiting for a date). dle_reschedule saves the whole bank of the game and its pool_hash`,
    `-- (dle_schedule_backup, first snapshot kept), then gives every coming day (tomorrow to today + 364; never today, never a date already served) whose entity is no longer a`,
    `-- valid target (can_be_target, in_pool, not excluded) another valid target: the first by md5(game:bank_day:entity) that is scheduled neither in the 30 days after today nor`,
    `-- within 30 days of that date (state as it stands, picks already made included); else the first not scheduled in the 30 days after today; else any valid target.`,
    `-- dle_reschedule_undo puts the saved bank and pool_hash back (except today and the served dates) and deletes the saved rows. Both are locked away from the browser roles.`,
    `create table if not exists public.dle_schedule_backup (`,
    `  file text not null,`,
    `  game_id text not null references public.dle_games(id) on delete cascade,`,
    `  bank_day smallint not null check (bank_day between 1 and 365),`,
    `  entity_id text not null,`,
    `  pool_hash text,`,
    `  saved_at timestamptz not null default now(),`,
    `  primary key (file, game_id, bank_day)`,
    `);`,
    `alter table public.dle_schedule_backup enable row level security;`,
    `revoke all on table public.dle_schedule_backup from public, anon, authenticated;`,
    ``,
    `create or replace function public.dle_reschedule(p_file text, p_game text, p_now timestamptz default now()) returns integer`,
    `language plpgsql set search_path = public`,
    `as $rs$`,
    `declare`,
    `  g public.dle_games;`,
    `  v_today date := public.dle_utc_date(p_now);`,
    `  v_tb integer;`,
    `  v_d date;`,
    `  v_b integer;`,
    `  v_cur text;`,
    `  v_pick text;`,
    `  v_n integer := 0;`,
    `begin`,
    `  select * into g from public.dle_games where id = p_game;`,
    `  if not found then`,
    `    raise exception 'dle_unknown_game';`,
    `  end if;`,
    `  -- A game that is not live yet has no calendar to protect: its activation will draw from the pool as it is.`,
    `  if g.epoch is null or not exists (select 1 from public.dle_schedule where game_id = p_game) then`,
    `    return 0;`,
    `  end if;`,
    `  insert into public.dle_schedule_backup (file, game_id, bank_day, entity_id, pool_hash)`,
    `  select p_file, s.game_id, s.bank_day, s.entity_id, g.pool_hash from public.dle_schedule s where s.game_id = p_game`,
    `  on conflict (file, game_id, bank_day) do nothing;`,
    `  v_tb := public.dle_bank_day(g.epoch, v_today);`,
    `  for k in 1..364 loop`,
    `    v_d := v_today + k;`,
    `    v_b := public.dle_bank_day(g.epoch, v_d);`,
    `    if v_b = v_tb or exists (select 1 from public.dle_daily_stats d where d.game_id = p_game and d.play_date = v_d) then`,
    `      continue;`,
    `    end if;`,
    `    select s.entity_id into v_cur from public.dle_schedule s where s.game_id = p_game and s.bank_day = v_b;`,
    `    if not found then`,
    `      continue;`,
    `    end if;`,
    `    if exists (select 1 from public.dle_entities e where e.game_id = p_game and e.entity_id = v_cur and e.can_be_target and e.in_pool`,
    `      and not exists (select 1 from public.dle_curation c where c.game_id = p_game and c.entity_id = e.entity_id and c.excluded)) then`,
    `      continue;`,
    `    end if;`,
    `    v_pick := null;`,
    `    for lvl in 1..3 loop`,
    `      select e.entity_id into v_pick from public.dle_entities e`,
    `      where e.game_id = p_game and e.can_be_target and e.in_pool`,
    `        and not exists (select 1 from public.dle_curation c where c.game_id = p_game and c.entity_id = e.entity_id and c.excluded)`,
    `        and (lvl = 3 or not exists (select 1 from public.dle_schedule s where s.game_id = p_game and s.entity_id = e.entity_id`,
    `          and s.bank_day in (select public.dle_bank_day(g.epoch, v_today + j) from generate_series(1, 30) as j)))`,
    `        and (lvl >= 2 or not exists (select 1 from public.dle_schedule s where s.game_id = p_game and s.entity_id = e.entity_id`,
    `          and s.bank_day in (select public.dle_bank_day(g.epoch, v_d + j) from generate_series(-30, 30) as j)))`,
    `      order by md5(p_game || ':' || v_b || ':' || e.entity_id), e.entity_id limit 1;`,
    `      exit when v_pick is not null;`,
    `    end loop;`,
    `    if v_pick is null then`,
    `      raise exception 'dle_reschedule: no valid target for %', p_game;`,
    `    end if;`,
    `    update public.dle_schedule set entity_id = v_pick, drawn_at = p_now where game_id = p_game and bank_day = v_b;`,
    `    v_n := v_n + 1;`,
    `  end loop;`,
    `  return v_n;`,
    `end;`,
    `$rs$;`,
    ``,
    `create or replace function public.dle_reschedule_undo(p_file text, p_game text, p_now timestamptz default now()) returns integer`,
    `language plpgsql set search_path = public`,
    `as $rs$`,
    `declare`,
    `  g public.dle_games;`,
    `  v_tb integer;`,
    `  v_hash text;`,
    `  v_n integer;`,
    `begin`,
    `  select * into g from public.dle_games where id = p_game;`,
    `  if not found then`,
    `    raise exception 'dle_unknown_game';`,
    `  end if;`,
    `  select b.pool_hash into v_hash from public.dle_schedule_backup b where b.file = p_file and b.game_id = p_game limit 1;`,
    `  if not found then`,
    `    return 0;`,
    `  end if;`,
    `  v_tb := public.dle_bank_day(g.epoch, public.dle_utc_date(p_now));`,
    `  update public.dle_schedule s set entity_id = b.entity_id, drawn_at = p_now`,
    `  from public.dle_schedule_backup b`,
    `  where b.file = p_file and b.game_id = p_game and s.game_id = p_game and s.bank_day = b.bank_day and s.entity_id <> b.entity_id`,
    `    and s.bank_day <> v_tb`,
    `    and not exists (select 1 from public.dle_daily_stats d where d.game_id = p_game and d.play_date >= public.dle_utc_date(p_now)`,
    `      and public.dle_bank_day(g.epoch, d.play_date) = s.bank_day);`,
    `  get diagnostics v_n = row_count;`,
    `  update public.dle_games set pool_hash = v_hash where id = p_game;`,
    `  delete from public.dle_schedule_backup where file = p_file and game_id = p_game;`,
    `  return v_n;`,
    `end;`,
    `$rs$;`,
    ``,
    `revoke execute on function public.dle_reschedule(text, text, timestamptz), public.dle_reschedule_undo(text, text, timestamptz) from public, anon, authenticated;`,
  ].join('\n');
}

const calls = (fn, file, games) => games.map((g) => `  perform public.${fn}(${q(file)}, ${q(g)});`);

/** After the data changes and the refresh of each game: save and redraw. */
export function rescheduleCall(file, games) {
  return [`do $x$ begin`, ...calls('dle_reschedule', file, games), `end $x$;`].join('\n');
}

/** In a rollback, after its data changes and the refresh of each game: put the saved calendar back. */
export function rescheduleUndoCall(file, games) {
  return [`do $x$ begin`, ...calls('dle_reschedule_undo', file, games), `end $x$;`].join('\n');
}
