-- 112 - "Stan since" year (Workstream F2c, C1).
--
-- The year a fan got into K-pop, shown on the passport meta line and the Fan
-- Card. Optional (null = unset). Bounded: 1992 is K-pop's conventional birth
-- year (Seo Taiji and Boys), and a future year is impossible.
alter table public.profiles
  add column if not exists stan_since smallint
  check (stan_since is null or (stan_since >= 1992 and stan_since <= extract(year from now())));
