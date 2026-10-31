-- 021b-k1-idol-activate.rollback.sql (lot K1): undo of 021b-k1-idol-activate.sql.
--
-- What:   puts the listed idols back in the review queue: active false, needs_review true, review_reason = the text they had
--         before K1 ("Wikidata lists this member but not in our name-all roster; confirm before activating.").
--         Paste the SAME (id, 'QID') lines as in 021b-k1-idol-activate.sql. An empty list (021b's state for launch, owner's
--         decision of 2026-10-30) undoes nothing and passes, so the RUNBOOK's rollback of session G runs through it. Refused, with
--         nothing changed, when a listed id is unknown or carries another QID.
-- Why:    the rollback of the K1 activation. The idol leaves the public pages and, at the next pool refresh, Kpopdle Idol.
-- Rows:   one update per listed idol that is active; nothing else (the K1 columns and sources stay: 021a-k1-idol-gender-debut.rollback.sql).
-- Verify: select id, active, needs_review from public.idols where id in (<the listed ids>);   expect f, t on every row
-- Undo:   run 021b-k1-idol-activate.sql again with the same list.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

drop table if exists pg_temp.k1_deactivate;
create temp table k1_deactivate (id integer primary key, qid text not null);

insert into k1_deactivate (id, qid)
select l.id, l.qid from (values
  (null::integer, null::text)   -- keep this first line: it only gives the types and is ignored
  -- OWNER: paste here the same lines as in 021b-k1-idol-activate.sql, each starting with a comma, for example:
  -- , (20, 'Q61100680')
) as l(id, qid)
where l.id is not null;

-- From here the file reports what it refuses or does.
set client_min_messages = notice;

do $$
declare
  bad text;
begin
  if not exists (select 1 from k1_deactivate) then
    raise notice '021b-k1-idol-activate rollback: the id list is empty, nothing to undo (021b activates nobody before launch)';
  end if;
  select string_agg(format('%s (list %s, row %s)', a.id, a.qid, coalesce(i.wikidata_qid, 'none')), ', ' order by a.id) into bad
  from k1_deactivate a left join public.idols i on i.id = a.id where i.id is null or i.wikidata_qid is distinct from a.qid;
  if bad is not null then
    raise exception '021b-k1-idol-activate rollback refused: unknown id or other QID for %', bad;
  end if;
end $$;

update public.idols i
set active = false, needs_review = true,
  review_reason = 'Wikidata lists this member but not in our name-all roster; confirm before activating.', updated_at = now()
from k1_deactivate a
where i.id = a.id and i.wikidata_qid = a.qid and (i.active or not i.needs_review);

do $$
declare
  n bigint;
begin
  select count(*) into n from k1_deactivate a join public.idols i on i.id = a.id where i.active or not i.needs_review;
  if n > 0 then
    raise exception '021b-k1-idol-activate rollback: % listed idol(s) are still active', n;
  end if;
end $$;

drop table if exists pg_temp.k1_deactivate;

notify pgrst, 'reload schema';
