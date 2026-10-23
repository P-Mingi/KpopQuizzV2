#!/usr/bin/env node
// Run O1, lane K1: checks the series data files of docs/anime/data (series/<slug>.json and facts/<slug>.json) before
// they are loaded or packed for review. No network, no database.
//
//   node scripts/anime/k1/validate-data.mjs [docs/anime/data] [--tier-counts]
//
// 1. The series file against series-fixture.schema.json without quizzes (the brief adds group.site, official_url, wikidata_qid, the
//    arc episode and chapter ranges, the character affiliation and deezer_playable).
// 2. Every fact against fact.schema.json (the extra `excerpt` key, the short source text the copy guard reads, is
//    removed first and must be a non-empty one-liner of 160 characters or fewer).
// 3. Lints the schemas cannot state: arc ords run 1..n, arc ranges ordered, a character debut arc exists, slugs and theme
//    slots are unique, fact ids are unique, every fact refers to a character of its series, every spoiler arc exists,
//    no U+2013 or U+2014 anywhere, tier counts (A 30 characters/facts, B 20, C 12/15; the fact count is a floor on the non-rejected facts) when --tier-counts is given.
// 4. Backing: every number, date, name and title of the series file occurs in the value or text of at least one fact.
// Exit 0 only when nothing fails. Prints the failures, at most 12 per file.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const SCHEMAS = resolve(ROOT, 'docs/o1/contracts/schemas');
const FIXTURE_SCHEMA = resolve(ROOT, 'docs/o1/contracts/fixtures/series-fixture.schema.json');
const TIER_CHARS = { A: 30, B: 20, C: 12 };
const TIER_FACTS = { A: 30, B: 20, C: 15 };

const args = process.argv.slice(2);
const tierCounts = args.includes('--tier-counts');
const dataDir = resolve(ROOT, args.find((a) => !a.startsWith('--')) ?? 'docs/anime/data');

const { tsImport } = await import('tsx/esm/api');
const { validate } = await tsImport(resolve(ROOT, 'apps/quiz/scripts/o1/contract/json-schema.ts'), import.meta.url);

const registry = {};
for (const f of readdirSync(SCHEMAS)) if (f.endsWith('.schema.json')) registry[f] = JSON.parse(readFileSync(join(SCHEMAS, f), 'utf8'));
const fixture = JSON.parse(readFileSync(FIXTURE_SCHEMA, 'utf8'));
// D-105: press (Oricon, Anime News Network) is a fact source kind kept in the files only; docs/o1/requests/K1.md asks ORCH to add it to the contract
{ const kinds = registry['fact.schema.json']?.properties?.sources?.items?.properties?.source; if (kinds && !kinds.enum.includes('press')) kinds.enum = [...kinds.enum, 'press']; }
const common = registry['common.schema.json'].$defs;

// The data-file schema: the fixture without quizzes, plus the keys the brief adds.
const dataSchema = structuredClone(fixture);
dataSchema.$id = 'series-data.schema.json';
dataSchema.required = dataSchema.required.filter((k) => k !== 'quizzes');
delete dataSchema.properties.quizzes;
dataSchema.properties.group.required = ['slug', 'name', 'site', 'display_color', 'text_color'];
dataSchema.properties.group.properties.site = { const: 'anime' };
Object.assign(dataSchema.properties.series.properties, {
  official_url: { $ref: 'common.schema.json#/$defs/sourceUrl' },
  wikidata_qid: { type: 'string', pattern: '^Q[0-9]+$' },
});
dataSchema.properties.series.required.push('official_url', 'wikidata_qid', 'tier');
Object.assign(dataSchema.properties.arcs.items.properties, {
  episode_from: { type: 'integer', minimum: 1 }, episode_to: { type: 'integer', minimum: 1 },
  chapter_from: { type: 'integer', minimum: 1 }, chapter_to: { type: 'integer', minimum: 1 },
});
Object.assign(dataSchema.properties.characters.items.properties, { affiliation: { $ref: 'common.schema.json#/$defs/plainText', maxLength: 120 } });
dataSchema.properties.characters.items.required.push('affiliation', 'debut_medium');
Object.assign(dataSchema.properties.themes.items.properties, { deezer_playable: { type: 'boolean' } });
dataSchema.properties.themes.items.required.push('deezer_playable');
// A series with no aired anime (webtoon or manga only) has no opening or ending: the data files may hold an empty themes list.
dataSchema.properties.themes.minItems = 0;
registry['series-data.schema.json'] = dataSchema;
registry['series-fixture.schema.json'] = fixture;

const BANNED = /[–—]/;
const EMOJI = /\p{Extended_Pictographic}/u;
let failed = 0;
const report = (file, msgs) => {
  if (msgs.length === 0) { console.log(`ok   ${file}`); return; }
  failed += msgs.length;
  console.log(`FAIL ${file} (${msgs.length})`);
  for (const m of msgs.slice(0, 12)) console.log(`     ${m}`);
  if (msgs.length > 12) console.log(`     ... ${msgs.length - 12} more`);
};

const norm = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const flatten = (v, out = []) => {
  if (v === null || v === undefined) return out;
  if (Array.isArray(v)) v.forEach((x) => flatten(x, out));
  else if (typeof v === 'object') Object.values(v).forEach((x) => flatten(x, out));
  else out.push(String(v));
  return out;
};

const seriesDir = join(dataDir, 'series');
const factsDir = join(dataDir, 'facts');
if (!existsSync(seriesDir)) { console.error(`validate-data: ${seriesDir} is missing`); process.exit(2); }
const slugs = readdirSync(seriesDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();

for (const slug of slugs) {
  const msgs = [];
  const s = JSON.parse(readFileSync(join(seriesDir, `${slug}.json`), 'utf8'));
  const factFile = join(factsDir, `${slug}.json`);
  const facts = existsSync(factFile) ? JSON.parse(readFileSync(factFile, 'utf8')) : null;
  if (s.group?.slug !== slug) msgs.push(`group.slug ${s.group?.slug} is not the file name ${slug}`);
  for (const e of validate('series-data.schema.json', s, registry)) msgs.push(`schema ${e.path || '/'}: ${e.message}`);
  const raw = JSON.stringify(s);
  if (BANNED.test(raw)) msgs.push('series file holds a U+2013 or U+2014 character');
  if (EMOJI.test(raw)) msgs.push('series file holds an emoji');
  const arcs = s.arcs ?? [];
  arcs.forEach((a, i) => {
    if (a.ord !== i + 1) msgs.push(`arcs[${i}].ord is ${a.ord}, expected ${i + 1}`);
    if (a.episode_from && a.episode_to && a.episode_from > a.episode_to) msgs.push(`arc ${a.ord}: episode range reversed`);
    if (a.chapter_from && a.chapter_to && a.chapter_from > a.chapter_to) msgs.push(`arc ${a.ord}: chapter range reversed`);
    if (a.manga_only && a.anime_only) msgs.push(`arc ${a.ord}: manga_only and anime_only`);
  });
  const arcMax = arcs.length;
  const cslugs = new Set();
  (s.characters ?? []).forEach((c, i) => {
    if (cslugs.has(c.slug)) msgs.push(`duplicate character slug ${c.slug}`);
    cslugs.add(c.slug);
    if (c.debut_arc_ord > arcMax) msgs.push(`${c.slug}: debut_arc_ord ${c.debut_arc_ord} above the last arc`);
    if (c.spoiler_level > arcMax) msgs.push(`${c.slug}: spoiler_level ${c.spoiler_level} above the last arc`);
    if (c.ord !== i + 1) msgs.push(`${c.slug}: ord ${c.ord}, expected ${i + 1}`);
    if (c.spoiler_level > 0 && c.spoiler_level < c.debut_arc_ord) msgs.push(`${c.slug}: spoiler_level below its debut arc`);
  });
  const slots = new Set();
  for (const t of s.themes ?? []) {
    const k = `${t.kind}-${t.number}`;
    if (slots.has(k)) msgs.push(`duplicate theme slot ${k}`);
    slots.add(k);
  }
  if (tierCounts) {
    const want = TIER_CHARS[s.series?.tier];
    if (want && s.characters.length !== want) msgs.push(`tier ${s.series.tier}: ${s.characters.length} characters, expected ${want}`);
  }

  // facts
  if (!facts) msgs.push(`facts/${slug}.json is missing`);
  else {
    if (!Array.isArray(facts)) msgs.push('facts file is not an array');
    else {
      const ids = new Set(); const slots2 = new Set();
      facts.forEach((f, i) => {
        const { excerpt, ...rest } = f;
        for (const e of validate('fact.schema.json', rest, registry)) msgs.push(`fact ${f.id ?? i} ${e.path || '/'}: ${e.message}`);
        if (typeof excerpt !== 'string' || excerpt.length === 0 || excerpt.length > 160 || /[\n\r]/.test(excerpt)) msgs.push(`fact ${f.id}: excerpt must be one line of 1 to 160 characters`);
        if (ids.has(f.id)) msgs.push(`duplicate fact id ${f.id}`);
        ids.add(f.id);
        if (BANNED.test(JSON.stringify(f))) msgs.push(`fact ${f.id}: U+2013 or U+2014`);
        if (f.entity?.group_slug !== slug) msgs.push(`fact ${f.id}: group_slug ${f.entity?.group_slug}`);
        if (f.entity?.kind === 'character' && !cslugs.has(f.entity.ref)) msgs.push(`fact ${f.id}: unknown character ${f.entity.ref}`);
        if (f.spoiler && f.spoiler.arc > arcMax) msgs.push(`fact ${f.id}: spoiler arc ${f.spoiler.arc} above the last arc`);
        // entity_sources keeps one row per (entity_type, entity_id, field, source): a fact has at most one source of each
        // kind and no two facts share an entity and field for the same source kind.
        const kinds = (f.sources ?? []).map((x) => x.source).filter((k) => k !== 'press'); // press is not loaded into entity_sources
        if (new Set(kinds).size !== kinds.length) msgs.push(`fact ${f.id}: two sources of the same kind (${kinds.join(', ')})`);
        for (const k of new Set(kinds)) {
          const slotKey = `${f.entity?.kind}|${f.entity?.kind === 'series' ? slug : (f.entity?.ref ?? '')}|${f.field}|${k}`;
          if (slots2.has(slotKey)) msgs.push(`fact ${f.id}: entity_sources slot ${slotKey} is used by another fact`);
          slots2.add(slotKey);
        }
      });
      if (tierCounts) {
        // The tier is a floor for the live facts: retired (rejected) cast-list facts no longer count, and the one fact per character
        // that replaced them comes on top of the tier count.
        const want = TIER_FACTS[s.series?.tier];
        const live = facts.filter((f) => f.status !== 'rejected').length;
        if (want && live < want) msgs.push(`tier ${s.series.tier}: ${live} live facts, at least ${want} expected`);
      }
      // backing
      const corpus = norm(facts.map((f) => flatten([f.value, f.text]).join(' | ')).join(' || '));
      const has = (v) => corpus.includes(norm(v));
      const hasNum = (n) => new RegExp(`(?<![0-9])${n}(?![0-9])`).test(corpus);
      const need = [];
      const ser = s.series ?? {};
      for (const k of ['title_en', 'title_native', 'title_romaji', 'director', 'magazine', 'publisher']) if (ser[k]) need.push([`series.${k}`, ser[k], 's']);
      for (const st of ser.studios ?? []) need.push(['series.studios', st.name, 's']);
      for (const au of ser.authors ?? []) need.push(['series.authors', au.name, 's']);
      for (const k of ['anime_start_year', 'anime_end_year', 'manga_start_year', 'manga_end_year', 'episodes', 'seasons', 'volumes', 'chapters']) if (ser[k] !== undefined) need.push([`series.${k}`, ser[k], 'n']);
      for (const a of arcs) {
        need.push([`arc ${a.ord} name`, a.name, 's']);
        for (const k of ['episode_from', 'episode_to', 'chapter_from', 'chapter_to']) if (a[k] !== undefined) need.push([`arc ${a.ord} ${k}`, a[k], 'n']);
      }
      for (const c of s.characters ?? []) { need.push([`character ${c.slug} name`, c.name, 's']); if (c.name_native) need.push([`character ${c.slug} native`, c.name_native, 's']); }
      for (const t of s.themes ?? []) { need.push([`theme ${t.kind} ${t.number} title`, t.title, 's']); need.push([`theme ${t.kind} ${t.number} artist`, t.artist, 's']); }
      const miss = need.filter(([, v, kind]) => !(kind === 'n' ? hasNum(v) : has(v))).map(([w, v]) => `not backed by a fact: ${w} = ${v}`);
      msgs.push(...miss);
    }
  }
  report(slug, msgs);
}
console.log(failed === 0 ? `validate-data: ${slugs.length} series ok` : `validate-data: ${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
