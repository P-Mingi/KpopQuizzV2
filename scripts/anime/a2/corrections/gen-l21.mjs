// L21-l1-series-games-corrections.sql and its rollback, derived from spec-l21.mjs and the data (node scripts/anime/a2/corrections/gen.mjs).
import { ASK_L21, L21, READ } from './spec-l21.mjs';
import { rescheduleCall, rescheduleSetup, rescheduleUndoCall } from '../../sql/dle-reschedule.mjs';
import { verifyLines } from './verify-l2x.mjs';
import { toSingleDoBlock } from '../../sql/single-do-block.mjs';
import { clone, gameContext, gameFacts, jq, q, same, setState, stateOf } from './engine.mjs';


/** Everything the two files need: the corrections as table rows, the sources to move, the characters that stop (or start) being an answer. */
export function plan(D) {
  const ctx0 = gameContext(D);
  const Dold = stateOf(D, L21, 'old');
  const Dnew = stateOf(D, L21, 'new');
  const ctxOld = gameContext(Dold);
  const ctxNew = gameContext(Dnew);
  const rows = [];
  const srcs = [];
  const flips = [];
  const byChar = new Map();
  for (const it of L21) {
    const k = `${it.game}|${it.slug}`;
    byChar.set(k, [...(byChar.get(k) ?? []), it]);
  }
  for (const [k, items] of byChar) {
    const [game, slug] = k.split('|');
    const o = gameFacts(Dold, ctxOld, game, slug);
    const n = gameFacts(Dnew, ctxNew, game, slug);
    const series = game === 'otakudle-one-piece' ? 'one-piece' : 'dragon-ball';
    for (const it of items) {
      const oldV = it.kind === 'attr' ? o.attrs[it.col] : (o.hints[it.col] ?? null);
      const newV = it.kind === 'attr' ? n.attrs[it.col] : (n.hints[it.col] ?? null);
      if (same(oldV, newV)) throw new Error(`${it.id}: old and new give the same stored value ${JSON.stringify(oldV)}`);
      rows.push({ id: it.id, game, series, slug, kind: it.kind, col: it.col, old: oldV, new: newV });
      const field = `${series}.${it.col}`;
      for (const key of new Set([...o.sources.keys(), ...n.sources.keys()])) {
        if (!key.startsWith(`${field}|`)) continue;
        const a = o.sources.get(key);
        const b = n.sources.get(key);
        if (b && !same(a, b)) srcs.push({ id: it.id, op: 'upsert', old: a ?? null, ...b, slug });
        if (!b && a) srcs.push({ id: it.id, op: 'delete', old: a, ...a, slug });
      }
      if (it.new !== null && n.sources.size && ![...n.sources.keys()].some((x) => x.startsWith(`${field}|`))) throw new Error(`${it.id}: the new value has no source`);
    }
    if (o.target !== n.target) {
      rows.push({ id: `${items[0].id}-target`, game, series, slug, kind: 'target', col: 'can_be_target', old: o.target, new: n.target });
      flips.push({ game, slug, from: o.target, to: n.target, id: items[0].id });
    }
  }
  return { rows, srcs, flips, ctx0 };
}

// No temp table (owner, 2026-11-09): the corrections and the sources are constants of the one DO block, a JSON array with one row per line.
// old_v and new_v hold the JSON text of the stored value, so that JSON null (a key holding null) stays different from SQL NULL (no key).
const jsonArray = (rows) => q(`[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]`);
const fixRow = (r, dir) => ({ id: r.id, game_id: r.game, series: r.series, slug: r.slug, kind: r.kind, col: r.col, old_v: JSON.stringify(dir === 'up' ? r.old : r.new), new_v: JSON.stringify(dir === 'up' ? r.new : r.old) });

function srcRows(p, dir) {
  // up: the new rows; down: the old rows back, and the new rows that did not exist go away
  const out = [];
  for (const s of p.srcs) {
    if (dir === 'up') out.push(s.op === 'delete' ? { ...s, row: null } : { ...s, row: s });
    else if (s.old) out.push({ ...s, op: 'upsert', row: s.old });
    else out.push({ ...s, op: 'delete', row: s });
  }
  return out;
}
const srcRow = (s) => {
  const r = s.row ?? s;
  const x = s.op === 'delete' ? (s.old ?? s) : r;
  const f = (s.row ?? x);
  return { id: s.id, op: s.op, entity_id: s.slug, field: f.field, source: f.source, ref: f.ref ? f.ref : null, url: f.url, fetched: f.read ? `${f.read}T00:00:00Z` : '__DEFAULT__' };
};

function gameIds(p) { return [...new Set(p.rows.map((r) => r.game))].sort(); }

function body(p, dir, ctx) {
  const rows = p.rows;
  const total = rows.length;
  const srcs = srcRows(p, dir);
  const tag = dir === 'up' ? 'L21' : 'L21 rollback';
  const refreshCall = () => ['do $l21$ begin', ...gameIds(p).map((g) => `  if exists (select 1 from public.dle_entities where game_id = ${q(g)}) then perform public.dle_refresh_entities(${q(g)}); end if;`), 'end $l21$;'].join('\n');
  const lines = [];
  lines.push(
    `do $l21$ begin`,
    `  if to_regclass('public.character_game_facts') is null or to_regclass('public.entity_sources') is null then`,
    `    raise exception '${tag}: 024 and L15 must be applied first';`,
    `  end if;`,
    `  if (select count(*) from public.character_game_facts where game_id = 'otakudle-one-piece') < 100 or (select count(*) from public.character_game_facts where game_id = 'otakudle-dragon-ball') < 70 then`,
    `    raise exception '${tag}: the 100 + 70 facts of L15 are not all there (apply L15 first)';`,
    `  end if;`,
    `end $l21$;`,
    ``,
    rescheduleSetup(),
    ``,
    ``,
  );
  const fixJson = jsonArray(rows.map((r) => fixRow(r, dir)));
  const srcJson = jsonArray(srcs.map((s) => srcRow(s)).map((r) => ({ ...r, fetched: r.fetched === '__DEFAULT__' ? `${ctx.fetchedDefault}T00:00:00Z` : r.fetched })));
  lines.push(
    `do $l21$`,
    `declare`,
    `  fixes constant jsonb := ${fixJson};`,
    `  srcs constant jsonb := ${srcJson};`,
    `  c record; s record; r record; cur jsonb;`,
    `  n_changed integer := 0; n_already integer := 0; n_drift integer := 0; n_missing integer := 0;`,
    `begin`,
    `  for c in select t.id, t.game_id, t.series, t.slug, t.kind, t.col, t.old_v::jsonb as old_v, t.new_v::jsonb as new_v`,
    `    from jsonb_to_recordset(fixes) as t(id text, game_id text, series text, slug text, kind text, col text, old_v text, new_v text) order by t.id loop`,
    `    select f.character_id, f.attrs, f.hints, f.can_be_target into r`,
    `    from public.character_game_facts f`,
    `    join public.characters ch on ch.id = f.character_id`,
    `    join public.groups g on g.id = ch.group_id and g.site_id = 'anime' and g.slug = c.series`,
    `    where ch.slug = c.slug and f.game_id = c.game_id;`,
    `    if not found then`,
    `      n_missing := n_missing + 1;`,
    `      raise warning '${tag} %: no fact row for % / %', c.id, c.game_id, c.slug;`,
    `      continue;`,
    `    end if;`,
    `    cur := case c.kind when 'attr' then r.attrs -> c.col when 'hint' then r.hints -> c.col else to_jsonb(r.can_be_target) end;`,
    `    if cur is not distinct from c.old_v then`,
    `      if c.kind = 'attr' then`,
    `        update public.character_game_facts set attrs = jsonb_set(attrs, array[c.col], c.new_v) where character_id = r.character_id and game_id = c.game_id;`,
    `      elsif c.kind = 'hint' then`,
    `        update public.character_game_facts set hints = jsonb_set(hints, array[c.col], c.new_v) where character_id = r.character_id and game_id = c.game_id;`,
    `      else`,
    `        update public.character_game_facts set can_be_target = (c.new_v)::text::boolean where character_id = r.character_id and game_id = c.game_id;`,
    `      end if;`,
    `      n_changed := n_changed + 1;`,
    `    elsif cur is not distinct from c.new_v then`,
    `      n_already := n_already + 1;`,
    `    else`,
    `      n_drift := n_drift + 1;`,
    `      raise warning '${tag} %: % / % holds %, neither % nor %: left alone', c.id, c.game_id, c.slug, cur, c.old_v, c.new_v;`,
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
    `  if n_missing > 0 then`,
    `    raise exception '${tag}: % corrections found no row (apply L15 first)', n_missing;`,
    `  end if;`,
    `  if n_drift = 0 and n_changed not in (0, ${total}) then`,
    `    raise exception '${tag}: % rows changed, expected 0 or ${total}', n_changed;`,
    `  end if;`,
    `  raise notice '${tag}: % changed, % already as wanted, % left alone', n_changed, n_already, n_drift;`,
    `end $l21$;`,
    ``,
    `-- The snapshot the players read (a game that has none is refreshed by its own activation).`,
    `do $l21$ begin`,
    ...gameIds(p).map((g) => `  if exists (select 1 from public.dle_entities where game_id = ${q(g)}) then perform public.dle_refresh_entities(${q(g)}); end if;`),
    `end $l21$;`,
    ``,
    `-- ${dir === 'up' ? 'Redraw' : 'Put back'} the coming days of each game that hold an entity the data change removed (never today, never a served date; the bank is saved first).`,
    dir === 'up' ? rescheduleCall('L21', gameIds(p)) : rescheduleUndoCall('L21', gameIds(p)),
    dir === 'up' ? `` : `-- The snapshot again, now that the calendar is back.`,
    dir === 'up' ? `` : refreshCall(),
    ``,
    `notify pgrst, 'reload schema';`,
  );
  return lines.join('\n');
}

export function writeL21(D, readDefault) {
  const p = plan(D);
  const ctx = { fetchedDefault: readDefault };
  const opAnswers = (D0) => {
    const c = gameContext(D0);
    return Object.fromEntries(['otakudle-one-piece', 'otakudle-dragon-ball'].map((g) => [g, D0[g === 'otakudle-one-piece' ? 'op' : 'db'].characters.filter((ch) => gameFacts(D0, c, g, ch.slug).target).length]));
  };
  const before = opAnswers(stateOf(D, L21, 'old'));
  const after = opAnswers(stateOf(D, L21, 'new'));
  const ask = ASK_L21.map((a) => `--   ${a.id}: ${a.text}\n${a.sql.split('\n').map((l) => (l.startsWith('--') ? l : `--   ${l}`)).join('\n')}`).join('\n');
  const head = (name, what, undo, dir) => [
    `-- ${name} (lane otkdata, run O1, audit 06 of 2026-11-08 validated by the owner on 2026-11-09; generated by scripts/anime/a2/corrections/gen.mjs from spec-l21.mjs, do not edit by hand)`,
    `--`,
    ...what,
    `-- Needs:  024, L15 (the 100 + 70 character_game_facts rows). After L17 (it owns attrs.affiliation of One Piece, never touched here).`,
    `-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it. Nothing waits for a date: the file redraws itself the coming days`,
    `--         whose answer it removes (never today, never a served date), after saving the whole bank of each game in dle_schedule_backup; the rollback puts that bank and the pool_hash back. A guess is stored as the entity id only`,
    `--         and its colours are computed on every read, so a game in progress is recoloured at once; the snapshot dle_entities is refreshed in the same transaction.`,
    ...verifyLines('L21', dir),
    undo,
    `-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing; a row that already moved to another value is left alone (warning).`,
    ``,
    `set lock_timeout = '5s';`,
    `set client_min_messages = warning;`,
    ``,
  ];
  const what = [
    `-- What:   ${p.rows.filter((r) => r.kind !== 'target').length} values of character_game_facts (otakudle-one-piece and otakudle-dragon-ball), each guarded on the value L15 wrote, each with its source (entity_sources: Fandom box text at the stored`,
    `--         snapshot, or the Fandom page read on ${READ} with its revision id; Bounty = revision 2135525):`,
    `--         One Piece: bounty = World Government bounties only (D-1): "No bounty" for Garp, Borsalino, Issho, Aramaki, Koby (Cross Guild rank rewards) and Kin'emon, Rebecca, Viola (Doflamingo's Birdcage rewards);`,
    `--           null for Kyros (box: Unknown) and Jesus Burgess (box: "At least 20,000,000", a lower bound), who are no longer answers; sea of origin "Grand Line" for the 7 "New World" values (D-7), "Calm Belt" for`,
    `--           Boa Hancock (D-6), who becomes an answer; Devil Fruit hints: Kin'emon "Garb-Garb Fruit", Luffy "Human-Human Fruit, Model: Nika" (OP17, as of the reference point).`,
    `--         Dragon Ball: race of Cell, Dr. Gero (Android), Emperor Pilaf (Monster), Oolong, Puar, Korin (Animal); King Piccolo's technique hint (Explosive Demon Wave); the Japanese voice actor hints of Raditz`,
    `--           and Zamasu; the affiliations of 13 characters without their game-only groups (DB7) and without the double space of "Capsule  Corporation" (DB6).`,
    `--         can_be_target follows the data: ${p.flips.map((f) => `${f.slug} ${f.from} -> ${f.to}`).join(', ')}. Answers afterwards: One Piece ${after['otakudle-one-piece']} (was ${before['otakudle-one-piece']}: minus Kyros and Jesus Burgess, plus Boa Hancock), Dragon Ball ${after['otakudle-dragon-ball']} (was ${before['otakudle-dragon-ball']}).`,
    `--         Not applied, listed below as commented, guarded blocks (the audit leaves them open or the source contradicts it):`,
    ask,
    `--         Nothing else: no other column, no affiliation of One Piece (L17), no kpop row. updated_at is not touched, so the rollback is exact.`,
  ];
  const up = [...head('L21-l1-series-games-corrections.sql', what, `-- Undo:   L21-l1-series-games-corrections.rollback.sql (restores the values of L15 and their sources, and the saved calendar).`, 'up'), body(p, 'up', ctx), ''].join('\n');
  const downWhat = [`-- What:   undoes L21: puts back the values and the sources that L15 wrote, for the rows that still hold the corrected value.`];
  const down = [...head('L21-l1-series-games-corrections.rollback.sql', downWhat, `-- Undo:   L21-l1-series-games-corrections.sql.`, 'down'), body(p, 'down', ctx), ''].join('\n');
  return { up: toSingleDoBlock(up, 'o1l21'), down: toSingleDoBlock(down, 'o1l21r'), plan: p, before, after };
}
