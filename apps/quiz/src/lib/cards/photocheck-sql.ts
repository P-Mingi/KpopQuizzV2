// Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK (integrator brief 2026-11-17, and the owner's rule relayed by ORCH the same day: the best
// looking photo of a subject goes on its rarest edition, and a subject keeps fewer editions rather than a poor photo). The text of
// docs/pending-migrations/cards/119-photocheck.sql and its rollback, built by scripts/cards/gen-photocheck-sql.mts from the plan of the photo
// check (out/launch-prep, not in git). Pure: no file, no network, no database. photocheck-sql.test.ts runs both files on PGlite.
//
// One UNIT per subject: the photos it changes (rejected, approved, a new focal point, files to cut again), its numbered cards (each keeps its
// number; its photo changes, or it leaves the packs with no photo), its panoramas (they follow the photo of their edition) and its lock
// reasons (a dropped edition says "photo" or "size", as cards_build_catalog does). A unit is applied only when every row it reads is still
// the one of the export (status and focal point of its photos, photo and in_packs of its cards, photo of its panoramas, lock reasons of the
// subject); otherwise it is left alone with a notice. What a unit changed is kept in cards_photocheck_log (one row per subject, the rows
// before and the unit), so a second run changes nothing and the rollback gives the rows back.

export const PHOTOCHECK_DAY = '2026-11-17';

export type PcStatus = 'auto' | 'approved' | 'pending' | 'rejected' | 'removed';
export interface PcPhoto {
  id: number;
  old: { status: PcStatus; fx: number; fy: number; ffx: number | null; ffy: number | null };
  /** status: 'rejected' (REPLACE) or 'approved' (a pending photo chosen as a replacement); fx/fy: a RECROP; reset_files: same window, files to cut again. */
  new: { status?: 'rejected' | 'approved'; fx?: number; fy?: number; reset_files?: boolean };
  note?: string;
}
export interface PcCard { no: number; old: { photo: number | null; in_packs: boolean }; new: { photo: number | null } }
export interface PcPano { no: number; old: number | null; new: number | null }
export interface PcUnit {
  entity: string;
  photos: PcPhoto[];
  cards: PcCard[];
  panos: PcPano[];
  lock: { old: Record<string, string>; new: Record<string, string> } | null;
}
/** The numbers the Verify lines expect once every unit is applied (the generator computes them from the plan and the export). */
export interface PcExpect {
  units: number;
  catalog: number;
  dropped: number;
  inPacks: number;
  inPacksAfterPublish: number;
  nullPanos: number;
  toCut: number;
  statuses: Record<string, number>;
}
export interface PhotocheckData { checked_on: string; export: string; units: PcUnit[]; expect: PcExpect }
export interface PhotocheckSql { sql: string; rollback: string; units: number }

const RARITIES = new Set(['C', 'U', 'R', 'SR', 'UR', 'L']);
const LOCKS = new Set(['one', 'sameday', 'newg', 'hiatus', 'crop', 'photo', 'size']);
const STATUSES = new Set(['auto', 'approved', 'pending', 'rejected', 'removed']);

/** Checks the data and writes it as the jsonb literal of the file (en and em dashes escaped, never written). */
export function dataLiteral(data: PhotocheckData): string {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.checked_on)) || !Array.isArray(data.units)) {
    throw new Error('photocheck data: { checked_on: "YYYY-MM-DD", units: [...] } expected');
  }
  const int = (v: unknown, what: string, min = 1, max = Number.MAX_SAFE_INTEGER): number => {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Error(`photocheck data: ${what} must be an integer from ${min} to ${max}`);
    return v;
  };
  const focal = (v: unknown, what: string): number => int(v, what, 0, 100);
  const optFocal = (v: unknown, what: string): number | null => (v === null || v === undefined ? null : focal(v, what));
  const ids = new Set<number>();
  const cards = new Set<number>();
  const panos = new Set<number>();
  const entities = new Set<string>();
  const units = data.units.map((u, i) => {
    const at = `units[${i}]`;
    if (typeof u.entity !== 'string' || !/^(idol|group):[a-z0-9-]+$/.test(u.entity)) throw new Error(`photocheck data: ${at}.entity must be idol:<slug> or group:<slug>`);
    if (entities.has(u.entity)) throw new Error(`photocheck data: ${u.entity} is listed twice`);
    entities.add(u.entity);
    const rejected = new Set<number>();
    const approved = new Set<number>();
    const photos = (u.photos ?? []).map((p, j) => {
      const pa = `${at}.photos[${j}]`;
      const id = int(p.id, `${pa}.id`);
      if (ids.has(id)) throw new Error(`photocheck data: photo ${id} is listed twice`);
      ids.add(id);
      if (!STATUSES.has(p.old?.status)) throw new Error(`photocheck data: ${pa}.old.status is not a status`);
      const old = { status: p.old.status, fx: focal(p.old.fx, `${pa}.old.fx`), fy: focal(p.old.fy, `${pa}.old.fy`), ffx: optFocal(p.old.ffx, `${pa}.old.ffx`), ffy: optFocal(p.old.ffy, `${pa}.old.ffy`) };
      const n: PcPhoto['new'] = {};
      if (p.new.status !== undefined) {
        if (p.new.status === 'rejected') {
          if (old.status !== 'auto' && old.status !== 'approved') throw new Error(`photocheck data: ${pa}: only a live photo is rejected`);
          rejected.add(id);
        } else if (p.new.status === 'approved') {
          if (old.status !== 'pending') throw new Error(`photocheck data: ${pa}: only a pending photo is approved`);
          approved.add(id);
        } else throw new Error(`photocheck data: ${pa}.new.status must be rejected or approved`);
        n.status = p.new.status;
      }
      if (p.new.fx !== undefined || p.new.fy !== undefined) {
        n.fx = focal(p.new.fx, `${pa}.new.fx`);
        n.fy = focal(p.new.fy, `${pa}.new.fy`);
        if (n.fx === old.fx && n.fy === old.fy) throw new Error(`photocheck data: ${pa}: the new focal point is the old one`);
      }
      if (p.new.reset_files) {
        if (n.fx !== undefined || n.status === 'rejected') throw new Error(`photocheck data: ${pa}: reset_files goes with the same focal point of a kept photo`);
        n.reset_files = true;
      }
      if (Object.keys(n).length === 0) throw new Error(`photocheck data: ${pa} changes nothing`);
      if (p.note !== undefined && (typeof p.note !== 'string' || p.note.trim() === '' || p.note.length > 600)) throw new Error(`photocheck data: ${pa}.note must be a line`);
      return { id, old, new: n, ...(p.note ? { note: p.note } : {}) };
    });
    const cs = (u.cards ?? []).map((c, j) => {
      const ca = `${at}.cards[${j}]`;
      const no = int(c.no, `${ca}.no`);
      if (cards.has(no)) throw new Error(`photocheck data: card ${no} is listed twice`);
      cards.add(no);
      const oldPhoto = c.old.photo === null ? null : int(c.old.photo, `${ca}.old.photo`);
      const newPhoto = c.new.photo === null ? null : int(c.new.photo, `${ca}.new.photo`);
      if (typeof c.old.in_packs !== 'boolean') throw new Error(`photocheck data: ${ca}.old.in_packs must be a boolean`);
      if (newPhoto !== null && rejected.has(newPhoto)) throw new Error(`photocheck data: ${ca}: its new photo ${newPhoto} is rejected by the same unit`);
      return { no, old: { photo: oldPhoto, in_packs: c.old.in_packs }, new: { photo: newPhoto } };
    });
    // a photo goes on one edition of its subject at most (the parts of a group edition share it)
    const byPhoto = new Map<number, Set<number>>();
    for (const c of cs) if (c.new.photo !== null) byPhoto.set(c.new.photo, (byPhoto.get(c.new.photo) ?? new Set()).add(c.no));
    for (const a of approved) if (!byPhoto.has(a)) throw new Error(`photocheck data: ${at}: photo ${a} is approved but no card takes it`);
    const ps = (u.panos ?? []).map((z, j) => {
      const za = `${at}.panos[${j}]`;
      const no = int(z.no, `${za}.no`);
      if (panos.has(no)) throw new Error(`photocheck data: panorama ${no} is listed twice`);
      panos.add(no);
      return { no, old: z.old === null ? null : int(z.old, `${za}.old`), new: z.new === null ? null : int(z.new, `${za}.new`) };
    });
    let lock: PcUnit['lock'] = null;
    if (u.lock) {
      const ok = (o: Record<string, string>, what: string): Record<string, string> => {
        if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error(`photocheck data: ${at}.lock.${what} must be an object`);
        for (const [k, v] of Object.entries(o)) if (!RARITIES.has(k) || !LOCKS.has(v)) throw new Error(`photocheck data: ${at}.lock.${what}.${k} is not an edition and a reason`);
        return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
      };
      lock = { old: ok(u.lock.old, 'old'), new: ok(u.lock.new, 'new') };
    }
    if (photos.length + cs.length + ps.length === 0 && !lock) throw new Error(`photocheck data: ${at} changes nothing`);
    return { entity: u.entity, photos, cards: cs, panos: ps, lock };
  });
  const json = JSON.stringify({ checked_on: data.checked_on, export: data.export, units })
    .replace(/[\u2013\u2014]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  if (json.includes('$pc$')) throw new Error('photocheck data: a text holds the quote $pc$');
  return json;
}

const header = (e: PcExpect, day: string): string => {
  const st = Object.entries(e.statuses).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k} ${v}`).join(', ');
  return `-- 119-photocheck.sql (Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK, ${day}; the check of every live card photo before the launch)
--
-- What:   in ONE DO block, per subject (a unit), from the photo check of ${day} (docs/o1/reports/CARDS/LAUNCH-PREP-PHOTOCHECK.md):
--           cards_photos      REPLACE: the photo leaves (status rejected, review_note says why); RECROP: a new focal_x / focal_y (the publish
--                             workflow then cuts its files again), or the same window with file_focal_x / file_focal_y cleared (files cut
--                             rotated: cut again); a pending photo chosen to replace one becomes approved (the workflow cuts it)
--           cards_catalog     a card KEEPS its number: its photo_id changes so the best looking photo of the subject sits on its rarest edition
--                             kept; a subject with fewer good photos than editions loses its RAREST editions: those cards leave the packs
--                             (in_packs false, photo_id null) until a new photo comes; small_2x follows the new photo (the rule of 118)
--           cards_panoramas   the photo of each group edition follows its cards (null when the edition leaves)
--           cards_entities    lock_reasons of a dropped edition: "photo" (or "size" for a Full Art without a 2x photo), when it has none
--           new table         cards_photocheck_log (one row per subject applied: the rows before and the unit), RLS on, service_role only
-- Why:    integrator brief 2026-11-17 (no minor, no crowd, no cut face, no KPop Demon Hunters image) and the owner's rule of the same day (the
--         best looking photo on the rarest edition, fewer editions rather than a poor photo).
-- Scope:  owned copies follow the card number (cards_owned is not touched); no XP, level, streak or badge is read or written. The triggers of
--         cards_photos (cards_photos_retire of 002, cards_photos_ready of 103) fire as the admin's approve and reject do: the cards move first,
--         then the photos change, so a trigger never takes a card out of the packs that this file keeps in.
-- Rows:   ${e.units} subjects (units). After the file: ${e.catalog} numbered cards (the numbers do not change), ${e.dropped} of them out of the packs
--         with no photo; photos ${st}.
-- Needs:  001 to 118 applied (cards_panoramas, cards_photos.parts). Apply after a backup, never between 23:50 and 00:30 UTC. Then run the
--         publish workflow (Cards publish): it cuts the approved photos, the new focal points and the files cleared here.
-- Verify: select count(*) from public.cards_photocheck_log;   expect ${e.units} (fewer when a notice says a subject was left alone)
-- Verify: select count(*), min(card_no), max(card_no) from public.cards_catalog;   expect ${e.catalog}, 1, ${e.catalog}
-- Verify: select count(*) from public.cards_catalog where photo_id is null and not in_packs;   expect ${e.dropped}
-- Verify: select count(*) from public.cards_catalog where in_packs;   expect ${e.inPacks} now, ${e.inPacksAfterPublish} once the publish workflow has cut the approved photos
-- Verify: select count(*) from public.cards_catalog where in_packs and photo_id is null;   expect 0
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.status not in ('auto', 'approved');   expect 0
-- Verify: select count(*) from (select entity_id, photo_id from public.cards_catalog where photo_id is not null group by entity_id, photo_id having count(distinct rarity) > 1) x;   expect 0 (no photo on two editions)
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where p.entity_id <> c.entity_id;   expect 0
-- Verify: select count(*) from public.cards_panoramas z join public.cards_catalog c on c.card_no = z.first_card where z.photo_id is distinct from c.photo_id;   expect 0
-- Verify: select count(*) from public.cards_panoramas where photo_id is null;   expect ${e.nullPanos}
-- Verify: select status, count(*) from public.cards_photos group by status order by status;   expect ${st}
-- Verify: select count(*) from public.cards_photos where status in ('auto', 'approved') and (storage_path is null or file_focal_x is distinct from focal_x or file_focal_y is distinct from focal_y);   expect ${e.toCut} now, 0 once the publish workflow has run
-- Verify: select count(*) from public.cards_owned o left join public.cards_catalog c on c.card_no = o.card_no where c.card_no is null;   expect 0
-- Refuses: between 23:50 and 00:30 UTC; when 118 is not applied (cards_panoramas or cards_photos.parts missing). A subject whose rows changed
--          since the export (${day}) is left alone with a notice; a check after the writes that fails (a card in the packs on a photo that is not
--          live, a photo on two editions, a card on a photo of another subject) rolls the whole file back.
-- Undo:   119-photocheck.rollback.sql (gives every applied subject its rows back from cards_photocheck_log, then drops the table).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.
`;
};

const CHECKS = (label: string, list: string): string => `
  -- the checks of the subjects this run touched; a failure rolls the whole file back
  if exists (select 1 from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id
             where c.entity_id = any (${list}) and c.in_packs and p.status not in ('auto', 'approved')) then
    raise exception '${label}: a card would stay in the packs on a photo that is not live, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c where c.entity_id = any (${list}) and c.in_packs and c.photo_id is null) then
    raise exception '${label}: a card would be in the packs with no photo, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c where c.entity_id = any (${list}) and c.photo_id is not null
             group by c.entity_id, c.photo_id having count(distinct c.rarity) > 1) then
    raise exception '${label}: a photo would be on two editions, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id
             where c.entity_id = any (${list}) and p.entity_id <> c.entity_id) then
    raise exception '${label}: a card would show a photo of another subject, nothing changed';
  end if;
  if exists (select 1 from public.cards_panoramas z join public.cards_catalog c on c.card_no = z.first_card
             where z.entity_id = any (${list}) and z.photo_id is distinct from c.photo_id) then
    raise exception '${label}: a panorama would not follow its cards, nothing changed';
  end if;`;

export function buildPhotocheck(data: PhotocheckData, day: string = PHOTOCHECK_DAY): PhotocheckSql {
  const literal = dataLiteral(data);
  const units = data.units.length;
  const sql = `${header(data.expect, day)}
do $c119$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  v_data constant jsonb := $pc$${literal}$pc$;
  u jsonb;
  x jsonb;
  rp record;
  rc record;
  v_entity text;
  v_why text;
  v_status text;
  v_np integer;
  v_cw integer;
  v_small boolean;
  v_in boolean;
  v_done text[] := '{}';
  v_applied integer := 0;
  v_already integer := 0;
  v_left integer := 0;
  v_rejected integer := 0;
  v_approved integer := 0;
  v_recrop integer := 0;
  v_reset integer := 0;
  v_moved integer := 0;
  v_dropped integer := 0;
  v_panos integer := 0;
  v_locks integer := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '119-photocheck: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_photos') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_entities') is null
     or to_regclass('public.cards_panoramas') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'parts') then
    raise exception '119-photocheck: the cards tables of 001 to 118 are missing (cards_panoramas, cards_photos.parts), nothing changed';
  end if;

  create table if not exists public.cards_photocheck_log (
    entity_id text constraint cards_photocheck_log_pkey primary key,
    applied_at timestamptz not null default now(),
    old jsonb not null,
    new jsonb not null
  );
  alter table public.cards_photocheck_log enable row level security;
  revoke all on table public.cards_photocheck_log from public, anon, authenticated;
  grant all on table public.cards_photocheck_log to service_role;
  -- nothing else writes these tables while the file reads and writes them (a publish PATCH, an append, the admin)
  lock table public.cards_photos, public.cards_catalog, public.cards_panoramas, public.cards_entities in share row exclusive mode;

  for u in select t.value from jsonb_array_elements(v_data -> 'units') as t(value) loop
    v_entity := u ->> 'entity';
    if exists (select 1 from public.cards_photocheck_log l where l.entity_id = v_entity) then
      v_already := v_already + 1;
      continue;
    end if;
    v_why := null;
    -- every row the unit reads must still be the one of the export
    for x in select t.value from jsonb_array_elements(u -> 'photos') as t(value) loop
      select ph.entity_id, ph.status, ph.focal_x, ph.focal_y, ph.file_focal_x, ph.file_focal_y into rp from public.cards_photos ph where ph.id = (x ->> 'id')::bigint;
      if not found or rp.entity_id <> v_entity or rp.status <> x #>> '{old,status}' or rp.focal_x <> (x #>> '{old,fx}')::integer
         or rp.focal_y <> (x #>> '{old,fy}')::integer
         or (coalesce((x #>> '{new,reset_files}')::boolean, false)
             and (rp.file_focal_x is distinct from (x #>> '{old,ffx}')::integer or rp.file_focal_y is distinct from (x #>> '{old,ffy}')::integer)) then
        v_why := 'photo ' || (x ->> 'id');
        exit;
      end if;
    end loop;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'cards') as t(value) loop
        select k.entity_id, k.photo_id, k.in_packs into rc from public.cards_catalog k where k.card_no = (x ->> 'no')::integer;
        if not found or rc.entity_id <> v_entity or rc.photo_id is distinct from (x #>> '{old,photo}')::bigint or rc.in_packs <> (x #>> '{old,in_packs}')::boolean then
          v_why := 'card BV1-' || lpad(x ->> 'no', 4, '0');
          exit;
        end if;
        -- the new photo: of this subject, and live once this unit is applied
        if x #>> '{new,photo}' is not null then
          select ph.entity_id, ph.status into rp from public.cards_photos ph where ph.id = (x #>> '{new,photo}')::bigint;
          if not found then
            v_why := 'photo ' || (x #>> '{new,photo}') || ' (the new photo of BV1-' || lpad(x ->> 'no', 4, '0') || ')';
            exit;
          end if;
          v_status := coalesce((select y.value #>> '{new,status}' from jsonb_array_elements(u -> 'photos') as y(value)
                                 where (y.value ->> 'id')::bigint = (x #>> '{new,photo}')::bigint), rp.status);
          if rp.entity_id <> v_entity or v_status not in ('auto', 'approved') then
            v_why := 'photo ' || (x #>> '{new,photo}') || ' (the new photo of BV1-' || lpad(x ->> 'no', 4, '0') || ')';
            exit;
          end if;
        end if;
      end loop;
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'panos') as t(value) loop
        if not exists (select 1 from public.cards_panoramas z where z.pano_no = (x ->> 'no')::integer and z.entity_id = v_entity
                         and z.photo_id is not distinct from (x ->> 'old')::bigint) then
          v_why := 'panorama P-' || lpad(x ->> 'no', 4, '0');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null and jsonb_typeof(u -> 'lock') = 'object'
       and not exists (select 1 from public.cards_entities e where e.id = v_entity and e.lock_reasons = u #> '{lock,old}') then
      v_why := 'the lock reasons';
    end if;
    if v_why is not null then
      v_left := v_left + 1;
      raise notice '119-photocheck: % left alone: % changed since the export of ${day}', v_entity, v_why;
      continue;
    end if;

    -- the rows before, then the unit
    insert into public.cards_photocheck_log (entity_id, old, new) values (v_entity, jsonb_build_object(
      'photos', (select coalesce(jsonb_agg(jsonb_build_object('id', ph.id, 'status', ph.status, 'focal_x', ph.focal_x, 'focal_y', ph.focal_y,
                   'file_focal_x', ph.file_focal_x, 'file_focal_y', ph.file_focal_y, 'review_note', ph.review_note) order by ph.id), '[]'::jsonb)
                 from public.cards_photos ph where ph.id in (select (y.value ->> 'id')::bigint from jsonb_array_elements(u -> 'photos') as y(value))),
      'cards', (select coalesce(jsonb_agg(jsonb_build_object('no', k.card_no, 'photo_id', k.photo_id, 'in_packs', k.in_packs, 'small_2x', k.small_2x) order by k.card_no), '[]'::jsonb)
                from public.cards_catalog k where k.card_no in (select (y.value ->> 'no')::integer from jsonb_array_elements(u -> 'cards') as y(value))),
      'panos', (select coalesce(jsonb_agg(jsonb_build_object('no', z.pano_no, 'photo_id', z.photo_id) order by z.pano_no), '[]'::jsonb)
                from public.cards_panoramas z where z.pano_no in (select (y.value ->> 'no')::integer from jsonb_array_elements(u -> 'panos') as y(value))),
      'lock_reasons', (select e.lock_reasons from public.cards_entities e where e.id = v_entity)), u);

    -- 1. the cards: the new photo (or none, out of the packs), the 2x flag of their part, in the packs when the photo has something to show
    for x in select t.value from jsonb_array_elements(u -> 'cards') as t(value) loop
      if x #>> '{new,photo}' is null then
        update public.cards_catalog set photo_id = null, in_packs = false where card_no = (x ->> 'no')::integer;
        v_dropped := v_dropped + 1;
      else
        select ph.status, ph.parts, ph.source_width, ph.source_height, ph.storage_path, ph.source_path, e.kind, k.part, k.photo_id as cur into rp
          from public.cards_photos ph join public.cards_entities e on e.id = ph.entity_id
          join public.cards_catalog k on k.card_no = (x ->> 'no')::integer
         where ph.id = (x #>> '{new,photo}')::bigint;
        v_status := coalesce((select y.value #>> '{new,status}' from jsonb_array_elements(u -> 'photos') as y(value)
                               where (y.value ->> 'id')::bigint = (x #>> '{new,photo}')::bigint), rp.status);
        v_np := case when rp.kind = 'group' then coalesce(rp.parts, 2)::integer else 1 end;
        v_cw := floor(least(rp.source_width::numeric, rp.source_height::numeric * (case when rp.kind = 'group' then v_np * 5.5 else 5.5 end) / 8.5))::integer;
        v_small := case when rp.kind = 'group' then (v_cw * rp.part / v_np - v_cw * (rp.part - 1) / v_np) < 640 else v_cw < 640 end;
        v_in := v_status in ('auto', 'approved') and (rp.storage_path is not null or rp.source_path is not null);
        if rp.cur is distinct from (x #>> '{new,photo}')::bigint then v_moved := v_moved + 1; end if;
        update public.cards_catalog set photo_id = (x #>> '{new,photo}')::bigint, small_2x = v_small, in_packs = v_in
         where card_no = (x ->> 'no')::integer;
      end if;
    end loop;
    -- 2. the panoramas follow the photo of their edition
    for x in select t.value from jsonb_array_elements(u -> 'panos') as t(value) loop
      update public.cards_panoramas set photo_id = (x ->> 'new')::bigint where pano_no = (x ->> 'no')::integer;
      v_panos := v_panos + 1;
    end loop;
    -- 3. the photos (no card points at a photo rejected here any more; an approved one sets its cards as computed above)
    for x in select t.value from jsonb_array_elements(u -> 'photos') as t(value) loop
      if x #>> '{new,status}' is not null then
        update public.cards_photos set status = x #>> '{new,status}', review_note = coalesce(x ->> 'note', review_note) where id = (x ->> 'id')::bigint;
        if x #>> '{new,status}' = 'rejected' then v_rejected := v_rejected + 1; else v_approved := v_approved + 1; end if;
      elsif x ->> 'note' is not null then
        update public.cards_photos set review_note = x ->> 'note' where id = (x ->> 'id')::bigint;
      end if;
      if x #>> '{new,fx}' is not null then
        update public.cards_photos set focal_x = (x #>> '{new,fx}')::integer, focal_y = (x #>> '{new,fy}')::integer where id = (x ->> 'id')::bigint;
        v_recrop := v_recrop + 1;
      end if;
      if coalesce((x #>> '{new,reset_files}')::boolean, false) then
        update public.cards_photos set file_focal_x = null, file_focal_y = null where id = (x ->> 'id')::bigint;
        v_reset := v_reset + 1;
      end if;
    end loop;
    -- 4. why a dropped edition is missing
    if jsonb_typeof(u -> 'lock') = 'object' then
      update public.cards_entities set lock_reasons = u #> '{lock,new}' where id = v_entity;
      v_locks := v_locks + 1;
    end if;
    v_done := v_done || v_entity;
    v_applied := v_applied + 1;
  end loop;
${CHECKS('119-photocheck', 'v_done')}

  raise notice '119-photocheck: % subjects applied, % already applied, % left alone (changed since the export)', v_applied, v_already, v_left;
  raise notice '119-photocheck: photos rejected %, approved %, new focal point %, files to cut again %', v_rejected, v_approved, v_recrop, v_reset;
  raise notice '119-photocheck: cards with a new photo %, cards out of the packs with no photo %, panoramas %, lock reasons %', v_moved, v_dropped, v_panos, v_locks;
end $c119$;
`;

  const rollback = `-- 119-photocheck.rollback.sql (Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK, ${day}; undoes 119-photocheck.sql)
--
-- What:   in ONE DO block, for every subject of cards_photocheck_log whose rows are still the ones 119 wrote: gives back its cards (photo_id,
--         in_packs, small_2x), its panoramas (photo_id), its photos (status, focal point, review_note; the file focal point only while the
--         files are not cut again) and its lock reasons, then deletes its log row. A subject changed since 119 is left alone with a notice and
--         keeps its log row. The table is dropped once it is empty.
-- Scope:  the cards move back first, then the photos (the triggers of 002 and 103 then agree with the cards). No XP, level, streak or badge.
-- Verify: select to_regclass('public.cards_photocheck_log') is null;   expect t (f when a notice says a subject was left alone)
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.status not in ('auto', 'approved');   expect 0
-- Refuses: between 23:50 and 00:30 UTC. A check after the writes that fails rolls the whole file back.
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c119r$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  l record;
  u jsonb;
  o jsonb;
  x jsonb;
  y jsonb;
  v_why text;
  v_done text[] := '{}';
  v_back integer := 0;
  v_left integer := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '119-photocheck rollback: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_photocheck_log') is null then
    raise notice '119-photocheck rollback: nothing to undo (no cards_photocheck_log)';
    return;
  end if;
  lock table public.cards_photos, public.cards_catalog, public.cards_panoramas, public.cards_entities in share row exclusive mode;

  for l in select g.entity_id, g.old, g.new from public.cards_photocheck_log g order by g.entity_id loop
    u := l.new;
    o := l.old;
    v_why := null;
    -- every row must still be the one 119 wrote
    for x in select t.value from jsonb_array_elements(u -> 'cards') as t(value) loop
      if not exists (select 1 from public.cards_catalog k where k.card_no = (x ->> 'no')::integer and k.photo_id is not distinct from (x #>> '{new,photo}')::bigint) then
        v_why := 'card BV1-' || lpad(x ->> 'no', 4, '0');
        exit;
      end if;
    end loop;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'panos') as t(value) loop
        if not exists (select 1 from public.cards_panoramas z where z.pano_no = (x ->> 'no')::integer and z.photo_id is not distinct from (x ->> 'new')::bigint) then
          v_why := 'panorama P-' || lpad(x ->> 'no', 4, '0');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'photos') as t(value) loop
        if not exists (select 1 from public.cards_photos ph where ph.id = (x ->> 'id')::bigint
                         and ph.status = coalesce(x #>> '{new,status}', x #>> '{old,status}')
                         and ph.focal_x = coalesce((x #>> '{new,fx}')::integer, (x #>> '{old,fx}')::integer)
                         and ph.focal_y = coalesce((x #>> '{new,fy}')::integer, (x #>> '{old,fy}')::integer)) then
          v_why := 'photo ' || (x ->> 'id');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null and jsonb_typeof(u -> 'lock') = 'object'
       and not exists (select 1 from public.cards_entities e where e.id = l.entity_id and e.lock_reasons = u #> '{lock,new}') then
      v_why := 'the lock reasons';
    end if;
    if v_why is not null then
      v_left := v_left + 1;
      raise notice '119-photocheck rollback: % left alone: % changed since 119', l.entity_id, v_why;
      continue;
    end if;
    -- the cards and the panoramas first, then the photos, then the lock reasons
    for y in select t.value from jsonb_array_elements(o -> 'cards') as t(value) loop
      update public.cards_catalog set photo_id = (y ->> 'photo_id')::bigint, in_packs = (y ->> 'in_packs')::boolean, small_2x = (y ->> 'small_2x')::boolean
       where card_no = (y ->> 'no')::integer;
    end loop;
    for y in select t.value from jsonb_array_elements(o -> 'panos') as t(value) loop
      update public.cards_panoramas set photo_id = (y ->> 'photo_id')::bigint where pano_no = (y ->> 'no')::integer;
    end loop;
    for y in select t.value from jsonb_array_elements(o -> 'photos') as t(value) loop
      update public.cards_photos set status = y ->> 'status' where id = (y ->> 'id')::bigint and status is distinct from y ->> 'status';
      update public.cards_photos set focal_x = (y ->> 'focal_x')::integer, focal_y = (y ->> 'focal_y')::integer, review_note = y ->> 'review_note',
             file_focal_x = case when file_focal_x is null and file_focal_y is null then (y ->> 'file_focal_x')::integer else file_focal_x end,
             file_focal_y = case when file_focal_x is null and file_focal_y is null then (y ->> 'file_focal_y')::integer else file_focal_y end
       where id = (y ->> 'id')::bigint;
    end loop;
    if jsonb_typeof(u -> 'lock') = 'object' then
      update public.cards_entities set lock_reasons = o -> 'lock_reasons' where id = l.entity_id;
    end if;
    delete from public.cards_photocheck_log where entity_id = l.entity_id;
    v_done := v_done || l.entity_id;
    v_back := v_back + 1;
  end loop;
${CHECKS('119-photocheck rollback', 'v_done')}

  if not exists (select 1 from public.cards_photocheck_log) then
    drop table public.cards_photocheck_log;
  end if;
  raise notice '119-photocheck rollback: % subjects given back, % left alone', v_back, v_left;
end $c119r$;
`;
  return { sql, rollback, units };
}
