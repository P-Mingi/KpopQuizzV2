#!/usr/bin/env node
// Lot A2 (run O1, CR-023): writes the SQL of the per-series daily games from the collected data.
//
//   node scripts/anime/a2/gen-sql.mjs [--targets complete|none] [--l04 <file>] [--migration <024 file>] [--out <folder>] [--check]
//
// Reads  scripts/anime/a2/data/one-piece.json and dragon-ball.json (the Fandom, Wikipedia and Wikidata data of the two series),
//        scripts/anime/a2/data/all-series.json when it is there (lot A2's data of the 50 series: only the Japanese voice actor of the Dragon Ball
//        characters is read from it, the 5-error hint of a character with no signature technique; without the file those characters have no hint,
//        are not targets, and the header of L15 lists them),
//        docs/pending-migrations/multisite/launch/L04-K1-series.sql (which characters the site has: series slug and character slug),
//        docs/pending-migrations/multisite/024-dle-series-games.sql (the column list of each game: a column is in the data only when it is a line of
//        the dle_attributes insert there, so dropping Dragon Ball's height_cm is deleting its line in 024 and running this script again).
// Writes docs/pending-migrations/multisite/launch/L15-A2-series-games.sql and L15-A2-series-games.rollback.sql:
//        - one character_game_facts row per character that exists in L04 (the columns as {"v", "p", "l"}, the secret hints, can_be_target);
//        - one entity_sources row per stored value and supporting source (field "<series>.<column>", so L13's rows of the same character keep theirs).
//        Characters of the data that L04 does not have yet are listed in the header of the file and skipped; they come with the next L04 regeneration.
// Facts only: the values are numbers, words and names; no text of a Fandom page is copied. Same input, same output (no clock, no random).
//
// --targets complete (the default): can_be_target is true only when every column of the game and the hint have a value.
// --targets none: no character is a target (to keep the games closed whatever the data holds). The owner has not decided yet whether an
//                 incomplete character may be a target; the engine would not draw one anyway (an empty cell is "unknown").
// --check: writes nothing, prints the counts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');

export const GAMES = [
  { id: 'otakudle-one-piece', series: 'one-piece', file: 'one-piece.json' },
  { id: 'otakudle-dragon-ball', series: 'dragon-ball', file: 'dragon-ball.json' },
];

const SERIES_LABEL = { DB: 'Dragon Ball', Z: 'Dragon Ball Z', GT: 'Dragon Ball GT', Super: 'Dragon Ball Super', Daima: 'Dragon Ball Daima' };
const SERIES_ORDER = { DB: 1, Z: 2, GT: 3, Super: 4, Daima: 5 };
const HAKI_ORDER = ['observation', 'armament', 'conqueror'];

const present = (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
const lower = (v) => (typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null);
const text = (v) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'unknown' ? v.trim() : null);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const list = (v) => {
  const a = (Array.isArray(v) ? v : [v]).map((x) => (typeof x === 'string' ? x.trim() : null)).filter(Boolean);
  return [...new Set(a)].length ? [...new Set(a)] : null;
};
const wrap = (v, extra = {}) => ({ v: v ?? null, ...(v === null || v === undefined ? {} : extra) });

// One column: the value of the data to {"v", "l"} (null v when the data has no value). `field` is the field of the data, `src` its value.
const COLUMNS = {
  'otakudle-one-piece': {
    gender: (f) => wrap(lower(f.gender.value)),
    affiliation: (f) => wrap(list(f.affiliation.value)),
    devil_fruit_type: (f) => wrap(text(f.devil_fruit_type.value)),
    haki: (f) => {
      const h = f.haki.value;
      if (!Array.isArray(h)) return wrap(null);
      const set = HAKI_ORDER.filter((x) => h.includes(x));
      return wrap(set.length ? set : ['none']);   // none is a value: a character with no haki still compares
    },
    bounty: (f) => {
      const b = f.bounty.value;
      if (b === 'no bounty') return wrap(0, { l: 'No bounty' });
      return wrap(num(b));
    },
    height_cm: (f) => wrap(num(f.height_cm.value)),
    sea_of_origin: (f) => wrap(text(f.sea_of_origin.value)),
    debut_arc: (f) => {
      const a = f.debut_arc.value;
      return a && num(a.ord) !== null ? wrap(a.ord, { l: a.name }) : wrap(null);
    },
  },
  'otakudle-dragon-ball': {
    gender: (f) => wrap(lower(f.gender.value)),
    race: (f) => wrap(text(f.race.value)),
    affiliation: (f) => wrap(list(f.affiliation.value)),
    home_planet: (f) => wrap(text(f.home_planet.value)),
    universe: (f) => wrap(num(f.universe.value)),
    debut_series: (f) => {
      const s = f.debut_series.value;
      const order = s ? SERIES_ORDER[s.code] : undefined;
      if (order === undefined) return wrap(null);
      if (num(s.order) !== null && s.order !== order && s.code !== 'Daima') throw new Error(`debut_series ${s.code}: order ${s.order} is not ${order}`);
      return wrap(order, { l: SERIES_LABEL[s.code] });
    },
    debut_saga: (f) => {
      const s = f.debut_saga.value;
      return s && num(s.order) !== null ? wrap(s.order, { l: s.name }) : wrap(null);
    },
    height_cm: (f) => wrap(num(f.height_cm.value)),
    alignment_at_debut: (f) => wrap(lower(f.alignment_at_debut.value)),
  },
};

// The data field that backs a column (the sources of the entity_sources rows).
const FIELD_OF = { debut_series: 'debut_series', debut_saga: 'debut_saga' };
// The secret hints of a character: {hint key: {value, data field, character}}. One Piece: the Devil Fruit name (the view says "No Devil Fruit" for none).
// Dragon Ball: the signature technique and the Japanese voice actor (the view serves the technique, else the voice actor, never both).
const HINTS_OF = {
  'otakudle-one-piece': (ch) => {
    const f = ch.fields;
    const v = lower(f.devil_fruit_type.value) === 'none' ? null : text(Array.isArray(f.devil_fruit_name.value) ? f.devil_fruit_name.value.join(', ') : f.devil_fruit_name.value);
    return { devil_fruit_name: { value: v, field: f.devil_fruit_name, ch } };
  },
  'otakudle-dragon-ball': (ch, extra) => {
    return {
      signature_technique: { value: text(ch.fields.signature_technique.value), field: ch.fields.signature_technique, ch },
      voice_actor_ja: { value: extra ? text(extra.value) : null, field: extra ?? null, ch: extra?.ch ?? ch },
    };
  },
};
// A hint is enough when the 5-error hint exists: One Piece, a fruit name or no fruit; Dragon Ball, a technique or a voice actor.
const HINT_OK = {
  'otakudle-one-piece': (ch, h) => lower(ch.fields.devil_fruit_type.value) === 'none' || h.devil_fruit_name.value !== null,
  'otakudle-dragon-ball': (ch, h) => h.signature_technique.value !== null || h.voice_actor_ja.value !== null,
};

// The columns of each game, read from the dle_attributes insert of 024 (one line per column, in position order).
export function columnsOf(migrationSql) {
  const out = {};
  const re = /^\s*\('(otakudle-[a-z-]+)', '([a-z_]+)', '(single|multi|number|ordinal)', (\d+)::smallint/gm;
  let m;
  while ((m = re.exec(migrationSql))) (out[m[1]] ??= []).push({ key: m[2], kind: m[3], position: Number(m[4]) });
  for (const g of Object.keys(out)) out[g].sort((a, b) => a.position - b.position);
  return out;
}

// The characters L04 has, as "series/character".
export function l04Characters(l04Sql) {
  const set = new Set();
  const re = /^insert into public\.characters \([^)]*\) values \(\(select id from public\.groups where slug = '([a-z0-9-]+)' and site_id = 'anime'\), '([a-z0-9-]+)',/gm;
  let m;
  while ((m = re.exec(l04Sql))) set.add(`${m[1]}/${m[2]}`);
  return set;
}

const norm = (v) => {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v.flatMap(norm);
  if (typeof v === 'object') return norm(v.code ?? v.ord ?? v.order);
  const s = String(v).trim().toLowerCase();
  return s === '' || s === 'unknown' ? [] : [s];
};
// Does a source back the value kept? Two empty lists agree (no haki); otherwise they share one element.
const supports = (kept, got) => {
  if (Array.isArray(kept) && kept.length === 0) return Array.isArray(got) && got.length === 0;
  const a = norm(kept);
  const b = norm(got);
  return a.some((x) => b.includes(x));
};

const sourceOf = (url) => {
  let host;
  try { host = new URL(url).hostname; } catch { return null; }
  if (host.endsWith('.fandom.com')) return 'fandom';
  if (host.endsWith('wikidata.org')) return 'wikidata';
  if (host.endsWith('wikipedia.org')) return 'wikipedia';
  return null;   // the site's own data files are not a source
};

// The entity_sources rows of one stored value: one per source (wikidata, wikipedia, fandom), the first page that backs the value.
export function sourcesOf(field, ch) {
  const rows = new Map();
  for (const s of field.sources ?? []) {
    if (!s.url || !supports(field.value, s.value)) continue;
    const source = sourceOf(s.url);
    if (!source || rows.has(source)) continue;
    let ref = null;
    if (source === 'wikidata') ref = /\/wiki\/(Q[0-9]+)$/.exec(s.url)?.[1] ?? ch.ids?.wikidata_qid ?? null;
    if (source === 'fandom') ref = ch.ids?.fandom_revision ? String(ch.ids.fandom_revision) : null;
    rows.set(source, { source, ref, url: s.url });
  }
  return [...rows.values()];
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const json = (o) => `${q(JSON.stringify(o))}::jsonb`;
const sqlOrNull = (s) => (s === null || s === undefined ? 'null' : q(s));

export function build({ data, l04, columns, targets = 'complete', voices = null }) {
  const result = { games: [], sql: '', rollback: '', targets };
  const header = [];
  const body = [];
  const fieldsByGame = {};
  for (const game of GAMES) {
    const cols = columns[game.id];
    if (!cols?.length) throw new Error(`024 holds no column for ${game.id}`);
    const known = Object.keys(COLUMNS[game.id]);
    for (const c of cols) if (!known.includes(c.key)) throw new Error(`${game.id}: 024 has the column ${c.key} and the generator does not know it`);
    const d = data[game.id];
    const inSite = d.characters.filter((c) => l04.has(`${game.series}/${c.slug}`));
    const waiting = d.characters.filter((c) => !l04.has(`${game.series}/${c.slug}`));
    let complete = 0;
    const noHint = [];
    let nTargets = 0;
    const fields = new Set();
    const rowsSql = [];
    for (const ch of inSite) {
      const attrs = {};
      for (const c of cols) attrs[c.key] = COLUMNS[game.id][c.key](ch.fields);
      const extra = game.id === 'otakudle-dragon-ball' ? voices?.get(ch.slug) : undefined;
      const hintDefs = HINTS_OF[game.id](ch, extra);
      const hints = Object.fromEntries(Object.entries(hintDefs).filter(([, h]) => h.value !== null).map(([k, h]) => [k, h.value]));
      const hintOk = HINT_OK[game.id](ch, hintDefs);
      const isComplete = cols.every((c) => present(attrs[c.key].v)) && hintOk;
      if (!hintOk) noHint.push(ch.slug);
      if (isComplete) complete++;
      const target = targets === 'complete' && isComplete;
      if (target) nTargets++;
      rowsSql.push(
        `insert into public.character_game_facts (character_id, game_id, attrs, hints, can_be_target) values ((select c.id from public.characters c join public.groups g on g.id = c.group_id where g.site_id = 'anime' and g.slug = ${q(game.series)} and c.slug = ${q(ch.slug)}), ${q(game.id)}, ${json(attrs)}, ${json(hints)}, ${target}) on conflict (character_id, game_id) do update set attrs = excluded.attrs, hints = excluded.hints, can_be_target = excluded.can_be_target, updated_at = now() where (character_game_facts.attrs, character_game_facts.hints, character_game_facts.can_be_target) is distinct from (excluded.attrs, excluded.hints, excluded.can_be_target);`,
      );
      const fetched = `${d.header.generated_on}T00:00:00Z`;
      const stored = [
        ...cols.map((c) => [c.key, ch.fields[FIELD_OF[c.key] ?? c.key], attrs[c.key].v, ch]),
        ...Object.entries(hintDefs).filter(([, h]) => h.value !== null).map(([k, h]) => [k, h.field, h.value, h.ch]),
      ];
      for (const [key, dataField, v, owner] of stored) {
        if (!present(v) && v !== 0) continue;
        const srcs = sourcesOf(dataField, owner);
        if (srcs.length === 0) throw new Error(`${game.id} ${ch.slug} ${key}: the value ${JSON.stringify(v)} has no source`);
        const field = `${game.series}.${key}`;
        fields.add(field);
        for (const s of srcs) {
          rowsSql.push(
            `insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at) values ('character', ${q(ch.slug)}, ${q(field)}, ${q(s.source)}, ${sqlOrNull(s.ref)}, ${q(s.url)}, ${q(fetched)}::timestamptz) on conflict (entity_type, entity_id, field, source) do update set source_ref = excluded.source_ref, source_url = excluded.source_url, fetched_at = excluded.fetched_at where (entity_sources.source_ref, entity_sources.source_url, entity_sources.fetched_at) is distinct from (excluded.source_ref, excluded.source_url, excluded.fetched_at);`,
          );
        }
      }
    }
    fieldsByGame[game.id] = [...fields].sort();
    result.games.push({ id: game.id, series: game.series, data: d.characters.length, loaded: inSite.length, complete, targets: nTargets, waiting: waiting.length, columns: cols.map((c) => c.key), noHint });
    header.push(
      `--   ${game.id}: ${d.characters.length} characters collected, ${inSite.length} in L04 and loaded here (${complete} with every column and the hint, ${nTargets} flagged as targets), ${waiting.length} waiting for the L04 regeneration and skipped.`,
      `--     columns: ${cols.map((c) => c.key).join(', ')}; 5-error hint: ${game.id === 'otakudle-one-piece' ? 'devil_fruit_name' : 'signature_technique, else voice_actor_ja'}.`,
      `--     waiting (slug): ${waiting.map((c) => c.slug).join(', ') || 'none'}`,
      ...(game.id === 'otakudle-dragon-ball' ? [`--     voice actors: ${voices ? 'read from data/all-series.json' : 'data/all-series.json is not there, so no voice actor is loaded'}; loaded from L04 with no 5-error hint (no technique${voices ? ', no voice actor' : ', voice actor unknown'}), never a target (${noHint.length}): ${noHint.join(', ') || 'none'}`] : []),
    );
    body.push(`-- ${game.id}`, ...rowsSql, '');
  }
  const guard = GAMES.map((game) => {
    const slugs = data[game.id].characters.filter((c) => l04.has(`${game.series}/${c.slug}`)).map((c) => `(${q(game.series)}, ${q(c.slug)})`);
    return { game, slugs };
  });
  const total = guard.reduce((n, g) => n + g.slugs.length, 0);
  result.sql = [
    '-- L15-A2-series-games.sql (lot A2, run O1, CR-023; generated by scripts/anime/a2/gen-sql.mjs, do not edit by hand)',
    '--',
    `-- What:   the facts of the two per-series daily games, otakudle-one-piece and otakudle-dragon-ball: ${result.games.map((g) => `${g.loaded} character_game_facts rows for ${g.id}`).join(', ')}, and their`,
    '--         entity_sources rows (one per stored value and supporting source: Wikidata, Wikipedia or a Fandom wiki, facts only). Upserts only. It touches no other',
    '--         table, no row of L01 to L14, no kpop row. The facts are as the data stands at its reference point (One Piece: the Egghead arc, the last arc finished',
    `--         in the anime; Dragon Ball: Daima). can_be_target rule: --targets ${targets} (only a character with every column of the game and the hint).`,
    '--         The data of lot A2 holds more characters than L04 has; the others are skipped until L04 is regenerated, then this file is generated again:',
    ...header,
    '-- Needs:  L04 (series and characters), 011 (entity_sources.source_url and the source fandom), 024 (the table character_game_facts).',
    '-- Verify: docs/launch/o1/checks/V-L15.sql (session.sh J4)',
    '-- Undo:   L15-A2-series-games.rollback.sql (refused once a series game has a play).',
    '-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.',
    '',
    "set lock_timeout = '5s';",
    'set client_min_messages = warning;',
    'do $a2$ begin',
    "  if to_regclass('public.character_game_facts') is null then",
    "    raise exception 'L15: public.character_game_facts is missing (apply 024 first)';",
    '  end if;',
    "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url') then",
    "    raise exception 'L15: entity_sources.source_url is missing (apply 011 first)';",
    '  end if;',
    "  if not exists (select 1 from pg_constraint where conname = 'entity_sources_source_check' and pg_get_constraintdef(oid) like '%fandom%') then",
    "    raise exception 'L15: entity_sources_source_check does not know fandom (apply 011 as of CR-023)';",
    '  end if;',
    `  if (select count(*) from public.characters c join public.groups g on g.id = c.group_id where g.site_id = 'anime' and (g.slug, c.slug) in (${guard.flatMap((g) => g.slugs).join(', ')})) <> ${total} then`,
    "    raise exception 'L15: a character of this file is missing in L04 (apply L04 first, or generate this file again)';",
    '  end if;',
    'end $a2$;',
    '',
    ...body,
  ].join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  const allFields = GAMES.flatMap((g) => fieldsByGame[g.id]);
  result.rollback = [
    '-- L15-A2-series-games.rollback.sql (lot A2, run O1, CR-023; generated by scripts/anime/a2/gen-sql.mjs, do not edit by hand)',
    '--',
    '-- What:   undoes L15: deletes the rows of otakudle-one-piece and otakudle-dragon-ball from character_game_facts, and their entity_sources rows (the fields "one-piece.<column>" and "dragon-ball.<column>").',
    '--         Refused once a series game has a play.',
    '-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.',
    '',
    "set lock_timeout = '5s';",
    'set client_min_messages = warning;',
    'do $a2$',
    'declare plays bigint := 0;',
    'begin',
    "  if to_regclass('public.dle_plays') is not null then",
    "    execute $q$select count(*) from public.dle_plays where game_id in ('otakudle-one-piece', 'otakudle-dragon-ball')$q$ into plays;",
    '  end if;',
    '  if plays > 0 then',
    "    raise exception 'L15 rollback refused: a series game has a play';",
    '  end if;',
    'end $a2$;',
    '',
    "delete from public.character_game_facts where game_id in ('otakudle-one-piece', 'otakudle-dragon-ball');",
    `delete from public.entity_sources where entity_type = 'character' and field in (${allFields.map(q).join(', ')});`,
    '',
  ].join('\n');
  return result;
}

// The Japanese voice actors of the Dragon Ball characters, from the all-series data when the file is there (null when it is not).
export function loadVoices(file) {
  let all;
  try { all = JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
  const series = (all.series ?? []).find((s) => s.slug === 'dragon-ball');
  if (!series) return null;
  return new Map(series.characters.filter((c) => c.fields?.voice_actor_ja).map((c) => [c.slug, { ...c.fields.voice_actor_ja, ch: c }]));
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const targets = arg('targets', 'complete');
  if (!['complete', 'none'].includes(targets)) throw new Error('--targets is complete or none');
  const l04 = l04Characters(readFileSync(arg('l04', path.join(ROOT, 'docs/pending-migrations/multisite/launch/L04-K1-series.sql')), 'utf8'));
  const columns = columnsOf(readFileSync(arg('migration', path.join(ROOT, 'docs/pending-migrations/multisite/024-dle-series-games.sql')), 'utf8'));
  const data = Object.fromEntries(GAMES.map((g) => [g.id, JSON.parse(readFileSync(path.join(HERE, 'data', g.file), 'utf8'))]));
  const voices = loadVoices(path.join(HERE, 'data', 'all-series.json'));
  const res = build({ data, l04, columns, targets, voices });
  for (const g of res.games) console.log(`${g.id}: ${g.data} collected, ${g.loaded} in L04, ${g.complete} complete, ${g.targets} targets, ${g.waiting} waiting; columns ${g.columns.join(',')}`);
  if (!process.argv.includes('--check')) {
    const dir = arg('out', path.join(ROOT, 'docs/pending-migrations/multisite/launch'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'L15-A2-series-games.sql'), res.sql);
    writeFileSync(path.join(dir, 'L15-A2-series-games.rollback.sql'), res.rollback);
    console.log(`written: ${path.join(dir, 'L15-A2-series-games.sql')}`);
  }
}
