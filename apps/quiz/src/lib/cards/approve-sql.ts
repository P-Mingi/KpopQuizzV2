// Bunnyverse Cards lot 6: the text of docs/pending-migrations/cards/116c-approve-personality-rights.sql and its rollback, built from
// docs/design/cards/data/lot6/photos.json by scripts/cards/gen-approve-sql.mts. Pure: no file, no network, no database. OPTIONAL: the
// owner decides whether to apply it (integrator, 2026-11-16). approve-sql.test.ts runs both files on PGlite after 116.
//
// It approves the photos that 116 added as pending for ONE reason only, Commons' personality rights warning, and nothing else. A strict
// guard: exactly the expected number of photos qualify and no pack was ever opened, or it refuses with nothing changed.
import type { HarvestPhotosFile } from './harvest-checks';
import { HELD_NOTE } from './harvest-sql';

/** The review reason of verify-harvest.mts for a file with Commons' {{Personality rights}} warning. */
export const PR_ONLY = 'Commons shows a personality rights warning on the file';
/** What 116c appends to the note of a photo it approves (the rollback takes it off). No quote. */
export const MARK116C = ' (approved with 116c-approve-personality-rights.sql)';

/** The pages of the photos pending for the personality rights warning alone (an unlocked subject; 116 adds them as pending). */
export function personalityOnlyPages(file: HarvestPhotosFile): string[] {
  return file.subjects.filter((s) => !s.locked)
    .flatMap((s) => s.photos.filter((p) => p.status === 'pending' && p.review.length === 1 && p.review[0] === PR_ONLY).map((p) => p.page));
}

const lit = (s: string): string => `'${s.replace(/'/g, "''").replace(/\u2013/g, "' || chr(8211) || '").replace(/\u2014/g, "' || chr(8212) || '")}'`;
const item = (s: string): string => (/[\u2013\u2014]/.test(s) ? `(${lit(s)})` : lit(s));

export function buildApprove(pages: string[], checked: string): { sql: string; rollback: string } {
  if (new Set(pages).size !== pages.length) throw new Error('116c: a page is listed twice');
  const n = pages.length;
  const list = pages.length ? pages.map(item).join(',\n    ') : '';
  const plain = `To review: ${PR_ONLY}`;
  const held = `${HELD_NOTE}; ${PR_ONLY}`;

  const sql = `-- 116c-approve-personality-rights.sql (Bunnyverse Cards lot 6, ${checked}; OPTIONAL: the owner decides whether to apply it)
--
-- What:   approves, in ONE DO block, the ${n} photos that 116-photos-harvest.sql added as pending for ONE reason only: Commons shows a
--         personality rights warning on the file (the person photographed has rights on their image, apart from the copyright; the
--         licence and the author were checked like every other photo). Their status goes from pending to approved and their note ends
--         with "${MARK116C.trim()}". Nothing else changes: no other photo, no entity, no catalog row.
-- Guard:  refuses, with nothing changed, unless EXACTLY ${n} photos qualify: one of the ${n} pages below, status pending, added by 116 (its
--         log), and its note the personality rights reason alone, or that reason after 116's "no birth date yet" note once the person's
--         public.idols row has a birth date (apply 116b first). Refuses too when a pack was ever opened, when a live photo already holds
--         one of their slots, and between 23:50 and 00:30 UTC. A second run is refused (nothing qualifies any more).
-- Why:    integrator, lot 6: ${n} photos wait for the owner only because of that warning; approved, they open the editions of the
--         subjects they bring to two live photos or more (docs/o1/reports/CARDS/LOT6-HARVEST.md gives the count).
-- Rows:   ${n} cards_photos rows (status and note). The real count is the notice "116c: N photos approved" (Messages tab).
-- Needs:  116-photos-harvest.sql, then 116b (the dates file, from the owner's private folder). Apply after a backup, then
--         "Reconstruire le catalogue" (the approved photos give cards only after the rebuild).
-- Verify: select count(*) from public.cards_photos where status = 'approved' and right(review_note, ${MARK116C.length}) = ${lit(MARK116C)};   expect ${n}
-- Verify: select count(*) from public.cards_photos where status = 'pending' and review_note = ${lit(plain)};   expect 0
-- Verify: select count(*) from public.cards_packs;   expect 0
-- Refuses: between 23:50 and 00:30 UTC; before 116; when a pack was opened; unless exactly ${n} photos qualify; when a live photo holds one of their slots.
-- Undo:   116c-approve-personality-rights.rollback.sql (puts them back to pending; refused once a pack was opened).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor).

do $c116c$
declare
  v_pages constant text[] := array[
    ${list}]::text[];
  v_utc time := (now() at time zone 'UTC')::time;
  v_ids bigint[];
  v_n integer;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '116c: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_harvest_log') is null then
    raise exception '116c: apply 116-photos-harvest.sql first, nothing changed';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '116c: a pack was opened, the catalog can only grow at its end now: nothing changed';
  end if;

  select coalesce(array_agg(p.id order by p.id), '{}'), count(distinct p.source_page) into v_ids, v_n
    from public.cards_photos p
    join public.cards_harvest_log l on l.kind = 'photo' and l.ref = p.id::text
    join public.cards_entities e on e.id = p.entity_id
   where p.source_page = any (v_pages) and p.status = 'pending'
     and (p.review_note = ${lit(plain)}
          or (p.review_note = ${lit(held)}
              and exists (select 1 from public.idols i where e.qid is not null and i.wikidata_qid = e.qid and i.birth_date is not null)));
  if cardinality(v_ids) <> ${n} or v_n <> ${n} then
    raise exception '116c: % photos qualify (% pages), the file expects exactly ${n}: nothing changed', cardinality(v_ids), v_n;
  end if;
  if exists (select 1 from public.cards_photos p join public.cards_photos q on q.entity_id = p.entity_id and q.slot = p.slot and q.id <> p.id
              where p.id = any (v_ids) and q.status in ('auto', 'approved')) then
    raise exception '116c: a live photo already holds the slot of one of them: nothing changed';
  end if;

  update public.cards_photos set status = 'approved', review_note = review_note || ${lit(MARK116C)} where id = any (v_ids);
  get diagnostics v_n = row_count;
  raise notice '116c: % photos approved (personality rights warning only); now press "Reconstruire le catalogue"', v_n;
end $c116c$;
`;

  const rollback = `-- 116c-approve-personality-rights.rollback.sql (undo of 116c-approve-personality-rights.sql)
--
-- What:   puts the photos 116c approved (their note ends with "${MARK116C.trim()}") back to pending, with their note as before.
--         Then press "Reconstruire le catalogue": until then the catalog still holds their cards.
-- Refuses: when a pack was opened (the catalog numbers cannot change any more).
-- Verify: select count(*) from public.cards_photos where right(review_note, ${MARK116C.length}) = ${lit(MARK116C)};   expect 0
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c116cr$
declare
  v_n integer;
begin
  perform set_config('lock_timeout', '5s', true);
  if exists (select 1 from public.cards_packs) then
    raise exception '116c.rollback: a pack was opened, the catalog numbers cannot change: nothing changed';
  end if;
  update public.cards_photos
     set status = 'pending', review_note = left(review_note, length(review_note) - ${MARK116C.length})
   where status = 'approved' and right(review_note, ${MARK116C.length}) = ${lit(MARK116C)};
  get diagnostics v_n = row_count;
  raise notice '116c.rollback: % photos back to pending; now press "Reconstruire le catalogue"', v_n;
end $c116cr$;
`;
  return { sql, rollback };
}
