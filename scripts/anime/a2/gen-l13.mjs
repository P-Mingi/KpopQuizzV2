#!/usr/bin/env node
// Lot A2 (run O1, CR-023): writes L13-A1-character-facts.sql (and its rollback) for the whole pool of Otakudle, the 750 characters of the 50 launch series.
//
//   node scripts/anime/a2/gen-l13.mjs [--l04 <file>] [--out <folder>] [--check]
//
// The file keeps the name lot A1 gave it (session.sh, the rehearsal, the runbook and the rollback docs name it); what changes is its source: A1's 120
// characters came from scripts/anime/a1/data/a1-facts.json, these come from scripts/anime/a2/data/all-series.json, which already holds A1's values as one of
// its sources (a1_facts) and the owner's rulings of 2026-11-03 after them. a1-facts.json still gives the demographic of the 50 series (series_facts).
// Reads  data/all-series.json (gender, species, role at the first appearance, first appearance, Japanese voice actor, with their sources),
//        data/TOP200.md (the 200 best known characters: character_facts.featured, the only characters the first bank draws its target from),
//        docs/pending-migrations/multisite/launch/L04-K1-series.sql (which characters the site has),
//        scripts/anime/a1/data/a1-facts.json (series demographic and its sources).
// Writes one character_facts row per character that L04 has and one entity_sources row per stored value and supporting source (Wikidata, Wikipedia or a Fandom
// wiki; fandom admitted by CR-023). Facts only. A value the data does not have is null: the character stays guessable and is not a target. Same input, same bytes.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { l04Characters, sourcesOf } from './gen-sql.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const FIELDS = ['gender', 'species', 'role_at_debut', 'first_appearance', 'voice_actor_ja'];
const ROLES = new Set(['main', 'supporting', 'antagonist', 'other']);

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const list = (xs) => xs.map(q).join(', ');

/** The fields as the table stores them: null when the data has no value, or one the table refuses (the report names it). */
export function storedValues(fields) {
  const text = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max && v.trim().toLowerCase() !== 'unknown' ? v.trim() : null);
  const gender = typeof fields.gender?.value === 'string' ? fields.gender.value.trim().toLowerCase() : null;
  const species = typeof fields.species?.value === 'string' ? fields.species.value.trim().toLowerCase() : null;
  const role = typeof fields.role_at_debut?.value === 'string' ? fields.role_at_debut.value.trim().toLowerCase() : null;
  return {
    gender: gender === 'male' || gender === 'female' ? gender : null,
    species: species && /^[a-z][a-z0-9-]{0,39}$/.test(species) ? species : null,
    role_at_debut: role && ROLES.has(role) ? role : null,
    first_appearance: text(fields.first_appearance?.value, 80),
    // a Japanese voice actor is written in Latin script: a value in kanji or kana is the character's own native name (audit 06, part 1), not an actor
    voice_actor_ja: ((v) => (v !== null && /[\u3040-\u30ff\u4e00-\u9fff]/.test(v) ? null : v))(text(fields.voice_actor_ja?.value, 80)),
  };
}

/** The TOP200 table of TOP200.md as "series title / character name" pairs. */
export function top200Rows(md) {
  return md.split('\n').filter((l) => /^\| [0-9]+ \|/.test(l)).map((l) => {
    const cells = l.split('|').map((x) => x.trim());
    return { rank: Number(cells[1]), name: cells[2], series: cells[3] };
  });
}

export function build({ all, top, l04, demographics, featuredAdd = [], featuredDrop = [] }) {
  const bySeriesTitle = new Map(all.series.map((s) => [s.title, s]));
  const featured = new Set();
  for (const r of top) {
    const s = bySeriesTitle.get(r.series);
    const hits = s?.characters.filter((c) => c.name === r.name) ?? [];
    if (hits.length !== 1) throw new Error(`TOP200 row ${r.rank} (${r.name}, ${r.series}) matches ${hits.length} characters of the pool`);
    featured.add(`${s.slug}/${hits[0].slug}`);
  }
  if (featured.size !== top.length) throw new Error(`TOP200 holds ${top.length} rows and ${featured.size} distinct characters`);
  // The owner's hand additions and replacements (audit 06 OT-D2, OT-D3; corrections/spec-l22.json): 'series/character' keys.
  for (const k of featuredAdd) featured.add(k);
  for (const k of featuredDrop) featured.delete(k);

  const slugCount = new Map();
  for (const s of all.series) for (const c of s.characters) slugCount.set(c.slug, (slugCount.get(c.slug) ?? 0) + 1);
  const sourceKey = (series, slug) => (slugCount.get(slug) > 1 ? `${series}/${slug}` : slug);

  const charId = (s, c) => `(select c.id from public.characters c join public.groups g on g.id = c.group_id where g.site_id = 'anime' and g.slug = ${q(s)} and c.slug = ${q(c)})`;
  const slugs = all.series.map((s) => s.slug).sort();
  const inSeries = `g.site_id = 'anime' and g.slug in (${list(slugs)})`;
  const rows = [];
  const waiting = [];
  const pairs = [];
  let nSources = 0;
  let complete = 0;
  let featuredComplete = 0;
  let ruled = 0;
  let siteRoles = 0;
  for (const s of all.series) {
    for (const c of s.characters) {
      if (!l04.has(`${s.slug}/${c.slug}`)) { waiting.push(`${s.slug}/${c.slug}`); continue; }
      pairs.push(`(${q(s.slug)}, ${q(c.slug)})`);
      const v = storedValues(c.fields);
      const isFeatured = featured.has(`${s.slug}/${c.slug}`);
      const ok = ['gender', 'species', 'role_at_debut', 'voice_actor_ja'].every((f) => v[f] !== null);
      if (ok) complete++;
      if (ok && isFeatured) featuredComplete++;
      rows.push(
        `insert into public.character_facts (character_id, ${FIELDS.join(', ')}, featured) values (${charId(s.slug, c.slug)}, ${FIELDS.map((f) => q(v[f])).join(', ')}, ${isFeatured}) on conflict (character_id) do update set ${FIELDS.map((f) => `${f} = excluded.${f}`).join(', ')}, featured = excluded.featured, updated_at = now() where (character_facts.${FIELDS.join(', character_facts.')}, character_facts.featured) is distinct from (excluded.${FIELDS.join(', excluded.')}, excluded.featured);`,
      );
      const fetched = `${all.header.generated_on}T00:00:00Z`;
      for (const f of FIELDS) {
        if (v[f] === null) continue;
        let srcs = sourcesOf(c.fields[f], c);
        if (srcs.length === 0 && c.fields[f].ruling) {
          // An ORCH ruling of 2026-11-03 gave the value (one word for a whole family): the pages read for the character are its sources.
          srcs = sourcesOf({ ...c.fields[f], value: null, sources: c.fields[f].sources.map((x) => ({ ...x, value: 'ruling' })) }, c, true);
          ruled++;
        }
        if (srcs.length === 0 && f === 'role_at_debut' && c.fields[f].sources.some((x) => x.source === 'site_data_role' && x.value === v[f])) { siteRoles++; continue; }
        if (srcs.length === 0) throw new Error(`${s.slug}/${c.slug} ${f}: the value ${JSON.stringify(v[f])} has no source`);
        for (const x of srcs) {
          nSources++;
          rows.push(
            `insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at) values ('character', ${q(sourceKey(s.slug, c.slug))}, ${q(f)}, ${q(x.source)}, ${q(x.ref)}, ${q(x.url)}, ${q(x.read ? `${x.read}T00:00:00Z` : fetched)}::timestamptz) on conflict (entity_type, entity_id, field, source) do update set source_ref = excluded.source_ref, source_url = excluded.source_url, fetched_at = excluded.fetched_at where (entity_sources.source_ref, entity_sources.source_url, entity_sources.fetched_at) is distinct from (excluded.source_ref, excluded.source_url, excluded.fetched_at);`,
          );
        }
      }
    }
  }

  const demo = [];
  for (const d of demographics) {
    demo.push(`insert into public.series_facts (group_id, demographic) values ((select g.id from public.groups g where g.site_id = 'anime' and g.slug = ${q(d.slug)}), ${q(d.demographic.value)}) on conflict (group_id) do update set demographic = excluded.demographic, updated_at = now() where series_facts.demographic is distinct from excluded.demographic;`);
    demo.push(`insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at) values ('series', ${q(d.slug)}, 'demographic', ${q(d.demographic.source)}, ${q(d.demographic.source_ref)}, ${q(d.demographic.source_url)}, ${q(d.demographic.fetched_at)}::timestamptz) on conflict (entity_type, entity_id, field, source) do update set source_ref = excluded.source_ref, source_url = excluded.source_url, fetched_at = excluded.fetched_at where (entity_sources.source_ref, entity_sources.source_url, entity_sources.fetched_at) is distinct from (excluded.source_ref, excluded.source_url, excluded.fetched_at);`);
  }

  const n = pairs.length;
  const sql = [
    `-- L13-A1-character-facts.sql (lots A1 and A2, 2026-11-03; generated by scripts/anime/a2/gen-l13.mjs, do not edit by hand)`,
    `--`,
    `-- What:   the Otakudle facts of docs/o1/contracts/dle-a1-characters.md for the whole pool: ${demographics.length} series_facts rows (demographic) and ${n} character_facts rows (the ${all.series.reduce((m, s) => m + s.characters.length, 0)} characters`,
    `--         of data/all-series.json that L04 has), with ${nSources + demographics.length} entity_sources rows (one per stored value and supporting source: Wikidata, Wikipedia or a Fandom wiki). Upserts only. It touches no other`,
    `--         table, no row of L01 to L12, no kpop row. A1's 120 characters were the first version of this file; A1's values are among the sources of these (a1_facts),`,
    `--         after the owner's rulings of 2026-11-03 (Denji is a devil-human-hybrid, for one). The 20 characters of A1 that the pool does not hold are no longer in the game.`,
    `--         featured: the 200 characters of TOP200.md, the only ones the first bank of otakudle draws its target from (023); ${complete} characters have a gender, a species,`,
    `--         a role and a voice actor, ${featuredComplete} of them are featured.`,
    `--         Sources: ${siteRoles} roles at the first appearance are the role of the site data itself (characters.role, K1), with no entity_sources row; ${ruled} values rest on an`,
    `--         ORCH ruling of 2026-11-03 and carry the pages read for the character as their sources.`,
    `--         Waiting for L04 (not in the file, listed): ${waiting.length === 0 ? 'none' : waiting.join(', ')}`,
    `-- Needs:  L04 (series and characters), 011 (entity_sources.source_url and the source fandom), 023 (the two tables and featured).`,
    `-- Verify: docs/launch/o1/checks/V-L13.sql (session.sh J4); select count(*) from public.series_facts;   expect ${demographics.length}`,
    `--         select count(*) from public.character_facts;   expect ${n}`,
    `-- Undo:   L13-A1-character-facts.rollback.sql (refused once the game otakudle has a play).`,
    `-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.`,
    ``,
    `set lock_timeout = '5s';`,
    `set client_min_messages = warning;`,
    `do $a1$ begin`,
    `  if to_regclass('public.character_facts') is null or to_regclass('public.series_facts') is null then`,
    `    raise exception 'L13: public.character_facts or public.series_facts is missing (apply 023 first)';`,
    `  end if;`,
    `  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'character_facts' and column_name = 'featured') then`,
    `    raise exception 'L13: character_facts.featured is missing (apply 023 as of CR-023)';`,
    `  end if;`,
    `  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url') then`,
    `    raise exception 'L13: entity_sources.source_url is missing (apply 011 first)';`,
    `  end if;`,
    `  if not exists (select 1 from pg_constraint where conname = 'entity_sources_source_check' and pg_get_constraintdef(oid) like '%fandom%') then`,
    `    raise exception 'L13: entity_sources_source_check does not know fandom (apply 011 as of CR-023)';`,
    `  end if;`,
    `  if (select count(*) from public.groups g where ${inSeries}) <> ${all.series.length} then`,
    `    raise exception 'L13: the series groups are missing (apply L04 first)';`,
    `  end if;`,
    `  if (select count(*) from public.characters c join public.groups g on g.id = c.group_id where g.site_id = 'anime' and (g.slug, c.slug) in (${pairs.join(', ')}) and c.status = 'published') <> ${n} then`,
    `    raise exception 'L13: a character of this file is missing or not published in L04';`,
    `  end if;`,
    `end $a1$;`,
    ``,
    `-- series_facts: the demographic of the original work, the ${demographics.length} launch series.`,
    ...demo,
    ``,
    `-- character_facts: as the reader first meets the character. Null: not known for sure, so not a target.`,
    ...rows,
  ].join('\n') + '\n';

  const rollback = [
    `-- L13-A1-character-facts.rollback.sql (lots A1 and A2, 2026-11-03; generated by scripts/anime/a2/gen-l13.mjs, do not edit by hand)`,
    `--`,
    `-- What:   undoes L13: deletes the rows of the ${all.series.length} launch series from character_facts and series_facts, and their entity_sources rows of the six fields. Refused once the game otakudle has a play.`,
    `-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.`,
    ``,
    `set lock_timeout = '5s';`,
    `set client_min_messages = warning;`,
    `do $a1$`,
    `declare plays bigint := 0;`,
    `begin`,
    `  if to_regclass('public.dle_plays') is not null then`,
    `    execute $q$select count(*) from public.dle_plays where game_id = 'otakudle'$q$ into plays;`,
    `  end if;`,
    `  if plays > 0 then`,
    `    raise exception 'L13 rollback refused: the game otakudle has a play';`,
    `  end if;`,
    `end $a1$;`,
    ``,
    `delete from public.character_facts where character_id in (select c.id from public.characters c join public.groups g on g.id = c.group_id where ${inSeries});`,
    `delete from public.series_facts where group_id in (select g.id from public.groups g where ${inSeries});`,
    `delete from public.entity_sources where entity_type = 'character' and field in (${list(FIELDS)}) and entity_id in (select c.slug from public.characters c join public.groups g on g.id = c.group_id where ${inSeries} union select g.slug || '/' || c.slug from public.characters c join public.groups g on g.id = c.group_id where ${inSeries});`,
    `delete from public.entity_sources where entity_type = 'series' and field = 'demographic' and entity_id in (${list(slugs)});`,
    ``,
  ].join('\n');
  return { sql, rollback, counts: { characters: n, sources: nSources, series: demographics.length, complete, featuredComplete, featured: featured.size, waiting } };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = JSON.parse(readFileSync(path.join(HERE, 'data', 'all-series.json'), 'utf8'));
  const top = top200Rows(readFileSync(path.join(HERE, 'data', 'TOP200.md'), 'utf8'));
  const l04 = l04Characters(readFileSync(arg('l04', path.join(ROOT, 'docs/pending-migrations/multisite/launch/L04-K1-series.sql')), 'utf8'));
  const a1 = JSON.parse(readFileSync(path.join(ROOT, 'scripts/anime/a1/data/a1-facts.json'), 'utf8'));
  const inPool = new Set(all.series.map((s) => s.slug));
  const demographics = a1.series.filter((s) => inPool.has(s.slug)).sort((x, y) => (x.slug < y.slug ? -1 : 1));
  const spec = await import('./corrections/spec-l22.mjs').catch((e) => (e.code === 'ERR_MODULE_NOT_FOUND' ? null : Promise.reject(e)));
  const out = build({ all, top, l04, demographics, featuredAdd: spec?.FEATURED_ON ?? [], featuredDrop: spec?.FEATURED_OFF ?? [] });
  console.log(JSON.stringify(out.counts).replace(/"waiting":\[[^\]]*\]/, `"waiting":${out.counts.waiting.length}`));
  if (!process.argv.includes('--check')) {
    const dir = arg('out', path.join(ROOT, 'docs/pending-migrations/multisite/launch'));
    writeFileSync(path.join(dir, 'L13-A1-character-facts.sql'), out.sql);
    writeFileSync(path.join(dir, 'L13-A1-character-facts.rollback.sql'), out.rollback);
    console.log(`written: ${path.join(dir, 'L13-A1-character-facts.sql')}`);
  }
}
