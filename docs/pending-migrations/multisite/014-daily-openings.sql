-- 014-daily-openings.sql (run O1, lane K1 (the brief of lot (e) part 1 builds the SQL of O6's row); manifest.md row 18; BACKLOG 4.1 row 28; schema.sql section "@file 014-daily-openings")
--
-- What:   creates public.daily_openings (one row per site and date: the opening of the day, keyed (site_id, date), theme_id
--         references series_themes), with RLS and one public read policy, and ensure_daily_opening(p_date date, p_site text)
--         (SECURITY DEFINER, search_path = public, service_role only), the function the anime cron calls.
-- Why:    OtakuQuiz shows "the opening of the day" (blind test, openings page); the cron files one theme a day, once.
-- Rows:   1 new table, 1 new function; no row is inserted (the cron writes them after launch L09 loads the themes).
-- How:    ensure_daily_opening is idempotent per (p_site, p_date): a row already there is returned as it is. Otherwise it files
--         one theme and returns its id, or returns null when no theme qualifies or the site is unknown. A theme qualifies when
--         it is published, deezer_playable is true, its series is published and its group belongs to p_site.
-- Decisions where the contract is silent (the K4 rotation rules are not written in C/**): among the qualifying themes the
--         pick is, in order, (1) a series other than the one filed the day before, when one qualifies, (2) the theme never
--         filed for this site, then the one filed longest ago, (3) a fixed order by md5(date || theme id), then the theme id,
--         so the same state always gives the same pick. A concurrent second call inserts nothing (ON CONFLICT DO NOTHING) and
--         returns the stored row. The table reads are public, as the contract says; the function is service role only.
-- Verify: select to_regclass('public.daily_openings'), to_regprocedure('public.ensure_daily_opening(date, text)');   expect both set
--         select polname, polcmd from pg_policy where polrelid = 'public.daily_openings'::regclass;                expect daily_openings_select_public | r
--         select proacl from pg_proc where proname = 'ensure_daily_opening';                                       expect {postgres=X/postgres,service_role=X/postgres}
--         select public.ensure_daily_opening(current_date, 'anime');                                               expect null until a theme qualifies (needs service_role)
-- Undo:   014-daily-openings.rollback.sql (refused while a daily opening exists).
-- Needs:  011 (series_themes, series), 001 (sites).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.series_themes') is null or to_regclass('public.series') is null then
    raise exception '014-daily-openings: public.series_themes or public.series is missing (apply 011 first)';
  end if;
end $$;

create table if not exists public.daily_openings (
  site_id text not null constraint daily_openings_site_id_fkey references public.sites(id),
  date date not null,
  theme_id integer not null constraint daily_openings_theme_id_fkey references public.series_themes(id),
  created_at timestamptz not null default now(),
  constraint daily_openings_pkey primary key (site_id, date)
);
alter table public.daily_openings enable row level security;
-- policy: everyone reads the opening of the day.
do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.daily_openings'::regclass and polname = 'daily_openings_select_public') then
    create policy daily_openings_select_public on public.daily_openings for select using (true);
  end if;
end $$;

-- ensure_daily_opening: idempotent per (p_site, p_date); picks a published, playable theme by the rotation described above;
-- returns the theme id or null.
CREATE OR REPLACE FUNCTION public.ensure_daily_opening(p_date date, p_site text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_theme integer;
  v_prev_series integer;
BEGIN
  IF p_date IS NULL OR p_site IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT d.theme_id INTO v_theme FROM public.daily_openings d WHERE d.site_id = p_site AND d.date = p_date;
  IF v_theme IS NOT NULL THEN
    RETURN v_theme;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sites WHERE id = p_site) THEN
    RETURN NULL;
  END IF;

  -- the series filed the day before
  SELECT t.group_id INTO v_prev_series
  FROM public.daily_openings d JOIN public.series_themes t ON t.id = d.theme_id
  WHERE d.site_id = p_site AND d.date = p_date - 1;

  SELECT t.id INTO v_theme
  FROM public.series_themes t
  JOIN public.series s ON s.group_id = t.group_id
  JOIN public.groups g ON g.id = s.group_id
  WHERE t.status = 'published' AND t.deezer_playable IS TRUE AND s.published AND g.site_id = p_site
  ORDER BY (t.group_id IS NOT DISTINCT FROM v_prev_series),
           (SELECT max(d2.date) FROM public.daily_openings d2 WHERE d2.site_id = p_site AND d2.theme_id = t.id) ASC NULLS FIRST,
           md5(p_date::text || ':' || t.id::text),
           t.id
  LIMIT 1;
  IF v_theme IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.daily_openings (site_id, date, theme_id) VALUES (p_site, p_date, v_theme)
  ON CONFLICT (site_id, date) DO NOTHING;

  SELECT d.theme_id INTO v_theme FROM public.daily_openings d WHERE d.site_id = p_site AND d.date = p_date;
  RETURN v_theme;
END;
$function$;
revoke all on function public.ensure_daily_opening(date, text) from public, anon, authenticated;
grant execute on function public.ensure_daily_opening(date, text) to service_role;
