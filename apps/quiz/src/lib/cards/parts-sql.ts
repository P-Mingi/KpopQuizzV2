// Bunnyverse Cards lot 7 (owner, 2026-11-17): the text of docs/pending-migrations/cards/118-group-parts.sql and its rollback, built by
// scripts/cards/gen-parts-sql.mts from the files that hold the functions it replaces (117, 114, 110) and from the data of the lot
// (docs/design/cards/data/lot7/parts.json). Pure: no file, no network, no database. parts-sql.test.ts runs both files on PGlite.
//
// A group photo gives 2 or 3 cards (cards_photos.parts), the parts have consecutive numbers (part 1 to 3), and every group edition has a
// panorama (cards_panoramas, P-0001 and up) that the server gives once, in the transaction of the open or the craft that completes the set.
// The four functions are the old ones with a handful of exact replacements (every replacement must match exactly once, else the generator
// throws): the old text is extracted from the older file, its md5 is checked at apply time, the new one is checked after.
import { createHash } from 'node:crypto';

/** The day of the file (lot 7 contract). */
export const PARTS_DAY = '2026-11-17';

/** A verdict line of parts.json (the DATA lane writes the file; see docs/o1/reports/CARDS/LOT7-CONTRACT.md). */
export interface PartsPhoto {
  page: string;
  parts: 2 | 3;
  heads_box: { x0: number; x1: number; y0: number; y1: number; hw: number } | null;
  note: string;
  focal_from: { x: number; y: number } | null;
  focal: { x: number; y: number } | null;
  review: boolean;
  rejected: boolean;
  by: 'thumbnail' | 'ratio';
}
export interface PartsData { checked_on: string; photos: PartsPhoto[] }

/** The three files the old functions come from. */
export interface PartsSources { text117: string; text114: string; text110: string }

export const REJECTED_NOTE = 'Rejected by the lot 7 thumbnail check: a person seems under 18';

const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');

/** A function as a file writes it: the whole statement and its body as pg_proc.prosrc holds it (between the $f$ quotes). */
export function extractFunction(text: string, start: string, label: string): { statement: string; body: string } {
  const a = text.indexOf(start);
  if (a < 0 || text.indexOf(start, a + 1) >= 0) throw new Error(`${label}: "${start.trim()}" must be defined exactly once`);
  const open = text.indexOf('as $f$', a);
  const close = text.indexOf('$f$;', open + 6);
  if (open < 0 || close < 0) throw new Error(`${label}: the body was not found`);
  return { statement: text.slice(a, close + 4), body: text.slice(open + 6, close) };
}

/** Replaces `from` by `to` once; throws when `from` is not there exactly once (so a changed old file is noticed at generation). */
function swap(text: string, from: string, to: string, what: string): string {
  const a = text.indexOf(from);
  if (a < 0 || text.indexOf(from, a + 1) >= 0) throw new Error(`parts-sql: "${what}" must match exactly once in the old text`);
  return text.slice(0, a) + to + text.slice(a + from.length);
}

type Fn = 'build' | 'append' | 'open' | 'craft';
const FNS: Fn[] = ['build', 'append', 'open', 'craft'];
const NAME: Record<Fn, string> = { build: 'cards_build_catalog', append: 'cards_catalog_append', open: 'cards_open', craft: 'cards_craft' };
const SIG: Record<Fn, string> = {
  build: 'public.cards_build_catalog()',
  append: 'public.cards_catalog_append(boolean)',
  open: 'public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)',
  craft: 'public.cards_craft(uuid, text, integer, timestamptz, integer)',
};
const FROM: Record<Fn, string> = { build: '117', append: '114', open: '110', craft: '110' };
const START: Record<Fn, string> = {
  build: '  create or replace function public.cards_build_catalog()',
  append: '  create or replace function public.cards_catalog_append(p_dry_run boolean default true)',
  open: '  create or replace function public.cards_open(',
  craft: '  create or replace function public.cards_craft(p_user uuid, p_key text, p_card_no integer, p_now timestamptz default now(), p_timer_cap integer default 40)',
};

// ---- the shared edit of the photo query of cards_build_catalog() and cards_catalog_append(): a group photo of `np` cards ----
function patchPhotoQuery(t: string, label: string): string {
  let s = t;
  s = swap(s, `             array_agg(x.cw order by x.rk), array_agg(x.shown order by x.rk)
        into v_ids, v_full, v_stage, v_cw, v_shown
        from (select p.id, p.stage, w.cw,
                     case when e.kind = 'group' then w.cw / 2 >= 640 else w.cw >= 640 end as full_ok,`,
  `             array_agg(x.cw order by x.rk), array_agg(x.shown order by x.rk), array_agg(x.np order by x.rk)
        into v_ids, v_full, v_stage, v_cw, v_shown, v_np
        from (select p.id, p.stage, w.cw, n.np,
                     -- lot 7: Full Art needs every part (the narrowest is floor(window / parts)) to be at least 640 px wide
                     w.cw / n.np >= 640 as full_ok,`, `${label} the photo columns`);
  s = swap(s, 'row_number() over (order by coalesce(p.quality, 3) desc, w.cw desc, p.event_date desc nulls last, p.slot) as rk',
    // ranked by the width of ONE card; the whole window breaks the ties, so a photo in 2 keeps the order it has today
    'row_number() over (order by coalesce(p.quality, 3) desc, w.cw / n.np desc, w.cw desc, p.event_date desc nulls last, p.slot) as rk', `${label} the ranking`);
  s = swap(s, `                cross join lateral (select floor(least(p.source_width::numeric,
                                      p.source_height::numeric * (case when e.kind = 'group' then 11 else 5.5 end) / 8.5))::integer as cw) w`,
  `                cross join lateral (select case when e.kind = 'group' then coalesce(p.parts, 2)::integer else 1 end as np) n
                cross join lateral (select floor(least(p.source_width::numeric,
                                      p.source_height::numeric * (case when e.kind = 'group' then n.np * 5.5 else 5.5 end) / 8.5))::integer as cw) w`, `${label} the window`);
  return s;
}

/** cards_build_catalog() of 117 with the parts and the panoramas. */
function newBuild(old: string): string {
  let s = old;
  s = swap(s, '    v_cwi integer;\n', '    v_cwi integer;\n    v_np integer[];\n    v_pn integer;\n    v_k integer;\n    v_panos integer := 0;\n', 'build declarations');
  s = swap(s, `      raise exception 'cards_build_catalog: a pack was opened, the catalog numbers cannot change';
    end if;
    delete from public.cards_catalog where true;
`, `      raise exception 'cards_build_catalog: a pack was opened, the catalog numbers cannot change';
    end if;
    if exists (select 1 from public.cards_panoramas_owned) then
      raise exception 'cards_build_catalog: a player owns a panorama, the catalog numbers cannot change';
    end if;
    delete from public.cards_catalog where true;
    delete from public.cards_panoramas where true;
`, 'build refusals');
  s = patchPhotoQuery(s, 'build');
  s = swap(s, `        if e.kind = 'group' then
          insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
          values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 1, v_cwi / 2 < 640),
                 (v_no + 2, 'BV1-' || lpad((v_no + 2)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 2, (v_cwi - v_cwi / 2) < 640);
          v_no := v_no + 2;
`, `        if e.kind = 'group' then
          -- lot 7: the parts of the photo (2 or 3), consecutive numbers; part k spans [floor(W (k - 1) / n), floor(W k / n)) of the window W
          v_pn := v_np[v_i];
          for v_k in 1 .. v_pn loop
            insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
            values (v_no + v_k, 'BV1-' || lpad((v_no + v_k)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], v_k,
                    (v_cwi * v_k / v_pn - v_cwi * (v_k - 1) / v_pn) < 640);
          end loop;
          v_no := v_no + v_pn;
`, 'build inserts');
  s = swap(s, `    return jsonb_build_object('subjects', v_subjects, 'waiting', v_waiting, 'cards', v_no,`,
  `    -- lot 7: one panorama per group edition, numbered P-0001 and up in the order of the catalog (its first part's number)
    insert into public.cards_panoramas (pano_no, num, entity_id, rarity, edition, photo_id, parts, first_card)
    select row_number() over (order by c.card_no), 'P-' || lpad((row_number() over (order by c.card_no))::text, 4, '0'), c.entity_id, c.rarity, c.edition, c.photo_id,
           (select max(h.part) from public.cards_catalog h where h.entity_id = c.entity_id and h.rarity = c.rarity), c.card_no
      from public.cards_catalog c where c.part = 1;
    get diagnostics v_panos = row_count;
    return jsonb_build_object('subjects', v_subjects, 'waiting', v_waiting, 'cards', v_no, 'panoramas', v_panos,`, 'build answer');
  return s;
}

/** cards_catalog_append() of 114 with the parts and the panoramas. */
function newAppend(old: string): string {
  let s = old;
  s = swap(s, '    v_in boolean;\n    v_size boolean;\n', '    v_in boolean;\n    v_size boolean;\n    v_np integer[];\n    v_pn integer;\n    v_m integer;\n    v_pano integer;\n    v_panos integer := 0;\n', 'append declarations');
  s = swap(s, '    v_no := v_base;\n', '    v_no := v_base;\n    select coalesce(max(pano_no), 0) into v_pano from public.cards_panoramas;\n', 'append panorama base');
  s = patchPhotoQuery(s, 'append');
  s = swap(s, `        if not p_dry_run then
          if e.kind = 'group' then
            insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
            values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 1, v_cwi / 2 < 640),
                   (v_no + 2, 'BV1-' || lpad((v_no + 2)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 2, (v_cwi - v_cwi / 2) < 640);
          else`, `        v_pn := case when e.kind = 'group' then v_np[v_i] else 1 end;
        if not p_dry_run then
          if e.kind = 'group' then
            -- lot 7: the parts of the photo (2 or 3), then its panorama after the highest P number
            for v_m in 1 .. v_pn loop
              insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
              values (v_no + v_m, 'BV1-' || lpad((v_no + v_m)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], v_m,
                      (v_cwi * v_m / v_pn - v_cwi * (v_m - 1) / v_pn) < 640);
            end loop;
            v_pano := v_pano + 1;
            insert into public.cards_panoramas (pano_no, num, entity_id, rarity, edition, photo_id, parts, first_card)
            values (v_pano, 'P-' || lpad(v_pano::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_pn, v_no + 1);
          else`, 'append inserts');
  s = swap(s, '        v_j := case when e.kind = \'group\' then 2 else 1 end;\n', '        v_j := v_pn;\n        if e.kind = \'group\' then v_panos := v_panos + 1; end if;\n', 'append count');
  s = swap(s, "      'by_rarity', v_by, 'not_shown', v_not_shown);", "      'by_rarity', v_by, 'not_shown', v_not_shown, 'panoramas', v_panos);", 'append answer');
  return s;
}

/** cards_open() of 110 with the missing part rule and the panorama. */
function newOpen(old: string): string {
  let s = old;
  s = swap(s, '    v_have_hi boolean;\n', '    v_have_hi boolean;\n    v_panos integer[];\n    v_pano integer;\n', 'open declarations');
  s = swap(s, `      v_seen := '{}';
      v_newn := 0;
`, `      v_seen := '{}';
      v_panos := '{}';
      v_newn := 0;
`, 'open pack start');
  s = swap(s, `        if v_c.part in (1, 2) then
          select h.card_no into v_pick from public.cards_catalog h where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part = 3 - v_c.part and h.in_packs;
          if v_pick is not null then
            v_own_c := exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
            v_own_p := exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_pick);
            if v_own_c and not v_own_p then
              v_card := v_pick;
              v_cards[v_k] := v_pick;
              select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
            end if;
          end if;
        end if;
`, `        -- lot 7, the missing part rule: a part the player owns, while another part of the same photo (entity and rarity) in packs is missing, becomes
        -- the lowest-numbered missing part (cards of this pack stored before count as owned)
        if v_c.part > 0 then
          v_pick := null;
          if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card) then
            select h.card_no into v_pick from public.cards_catalog h
             where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.in_packs
               and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no)
             order by h.part limit 1;
            if v_pick is not null then
              v_card := v_pick;
              v_cards[v_k] := v_pick;
              select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
            end if;
          end if;
        end if;
`, 'open swap');
  s = swap(s, `        if v_new and v_c.part in (1, 2) then
          v_pair := exists (select 1 from public.cards_catalog h join public.cards_owned o on o.card_no = h.card_no and o.user_id = p_user
                             where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part = 3 - v_c.part);
        end if;
`, `        if v_new and v_c.part > 0 then
          -- the last missing part: the photo has other parts and the player owns every one of them
          v_pair := exists (select 1 from public.cards_catalog h where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.card_no <> v_card)
                    and not exists (select 1 from public.cards_catalog h
                                     where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.card_no <> v_card
                                       and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no));
        end if;
`, 'open pair');
  s = swap(s, `        v_cards_out := v_cards_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new, 'completesPair', v_pair,
                                                                           'golden', v_k = 5 and v_golden, 'guarantee', v_k = 5 and v_pity));
`, `        -- lot 7: the card that completes its set gives the panorama, once (its row is written with the pack, below)
        v_pano := null;
        if v_pair then
          select pa.pano_no into v_pano from public.cards_panoramas pa
           where pa.entity_id = v_c.entity_id and pa.rarity = v_c.rarity
             and not exists (select 1 from public.cards_panoramas_owned po where po.user_id = p_user and po.pano_no = pa.pano_no);
          if v_pano is not null then v_panos := v_panos || v_pano; end if;
        end if;
        v_cards_out := v_cards_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new, 'completesPair', v_pair,
                                                                           'golden', v_k = 5 and v_golden, 'guarantee', v_k = 5 and v_pity)
                                                         || case when v_pano is not null then jsonb_build_object('pano', v_pano) else '{}'::jsonb end);
`, 'open card entry');
  s = swap(s, `      returning id into v_pack;
`, `      returning id into v_pack;
      if cardinality(v_panos) > 0 then
        insert into public.cards_panoramas_owned (user_id, pano_no, source, pack_id)
        select p_user, x.p, 'pack', v_pack from unnest(v_panos) as x(p)
        on conflict (user_id, pano_no) do nothing;
      end if;
`, 'open pack insert');
  s = swap(s, "'cards', v_cards_out, 'new_count', v_newn));", "'cards', v_cards_out, 'new_count', v_newn, 'panoramas', to_jsonb(v_panos)));", 'open pack entry');
  return s;
}

/** cards_craft() of 110 with the panorama. */
function newCraft(old: string): string {
  let s = old;
  s = swap(s, '    v_out jsonb;\n  begin\n', '    v_out jsonb;\n    v_ent text;\n    v_part smallint;\n    v_pano integer;\n  begin\n', 'craft declarations');
  s = swap(s, `    select c.rarity into v_rarity
      from public.cards_catalog c`, `    select c.rarity, c.entity_id, c.part into v_rarity, v_ent, v_part
      from public.cards_catalog c`, 'craft select');
  s = swap(s, `    delete from public.cards_wishlist where user_id = p_user and card_no = p_card_no;
`, `    delete from public.cards_wishlist where user_id = p_user and card_no = p_card_no;
    -- lot 7: the crafted part was the last missing one of its photo: the panorama, once
    v_pano := null;
    if v_part > 0 and not exists (select 1 from public.cards_catalog h where h.entity_id = v_ent and h.rarity = v_rarity and h.part > 0
                                     and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no)) then
      select pa.pano_no into v_pano from public.cards_panoramas pa
       where pa.entity_id = v_ent and pa.rarity = v_rarity
         and not exists (select 1 from public.cards_panoramas_owned po where po.user_id = p_user and po.pano_no = pa.pano_no);
      if v_pano is not null then
        insert into public.cards_panoramas_owned (user_id, pano_no, source, pack_id) values (p_user, v_pano, 'craft', null)
        on conflict (user_id, pano_no) do nothing;
      end if;
    end if;
`, 'craft grant');
  s = swap(s, "'shards', w.shards - v_cost, 'finished', v_fin);", "'shards', w.shards - v_cost, 'finished', v_fin, 'pano', v_pano);", 'craft answer');
  return s;
}

const REPLACE: Record<Fn, (old: string) => string> = { build: newBuild, append: newAppend, open: newOpen, craft: newCraft };

export interface PartsSql {
  sql: string;
  rollback: string;
  md5Old: Record<Fn, string>;
  md5New: Record<Fn, string>;
  /** The photos of the data, as written in the file. */
  photos: number;
}

/** Checks the data and writes it as the jsonb literal of the file (the en and em dashes of a note are escaped, never written). */
export function dataLiteral(data: PartsData): string {
  if (!data || typeof data.checked_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.checked_on) || !Array.isArray(data.photos)) {
    throw new Error('parts data: { checked_on: "YYYY-MM-DD", photos: [...] } expected');
  }
  const seen = new Set<string>();
  const int = (v: unknown, what: string): number => {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100) throw new Error(`parts data: ${what} must be an integer from 0 to 100`);
    return v;
  };
  const xy = (v: unknown, what: string): { x: number; y: number } | null => {
    if (v === null || v === undefined) return null;
    const o = v as { x: unknown; y: unknown };
    return { x: int(o.x, `${what}.x`), y: int(o.y, `${what}.y`) };
  };
  const photos = data.photos.map((p, i) => {
    const at = `photos[${i}]`;
    if (typeof p.page !== 'string' || !p.page.startsWith('https://commons.wikimedia.org/wiki/File:')) throw new Error(`parts data: ${at}.page must be a Commons file page`);
    if (seen.has(p.page)) throw new Error(`parts data: ${at}.page is listed twice (${p.page})`);
    seen.add(p.page);
    if (p.parts !== 2 && p.parts !== 3) throw new Error(`parts data: ${at}.parts must be 2 or 3`);
    let heads: PartsPhoto['heads_box'] = null;
    if (p.heads_box) {
      const h = p.heads_box;
      for (const k of ['x0', 'x1', 'y0', 'y1', 'hw'] as const) if (typeof h[k] !== 'number' || !Number.isFinite(h[k])) throw new Error(`parts data: ${at}.heads_box.${k} must be a number`);
      heads = { x0: h.x0, x1: h.x1, y0: h.y0, y1: h.y1, hw: h.hw };
    }
    if (typeof p.note !== 'string' || p.note.trim() === '') throw new Error(`parts data: ${at}.note must be a line`);
    if (typeof p.review !== 'boolean' || typeof p.rejected !== 'boolean') throw new Error(`parts data: ${at}.review and .rejected must be booleans`);
    if (p.by !== 'thumbnail' && p.by !== 'ratio') throw new Error(`parts data: ${at}.by must be "thumbnail" or "ratio"`);
    return { page: p.page, parts: p.parts, heads_box: heads, note: p.note, focal_from: xy(p.focal_from, `${at}.focal_from`), focal: xy(p.focal, `${at}.focal`),
      review: p.review, rejected: p.rejected, by: p.by };
  });
  const json = JSON.stringify({ checked_on: data.checked_on, photos }).replace(/[–—]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  if (json.includes('$parts$')) throw new Error('parts data: a text holds the quote $parts$');
  return json;
}

export function buildParts(src: PartsSources, data: PartsData, day: string = PARTS_DAY): PartsSql {
  const text: Record<Fn, string> = { build: src.text117, append: src.text114, open: src.text110, craft: src.text110 };
  const oldFn = {} as Record<Fn, { statement: string; body: string }>;
  const newFn = {} as Record<Fn, { statement: string; body: string }>;
  const md5Old = {} as Record<Fn, string>;
  const md5New = {} as Record<Fn, string>;
  for (const f of FNS) {
    oldFn[f] = extractFunction(text[f], START[f], FROM[f]);
    const statement = REPLACE[f](oldFn[f].statement);
    const a = statement.indexOf('as $f$');
    const b = statement.lastIndexOf('$f$;');
    newFn[f] = { statement, body: statement.slice(a + 6, b) };
    md5Old[f] = md5(oldFn[f].body);
    md5New[f] = md5(newFn[f].body);
  }
  const json = dataLiteral(data);
  const grants = (f: Fn, ind: string): string => `${ind}revoke all on function ${SIG[f]} from public, anon, authenticated;\n${ind}grant execute on function ${SIG[f]} to service_role;`;
  const regproc = (f: Fn): string => `to_regprocedure('${SIG[f]}')`;
  const inList = (m: Record<Fn, string>): string => FNS.map((f) => `'${m[f]}'`).join(', ');
  const names = FNS.map((f) => `'${NAME[f]}'`).join(', ');
  const idx = (m: Record<Fn, string>, f: Fn): string => m[f];

  const sql = `-- 118-group-parts.sql (Bunnyverse Cards lot 7, ${day}; a group photo in 2 or 3 cards, and the panorama of every group edition)
--
-- What:   in ONE DO block, additive:
--           cards_photos      + parts (2 or 3, null reads as 2), file_parts (what the owner's files were cut for, null reads as 2), file_pano
--                             (the panorama file exists), heads_box (jsonb, the thumbnail verdict, geometry only), parts_note (the rule's line)
--           cards_catalog     part check widened to 0 to 3 (part 1 to 3 of a group photo, consecutive card numbers)
--           new tables        cards_panoramas (P-0001 and up, one per group edition), cards_panoramas_owned (who holds which, source pack or craft),
--                             cards_parts_log (what this file changed on a photo row, for the rollback); RLS on, service_role only
--           4 functions replaced (same signatures, same privileges): cards_build_catalog (117's: a group photo of 2 or 3 cards, ranked by the width
--                             of ONE card, Full Art needs every part at 640 px, small_2x per part, the panoramas rebuilt, refuses when a panorama is
--                             owned), cards_catalog_append (114's: the same parts, a panorama after the highest P number), cards_open (110's: the
--                             missing part rule for 2 and 3 parts, completesPair on the last part, the panorama given once, answer gains pano and
--                             panoramas), cards_craft (110's: the same grant, answer gains pano)
--           data              ${data.photos.length} group photos from docs/design/cards/data/lot7/parts.json (checked on ${data.checked_on}), by source_page: parts, heads_box,
--                             parts_note and small_2x (the 2x flag of the new window); the focal point only when it is still the one the verdict was read at (else a notice per photo); a photo
--                             where someone would be cut even in 3 cards goes to pending ("To review: ..."); a photo that seems to show a person under
--                             18 is rejected. Old status, note and focal go to cards_parts_log first.
-- Why:    lot 7 (owner and integrator, 2026-11-17): a wide group photo cut in two loses people; the smallest window that keeps everyone gives 2 or 3
--         cards, and the player who holds every part gets the whole picture as a panorama (never in a pack, never crafted, never recycled).
-- Scope:  every UPDATE and DELETE of the four functions has a WHERE ("where true" for all rows): safeupdate.test.ts scans them.
-- Rows:   cards_photos rows changed: the ones of the data found by source_page (group photos only); none of the other tables gets a row here. The catalog
--         is NOT rebuilt by this file: run "Reconstruire le catalogue" (cards_build_catalog) afterwards, so the cards follow the parts and the
--         panoramas are written. The notice says "118-group-parts: photos set to 2 ..., to 3 ..., focal points moved ..., kept ..., to review ..., rejected ..., pages not found ...".
-- Needs:  103 and 117 (cards_build_catalog), 110 (cards_open, cards_craft), 114 (cards_catalog_append), 116 for the photos. Apply after a backup, never between
--         23:50 and 00:30 UTC.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (${names}) and md5(prosrc) in (${inList(md5New)});   expect 4
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (${names}) and md5(prosrc) in (${inList(md5Old)});   expect 0
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (${names}) and prosecdef and proconfig = array['search_path=public'];   expect 4
-- Verify: select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (${names}) and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));   expect 0
-- Verify: select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (${names}) and has_function_privilege('service_role', p.oid, 'execute');   expect 4
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name in ('parts', 'file_parts', 'file_pano', 'heads_box', 'parts_note');   expect 5
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_panoramas', 'cards_panoramas_owned', 'cards_parts_log') and rowsecurity;   expect 3
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_panoramas', 'cards_panoramas_owned', 'cards_parts_log') and grantee in ('anon', 'authenticated', 'PUBLIC');   expect 0
-- Verify: select pg_get_constraintdef(oid) like '%part >= 0%' and pg_get_constraintdef(oid) like '%part <= 3%' from pg_constraint where conname = 'cards_catalog_part_check' and conrelid = 'public.cards_catalog'::regclass;   expect t
-- Verify: select count(*) from public.cards_photos p where p.parts is not null and not exists (select 1 from public.cards_entities e where e.id = p.entity_id and e.kind = 'group');   expect 0
-- Verify: select count(*) from public.cards_parts_log l where not exists (select 1 from public.cards_photos p where p.id = l.photo_id);   expect 0
-- Verify: select coalesce(max(pano_no), 0) - count(*) from public.cards_panoramas;   expect 0 (P numbers contiguous; the table is filled by the next rebuild)
-- Verify: select count(*) from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = a.part + 1 where a.part > 0 and b.card_no <> a.card_no + 1;   expect 0
-- Refuses: between 23:50 and 00:30 UTC; when a pack was opened (cards_packs), a card is owned (cards_owned) or a panorama is owned (cards_panoramas_owned);
--          when a function it replaces is not the expected version (cards_build_catalog 117's, cards_catalog_append 114's, cards_open and cards_craft
--          110's; md5 of the body); when 103, 110 or 114 is missing. Nothing changed in every case.
-- Undo:   118-group-parts.rollback.sql (gives back the four functions, the rows of cards_parts_log, drops what 118 added; refused once a pack was opened).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c118$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  v_md5 text;
  v_ok integer := 0;
  v_has boolean;
  v_data jsonb := $parts$${json}$parts$::jsonb;
  d record;
  p record;
  v_found integer;
  v_two integer := 0;
  v_three integer := 0;
  v_moved integer := 0;
  v_kept integer := 0;
  v_review integer := 0;
  v_rejected integer := 0;
  v_missing integer := 0;
  v_status text;
  v_note text;
  v_reason text;
  v_fx integer;
  v_fy integer;
  v_nx integer;
  v_ny integer;
  v_small boolean;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '118-group-parts: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_photos') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_entities') is null
     or to_regclass('public.cards_packs') is null or to_regclass('public.cards_owned') is null then
    raise exception '118-group-parts: the cards tables are missing (run 001 to 003 first), nothing changed';
  end if;
  if ${FNS.map((f) => `${regproc(f)} is null`).join('\n     or ')} then
    raise exception '118-group-parts: cards_build_catalog (103, 117), cards_catalog_append (114), cards_open or cards_craft (110) is missing, nothing changed';
  end if;

  -- Already applied: the four functions are this file's. A second run changes nothing.
${FNS.map((f) => `  select md5(prosrc) into v_md5 from pg_proc where oid = ${regproc(f)};
  if v_md5 = '${md5New[f]}' then v_ok := v_ok + 1; end if;`).join('\n')}
  if v_ok = 4 then
    raise notice '118-group-parts: already applied, nothing changed';
    return;
  end if;
${FNS.map((f) => `  select md5(prosrc) into v_md5 from pg_proc where oid = ${regproc(f)};
  if v_md5 <> '${md5Old[f]}' then
    raise exception '118-group-parts: ${NAME[f]}() is not the version of ${FROM[f]} (md5 %), nothing changed', v_md5;
  end if;`).join('\n')}

  -- The guard: no pack opened, no card owned, no panorama owned.
  if exists (select 1 from public.cards_packs) then
    raise exception '118-group-parts: a pack was opened (cards_packs holds rows), the catalog numbers cannot change, nothing changed';
  end if;
  if exists (select 1 from public.cards_owned) then
    raise exception '118-group-parts: a player owns a card (cards_owned holds rows), the catalog numbers cannot change, nothing changed';
  end if;
  if to_regclass('public.cards_panoramas_owned') is not null then
    execute 'select exists (select 1 from public.cards_panoramas_owned)' into v_has;
    if v_has then
      raise exception '118-group-parts: a player owns a panorama (cards_panoramas_owned holds rows), nothing changed';
    end if;
  end if;

  -- ---------- the columns of cards_photos ----------
  alter table public.cards_photos add column if not exists parts smallint constraint cards_photos_parts_check check (parts is null or parts in (2, 3));
  alter table public.cards_photos add column if not exists file_parts smallint constraint cards_photos_file_parts_check check (file_parts is null or file_parts in (2, 3));
  alter table public.cards_photos add column if not exists file_pano boolean not null default false;
  alter table public.cards_photos add column if not exists heads_box jsonb
    constraint cards_photos_heads_box_check check (heads_box is null or (jsonb_typeof(heads_box) = 'object' and heads_box ?& array['x0', 'x1', 'y0', 'y1', 'hw']));
  alter table public.cards_photos add column if not exists parts_note text;

  -- the part of a card: 0 a whole card, 1 to 3 the parts of a group photo
  alter table public.cards_catalog drop constraint if exists cards_catalog_part_check;
  alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 3);

  -- ---------- the panoramas ----------
  create table if not exists public.cards_panoramas (
    pano_no integer constraint cards_panoramas_pkey primary key constraint cards_panoramas_pano_no_check check (pano_no > 0),
    num text not null constraint cards_panoramas_num_key unique constraint cards_panoramas_num_check check (num ~ '^P-[0-9]{4,}$'),
    entity_id text not null constraint cards_panoramas_entity_id_fkey references public.cards_entities(id) on delete cascade,
    rarity text not null,
    edition text not null,
    photo_id bigint constraint cards_panoramas_photo_id_fkey references public.cards_photos(id) on delete set null,
    parts smallint not null constraint cards_panoramas_parts_check check (parts in (2, 3)),
    first_card integer not null constraint cards_panoramas_first_card_fkey references public.cards_catalog(card_no) on delete cascade,
    constraint cards_panoramas_entity_rarity_key unique (entity_id, rarity)
  );
  create table if not exists public.cards_panoramas_owned (
    user_id uuid not null constraint cards_panoramas_owned_user_id_fkey references auth.users(id) on delete cascade,
    pano_no integer not null constraint cards_panoramas_owned_pano_no_fkey references public.cards_panoramas(pano_no) on delete cascade,
    granted_at timestamptz not null default now(),
    source text not null constraint cards_panoramas_owned_source_check check (source in ('pack', 'craft')),
    pack_id uuid constraint cards_panoramas_owned_pack_id_fkey references public.cards_packs(id) on delete set null,
    seen boolean not null default false,
    constraint cards_panoramas_owned_pkey primary key (user_id, pano_no)
  );
  create index if not exists cards_panoramas_owned_pano_idx on public.cards_panoramas_owned (pano_no);
  create table if not exists public.cards_parts_log (
    photo_id bigint constraint cards_parts_log_pkey primary key,
    status text,
    review_note text,
    focal_x integer,
    focal_y integer,
    small_2x boolean
  );
  alter table public.cards_panoramas enable row level security;
  alter table public.cards_panoramas_owned enable row level security;
  alter table public.cards_parts_log enable row level security;
  revoke all on table public.cards_panoramas, public.cards_panoramas_owned, public.cards_parts_log from public, anon, authenticated;
  grant all on table public.cards_panoramas, public.cards_panoramas_owned, public.cards_parts_log to service_role;

  -- ---------- the data: the parts of the group photos, by source_page ----------
  for d in select x.page, x.parts, nullif(x.heads_box, 'null'::jsonb) as heads_box, x.note, nullif(x.focal_from, 'null'::jsonb) as focal_from,
                  nullif(x.focal, 'null'::jsonb) as focal, coalesce(x.review, false) as review, coalesce(x.rejected, false) as rejected
             from jsonb_to_recordset(v_data -> 'photos') as x(page text, parts integer, heads_box jsonb, note text, focal_from jsonb, focal jsonb, review boolean, rejected boolean) loop
    v_found := 0;
    for p in select ph.id, ph.status, ph.review_note, ph.focal_x, ph.focal_y, ph.small_2x, ph.source_width, ph.source_height
               from public.cards_photos ph join public.cards_entities e on e.id = ph.entity_id
              where ph.source_page = d.page and e.kind = 'group' order by ph.id loop
      v_found := v_found + 1;
      v_status := p.status;
      v_note := p.review_note;
      v_fx := p.focal_x;
      v_fy := p.focal_y;
      if d.rejected then
        if p.status <> 'rejected' then
          v_status := 'rejected';
          v_note := '${REJECTED_NOTE}';
          v_rejected := v_rejected + 1;
        end if;
      elsif d.review then
        v_reason := case when d.note like 'To review: %' then d.note else 'To review: ' || d.note end;
        if p.status in ('auto', 'approved') then
          v_status := 'pending';
          v_note := v_reason;
          v_review := v_review + 1;
        elsif p.status = 'pending' and position(v_reason in coalesce(p.review_note, '')) = 0 then
          v_note := coalesce(nullif(p.review_note, '') || ' | ', '') || v_reason;
          v_review := v_review + 1;
        end if;
      end if;
      if d.focal is not null then
        v_nx := (d.focal ->> 'x')::integer;
        v_ny := (d.focal ->> 'y')::integer;
        if p.focal_x is distinct from v_nx or p.focal_y is distinct from v_ny then
          if d.focal_from is not null and p.focal_x is not distinct from (d.focal_from ->> 'x')::integer and p.focal_y is not distinct from (d.focal_from ->> 'y')::integer then
            v_fx := v_nx;
            v_fy := v_ny;
            v_moved := v_moved + 1;
          else
            v_kept := v_kept + 1;
            raise notice '118-group-parts: focal point kept for % (the owner''s %/%, the verdict was read at %/%)', d.page, p.focal_x, p.focal_y,
              coalesce(d.focal_from ->> 'x', '?'), coalesce(d.focal_from ->> 'y', '?');
          end if;
        end if;
      end if;
      -- the photo's own 2x flag follows its window: a part (the narrowest is floor(window / parts)) under 640 px; for 2 parts it is today's value
      v_small := p.small_2x;
      if p.source_width is not null and p.source_height is not null then
        v_small := floor(least(p.source_width::numeric, p.source_height::numeric * (d.parts * 5.5) / 8.5))::integer / d.parts < 640;
      end if;
      if v_status is distinct from p.status or v_note is distinct from p.review_note or v_fx is distinct from p.focal_x or v_fy is distinct from p.focal_y
         or v_small is distinct from p.small_2x then
        insert into public.cards_parts_log (photo_id, status, review_note, focal_x, focal_y, small_2x) values (p.id, p.status, p.review_note, p.focal_x, p.focal_y, p.small_2x)
        on conflict (photo_id) do nothing;
      end if;
      update public.cards_photos set parts = d.parts, heads_box = d.heads_box, parts_note = d.note, focal_x = v_fx, focal_y = v_fy, small_2x = v_small where id = p.id;
      if v_status is distinct from p.status or v_note is distinct from p.review_note then
        update public.cards_photos set status = v_status, review_note = v_note where id = p.id;
      end if;
      if d.parts = 3 then v_three := v_three + 1; else v_two := v_two + 1; end if;
    end loop;
    if v_found = 0 then v_missing := v_missing + 1; end if;
  end loop;

  -- ---------- the four functions ----------
${FNS.map((f) => `${newFn[f].statement}\n${grants(f, '  ')}\n`).join('\n')}
  -- ---------- checks ----------
  v_ok := 0;
${FNS.map((f) => `  if (select md5(prosrc) from pg_proc where oid = ${regproc(f)}) = '${md5New[f]}' then v_ok := v_ok + 1; end if;`).join('\n')}
  if v_ok <> 4 then
    raise exception '118-group-parts: a new body is not the expected one, nothing changed';
  end if;
  if exists (select 1 from pg_proc pr where pr.pronamespace = 'public'::regnamespace and pr.proname in (${names})
              and (has_function_privilege('anon', pr.oid, 'execute') or has_function_privilege('authenticated', pr.oid, 'execute'))) then
    raise exception '118-group-parts: a browser role can execute a function of this file, nothing changed';
  end if;
  raise notice '118-group-parts: photos set to 2: %, to 3: %, focal points moved %, kept (owner''s) %, to review %, rejected %, pages not found %', v_two, v_three, v_moved, v_kept, v_review, v_rejected, v_missing;
  raise notice '118-group-parts: the catalog is not rebuilt by this file: run "Reconstruire le catalogue" so the cards follow the parts and the panoramas are written';
  notify pgrst, 'reload schema';
end $c118$;
`;

  const rollback = `-- 118-group-parts.rollback.sql (undo of 118-group-parts.sql)
--
-- What:   refused once a pack was opened, a card or a panorama is owned. Gives back the four functions (the text of 117's cards_build_catalog, 114's
--         cards_catalog_append, 110's cards_open and cards_craft, md5 checked), puts the photo rows of cards_parts_log back (status, note, focal point, small_2x:
--         what the owner changed on those rows since is replaced by the logged values), rebuilds the catalog with the old function when a card of a
--         3 part photo exists (nothing is owned, so numbers may change), drops cards_panoramas_owned, cards_panoramas, cards_parts_log, the five columns of
--         cards_photos, and puts the part check back to 0 to 2.
-- Why:    without 118 a group photo is a pair again and no panorama exists; deploy the code from before first (or switch the panorama display off).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (${names}) and md5(prosrc) in (${inList(md5Old)});   expect 4
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_panoramas', 'cards_panoramas_owned', 'cards_parts_log');   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name in ('parts', 'file_parts', 'file_pano', 'heads_box', 'parts_note');   expect 0
-- Undo:   run 118-group-parts.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c118r$
declare
  v_md5 text;
  v_old integer := 0;
  v_new integer := 0;
  v_has boolean;
begin
  perform set_config('lock_timeout', '5s', true);
  if ${FNS.map((f) => `${regproc(f)} is null`).join('\n     or ')} then
    raise exception '118-group-parts.rollback: cards_build_catalog, cards_catalog_append, cards_open or cards_craft is missing, nothing changed';
  end if;
${FNS.map((f) => `  select md5(prosrc) into v_md5 from pg_proc where oid = ${regproc(f)};
  if v_md5 = '${md5Old[f]}' then v_old := v_old + 1;
  elsif v_md5 = '${md5New[f]}' then v_new := v_new + 1;
  else raise exception '118-group-parts.rollback: ${NAME[f]}() is not the version of 118 (md5 %), nothing changed', v_md5;
  end if;`).join('\n')}
  if v_new = 0 and to_regclass('public.cards_parts_log') is null and to_regclass('public.cards_panoramas') is null
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'parts') then
    raise notice '118-group-parts.rollback: already rolled back, nothing changed';
    return;
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '118-group-parts.rollback: refused, a pack was opened (cards_packs holds rows), nothing changed';
  end if;
  if exists (select 1 from public.cards_owned) then
    raise exception '118-group-parts.rollback: refused, a player owns a card (cards_owned holds rows), nothing changed';
  end if;
  if to_regclass('public.cards_panoramas_owned') is not null then
    execute 'select exists (select 1 from public.cards_panoramas_owned)' into v_has;
    if v_has then
      raise exception '118-group-parts.rollback: refused, a player owns a panorama, nothing changed';
    end if;
  end if;

  -- the photo rows 118 changed, as they were
  if to_regclass('public.cards_parts_log') is not null then
    execute 'update public.cards_photos p set status = l.status, review_note = l.review_note, focal_x = l.focal_x, focal_y = l.focal_y, small_2x = l.small_2x
      from public.cards_parts_log l where l.photo_id = p.id';
  end if;

  -- the four functions as they were
${FNS.map((f) => `${oldFn[f].statement}\n${grants(f, '  ')}\n`).join('\n')}
  if (select max(part) from public.cards_catalog) = 3 then
    -- a card of a 3 part photo: the old function rebuilds the catalog (nothing is owned, no pack was opened), every photo a pair again
    perform public.cards_build_catalog();
  end if;

  drop table if exists public.cards_panoramas_owned;
  drop table if exists public.cards_panoramas;
  drop table if exists public.cards_parts_log;
  alter table public.cards_photos drop column if exists parts, drop column if exists file_parts, drop column if exists file_pano,
    drop column if exists heads_box, drop column if exists parts_note;
  alter table public.cards_catalog drop constraint if exists cards_catalog_part_check;
  alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);

${FNS.map((f) => `  if (select md5(prosrc) from pg_proc where oid = ${regproc(f)}) <> '${md5Old[f]}' then
    raise exception '118-group-parts.rollback: ${NAME[f]}() is not the old body, nothing changed';
  end if;`).join('\n')}
  notify pgrst, 'reload schema';
  raise notice '118-group-parts.rollback: the four functions are back (117, 114, 110), the panorama tables and the five columns are dropped';
end $c118r$;
`;
  void idx;
  return { sql, rollback, md5Old, md5New, photos: data.photos.length };
}
