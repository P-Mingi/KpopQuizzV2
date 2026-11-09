// L22-l1-otakudle-facts-corrections.sql and its rollback, derived from spec-l22.mjs and the data (node scripts/anime/a2/corrections/gen.mjs).
import { readFileSync } from 'node:fs';
import { verifyLines } from './verify-l2x.mjs';
import { toSingleDoBlock } from '../../sql/single-do-block.mjs';
import path from 'node:path';

import { storedValues, top200Rows } from '../gen-l13.mjs';
import { ASK_L22, FEATURED_OFF, FEATURED_ON, HISOKA, L22, NEW_CHARS, READ } from './spec-l22.mjs';
import { A2, ensureNewChars, q, same, sourcesOf, stateOf } from './engine.mjs';

const FIELDS = ['gender', 'species', 'role_at_debut', 'first_appearance', 'voice_actor_ja'];
const GAME = 'otakudle';
const FETCHED_DEFAULT = '2026-11-02';
const lit = (v) => (v === null || v === undefined ? 'null' : q(v));

function featuredNow() {
  const top = top200Rows(readFileSync(path.join(A2, 'data/TOP200.md'), 'utf8'));
  return top;
}

export function plan(D0) {
  const D = JSON.parse(JSON.stringify(D0));
  ensureNewChars(D, NEW_CHARS);
  const Dold = stateOf(D, L22, 'old');
  const Dnew = stateOf(D, L22, 'new');
  const slugCount = new Map();
  for (const s of D.all.series) for (const c of s.characters) slugCount.set(c.slug, (slugCount.get(c.slug) ?? 0) + 1);
  const sourceKey = (series, slug) => (slugCount.get(slug) > 1 ? `${series}/${slug}` : slug);
  const find = (X, key) => { const [s, c] = key.split('/'); return X.all.series.find((x) => x.slug === s).characters.find((x) => x.slug === c); };
  const top = featuredNow();
  const titleOf = new Map(D.all.series.map((s) => [s.slug, s.title]));
  const isTop = (key) => { const c = find(D, key); const [s] = key.split('/'); return top.some((r) => r.name === c.name && r.series === titleOf.get(s)); };

  const rows = [];
  const srcs = [];
  const flips = [];
  const inserts = [];
  const newKeys = new Set(NEW_CHARS.map((n) => `${n.series}/${n.slug}`));
  const keys = [...new Set([...L22.map((i) => `${i.series}/${i.slug}`), ...FEATURED_ON, ...FEATURED_OFF])];
  for (const key of keys) {
    const [series, slug] = key.split('/');
    const co = find(Dold, key);
    const cn = find(Dnew, key);
    const vo = storedValues(co.fields);
    const vn = storedValues(cn.fields);
    const items = L22.filter((i) => `${i.series}/${i.slug}` === key);
    // the table holds what L13 wrote, also a value in Japanese script (storedValues now stores it as null)
    for (const it of items.filter((x) => !x.srcOnly)) vo[it.col] = it.old;
    const featOld = newKeys.has(key) ? false : isTop(key);
    const featNew = FEATURED_ON.includes(key) ? true : FEATURED_OFF.includes(key) ? false : featOld;
    if (FEATURED_ON.includes(key) && featOld) throw new Error(`${key} is already featured`);
    if (FEATURED_OFF.includes(key) && !featOld) throw new Error(`${key} is not featured`);
    if (newKeys.has(key)) {
      inserts.push({ id: `NEW-${slug}`, series, slug, vals: { ...vn, featured: featNew }, ids: items.map((i) => i.id) });
    } else {
      for (const it of items.filter((x) => !x.srcOnly)) {
        const a = vo[it.col];
        const b = vn[it.col];
        if (same(a, b)) continue;
        rows.push({ id: it.id, series, slug, col: it.col, old: it.guard ?? a, new: b });
      }
      if (featOld !== featNew) rows.push({ id: `F-${slug}`, series, slug, col: 'featured', old: String(featOld), new: String(featNew) });
    }
    const complete = (v, f) => f && ['gender', 'species', 'role_at_debut', 'voice_actor_ja'].every((x) => v[x] !== null);
    const tOld = newKeys.has(key) ? false : complete(vo, featOld);
    const tNew = complete(vn, featNew);
    if (tOld !== tNew) flips.push({ series, slug, from: tOld, to: tNew });
    // the sources of each column: the rows that exist before and after
    for (const col of FIELDS) {
      const so = vo[col] === null ? [] : sourcesOf(co.fields[col], co);
      const sn = vn[col] === null ? [] : sourcesOf(cn.fields[col], cn);
      const mk = (s) => ({ field: col, source: s.source, ref: s.ref ?? null, url: s.url, read: s.read ?? null });
      const id = items.find((i) => i.col === col)?.id ?? `NEW-${slug}`;
      const eid = sourceKey(series, slug);
      const oldBy = new Map(so.map((s) => [s.source, mk(s)]));
      const newBy = new Map(sn.map((s) => [s.source, mk(s)]));
      for (const [k, b] of newBy) if (!same(oldBy.get(k) ?? null, b)) srcs.push({ id, op: 'upsert', entity: eid, old: oldBy.get(k) ?? null, ...b, slug, srcOnly: items.find((i) => i.col === col)?.srcOnly === true });
      for (const [k, a] of oldBy) if (!newBy.has(k)) srcs.push({ id, op: 'delete', entity: eid, old: a, ...a, slug, srcOnly: false });
    }
  }
  return { rows, srcs, flips, inserts };
}

// No temp table (owner, 2026-11-09): the corrections, the sources and the new rows are constants of the one DO block, a JSON array with one row per line.
const jsonArray = (rows) => q(`[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]`);
const fixRow = (r, dir) => ({ id: r.id, series: r.series, slug: r.slug, col: r.col, old_v: (dir === 'up' ? r.old : r.new) ?? null, new_v: (dir === 'up' ? r.new : r.old) ?? null });
const fetchedOf = (s, def) => (s.read ? `${s.read}T00:00:00Z` : `${def}T00:00:00Z`);
function srcRows(p, dir) {
  const out = [];
  for (const s of p.srcs) {
    if (dir === 'up') out.push(s.op === 'delete' ? { ...s, row: s.old } : { ...s, row: s });
    else if (s.old) out.push({ ...s, op: 'upsert', row: s.old });
    else out.push({ ...s, op: 'delete', row: s });
  }
  return out;
}
const srcRow = (s) => { const f = s.row; return { id: s.id, op: s.op, entity_id: s.entity, field: f.field, source: f.source, ref: f.ref ? f.ref : null, url: f.url, fetched: fetchedOf(f, FETCHED_DEFAULT) }; };

function body(p, dir, ctx) {
  const tag = dir === 'up' ? 'L22' : 'L22 rollback';
  const total = p.rows.length;
  const nIns = p.inserts.length;
  const srcs = srcRows(p, dir);
  const leaving = p.flips.filter((f) => (dir === 'up' ? f.from && !f.to : !f.from && f.to));
  const prot = leaving.map((f) => `(${q(f.series)}, ${q(f.slug)})`);
  const L = [];
  L.push(
    `do $l22$ begin`,
    `  if to_regclass('public.character_facts') is null or to_regclass('public.entity_sources') is null then`,
    `    raise exception '${tag}: 023 and L13 must be applied first';`,
    `  end if;`,
    `  if (select count(*) from public.character_facts) < 750 then`,
    `    raise exception '${tag}: the 750 character_facts rows of L13 are not all there (apply L13 first)';`,
    `  end if;`,
    `end $l22$;`,
    ``,
    `-- Precheck of the next 7 days (AUDITS-COMMON): ${leaving.length ? `${leaving.map((f) => f.slug).join(', ')} ${dir === 'up' ? 'stop' : 'stops'} being a possible answer of ${GAME}, so none of them may be today's answer or scheduled in the next 7 days; otherwise the file aborts and is applied after that day.` : 'no character stops being a possible answer.'}`,
    `do $l22$`,
    `declare r record;`,
    `begin`,
    `  if to_regclass('public.dle_schedule') is not null and to_regclass('public.dle_games') is not null then`,
    prot.length ? [
      `    for r in`,
      `      select g.id as game_id, c.slug, s.bank_day`,
      `      from public.dle_games g`,
      `      join public.dle_schedule s on s.game_id = g.id`,
      `      join public.characters c on c.id::text = s.entity_id`,
      `      join public.groups gr on gr.id = c.group_id and gr.site_id = 'anime'`,
      `      where g.id = ${q(GAME)} and g.epoch is not null and (gr.slug, c.slug) in (${prot.join(', ')})`,
      `        and s.bank_day in (select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from generate_series(0, 7) as k)`,
      `      union all`,
      `      select g.id, c.slug, null from public.dle_games g join public.dle_daily_stats d on d.game_id = g.id and d.play_date >= public.dle_utc_date(now())`,
      `      join public.characters c on c.id::text = d.entity_id join public.groups gr on gr.id = c.group_id and gr.site_id = 'anime'`,
      `      where g.id = ${q(GAME)} and (gr.slug, c.slug) in (${prot.join(', ')})`,
      `    loop`,
      `      raise exception '${tag}: % is the answer of % (bank day %) today or in the next 7 days: apply this file after that day', r.slug, r.game_id, coalesce(r.bank_day::text, 'served today');`,
      `    end loop;`,
    ].join('\n') : `    null;`,
    `  end if;`,
    `end $l22$;`,
    ``,
    ``,
  );
  L.push(
    `do $l22$`,
    `declare`,
    `  fixes constant jsonb := ${jsonArray(p.rows.map((r) => fixRow(r, dir)))};`,
    `  srcs constant jsonb := ${jsonArray(srcs.map(srcRow))};`,
    `  news constant jsonb := ${jsonArray(p.inserts.map((n) => ({ series: n.series, slug: n.slug, ...Object.fromEntries(FIELDS.map((f) => [f, n.vals[f] ?? null])), featured: n.vals.featured })))};`,
    `  c record; s record; n record; cid bigint; cur text;`,
    `  n_changed integer := 0; n_already integer := 0; n_drift integer := 0; n_missing integer := 0; n_new integer := 0;`,
    `begin`,
    `  for c in select * from jsonb_to_recordset(fixes) as t(id text, series text, slug text, col text, old_v text, new_v text) order by t.id loop`,
    `    select ch.id into cid from public.characters ch join public.groups g on g.id = ch.group_id and g.site_id = 'anime' and g.slug = c.series`,
    `      join public.character_facts f on f.character_id = ch.id where ch.slug = c.slug;`,
    `    if cid is null then`,
    `      n_missing := n_missing + 1;`,
    `      raise warning '${tag} %: no facts row for % / %', c.id, c.series, c.slug;`,
    `      continue;`,
    `    end if;`,
    `    execute format('select %I::text from public.character_facts where character_id = $1', c.col) into cur using cid;`,
    `    if cur is not distinct from c.old_v then`,
    `      execute format('update public.character_facts set %I = $2::%s where character_id = $1', c.col, case when c.col = 'featured' then 'boolean' else 'text' end) using cid, c.new_v;`,
    `      n_changed := n_changed + 1;`,
    `    elsif cur is not distinct from c.new_v then`,
    `      n_already := n_already + 1;`,
    `    else`,
    `      n_drift := n_drift + 1;`,
    `      raise warning '${tag} %: % / % holds %, neither % nor %: left alone', c.id, c.series, c.slug, cur, c.old_v, c.new_v;`,
    `      continue;`,
    `    end if;`,
    `    for s in select w.* from jsonb_to_recordset(srcs) as w(id text, op text, entity_id text, field text, source text, ref text, url text, fetched text) where w.id = c.id loop`,
    `      if s.op = 'delete' then`,
    `        delete from public.entity_sources where entity_type = 'character' and entity_id = s.entity_id and field = s.field and source = s.source;`,
    `      else`,
    `        insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at) values ('character', s.entity_id, s.field, s.source, s.ref, s.url, s.fetched::timestamptz)`,
    `        on conflict (entity_type, entity_id, field, source) do update set source_ref = excluded.source_ref, source_url = excluded.source_url, fetched_at = excluded.fetched_at`,
    `        where (entity_sources.source_ref, entity_sources.source_url, entity_sources.fetched_at) is distinct from (excluded.source_ref, excluded.source_url, excluded.fetched_at);`,
    `      end if;`,
    `    end loop;`,
    `  end loop;`,
    `  -- the sources of values that stay (OT-D4: a role that had no external source) and of the new rows: upserted or deleted by key`,
    `  for s in select w.* from jsonb_to_recordset(srcs) as w(id text, op text, entity_id text, field text, source text, ref text, url text, fetched text) where not exists (select 1 from jsonb_to_recordset(fixes) as f(id text) where f.id = w.id) order by w.id, w.field, w.source loop`,
    `    if s.op = 'delete' then`,
    `      delete from public.entity_sources where entity_type = 'character' and entity_id = s.entity_id and field = s.field and source = s.source;`,
    `    else`,
    `      insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at) values ('character', s.entity_id, s.field, s.source, s.ref, s.url, s.fetched::timestamptz)`,
    `      on conflict (entity_type, entity_id, field, source) do update set source_ref = excluded.source_ref, source_url = excluded.source_url, fetched_at = excluded.fetched_at`,
    `      where (entity_sources.source_ref, entity_sources.source_url, entity_sources.fetched_at) is distinct from (excluded.source_ref, excluded.source_url, excluded.fetched_at);`,
    `    end if;`,
    `  end loop;`,
    `  -- a character that had no facts row (Ken Kaneki): ${dir === 'up' ? 'inserted' : 'deleted when it still holds exactly the values of this file'}`,
    `  for n in select * from jsonb_to_recordset(news) as t(series text, slug text, gender text, species text, role_at_debut text, first_appearance text, voice_actor_ja text, featured boolean) loop`,
    `    select ch.id into cid from public.characters ch join public.groups g on g.id = ch.group_id and g.site_id = 'anime' and g.slug = n.series where ch.slug = n.slug;`,
    `    if cid is null then`,
    `      raise exception '${tag}: character %/% is missing (apply L04 first)', n.series, n.slug;`,
    `    end if;`,
    dir === 'up'
      ? [`    insert into public.character_facts (character_id, gender, species, role_at_debut, first_appearance, voice_actor_ja, featured) values (cid, n.gender, n.species, n.role_at_debut, n.first_appearance, n.voice_actor_ja, n.featured) on conflict (character_id) do nothing;`,
         `    if found then n_new := n_new + 1; end if;`].join('\n')
      : [`    delete from public.character_facts f where f.character_id = cid and (f.gender, f.species, f.role_at_debut, f.first_appearance, f.voice_actor_ja, f.featured) is not distinct from (n.gender, n.species, n.role_at_debut, n.first_appearance, n.voice_actor_ja, n.featured);`,
         `    if found then n_new := n_new + 1; end if;`].join('\n'),
    `  end loop;`,
    `  if n_missing > 0 then`,
    `    raise exception '${tag}: % corrections found no row (apply L13 first)', n_missing;`,
    `  end if;`,
    `  if n_drift = 0 and n_changed not in (0, ${total}) then`,
    `    raise exception '${tag}: % rows changed, expected 0 or ${total}', n_changed;`,
    `  end if;`,
    `  if n_new not in (0, ${nIns}) then`,
    `    raise exception '${tag}: % new rows, expected 0 or ${nIns}', n_new;`,
    `  end if;`,
    `  raise notice '${tag}: % changed, % already as wanted, % left alone, % new rows', n_changed, n_already, n_drift, n_new;`,
    `end $l22$;`,
    ``,
    `-- OT-D1: ${HISOKA.slug} is the same person as ${HISOKA.keep} (the featured one). Excluded from the pool by the curation table; ${dir === 'up' ? 'a row already there is left alone' : 'removed only if it is still the row of this file'}.`,
    `do $l22$`,
    `declare cid bigint;`,
    `begin`,
    `  if to_regclass('public.dle_curation') is null or not exists (select 1 from public.dle_games where id = ${q(GAME)}) then`,
    `    raise notice '${tag}: no dle_curation or no game ${GAME}: the Hisoka curation is skipped';`,
    `  else`,
    `  select ch.id into cid from public.characters ch join public.groups g on g.id = ch.group_id and g.site_id = 'anime' and g.slug = ${q(HISOKA.series)} where ch.slug = ${q(HISOKA.slug)};`,
    `  if cid is null then raise exception '${tag}: ${HISOKA.slug} is missing'; end if;`,
    dir === 'up'
      ? `  insert into public.dle_curation (game_id, entity_id, excluded, note) values (${q(GAME)}, cid::text, true, ${q(HISOKA.note)}) on conflict (game_id, entity_id) do nothing;`
      : `  delete from public.dle_curation where game_id = ${q(GAME)} and entity_id = cid::text and excluded and note = ${q(HISOKA.note)};`,
    `  end if;`,
    `end $l22$;`,
    ``,
    `-- The snapshot the players read (a game that has none is refreshed by its own activation).`,
    `do $l22$ begin`,
    `  if exists (select 1 from public.dle_entities where game_id = ${q(GAME)}) then perform public.dle_refresh_entities(${q(GAME)}); end if;`,
    `end $l22$;`,
    ``,
    `-- Nobody scheduled in the next 7 days may have stopped being a possible answer.`,
    `do $l22$`,
    `declare r record;`,
    `begin`,
    `  if to_regclass('public.dle_schedule') is not null and to_regclass('public.dle_games') is not null and to_regclass('public.dle_entities') is not null then`,
    `    for r in`,
    `      select s.game_id, s.entity_id, s.bank_day from public.dle_games g join public.dle_schedule s on s.game_id = g.id`,
    `      join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id`,
    `      where g.id = ${q(GAME)} and g.epoch is not null and not (e.can_be_target and e.in_pool)`,
    `        and s.bank_day in (select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from generate_series(0, 7) as k)`,
    `    loop`,
    `      raise exception '${tag}: entity % of % (bank day %) is scheduled in the next 7 days and is no longer a possible answer', r.entity_id, r.game_id, r.bank_day;`,
    `    end loop;`,
    `    if to_regclass('public.dle_daily_stats') is not null and exists (select 1 from public.dle_daily_stats d join public.dle_entities e on e.game_id = d.game_id and e.entity_id = d.entity_id`,
    `       where d.game_id = ${q(GAME)} and d.play_date >= public.dle_utc_date(now()) and not (e.can_be_target and e.in_pool)) then`,
    `      raise exception '${tag}: the answer served today is no longer a possible answer';`,
    `    end if;`,
    `  end if;`,
    `end $l22$;`,
    ``,
    `notify pgrst, 'reload schema';`,
  );
  void ctx;
  return L.join('\n');
}

export function writeL22(D) {
  const p = plan(D);
  const ctx = {};
  const changed = p.rows.filter((r) => r.col !== 'featured');
  const byCol = (c) => changed.filter((r) => r.col === c).length;
  const feats = p.rows.filter((r) => r.col === 'featured');
  const ask = ASK_L22.map((a) => `--   ${a.id}: ${a.text}\n${a.sql.split('\n').map((l) => (l.startsWith('--') ? l : `--   ${l}`)).join('\n')}`).join('\n');
  const head = (name, what, undo, dir) => [
    `-- ${name} (lane otkdata, run O1, audit 06 of 2026-11-08 validated by the owner on 2026-11-09; generated by scripts/anime/a2/corrections/gen.mjs from spec-l22.json, do not edit by hand)`,
    `--`,
    ...what,
    `-- Needs:  023, L04, L13 (the 750 character_facts rows), L18 (it spelled "homunculu" as "homunculus": King Bradley is guarded on that value), 019 (dle_curation, dle_refresh_entities).`,
    `-- WHEN:   apply by the owner after a backup, just after 00:30 UTC, never between 23:50 and 00:30 UTC, never during a build. The first statements read dle_schedule for today and the next 7 days and abort`,
    `--         (nothing is written) if a character that stops being a possible answer is scheduled there (${p.flips.filter((f) => f.from && !f.to).map((f) => f.slug).join(', ') || 'none'}); ORCH reads those 7 days in production before the owner applies.`,
    `--         A guess is stored as the entity id only and its colours are computed on every read, so a game in progress is recoloured at once; the snapshot dle_entities is refreshed in the same transaction.`,
    `--         The pool of answers changes (${p.flips.filter((f) => !f.from && f.to).length} characters become possible answers, ${p.flips.filter((f) => f.from && !f.to).length} stops): the next dle_daily_maintenance sees a new pool hash and rebuilds the bank (L18: it keeps today and the 7 days after it).`,
    ...verifyLines('L22', dir),
    undo,
    `-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing; a row that already moved to another value is left alone (warning).`,
    ``,
    `set lock_timeout = '5s';`,
    `set client_min_messages = warning;`,
    ``,
  ];
  const what = [
    `-- What:   ${changed.length} values of character_facts (otakudle), each guarded on the value L13 wrote (L18 for King Bradley) and each with its source in entity_sources (the Wikipedia or Fandom page read on ${READ}, source_ref = its revision id):`,
    `--         gender ${byCol('gender')} (Captain Ginyu male, Neferpitou null), role_at_debut ${byCol('role_at_debut')} (OT2 to OT9 and the sample, plus the 9 missing roles), species ${byCol('species')} (the "as first met" rule, the 9 missing,`,
    `--         Kagura and Kamui "yato", Inuyasha "half-demon", Puar, Oolong and Korin "animal"), voice_actor_ja ${byCol('voice_actor_ja')} (D-5: the Japanese voice actor of the first TV anime series: Tokyo Revengers 12, Fullmetal Alchemist 7,`,
    `--         Hunter x Hunter 8 (the 1999 series), Raditz, Aqua, Tohru, Giorno, Joseph, Dio, Kogoro, Kyo, Jotaro, Josuke, Tae; Dandadan and Blue Lock were in Japanese script; surname-first names of Re:Zero and Sword Art Online reordered).`,
    `--         featured: ${feats.map((r) => `${r.slug} ${r.old} -> ${r.new}`).join(', ')} (OT-D2, OT-D3). A new facts row: ${p.inserts.map((n) => n.slug).join(', ')} (OT-D3, from its own pages; it differs from Haise Sasaki's row in species: "human" as first met, Haise holds "ghoul").`,
    `--         OT-D4: ${p.srcs.filter((s) => s.srcOnly).length} source rows for the roles that rested on the site's own data. OT-D1: ${HISOKA.slug} is excluded from the pool (dle_curation).`,
    `--         Answers: the featured characters with a complete row are possible answers: ${p.flips.filter((f) => !f.from && f.to).map((f) => f.slug).join(', ')}.`,
    `--         Not applied, listed below as commented blocks (the audit leaves them open or the source says otherwise):`,
    ask,
    `--         Nothing else: no other column, no kpop row. updated_at is not touched, so the rollback is exact.`,
  ];
  const up = [...head('L22-l1-otakudle-facts-corrections.sql', what, `-- Undo:   L22-l1-otakudle-facts-corrections.rollback.sql (restores the values of L13 and their sources).`, 'up'), body(p, 'up', ctx), ''].join('\n');
  const down = [...head('L22-l1-otakudle-facts-corrections.rollback.sql', [`-- What:   undoes L22: puts back the values and the sources that L13 (and L18) wrote, for the rows that still hold the corrected value.`], `-- Undo:   L22-l1-otakudle-facts-corrections.sql.`, 'down'), body(p, 'down', ctx), ''].join('\n');
  return { up: toSingleDoBlock(up, 'o1l22'), down: toSingleDoBlock(down, 'o1l22r'), plan: p };
}
