-- 021b-k1-idol-activate.sql (lot K1, step 2: ONLY after the owner's review of docs/strategy/o1/dle/K1-RELECTURE.md)
--
-- What:   activates exactly the idols the owner lists below, as (id, 'QID') pairs copied from the rows marked "oui" of
--         K1-RELECTURE.md: active true, needs_review false, review_reason null (what the admin "confirm" action does).
--         The whole file is refused, with nothing changed, when:
--         - the list is empty (the placeholder is all there is);
--         - a listed id does not exist, carries another QID, is detached, or is an inactive row that is not waiting for review;
--         - a listed idol is under 18 or has no birth date (a minor is never active, whatever the review says).
--         A listed idol that is already active and reviewed is left as it is (a second run changes nothing).
--         A notice names every listed idol whose QID is already on another active row (the same person in two groups).
-- Why:    lot K1 (owner brief of 2026-10-30): the 86 "a relire" idols wait for the owner's review; the reviewed adults join the
--         site and the pool of Kpopdle Idol. Activating an idol makes its row readable by everyone (policy idols_public_read)
--         and puts it on the public group and member pages.
-- Rows:   one update per listed idol; nothing else.
-- Needs:  021a-k1-idol-facts.sql (the review list shows its values; this file does not read the new columns) and the owner's list.
-- Verify: select id, active, needs_review from public.idols where id in (<the listed ids>);   expect t, f on every row
--         select count(*) from public.idols where active and birth_date > (current_date - interval '18 years')::date;   expect 0
-- Undo:   021b-k1-idol-activate.rollback.sql with the same list.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

drop table if exists pg_temp.k1_activate;
create temp table k1_activate (id integer primary key, qid text not null);

insert into k1_activate (id, qid)
select l.id, l.qid from (values
  (null::integer, null::text)   -- keep this first line: it only gives the types and is ignored
  -- OWNER: add one line per idol marked "oui" in K1-RELECTURE.md, each line starting with a comma, for example:
  -- , (20, 'Q61100680')
) as l(id, qid)
where l.id is not null;

-- From here the file reports what it refuses or does.
set client_min_messages = notice;

do $$
declare
  bad text;
begin
  if not exists (select 1 from k1_activate) then
    raise exception '021b-k1-idol-activate: the id list is empty. Fill it from K1-RELECTURE.md (rows marked oui) and run again';
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k1_activate a where not exists (select 1 from public.idols i where i.id = a.id);
  if bad is not null then
    raise exception '021b-k1-idol-activate refused: unknown idol id(s) %', bad;
  end if;
  select string_agg(format('%s (list %s, row %s)', a.id, a.qid, coalesce(i.wikidata_qid, 'none')), ', ' order by a.id) into bad
  from k1_activate a join public.idols i on i.id = a.id where i.wikidata_qid is distinct from a.qid;
  if bad is not null then
    raise exception '021b-k1-idol-activate refused: the QID differs for %', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k1_activate a join public.idols i on i.id = a.id where i.detached_at is not null;
  if bad is not null then
    raise exception '021b-k1-idol-activate refused: detached idol(s) %', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k1_activate a join public.idols i on i.id = a.id where not i.active and not i.needs_review;
  if bad is not null then
    raise exception '021b-k1-idol-activate refused: idol(s) % are inactive and not waiting for review (switched off on purpose, not part of K1)', bad;
  end if;
  select string_agg(format('%s %s', a.id, i.name), ', ' order by a.id) into bad
  from k1_activate a join public.idols i on i.id = a.id
  where i.birth_date is null or i.birth_date > (current_date - interval '18 years')::date;
  if bad is not null then
    raise exception '021b-k1-idol-activate refused: under 18 or without a birth date: % (a minor is never active; remove the line)', bad;
  end if;
  select string_agg(format('%s %s (same QID as active row %s)', a.id, i.name, o.id), ', ' order by a.id) into bad
  from k1_activate a join public.idols i on i.id = a.id
  join public.idols o on o.wikidata_qid = i.wikidata_qid and o.id <> i.id and o.active;
  if bad is not null then
    raise notice '021b-k1-idol-activate: listed idol(s) already active on another row: %', bad;
  end if;
end $$;

update public.idols i
set active = true, needs_review = false, review_reason = null, updated_at = now()
from k1_activate a
where i.id = a.id and i.wikidata_qid = a.qid and (not i.active or i.needs_review);

-- Self-check: every listed idol is active and reviewed, and no idol under 18 is active anywhere.
do $$
declare
  n bigint;
begin
  select count(*) into n from k1_activate a join public.idols i on i.id = a.id where not (i.active and not i.needs_review);
  if n > 0 then
    raise exception '021b-k1-idol-activate: % listed idol(s) are not active after the update', n;
  end if;
  select count(*) into n from public.idols where active and birth_date > (current_date - interval '18 years')::date;
  if n > 0 then
    raise exception '021b-k1-idol-activate: % active idol(s) are under 18', n;
  end if;
  select count(*) into n from k1_activate a join public.idols i on i.id = a.id where i.birth_date is null;
  if n > 0 then
    raise exception '021b-k1-idol-activate: % listed idol(s) have no birth date', n;
  end if;
  raise notice '021b-k1-idol-activate: % listed idol(s) are active', (select count(*) from k1_activate);
end $$;

drop table if exists pg_temp.k1_activate;

notify pgrst, 'reload schema';
