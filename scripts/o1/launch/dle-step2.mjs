// Otakudle in two steps (owner request of 2026-11-26, lane OTK-E, run O1): the data of step 2 and the SQL that loads it.
//
// The data: one file per series of docs/anime/data/dle/step2/<series-slug>.json (the 48 series other than One Piece and Dragon Ball, whose sets are the
// existing games otakudle-one-piece and otakudle-dragon-ball): the columns of the series (2 to 4, plus the engine's gender, which is not in the files) and,
// for every character of the series file, one value per column with its sources. The contract is checked by validateSeries (also run by the unit test).
//
// The SQL: gen-two-steps.mjs calls buildData, which returns the files L42a (the data: the set games, their columns, the facts and the sources). The engine
// (L42, the new dle_play_state) is hand written and does not depend on the data but for its self-check.
//
// Facts only: the values are words and numbers; no text of a page is copied. Same input, same output (no clock, no random).

/** The two series whose sets already exist (024, L15): their columns are the ones of their own games. */
export const LEGACY_SETS = { 'one-piece': 'otakudle-one-piece', 'dragon-ball': 'otakudle-dragon-ball' };

export const KINDS = ['single', 'multi', 'ordinal', 'number'];
const KEY = /^[a-z][a-z0-9_]{0,30}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** The id of the set game of a series. Same rule as public.dle_otakudle_set_id (L42): 30 characters of the slug at most, so the id stays under the 41 of dle_games. */
export function setId(series) {
  return LEGACY_SETS[series] ?? `otakudle-s-${series.slice(0, 30)}`;
}

// A source is Wikipedia (any language) or an official site: never a Fandom wiki or a fan database (the owner's rulebook 5.3), never another Wikipedia.
const FORBIDDEN_HOSTS = [
  'fandom.com', 'wikia.com', 'wikia.org', 'myanimelist.net', 'anilist.co', 'kitsu.io', 'kitsu.app', 'anidb.net', 'tvtropes.org', 'fanlore.org', 'miraheze.org',
  'namu.wiki', 'wikitubia.com', 'animenewsnetwork.com', 'imdb.com', 'wikidata.org', 'reddit.com', 'youtube.com', 'youtu.be', 'archive.org', 'web.archive.org',
];
const DASH = new RegExp(`[${String.fromCharCode(0x2013, 0x2014, 0x2026)}]`);

/** The kind of source of an URL (the entity_sources.source value), or null when the URL is not allowed. */
export function sourceKind(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  // Any Wikipedia language is a source (owner's rule, 2026-11-26: the series of a language other than English may be sourced from its own Wikipedia).
  if (/^[a-z]{2,3}(-[a-z]+)?\.wikipedia\.org$/.test(host)) return /^\/wiki\/[^/]+/.test(u.pathname) ? 'wikipedia' : null;
  if (host.endsWith('wikipedia.org') || host.endsWith('wikimedia.org')) return null;
  if (FORBIDDEN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  return 'official';
}

const isText = (s) => typeof s === 'string' && s.trim() !== '' && s === s.trim();
const isLabel = (o) => o && typeof o === 'object' && isText(o.en) && isText(o.fr);

/** Everything wrong with one series file against its series file of docs/anime/data/series, as a list of strings (empty: the file holds the contract). `raw` is the text of the file. */
export function validateSeries(data, series, raw = JSON.stringify(data)) {
  const bad = [];
  const slug = data?.series_slug;
  if (typeof slug !== 'string' || !SLUG.test(slug)) return [`series_slug is not a slug: ${JSON.stringify(slug)}`];
  const at = (m) => bad.push(`${slug}: ${m}`);
  if (LEGACY_SETS[slug]) at('One Piece and Dragon Ball are not in this data (their sets exist)');
  if (series?.group?.slug !== slug) at(`the series file has the slug ${series?.group?.slug}`);
  if (DASH.test(raw)) at('an em dash, an en dash or an ellipsis character');
  if (/fandom\.com|wikia\.com/i.test(raw)) at('a Fandom address');
  const columns = Array.isArray(data.columns) ? data.columns : [];
  if (columns.length < 2 || columns.length > 4) at(`${columns.length} columns, 2 to 4 expected`);
  const arcs = new Map((series?.arcs ?? []).map((a) => [a.ord, a.name]));
  const byKey = new Map();
  for (const c of columns) {
    if (!c || typeof c.key !== 'string' || !KEY.test(c.key)) { at(`a column key is not valid: ${JSON.stringify(c?.key)}`); continue; }
    if (c.key === 'gender') at('gender is the engine column, not in the file');
    if (byKey.has(c.key)) at(`the column ${c.key} is twice`);
    byKey.set(c.key, c);
    if (!KINDS.includes(c.kind)) at(`${c.key}: the kind ${c.kind} is not one of ${KINDS.join(', ')}`);
    if (!isLabel(c.label)) at(`${c.key}: label needs en and fr`);
    if (!isLabel(c.help)) at(`${c.key}: help needs en and fr`);
    if (c.kind === 'ordinal') {
      if (c.order === 'arcs') {
        if (arcs.size === 0) at(`${c.key}: order arcs but the series file has no arcs`);
      } else if (!Array.isArray(c.order) || c.order.length < 2) at(`${c.key}: an ordinal needs "order": "arcs" or a list of 2 or more steps`);
      else {
        const seen = new Set();
        for (const o of c.order) {
          if (!Number.isInteger(o?.v)) at(`${c.key}: an order step has no integer v`);
          else if (seen.has(o.v)) at(`${c.key}: the step ${o.v} is twice`);
          else seen.add(o.v);
          if (!isLabel(o?.label)) at(`${c.key}: the step ${o?.v} needs a label in en and fr`);
        }
      }
    } else if (c.order !== undefined) at(`${c.key}: only an ordinal has an order`);
    if (c.kind === 'number') {
      if (c.near_distance !== undefined && !(typeof c.near_distance === 'number' && c.near_distance >= 0)) at(`${c.key}: near_distance is a number from 0`);
    } else if (c.near_distance !== undefined) at(`${c.key}: only a number has a near_distance`);
  }
  // The characters the site has (L04): a series file may list more characters than the pool holds, and the facts are only for the pool. Every character of the data must be a character of the site;
  // that every character of the pool has its values is checked by L42 itself and by its test on PGlite.
  const wanted = new Map((series?.characters ?? []).map((c) => [c.slug, c]));
  const chars = Array.isArray(data.characters) ? data.characters : [];
  const seenChars = new Set();
  for (const ch of chars) {
    const cs = ch?.slug;
    if (typeof cs !== 'string' || !wanted.has(cs)) { at(`the character ${JSON.stringify(cs)} is not in the series file`); continue; }
    if (seenChars.has(cs)) { at(`${cs} is twice`); continue; }
    seenChars.add(cs);
    if (!isText(ch.name)) at(`${cs}: no name`);
    for (const c of byKey.values()) {
      const v = ch.values?.[c.key];
      const w = `${cs}.${c.key}`;
      if (v === undefined || v === null) { at(`${w}: no value`); continue; }
      if (c.kind === 'single' && !isText(v)) at(`${w}: a single is one non empty string`);
      if (c.kind === 'multi' && !(Array.isArray(v) && v.length > 0 && v.every(isText) && new Set(v).size === v.length)) at(`${w}: a multi is a list of distinct non empty strings`);
      if (c.kind === 'number' && !(typeof v === 'number' && Number.isFinite(v))) at(`${w}: a number is a finite number`);
      if (c.kind === 'ordinal') {
        const steps = c.order === 'arcs' ? [...arcs.keys()] : (c.order ?? []).map((o) => o.v);
        if (!Number.isInteger(v) || !steps.includes(v)) at(`${w}: ${JSON.stringify(v)} is not a step of the order`);
      }
      const src = ch.sources?.[c.key];
      if (!Array.isArray(src) || src.length === 0) at(`${w}: no source`);
      else for (const u of src) if (sourceKind(u) === null) at(`${w}: the source ${u} is neither a Wikipedia page nor an official site`);
    }
    for (const k of Object.keys(ch.values ?? {})) if (!byKey.has(k)) at(`${cs}: a value for ${k}, which is not a column`);
  }
  return bad;
}

/** The characters of each series that L04 gives the site: Map series slug to the list of {slug}. */
export function l04Characters(l04Sql) {
  const out = new Map();
  const re = /^insert into public\.characters \([^)]*\) values \(\(select id from public\.groups where slug = '([a-z0-9-]+)' and site_id = 'anime'\), '([a-z0-9-]+)',/gm;
  let m;
  while ((m = re.exec(l04Sql))) { if (!out.has(m[1])) out.set(m[1], []); out.get(m[1]).push({ slug: m[2] }); }
  return out;
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const json = (o) => q(JSON.stringify(o));

/** The attrs of a character: {column: {"v", "l"?, "lf"?}}; l (and lf in French when it differs) is the words of an ordinal step. */
export function attrsOf(columns, ch, arcs) {
  const out = {};
  for (const c of columns) {
    const v = ch.values[c.key];
    if (c.kind === 'ordinal') {
      if (c.order === 'arcs') out[c.key] = { v, l: arcs.get(v) };
      else {
        const step = c.order.find((o) => o.v === v);
        out[c.key] = { v, l: step.label.en, ...(step.label.fr !== step.label.en ? { lf: step.label.fr } : {}) };
      }
    } else out[c.key] = { v };
  }
  return out;
}

/** The columns of a set as dle_attributes rows: gender at position 1, the series' own after it. */
export function columnRows(columns) {
  return [
    { key: 'gender', kind: 'single', position: 1, near: null, meta: null },
    ...columns.map((c, i) => ({
      key: c.key, kind: c.kind, position: i + 2, near: c.kind === 'number' && c.near_distance !== undefined ? c.near_distance : null,
      meta: { label: c.label, help: c.help },
    })),
  ];
}

/** The facts and sources statements of one series. */
function seriesStatements(data, series) {
  const slug = data.series_slug;
  const id = setId(slug);
  const arcs = new Map((series.arcs ?? []).map((a) => [a.ord, a.name]));
  const factRows = data.characters.map((ch) => `(${q(ch.slug)}, ${json(attrsOf(data.columns, ch, arcs))})`);
  const srcRows = [];
  for (const ch of data.characters) {
    for (const c of data.columns) {
      const byKind = new Map();
      for (const u of ch.sources[c.key]) { const k = sourceKind(u); if (!byKind.has(k)) byKind.set(k, u); }
      for (const [kind, url] of byKind) srcRows.push(`(${q(ch.slug)}, ${q(`${slug}.${c.key}`)}, ${q(kind)}, ${q(url)})`);
    }
  }
  const group = `(select g.id from public.groups g where g.site_id = 'anime' and g.slug = ${q(slug)})`;
  return {
    facts: [
      `-- ${slug}: ${data.characters.length} characters, columns ${data.columns.map((c) => c.key).join(', ')}`,
      `insert into public.character_game_facts (character_id, game_id, attrs, hints, can_be_target)`,
      `select c.id, ${q(id)}, v.attrs::jsonb, '{}'::jsonb, false from (values`,
      factRows.join(',\n'),
      `) as v(slug, attrs) join public.characters c on c.slug = v.slug and c.group_id = ${group}`,
      `on conflict (character_id, game_id) do update set attrs = excluded.attrs, updated_at = now() where character_game_facts.attrs is distinct from excluded.attrs;`,
    ].join('\n'),
    sources: [
      `insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)`,
      `select 'character', v.slug, v.field, v.source, null, v.url, '2026-11-26T00:00:00Z'::timestamptz from (values`,
      srcRows.join(',\n'),
      `) as v(slug, field, source, url) join public.characters c on c.slug = v.slug and c.group_id = ${group}`,
      `on conflict (entity_type, entity_id, field, source) do update set source_url = excluded.source_url, fetched_at = excluded.fetched_at where (entity_sources.source_url, entity_sources.fetched_at) is distinct from (excluded.source_url, excluded.fetched_at);`,
    ].join('\n'),
    fields: data.columns.map((c) => `${slug}.${c.key}`),
    counts: { id, characters: data.characters.length, sources: srcRows.length },
  };
}

const SETS_TAG = (i) => `o1l42a${i}`;
const FILE = (i, n, rollback) => `L42a${n > 1 ? i + 1 : ''}-l1-otakudle-two-steps-data${rollback ? '.rollback' : ''}.sql`;

/**
 * The data files of L42a. `inputs`: [{data, series}] sorted by slug. `maxBytes`: a file stays under it (split by series, in order). Returns [{name, sql, rollback, rollbackName, series, rows}].
 * The first file also holds the structure (the meta column of dle_attributes, the set games and their columns).
 */
export function buildData(inputs, { maxBytes = 1_200_000 } = {}) {
  const sets = inputs.map(({ data, series }) => ({ data, series, st: seriesStatements(data, series) }));
  const slugs = new Set();
  for (const s of sets) {
    if (slugs.has(s.data.series_slug)) throw new Error(`${s.data.series_slug} is twice`);
    slugs.add(s.data.series_slug);
  }
  const ids = new Set(sets.map((s) => s.st.counts.id));
  if (ids.size !== sets.length) throw new Error('two series share a set id');
  for (const id of ids) if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) throw new Error(`the set id ${id} is not a game id`);

  // Split in files by size.
  const groups = [[]];
  let size = 0;
  for (const s of sets) {
    const n = s.st.facts.length + s.st.sources.length + 200;
    if (size + n > maxBytes && groups[groups.length - 1].length) { groups.push([]); size = 0; }
    groups[groups.length - 1].push(s);
    size += n;
  }
  const total = groups.length;
  const allIds = sets.map((s) => s.st.counts.id);
  const allFields = sets.flatMap((s) => s.st.fields);
  const gameRows = sets.map((s) => `(${q(s.st.counts.id)})`).join(', ');
  const attrRows = sets.flatMap((s) => columnRows(s.data.columns).map((c) =>
    `(${q(s.st.counts.id)}, ${q(c.key)}, ${q(c.kind)}, ${c.position}::smallint, ${c.near === null ? 'null::numeric' : `${c.near}::numeric`}, ${c.meta ? `${json(c.meta)}::jsonb` : 'null::jsonb'})`));
  const nChars = sets.reduce((n, s) => n + s.st.counts.characters, 0);

  return groups.map((group, i) => {
    const tag = SETS_TAG(i);
    const first = i === 0;
    const nFacts = group.reduce((n, s) => n + s.st.counts.characters, 0);
    const nSrc = group.reduce((n, s) => n + s.st.counts.sources, 0);
    const checks = group.map((s) => `(${q(s.st.counts.id)}, ${s.st.counts.characters})`).join(', ');
    const order = total > 1 ? `Apply the ${total} files L42a1 to L42a${total} in order, then L42-l1-otakudle-two-steps.sql.` : 'Apply this file, then L42-l1-otakudle-two-steps.sql.';
    const head = [
      `-- ${FILE(i, total, false)} (owner request of 2026-11-26, lane OTK-E of run O1: Otakudle in two steps; generated by scripts/o1/launch/gen-two-steps.mjs from docs/anime/data/dle/step2/, do not edit by hand)`,
      '--',
      `-- What:   ${first ? `the structure of the sets of step 2 and ` : ''}the data of ${group.length} series: ${nFacts} character_game_facts rows (game_id otakudle-s-<series>) and ${nSrc} entity_sources rows (one per value and kind of source: en.wikipedia.org or an official site, field <series>.<column>).`,
      ...(first ? [
        `--         Structure: dle_attributes gets one nullable column meta (jsonb: the label and the help of a column in English and French; the columns of One Piece and Dragon Ball keep the words of the app); one dle_games row per series`,
        `--         (${sets.length} rows otakudle-s-<series>, universe anime, active false, no epoch, no bank: a set is never a page, never drawn, it only holds the columns of step 2) and its dle_attributes rows (gender first, then the 2 to 4 columns of the series).`,
      ] : []),
      `--         The sets of One Piece and Dragon Ball are the existing games otakudle-one-piece and otakudle-dragon-ball (024, L15), unchanged. Gender is not stored here: the engine reads it from character_facts.`,
      `--         ${order} No change is visible to a player before L42: the sets are closed to the browser.`,
      `-- Rows:   ${first ? `${sets.length} dle_games, ${attrRows.length} dle_attributes, ` : ''}${nFacts} character_game_facts, ${nSrc} entity_sources. Upserts only; a second run changes nothing.`,
      `-- Needs:  011, 019, 023, 024, L01 (the anime site), L04 (the characters), L13${first ? '' : `, ${FILE(0, total, false)}`}.`,
      `-- Verify: select count(*) from public.character_game_facts where game_id like 'otakudle-s-%' and game_id in (${allIds.filter((id) => group.some((s) => s.st.counts.id === id)).map(q).join(', ')});   expect ${nFacts}`,
      ...(first ? [
        `-- Verify: select count(*) from public.dle_games where id like 'otakudle-s-%' and not active and epoch is null;   expect ${sets.length}`,
        `-- Verify: select count(*) from public.dle_attributes where game_id like 'otakudle-s-%';   expect ${attrRows.length}`,
        `-- Verify: select count(*) from public.dle_attributes where game_id like 'otakudle-s-%' and key <> 'gender' and (meta -> 'label' ->> 'en' is null or meta -> 'label' ->> 'fr' is null);   expect 0`,
      ] : []),
      `-- Verify: select count(*) from public.entity_sources where entity_type = 'character' and field in (${group.flatMap((s) => s.st.fields).map(q).join(', ')});   expect ${nSrc}`,
      `-- Undo:   ${FILE(i, total, true)}${total > 1 && first ? ' (apply the rollbacks in reverse order, this one last)' : ''}`,
      `-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.`,
      '',
    ];
    const body = [`do $${tag}$`, 'declare', '  r record;', 'begin', `  perform set_config('lock_timeout', '5s', true);`];
    const pre = [
      `  if to_regclass('public.character_game_facts') is null or to_regclass('public.dle_attributes') is null then raise exception 'L42a: 019 or 024 is missing'; end if;`,
      `  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url') then raise exception 'L42a: entity_sources.source_url is missing (011)'; end if;`,
      `  if not exists (select 1 from public.sites where id = 'anime') then raise exception 'L42a: the anime site is missing (L01)'; end if;`,
      `  if (select count(*) from public.characters c join public.groups g on g.id = c.group_id and g.site_id = 'anime' where g.slug in (${group.map((s) => q(s.data.series_slug)).join(', ')})) < ${nFacts} then raise exception 'L42a: the characters of L04 are missing'; end if;`,
    ];
    const struct = first ? [
      `  alter table public.dle_attributes add column if not exists meta jsonb;`,
      `  if not exists (select 1 from pg_constraint where conname = 'dle_attributes_meta_check') then`,
      `    alter table public.dle_attributes add constraint dle_attributes_meta_check check (meta is null or jsonb_typeof(meta) = 'object');`,
      `  end if;`,
      `  insert into public.dle_games (id, universe, entity_kind, source_view, no_repeat_days, min_pool, hint_keys, hint_after, active)`,
      `  select v.id, 'anime', 'character', 'dle_src_anime_character', 120, 2, '{}'::text[], '{}'::integer[], false from (values ${gameRows}) as v(id)`,
      `  on conflict (id) do nothing;`,
      `  insert into public.dle_attributes (game_id, key, kind, position, near, meta) select * from (values`,
      attrRows.join(',\n'),
      `  ) as v(game_id, key, kind, position, near, meta)`,
      `  on conflict (game_id, key) do update set kind = excluded.kind, position = excluded.position, near = excluded.near, meta = excluded.meta`,
      `  where (dle_attributes.kind, dle_attributes.position, dle_attributes.near, dle_attributes.meta) is distinct from (excluded.kind, excluded.position, excluded.near, excluded.meta);`,
    ] : [];
    const data = group.flatMap((s) => [s.st.facts, s.st.sources, '']);
    const post = [
      `  for r in select v.id, v.n from (values ${checks}) as v(id, n) loop`,
      `    if (select count(*) from public.character_game_facts where game_id = r.id) <> r.n then raise exception 'L42a: % does not hold % rows', r.id, r.n; end if;`,
      `  end loop;`,
      `  raise notice 'L42a: ${nFacts} step 2 rows loaded';`,
      `end $${tag}$;`,
    ];
    const sql = [...head, ...body, ...pre, ...struct, ...data, ...post].join('\n') + '\n';

    const rbTag = `${tag}r`;
    const rbGroup = first ? sets : group;
    const rbIds = rbGroup.map((s) => q(s.st.counts.id)).join(', ');
    const rollback = [
      `-- ${FILE(i, total, true)} (the undo of ${FILE(i, total, false)}; generated by scripts/o1/launch/gen-two-steps.mjs, do not edit by hand)`,
      '--',
      `-- What:   deletes ${first ? 'the facts and the sources of every set (and the other L42a files hold none left once their own undo ran), then the set games (their dle_attributes rows go with them), the check and the meta column' : `the facts and the sources of ${group.length} series`}.`,
      `--         Refused while L42 is applied (undo L42 first) and while a set game has a play (a set never has one).`,
      `-- Verify: select count(*) from public.character_game_facts where game_id in (${rbIds});   expect 0`,
      ...(first ? [`-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'dle_attributes' and column_name = 'meta';   expect 0`] : []),
      `-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.`,
      '',
      `do $${rbTag}$`,
      'begin',
      `  perform set_config('lock_timeout', '5s', true);`,
      `  if to_regprocedure('public.dle_step2_cells(text, jsonb, jsonb)') is not null then raise exception 'L42a rollback refused: L42 is applied, undo it first'; end if;`,
      `  if exists (select 1 from public.dle_plays where game_id in (${rbIds})) then raise exception 'L42a rollback refused: a set game has a play'; end if;`,
      `  delete from public.character_game_facts where game_id in (${rbIds});`,
      `  delete from public.entity_sources where entity_type = 'character' and field in (${rbGroup.flatMap((s) => s.st.fields).map(q).join(', ')});`,
      ...(first ? [
        `  delete from public.dle_games where id in (${rbIds}) and not active;`,
        `  alter table public.dle_attributes drop constraint if exists dle_attributes_meta_check;`,
        `  alter table public.dle_attributes drop column if exists meta;`,
      ] : []),
      `end $${rbTag}$;`,
    ].join('\n') + '\n';

    return { name: FILE(i, total, false), rollbackName: FILE(i, total, true), sql, rollback, series: group.map((s) => s.data.series_slug), rows: { facts: nFacts, sources: nSrc, games: first ? sets.length : 0, attributes: first ? attrRows.length : 0, allCharacters: nChars } };
  });
}
