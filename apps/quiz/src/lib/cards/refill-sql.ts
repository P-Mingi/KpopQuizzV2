// Bunnyverse Cards, lot LAUNCH-PREP lane REFILL (integrator brief 2026-11-18): after 119 the packs held 892 cards; the owner wants at least
// 1,000. The text of docs/pending-migrations/cards/123-refill.sql and its rollback, built by scripts/cards/gen-refill-sql.mts from the plan of
// the refill (out/launch-prep, not in git). Pure: no file, no network, no database. refill-sql.test.ts runs both files on PGlite.
//
// One UNIT per subject: the new Commons photos it adds (cards_photos rows, status approved, no file yet: the publish workflow cuts them and
// the trigger cards_photos_ready of 103 then puts their cards in the packs), the pending photos it approves, its numbered cards (each keeps its
// number; its photo changes by the owner's rule: the best looking photo on the rarest edition kept), its panoramas (they follow the photo of
// their edition) and its lock reasons (an edition that comes back loses its "photo" reason). A unit is applied only when every row of the
// subject is still the one 119 left (every photo: status and focal point; every card and panorama: its photo; the lock reasons) and no new
// photo is already in cards_photos; otherwise it is left alone with a notice. What a unit changed is kept in cards_refill_log, so a second run
// changes nothing and the rollback gives the rows back.

export const REFILL_DAY = '2026-11-18';

export type RfStatus = 'auto' | 'approved' | 'pending' | 'rejected' | 'removed';
/** A new photo of the subject, from Commons: the cards_photos row 123 inserts (status approved, no file). */
export interface RfNewPhoto {
  /** The name the cards of the unit use for it (the photo id is known only once the row is in). */
  key: string;
  slot: number;
  page: string;
  url: string;
  sha1: string;
  author: string;
  author_url: string | null;
  licence: string;
  licence_url: string;
  share_alike: boolean;
  date: string;
  event: string | null;
  stage: boolean;
  /** The look of the refill (5 professional or posed, 4 good event or stage, 3 acceptable). */
  quality: number;
  fx: number;
  fy: number;
  width: number;
  height: number;
  /** A group photo: the cards of the edition it goes on (2 or 3). A person: null. */
  parts: 2 | 3 | null;
  note: string;
}
export interface RfUnit {
  entity: string;
  /** Every photo of the subject as 119 leaves it: the unit is applied only when they are all still so (and there is no other). */
  photos: Array<{ id: number; status: RfStatus; slot: number; fx: number; fy: number }>;
  /** Pending photos the refill accepts (they become approved; the workflow cuts them). */
  approve: Array<{ id: number; note: string }>;
  add: RfNewPhoto[];
  /** Every numbered card of the subject: its photo after 119 (old) and after 123 (new: a photo id, the key of a new photo, or null). */
  cards: Array<{ no: number; old: number | null; new: number | string | null }>;
  panos: Array<{ no: number; old: number | null; new: number | string | null }>;
  lock: { old: Record<string, string>; new: Record<string, string> } | null;
}
/** The numbers the Verify lines expect once every unit is applied on the state 119 leaves (the generator computes them). */
export interface RfExpect {
  units: number;
  catalog: number;
  added: number;
  approved: number;
  dropped: number;
  /** In the packs right after the file, when the publish workflow has not run since 119. */
  inPacks: number;
  /** In the packs right after the file, when the publish workflow ran after 119 (the photos 119 approved are cut). */
  inPacksAfter119Publish: number;
  inPacksAfterPublish: number;
  nullPanos: number;
  toCut: number;
  statuses: Record<string, number>;
}
export interface RefillData { checked_on: string; export: string; units: RfUnit[]; expect: RfExpect }
export interface RefillSql { sql: string; rollback: string; units: number }

const RARITIES = new Set(['C', 'U', 'R', 'SR', 'UR', 'L']);
const LOCKS = new Set(['one', 'sameday', 'newg', 'hiatus', 'crop', 'photo', 'size']);
const STATUSES = new Set(['auto', 'approved', 'pending', 'rejected', 'removed']);
const LICENCE = /^(cc0( 1\.0)?|public domain|pd|cc by(-sa)? \d(\.\d)?( [a-z]{2,6})?|kogl type (1|i))$/i;

/** Checks the data and writes it as the jsonb literal of the file (en and em dashes escaped, never written). */
export function dataLiteral(data: RefillData): string {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.checked_on)) || !Array.isArray(data.units)) {
    throw new Error('refill data: { checked_on: "YYYY-MM-DD", units: [...] } expected');
  }
  const int = (v: unknown, what: string, min = 1, max = Number.MAX_SAFE_INTEGER): number => {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Error(`refill data: ${what} must be an integer from ${min} to ${max}`);
    return v;
  };
  const text = (v: unknown, what: string, max = 600): string => {
    if (typeof v !== 'string' || v.trim() === '' || v.length > max) throw new Error(`refill data: ${what} must be a line of text`);
    return v;
  };
  const entities = new Set<string>();
  const ids = new Set<number>();
  const cards = new Set<number>();
  const panos = new Set<number>();
  const pages = new Set<string>();
  const sha1s = new Set<string>();
  const units = data.units.map((u, i) => {
    const at = `units[${i}]`;
    if (typeof u.entity !== 'string' || !/^(idol|group):[a-z0-9-]+$/.test(u.entity)) throw new Error(`refill data: ${at}.entity must be idol:<slug> or group:<slug>`);
    if (entities.has(u.entity)) throw new Error(`refill data: ${u.entity} is listed twice`);
    entities.add(u.entity);
    const group = u.entity.startsWith('group:');
    const photos = (u.photos ?? []).map((p, j) => {
      const id = int(p.id, `${at}.photos[${j}].id`);
      if (ids.has(id)) throw new Error(`refill data: photo ${id} is listed twice`);
      ids.add(id);
      if (!STATUSES.has(p.status)) throw new Error(`refill data: ${at}.photos[${j}].status is not a status`);
      return { id, status: p.status, slot: int(p.slot, `${at}.photos[${j}].slot`, 1, 6), fx: int(p.fx, `${at}.photos[${j}].fx`, 0, 100), fy: int(p.fy, `${at}.photos[${j}].fy`, 0, 100) };
    });
    const known = new Map(photos.map((p) => [p.id, p]));
    const approve = (u.approve ?? []).map((a, j) => {
      const p = known.get(a.id);
      if (!p || p.status !== 'pending') throw new Error(`refill data: ${at}.approve[${j}]: photo ${a.id} is not a pending photo of the subject`);
      return { id: a.id, note: text(a.note, `${at}.approve[${j}].note`) };
    });
    if (new Set(approve.map((a) => a.id)).size !== approve.length) throw new Error(`refill data: ${at}: a photo is approved twice`);
    const keys = new Set<string>();
    // one live photo a slot (cards_photos_live_slot_key): the live photos, the approved ones and the new ones each hold their own
    const liveSlots = photos.filter((p) => p.status === 'auto' || p.status === 'approved' || approve.some((a) => a.id === p.id)).map((p) => p.slot);
    if (new Set(liveSlots).size !== liveSlots.length) throw new Error(`refill data: ${at}: two live photos would hold one slot`);
    const slotOf = new Map<number, number>();
    const add = (u.add ?? []).map((n, j) => {
      const na = `${at}.add[${j}]`;
      const key = text(n.key, `${na}.key`, 40);
      if (keys.has(key)) throw new Error(`refill data: ${na}: the key ${key} is used twice`);
      keys.add(key);
      const slot = int(n.slot, `${na}.slot`, 1, 6);
      if ([...slotOf.values()].includes(slot) || liveSlots.includes(slot)) throw new Error(`refill data: ${na}: slot ${slot} is held by another live photo`);
      slotOf.set(j, slot);
      if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(String(n.page))) throw new Error(`refill data: ${na}.page must be a Commons file page`);
      if (pages.has(n.page)) throw new Error(`refill data: ${na}: the page is listed twice`);
      pages.add(n.page);
      if (!/^https:\/\/upload\.wikimedia\.org\//.test(String(n.url))) throw new Error(`refill data: ${na}.url must be a Commons original`);
      if (!/^[0-9a-f]{40}$/.test(String(n.sha1))) throw new Error(`refill data: ${na}.sha1 must be a sha1`);
      if (sha1s.has(n.sha1)) throw new Error(`refill data: ${na}: the sha1 is listed twice`);
      sha1s.add(n.sha1);
      if (!LICENCE.test(String(n.licence).trim()) || /\b(nc|nd)\b/i.test(String(n.licence))) throw new Error(`refill data: ${na}.licence is not a free licence`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(n.date))) throw new Error(`refill data: ${na}.date must be YYYY-MM-DD`);
      if (group ? n.parts !== 2 && n.parts !== 3 : n.parts !== null) throw new Error(`refill data: ${na}.parts must be 2 or 3 for a group, null for a person`);
      if (typeof n.share_alike !== 'boolean' || typeof n.stage !== 'boolean') throw new Error(`refill data: ${na}: share_alike and stage are booleans`);
      return {
        key, slot, page: n.page, url: n.url, sha1: n.sha1, author: text(n.author, `${na}.author`, 300), author_url: n.author_url ?? null,
        licence: n.licence, licence_url: text(n.licence_url, `${na}.licence_url`, 300), share_alike: n.share_alike, date: n.date,
        event: n.event === null ? null : text(n.event, `${na}.event`, 300), stage: n.stage, quality: int(n.quality, `${na}.quality`, 3, 5),
        fx: int(n.fx, `${na}.fx`, 0, 100), fy: int(n.fy, `${na}.fy`, 0, 100), width: int(n.width, `${na}.width`), height: int(n.height, `${na}.height`),
        parts: n.parts, note: text(n.note, `${na}.note`),
      };
    });
    const ref = (v: unknown, what: string): number | string | null => {
      if (v === null) return null;
      if (typeof v === 'string') { if (!keys.has(v)) throw new Error(`refill data: ${what}: ${v} is not a new photo of the unit`); return v; }
      const id = int(v, what);
      const p = known.get(id);
      if (!p) throw new Error(`refill data: ${what}: photo ${id} is not a photo of the subject`);
      if (!(p.status === 'auto' || p.status === 'approved' || approve.some((a) => a.id === id))) throw new Error(`refill data: ${what}: photo ${id} is not live`);
      return id;
    };
    const cs = (u.cards ?? []).map((c, j) => {
      const no = int(c.no, `${at}.cards[${j}].no`);
      if (cards.has(no)) throw new Error(`refill data: card ${no} is listed twice`);
      cards.add(no);
      return { no, old: c.old === null ? null : int(c.old, `${at}.cards[${j}].old`), new: ref(c.new, `${at}.cards[${j}].new`) };
    });
    const used = new Set(cs.map((c) => c.new).filter((v) => v !== null));
    for (const k of keys) if (!used.has(k)) throw new Error(`refill data: ${at}: the new photo ${k} goes on no card`);
    for (const a of approve) if (!used.has(a.id)) throw new Error(`refill data: ${at}: photo ${a.id} is approved but no card takes it`);
    const ps = (u.panos ?? []).map((z, j) => {
      const no = int(z.no, `${at}.panos[${j}].no`);
      if (panos.has(no)) throw new Error(`refill data: panorama ${no} is listed twice`);
      panos.add(no);
      return { no, old: z.old === null ? null : int(z.old, `${at}.panos[${j}].old`), new: ref(z.new, `${at}.panos[${j}].new`) };
    });
    let lock: RfUnit['lock'] = null;
    if (u.lock) {
      const ok = (o: Record<string, string>, what: string): Record<string, string> => {
        if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error(`refill data: ${at}.lock.${what} must be an object`);
        for (const [k, v] of Object.entries(o)) if (!RARITIES.has(k) || !LOCKS.has(v)) throw new Error(`refill data: ${at}.lock.${what}.${k} is not an edition and a reason`);
        return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
      };
      lock = { old: ok(u.lock.old, 'old'), new: ok(u.lock.new, 'new') };
    }
    const changes = add.length + approve.length + cs.filter((c) => c.new !== c.old).length + ps.filter((z) => z.new !== z.old).length;
    if (changes === 0) throw new Error(`refill data: ${at} changes nothing`);
    return { entity: u.entity, photos, approve, add, cards: cs, panos: ps, lock };
  });
  const json = JSON.stringify({ checked_on: data.checked_on, export: data.export, units })
    .replace(/[\u2013\u2014]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  if (json.includes('$rf$')) throw new Error('refill data: a text holds the quote $rf$');
  return json;
}

const header = (e: RfExpect, day: string): string => {
  const st = Object.entries(e.statuses).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k} ${v}`).join(', ');
  return `-- 123-refill.sql (Bunnyverse Cards, lot LAUNCH-PREP lane REFILL, ${day}; new photos for the cards 119 took out of the packs)
--
-- What:   in ONE DO block, per subject (a unit), from the refill of ${day} (docs/o1/reports/CARDS/REFILL.md):
--           cards_photos      the new Commons photos of the refill (status approved, no file yet: the publish workflow cuts them, the trigger
--                             cards_photos_ready of 103 then puts their cards in the packs), in a slot no live photo holds; the pending
--                             photos the refill accepts become approved (the workflow cuts them too)
--           cards_catalog     a card KEEPS its number: its photo_id changes so the best looking photo of the subject sits on its rarest edition
--                             kept (the owner's rule, as in 119); a card 119 took out of the packs comes back with a new photo; small_2x
--                             follows the photo (the rule of 118); in_packs is what cards_photos_ready computes (live and with a file)
--           cards_panoramas   the photo of each group edition follows its cards
--           cards_entities    lock_reasons: an edition that comes back loses its reason
--           new table         cards_refill_log (one row per subject applied: the rows before and the unit), RLS on, service_role only
-- Why:    integrator brief ${day}: at least 1,000 cards in the packs after 119, with the rules of 119 (no minor, no crowd, no cut face, no
--         KPop Demon Hunters image, one occasion per edition, a free Commons licence with a named author, the best looking photo rarest).
-- Scope:  owned copies follow the card number (cards_owned is not touched); no XP, level, streak or badge is read or written. The cards move
--         first, then the pending photos are approved, as 119 does; a new photo is inserted before a card points at it.
-- Rows:   ${e.units} subjects (units), ${e.added} new photos, ${e.approved} pending photos approved. After the file: ${e.catalog} numbered cards (the
--         numbers do not change), ${e.dropped} of them out of the packs with no photo; photos ${st}.
-- Needs:  001 to 119 applied (119 leaves its table cards_photocheck_log). Apply after a backup, never between 23:50 and 00:30 UTC. Then
--         run the publish workflow (Cards publish): it cuts the new and the approved photos, and their cards enter the packs.
-- Verify: select count(*) from public.cards_refill_log;   expect ${e.units} (fewer when a notice says a subject was left alone)
-- Verify: select count(*), min(card_no), max(card_no) from public.cards_catalog;   expect ${e.catalog}, 1, ${e.catalog}
-- Verify: select count(*) from public.cards_catalog where photo_id is null and not in_packs;   expect ${e.dropped}
-- Verify: select count(*) from public.cards_catalog where in_packs;   expect ${e.inPacks} now (${e.inPacksAfter119Publish} when the publish workflow ran after 119), ${e.inPacksAfterPublish} once the publish workflow has cut the new photos
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where p.status in ('auto', 'approved');   expect ${e.inPacksAfterPublish} (the cards in the packs once the workflow has run)
-- Verify: select count(*) from public.cards_catalog where in_packs and photo_id is null;   expect 0
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.status not in ('auto', 'approved');   expect 0
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.storage_path is null and p.source_path is null;   expect 0
-- Verify: select count(*) from (select entity_id, photo_id from public.cards_catalog where photo_id is not null group by entity_id, photo_id having count(distinct rarity) > 1) x;   expect 0 (no photo on two editions)
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where p.entity_id <> c.entity_id;   expect 0
-- Verify: select count(*) from public.cards_panoramas z join public.cards_catalog c on c.card_no = z.first_card where z.photo_id is distinct from c.photo_id;   expect 0
-- Verify: select count(*) from public.cards_panoramas where photo_id is null;   expect ${e.nullPanos}
-- Verify: select status, count(*) from public.cards_photos group by status order by status;   expect ${st}
-- Verify: select count(*) from public.cards_photos where status in ('auto', 'approved') group by entity_id, slot having count(*) > 1;   expect no row
-- Verify: select count(*) from public.cards_photos where status in ('auto', 'approved') and (storage_path is null or file_focal_x is distinct from focal_x or file_focal_y is distinct from focal_y);   expect ${e.toCut} now (fewer when the publish workflow ran after 119), 0 once the publish workflow has run
-- Verify: select count(*) from public.cards_owned o left join public.cards_catalog c on c.card_no = o.card_no where c.card_no is null;   expect 0
-- Refuses: between 23:50 and 00:30 UTC; when 119 is not applied (no cards_photocheck_log). A subject whose rows changed since 119 (or that 119
--          left alone: a photo, a card, a panorama, its lock reasons), or whose new photo is already in cards_photos, is left alone with a notice; a check
--          after the writes that fails (a card in the packs on a photo that is not live or has no file, a photo on two editions, a card on a
--          photo of another subject, two live photos in one slot) rolls the whole file back.
-- Undo:   123-refill.rollback.sql (gives every applied subject its rows back from cards_refill_log, removes the new photos, then drops the table).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.
`;
};

const CHECKS = (label: string, list: string): string => `
  -- the checks of the subjects this run touched; a failure rolls the whole file back
  if exists (select 1 from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id
             where c.entity_id = any (${list}) and c.in_packs and (p.status not in ('auto', 'approved') or (p.storage_path is null and p.source_path is null))) then
    raise exception '${label}: a card would stay in the packs on a photo that is not live or has no file, nothing changed';
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
  end if;
  if exists (select 1 from public.cards_photos p where p.entity_id = any (${list}) and p.status in ('auto', 'approved')
             group by p.entity_id, p.slot having count(*) > 1) then
    raise exception '${label}: two live photos would hold one slot, nothing changed';
  end if;`;

export function buildRefill(data: RefillData, day: string = REFILL_DAY): RefillSql {
  const literal = dataLiteral(data);
  const units = data.units.length;
  const sql = `${header(data.expect, day)}
do $c123$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  v_data constant jsonb := $rf$${literal}$rf$;
  u jsonb;
  x jsonb;
  rp record;
  v_entity text;
  v_kind text;
  v_why text;
  v_id bigint;
  v_ids jsonb;
  v_old jsonb;
  v_status text;
  v_np integer;
  v_cw integer;
  v_small boolean;
  v_in boolean;
  v_done text[] := '{}';
  v_applied integer := 0;
  v_already integer := 0;
  v_left integer := 0;
  v_added integer := 0;
  v_approved integer := 0;
  v_moved integer := 0;
  v_back integer := 0;
  v_panos integer := 0;
  v_locks integer := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '123-refill: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_photos') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_entities') is null
     or to_regclass('public.cards_panoramas') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'parts') then
    raise exception '123-refill: the cards tables of 001 to 118 are missing (cards_panoramas, cards_photos.parts), nothing changed';
  end if;
  if to_regclass('public.cards_photocheck_log') is null then
    raise exception '123-refill: 119-photocheck.sql is not applied (no cards_photocheck_log): apply 119 first, nothing changed';
  end if;
  -- 119 applied: its log table is there (119 creates it before its first subject, its rollback drops it). A subject 119 left alone does not
  -- have the rows 123 expects, so the guard below leaves it alone too.
  if not exists (select 1 from public.cards_photocheck_log) then
    raise notice '123-refill: cards_photocheck_log is empty (119 applied no subject): every subject is checked against the rows 119 leaves';
  end if;

  create table if not exists public.cards_refill_log (
    entity_id text constraint cards_refill_log_pkey primary key,
    applied_at timestamptz not null default now(),
    old jsonb not null,
    new jsonb not null
  );
  alter table public.cards_refill_log enable row level security;
  revoke all on table public.cards_refill_log from public, anon, authenticated;
  grant all on table public.cards_refill_log to service_role;
  -- nothing else writes these tables while the file reads and writes them (a publish PATCH, an append, the admin)
  lock table public.cards_photos, public.cards_catalog, public.cards_panoramas, public.cards_entities in share row exclusive mode;

  for u in select t.value from jsonb_array_elements(v_data -> 'units') as t(value) loop
    v_entity := u ->> 'entity';
    if exists (select 1 from public.cards_refill_log l where l.entity_id = v_entity) then
      v_already := v_already + 1;
      continue;
    end if;
    v_why := null;
    -- every row of the subject must still be the one 119 left
    if (select count(*) from public.cards_photos ph where ph.entity_id = v_entity) <> jsonb_array_length(u -> 'photos') then
      v_why := 'its photos (one more or one less)';
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'photos') as t(value) loop
        if not exists (select 1 from public.cards_photos ph where ph.id = (x ->> 'id')::bigint and ph.entity_id = v_entity and ph.status = x ->> 'status'
                         and ph.slot = (x ->> 'slot')::integer and ph.focal_x = (x ->> 'fx')::integer and ph.focal_y = (x ->> 'fy')::integer) then
          v_why := 'photo ' || (x ->> 'id');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null and (select count(*) from public.cards_catalog k where k.entity_id = v_entity) <> jsonb_array_length(u -> 'cards') then
      v_why := 'its cards (one more or one less)';
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'cards') as t(value) loop
        if not exists (select 1 from public.cards_catalog k where k.card_no = (x ->> 'no')::integer and k.entity_id = v_entity
                         and k.photo_id is not distinct from (x ->> 'old')::bigint) then
          v_why := 'card BV1-' || lpad(x ->> 'no', 4, '0');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null and (select count(*) from public.cards_panoramas z where z.entity_id = v_entity) <> jsonb_array_length(u -> 'panos') then
      v_why := 'its panoramas (one more or one less)';
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
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'add') as t(value) loop
        if exists (select 1 from public.cards_photos ph where ph.source_page = x ->> 'page' or ph.sha1 = x ->> 'sha1') then
          v_why := 'the new photo ' || (x ->> 'page') || ' is already in cards_photos';
          exit;
        end if;
        if exists (select 1 from public.cards_photos ph where ph.entity_id = v_entity and ph.slot = (x ->> 'slot')::integer and ph.status in ('auto', 'approved')) then
          v_why := 'slot ' || (x ->> 'slot') || ' is held by a live photo';
          exit;
        end if;
      end loop;
    end if;
    if v_why is not null then
      v_left := v_left + 1;
      raise notice '123-refill: % left alone: % changed since 119', v_entity, v_why;
      continue;
    end if;

    -- the rows before
    v_old := jsonb_build_object(
      'photos', (select coalesce(jsonb_agg(jsonb_build_object('id', ph.id, 'status', ph.status, 'review_note', ph.review_note, 'storage_path', ph.storage_path,
                   'file_focal_x', ph.file_focal_x, 'file_focal_y', ph.file_focal_y, 'file_parts', ph.file_parts, 'file_pano', ph.file_pano) order by ph.id), '[]'::jsonb)
                 from public.cards_photos ph where ph.id in (select (y.value ->> 'id')::bigint from jsonb_array_elements(u -> 'approve') as y(value))),
      'cards', (select coalesce(jsonb_agg(jsonb_build_object('no', k.card_no, 'photo_id', k.photo_id, 'in_packs', k.in_packs, 'small_2x', k.small_2x) order by k.card_no), '[]'::jsonb)
                from public.cards_catalog k where k.entity_id = v_entity),
      'panos', (select coalesce(jsonb_agg(jsonb_build_object('no', z.pano_no, 'photo_id', z.photo_id) order by z.pano_no), '[]'::jsonb)
                from public.cards_panoramas z where z.entity_id = v_entity),
      'lock_reasons', (select e.lock_reasons from public.cards_entities e where e.id = v_entity));
    select e.kind into v_kind from public.cards_entities e where e.id = v_entity;

    -- 1. the new photos (approved, no file yet: the publish workflow cuts them)
    v_ids := '{}'::jsonb;
    for x in select t.value from jsonb_array_elements(u -> 'add') as t(value) loop
      v_np := case when v_kind = 'group' then (x ->> 'parts')::integer else 1 end;
      v_cw := floor(least((x ->> 'width')::numeric, (x ->> 'height')::numeric * v_np * 5.5 / 8.5))::integer;
      insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, author_url, licence, licence_url, share_alike,
                                       checked_at, event_name, event_date, event_date_precision, event_precision, focal_x, focal_y, source_path,
                                       source_width, source_height, small_2x, status, review_note, sha1, quality, stage, news_only, parts)
      values (v_entity, (x ->> 'slot')::integer, 'commons', x ->> 'page', x ->> 'url', x ->> 'author', x ->> 'author_url', x ->> 'licence',
              x ->> 'licence_url', (x ->> 'share_alike')::boolean, (v_data ->> 'checked_on')::date, x ->> 'event', (x ->> 'date')::date, 'day', 'day',
              (x ->> 'fx')::integer, (x ->> 'fy')::integer, null, (x ->> 'width')::integer, (x ->> 'height')::integer, v_cw / v_np < 640,
              'approved', x ->> 'note', x ->> 'sha1', (x ->> 'quality')::smallint, (x ->> 'stage')::boolean, false,
              case when v_kind = 'group' then (x ->> 'parts')::smallint else null end)
      returning id into v_id;
      v_ids := v_ids || jsonb_build_object(x ->> 'key', v_id);
      v_added := v_added + 1;
    end loop;

    -- 2. the cards: the new photo, the 2x flag of their part, in the packs when the photo is live and has a file
    for x in select t.value from jsonb_array_elements(u -> 'cards') as t(value) loop
      if (x -> 'new') is not distinct from (x -> 'old') then continue; end if;
      v_id := case when jsonb_typeof(x -> 'new') = 'string' then (v_ids ->> (x ->> 'new'))::bigint else (x ->> 'new')::bigint end;
      if v_id is null then
        update public.cards_catalog set photo_id = null, in_packs = false where card_no = (x ->> 'no')::integer;
        continue;
      end if;
      select ph.status, ph.parts, ph.source_width, ph.source_height, ph.storage_path, ph.source_path, k.part, k.photo_id as cur into rp
        from public.cards_photos ph join public.cards_catalog k on k.card_no = (x ->> 'no')::integer
       where ph.id = v_id;
      v_status := case when exists (select 1 from jsonb_array_elements(u -> 'approve') as y(value) where (y.value ->> 'id')::bigint = v_id) then 'approved' else rp.status end;
      v_np := case when v_kind = 'group' then coalesce(rp.parts, 2)::integer else 1 end;
      v_cw := floor(least(rp.source_width::numeric, rp.source_height::numeric * (case when v_kind = 'group' then v_np * 5.5 else 5.5 end) / 8.5))::integer;
      v_small := case when v_kind = 'group' then (v_cw * rp.part / v_np - v_cw * (rp.part - 1) / v_np) < 640 else v_cw < 640 end;
      v_in := v_status in ('auto', 'approved') and (rp.storage_path is not null or rp.source_path is not null);
      if rp.cur is null then v_back := v_back + 1; else v_moved := v_moved + 1; end if;
      update public.cards_catalog set photo_id = v_id, small_2x = v_small, in_packs = v_in where card_no = (x ->> 'no')::integer;
    end loop;
    -- 3. the panoramas follow the photo of their edition
    for x in select t.value from jsonb_array_elements(u -> 'panos') as t(value) loop
      if (x -> 'new') is not distinct from (x -> 'old') then continue; end if;
      update public.cards_panoramas
         set photo_id = case when jsonb_typeof(x -> 'new') = 'string' then (v_ids ->> (x ->> 'new'))::bigint else (x ->> 'new')::bigint end
       where pano_no = (x ->> 'no')::integer;
      v_panos := v_panos + 1;
    end loop;
    -- 4. the pending photos the refill accepts (their cards were set above; the trigger of 103 agrees with them)
    for x in select t.value from jsonb_array_elements(u -> 'approve') as t(value) loop
      update public.cards_photos set status = 'approved', review_note = x ->> 'note' where id = (x ->> 'id')::bigint;
      v_approved := v_approved + 1;
    end loop;
    -- 5. an edition that comes back loses its lock reason
    if jsonb_typeof(u -> 'lock') = 'object' then
      update public.cards_entities set lock_reasons = u #> '{lock,new}' where id = v_entity;
      v_locks := v_locks + 1;
    end if;
    insert into public.cards_refill_log (entity_id, old, new) values (v_entity, v_old, u || jsonb_build_object('ids', v_ids));
    v_done := v_done || v_entity;
    v_applied := v_applied + 1;
  end loop;
${CHECKS('123-refill', 'v_done')}

  raise notice '123-refill: % subjects applied, % already applied, % left alone (changed since 119)', v_applied, v_already, v_left;
  raise notice '123-refill: new photos %, pending photos approved %', v_added, v_approved;
  raise notice '123-refill: cards back with a photo %, cards with another photo %, panoramas %, lock reasons %', v_back, v_moved, v_panos, v_locks;
end $c123$;
`;

  const rollback = `-- 123-refill.rollback.sql (Bunnyverse Cards, lot LAUNCH-PREP lane REFILL, ${day}; undoes 123-refill.sql)
--
-- What:   in ONE DO block, for every subject of cards_refill_log whose rows are still the ones 123 wrote: gives back its cards (photo_id,
--         in_packs, small_2x), its panoramas (photo_id), its approved pending photos (status pending, review_note, file columns) and its lock reasons, then
--         removes the photos 123 added (their files, if the workflow cut them, stay in the bucket until its cleanup) and deletes its log row.
--         A subject changed since 123 is left alone with a notice and keeps its log row. The table is dropped once it is empty.
-- Scope:  the cards move back first, then the photos (the triggers of 002 and 103 then agree with the cards). No XP, level, streak or badge.
-- Verify: select to_regclass('public.cards_refill_log') is null;   expect t (f when a notice says a subject was left alone)
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.status not in ('auto', 'approved');   expect 0
-- Refuses: between 23:50 and 00:30 UTC. A check after the writes that fails rolls the whole file back.
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c123r$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  l record;
  u jsonb;
  o jsonb;
  x jsonb;
  y jsonb;
  v_ids jsonb;
  v_why text;
  v_done text[] := '{}';
  v_back integer := 0;
  v_left integer := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '123-refill rollback: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_refill_log') is null then
    raise notice '123-refill rollback: nothing to undo (no cards_refill_log)';
    return;
  end if;
  lock table public.cards_photos, public.cards_catalog, public.cards_panoramas, public.cards_entities in share row exclusive mode;

  for l in select g.entity_id, g.old, g.new from public.cards_refill_log g order by g.entity_id loop
    u := l.new;
    o := l.old;
    v_ids := coalesce(u -> 'ids', '{}'::jsonb);
    v_why := null;
    -- every row must still be the one 123 wrote
    for x in select t.value from jsonb_array_elements(u -> 'cards') as t(value) loop
      if not exists (select 1 from public.cards_catalog k where k.card_no = (x ->> 'no')::integer
                       and k.photo_id is not distinct from (case when jsonb_typeof(x -> 'new') = 'string' then (v_ids ->> (x ->> 'new'))::bigint else (x ->> 'new')::bigint end)) then
        v_why := 'card BV1-' || lpad(x ->> 'no', 4, '0');
        exit;
      end if;
    end loop;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'panos') as t(value) loop
        if not exists (select 1 from public.cards_panoramas z where z.pano_no = (x ->> 'no')::integer
                         and z.photo_id is not distinct from (case when jsonb_typeof(x -> 'new') = 'string' then (v_ids ->> (x ->> 'new'))::bigint else (x ->> 'new')::bigint end)) then
          v_why := 'panorama P-' || lpad(x ->> 'no', 4, '0');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'approve') as t(value) loop
        if not exists (select 1 from public.cards_photos ph where ph.id = (x ->> 'id')::bigint and ph.status = 'approved') then
          v_why := 'photo ' || (x ->> 'id');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'add') as t(value) loop
        if not exists (select 1 from public.cards_photos ph where ph.id = (v_ids ->> (x ->> 'key'))::bigint and ph.status = 'approved'
                         and ph.focal_x = (x ->> 'fx')::integer and ph.focal_y = (x ->> 'fy')::integer) then
          v_why := 'the new photo ' || (x ->> 'page');
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
      raise notice '123-refill rollback: % left alone: % changed since 123', l.entity_id, v_why;
      continue;
    end if;
    -- the cards and the panoramas first, then the photos, then the lock reasons
    for y in select t.value from jsonb_array_elements(o -> 'cards') as t(value) loop
      update public.cards_catalog set photo_id = (y ->> 'photo_id')::bigint, in_packs = (y ->> 'in_packs')::boolean, small_2x = (y ->> 'small_2x')::boolean
       where card_no = (y ->> 'no')::integer
         and (photo_id is distinct from (y ->> 'photo_id')::bigint or in_packs <> (y ->> 'in_packs')::boolean or small_2x <> (y ->> 'small_2x')::boolean);
    end loop;
    for y in select t.value from jsonb_array_elements(o -> 'panos') as t(value) loop
      update public.cards_panoramas set photo_id = (y ->> 'photo_id')::bigint where pano_no = (y ->> 'no')::integer and photo_id is distinct from (y ->> 'photo_id')::bigint;
    end loop;
    -- an approved pending photo goes back to pending with its rows as they were (files the workflow cut for it stay in the bucket until its cleanup)
    for y in select t.value from jsonb_array_elements(o -> 'photos') as t(value) loop
      update public.cards_photos set status = y ->> 'status', review_note = y ->> 'review_note', storage_path = y ->> 'storage_path',
             file_focal_x = (y ->> 'file_focal_x')::integer, file_focal_y = (y ->> 'file_focal_y')::integer, file_parts = (y ->> 'file_parts')::smallint,
             file_pano = (y ->> 'file_pano')::boolean
       where id = (y ->> 'id')::bigint;
    end loop;
    delete from public.cards_photos ph where ph.entity_id = l.entity_id
       and ph.id in (select (t.value)::text::bigint from jsonb_each(v_ids) as t(key, value));
    if jsonb_typeof(u -> 'lock') = 'object' then
      update public.cards_entities set lock_reasons = o -> 'lock_reasons' where id = l.entity_id;
    end if;
    delete from public.cards_refill_log where entity_id = l.entity_id;
    v_done := v_done || l.entity_id;
    v_back := v_back + 1;
  end loop;
${CHECKS('123-refill rollback', 'v_done')}

  if not exists (select 1 from public.cards_refill_log) then
    drop table public.cards_refill_log;
  end if;
  raise notice '123-refill rollback: % subjects given back, % left alone', v_back, v_left;
end $c123r$;
`;
  return { sql, rollback, units };
}
