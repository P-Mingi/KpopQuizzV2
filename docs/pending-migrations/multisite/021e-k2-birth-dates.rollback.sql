-- 021e-k2-birth-dates.rollback.sql: undoes 021e-k2-birth-dates.sql. Empties the four birth dates again, only where they still hold
-- the value 021e wrote, and deletes the birth_date source rows 021e added (fetched_at 2026-11-07 12:00 UTC). V-K2 check 5 then
-- counts these four again. One transaction. It prints 0 | 0 (idols still dated, source rows left).

begin;
set local lock_timeout = '5s';

create temp table k2e (id bigint primary key, qid text not null, birth_date date not null) on commit drop;
insert into k2e (id, qid, birth_date) values
  (39,  'Q21824968', date '1995-08-08'),
  (46,  'Q21824862', date '1997-02-18'),
  (48,  'Q21824868', date '1997-11-07'),
  (175, 'Q10775090', date '1994-01-14');

delete from public.entity_sources e
using k2e k
where e.entity_type = 'idol' and e.entity_id = k.id::text and e.field = 'birth_date'
  and e.source in ('wikidata', 'musicbrainz') and e.fetched_at = timestamptz '2026-11-07 12:00:00+00';

update public.idols i
set birth_date = null
from k2e k
where i.id = k.id and i.wikidata_qid = k.qid and i.birth_date = k.birth_date;

select
  (select count(*) from public.idols i join k2e k on k.id = i.id and i.birth_date is not null) as idols_dated,
  (select count(*) from public.entity_sources e join k2e k on e.entity_type = 'idol' and e.entity_id = k.id::text
     and e.field = 'birth_date' and e.fetched_at = timestamptz '2026-11-07 12:00:00+00') as source_rows;

commit;
