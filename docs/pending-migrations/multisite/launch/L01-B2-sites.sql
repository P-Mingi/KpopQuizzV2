-- launch/L01-B2-sites.sql (run O1, lane B2; manifest.md row 2; BACKLOG 4.1 row 1; schema.sql "@file L01-B2-sites")
--
-- What:   inserts the anime and hub rows of public.sites, status 'building' (L12, lane L1, sets 'live' on launch day).
-- Why:    production phase launch, the first launch file (Verrou 0 keeps every anime and hub row out of production
--         until launch day). On the dev branches it runs right after 001, so anime content rows can load once 002a
--         is on the branch. Values mirror the registry (registry.md, lib/site/registry.ts).
-- Rows:   2 rows inserted into public.sites (anime, hub). No other table is touched.
-- Verify: select id, domain, brand, kind, status, sort from public.sites order by sort;
--           expect 3 rows: kpop | kpopquiz.org | KpopQuiz | world | live | 1
--                          anime | otakuquiz.org | OtakuQuiz | world | building | 2
--                          hub | fanquiz.org | FanQuiz | hub | building | 3
-- Undo:   launch/L01-B2-sites.rollback.sql (refused while any row of another table references anime or hub).
-- Needs:  001-sites.sql.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.sites') is null then
    raise exception 'L01-B2-sites: public.sites is missing; apply 001-sites.sql first';
  end if;
end $$;

insert into public.sites (id, domain, brand, kind, status, sort) values
  ('anime', 'otakuquiz.org', 'OtakuQuiz', 'world', 'building', 2),
  ('hub',   'fanquiz.org',   'FanQuiz',   'hub',   'building', 3)
on conflict (id) do nothing;

-- Self-check: both rows read as the registry says (status may already be 'live' when L12 ran before a rerun).
do $$
begin
  if (select count(*) from public.sites
       where (id, domain, brand, kind, sort) in (('anime', 'otakuquiz.org', 'OtakuQuiz', 'world', 2::smallint),
                                                 ('hub', 'fanquiz.org', 'FanQuiz', 'hub', 3::smallint))) <> 2 then
    raise exception 'L01-B2-sites: the anime or hub row differs from the registry';
  end if;
end $$;
