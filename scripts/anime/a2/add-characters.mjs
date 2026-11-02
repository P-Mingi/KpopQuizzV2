#!/usr/bin/env node
// Lot A2 (run O1, CR-023): the characters of the daily games of one series enter the site data.
//
//   node scripts/anime/a2/add-characters.mjs [--check]
//
// Reads  scripts/anime/a2/data/one-piece.json and dragon-ball.json (the collected pools; each character has the reviewed debut arc or saga),
//        scripts/anime/a2/data/all-series.json (role at the first appearance),
// and changes docs/anime/data/series/one-piece.json and dragon-ball.json (the files content-sql.mjs turns into L04):
//   - every character of the pool that the file does not have is added, in the rank order of the pool, after the last ord:
//       slug and name as collected; role = the role at the first appearance of the all-series data (main, supporting, antagonist, other), else other;
//       affiliation = the first current entry of the data, else "None" (the convention of the other files);
//       debut_arc_ord = the reviewed debut arc (One Piece) or the site arc of the reviewed debut saga (Dragon Ball);
//       debut_medium = anime when that arc is anime only, manga when manga only, else both;
//       spoiler_level = 0 for the first arc, else the arc order (the rule of the files); identity_spoiler false, except the two the editor lists below;
//       no description, no native name, no source_url: nothing is written that was not collected (`no_description: true`, fixture schema).
//   - a character the file has whose debut_arc_ord is later than its reviewed first appearance (the data says site_data_differs) gets the reviewed
//     debut_arc_ord; its spoiler_level is left as it is (it only ever hides more).
//   - a Dragon Ball character whose first saga is a GT saga is not added: the file has no GT arc.
// and docs/anime/data/facts/<series>.json: validate-data.mjs wants every character name backed by a fact, so each added character gets one DRAFT fact
//   (entity the character, field name, value the name, the Fandom page and the Wikidata item as sources, the page title as the excerpt, no text).
//   A draft fact is not loaded by the launch files (mode verified): the owner verifies it like the others, and only then does it reach the database.
// Idempotent. Same input, same bytes.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const IDENTITY = new Set(['nerona-imu', 'goku-black']);   // the name alone gives away who they are (as Sabo, Zamasu and Trunks in the files)
// An existing fact names this character at a lower spoiler tag than a first arc gives (check C5 of the editorial checks: a text that names a character
// must be tagged at the character's level or above). The level follows the fact the owner verified. (Arlong is the other case: a quiz question named him
// in arc 4 while he comes in arc 5; the question is tagged 5 in docs/anime/data/quizzes/one-piece/pirate-feast-meals-drinks-and-sanjis-kitchen-in-one-piece.json.)
const LEVEL_CAPS = { 'mr-popo': 0 };
const ROLES = new Set(['main', 'supporting', 'antagonist', 'other']);

const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));

export function arcOf(series, ch) {
  const f = ch.fields;
  if (series === 'one-piece') return f.debut_arc?.value?.ord ?? null;
  return f.debut_saga?.value?.site_arc_ord ?? null;
}

export function update({ site, pool, roles, series, facts = [], generatedOn = '2026-11-02' }) {
  const out = structuredClone(site);
  const bySlug = new Map(out.characters.map((c) => [c.slug, c]));
  const arcs = new Map(out.arcs.map((a) => [a.ord, a]));
  const report = { added: [], corrected: [], skipped: [] };
  const outFacts = structuredClone(facts);
  let counter = Math.max(0, ...outFacts.map((f) => Number(/-([0-9]+)$/.exec(f.id)?.[1] ?? 0)));
  const named = new Set(outFacts.filter((f) => f.entity?.kind === 'character' && f.field === 'name').map((f) => f.entity.ref));
  for (const ch of pool.characters) {
    const ord = arcOf(series, ch);
    const have = bySlug.get(ch.slug);
    if (have) {
      const d = ch.fields.debut_arc;
      if (series === 'one-piece' && d?.site_data_differs && ord !== null && ord < have.debut_arc_ord) {
        report.corrected.push({ slug: ch.slug, from: have.debut_arc_ord, to: ord, spoiler_level: have.spoiler_level });
        have.debut_arc_ord = ord;
      }
      continue;
    }
    if (ord === null || !arcs.has(ord)) { report.skipped.push({ slug: ch.slug, why: 'its first arc is not in the file' }); continue; }
    const arc = arcs.get(ord);
    const role = roles.get(ch.slug);
    const aff = Array.isArray(ch.fields.affiliation?.value) ? ch.fields.affiliation.value.find((x) => typeof x === 'string' && x.trim()) : null;
    const row = {
      slug: ch.slug,
      name: ch.name,
      role: ROLES.has(role) ? role : 'other',
      affiliation: aff ? aff.trim().slice(0, 120) : 'None',
      debut_arc_ord: ord,
      debut_medium: arc.anime_only ? 'anime' : arc.manga_only ? 'manga' : 'both',
      no_description: true,
      spoiler_level: Math.min(ord <= 1 ? 0 : ord, LEVEL_CAPS[ch.slug] ?? Infinity),
      identity_spoiler: IDENTITY.has(ch.slug),
      ord: Math.max(...out.characters.map((c) => c.ord)) + 1,
      status: 'published',
    };
    out.characters.push(row);
    report.added.push(ch.slug);
    if (!named.has(ch.slug)) {
      const sources = [];
      if (ch.ids?.fandom_url) sources.push({ source: 'fandom', url: ch.ids.fandom_url, ref: String(ch.ids.fandom_revision), fetched_at: `${generatedOn}T00:00:00Z` });
      if (ch.ids?.wikidata_qid) sources.push({ source: 'wikidata', url: `https://www.wikidata.org/wiki/${ch.ids.wikidata_qid}`, ref: ch.ids.wikidata_qid, fetched_at: `${generatedOn}T00:00:00Z` });
      outFacts.push({
        id: `${series}-${ch.slug}-name-${String(++counter).padStart(3, '0')}`.slice(0, 80),
        site: 'anime',
        entity: { kind: 'character', group_slug: series, ref: ch.slug },
        field: 'name',
        value: ch.name,
        category: 'members',
        load_bearing: false,
        spoiler: { arc: row.spoiler_level, scope: 'both' },   // raised below to the level of any other character the value names
        sources,
        status: 'draft',
        excerpt: String(ch.ids?.fandom_title ?? ch.name).slice(0, 160),
      });
    }
  }
  // A fact tagged below the level of a character its value names fails C5 ("Grandpa Gohan" names Gohan): it takes the highest level.
  for (const f of outFacts) {
    if (f.field !== 'name' || f.status !== 'draft' || !report.added.includes(f.entity?.ref)) continue;
    for (const c of out.characters) {
      if (c.slug !== f.entity.ref && new RegExp(`(^|[^A-Za-z])${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z])`, 'i').test(String(f.value))) f.spoiler.arc = Math.max(f.spoiler.arc, c.spoiler_level);
    }
  }
  return { out, report, outFacts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = readJson(path.join(HERE, 'data', 'all-series.json'));
  for (const series of ['one-piece', 'dragon-ball']) {
    const file = path.join(ROOT, 'docs/anime/data/series', `${series}.json`);
    const roles = new Map((all.series.find((s) => s.slug === series)?.characters ?? []).map((c) => [c.slug, c.fields.role_at_debut?.value]));
    const factsFile = path.join(ROOT, 'docs/anime/data/facts', `${series}.json`);
    const pool = readJson(path.join(HERE, 'data', `${series}.json`));
    const { out, report, outFacts } = update({ site: readJson(file), pool, roles, series, facts: readJson(factsFile), generatedOn: pool.header.generated_on });
    console.log(`${series}: ${report.added.length} added, ${report.corrected.length} debut arcs corrected, ${report.skipped.length} skipped (${report.skipped.map((s) => s.slug).join(', ')}); ${out.characters.length} characters`);
    for (const c of report.corrected) console.log(`  corrected ${c.slug}: debut_arc_ord ${c.from} -> ${c.to} (spoiler_level stays ${c.spoiler_level})`);
    if (!process.argv.includes('--check')) {
      writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
      writeFileSync(factsFile, JSON.stringify(outFacts, null, 2) + '\n');
    }
  }
}
