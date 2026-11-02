#!/usr/bin/env node
// Lot A2 (run O1, CR-023): the characters of the daily games of one series enter the site data.
//
//   node scripts/anime/a2/add-characters.mjs [--check]
//
// Reads  scripts/anime/a2/data/one-piece.json and dragon-ball.json (the collected pools; each character has the reviewed debut arc or saga),
//        scripts/anime/a2/data/all-series.json (the pool of the 50 series: role at the first appearance; for a series other than the two above, the
//        first appearance too, which gives the arc through the episode ranges of the file),
// and changes docs/anime/data/series/<series>.json (the files content-sql.mjs turns into L04):
//   - every character of the pool that the file does not have is added, in the rank order of the pool, after the last ord:
//       slug and name as collected; role = the role at the first appearance of the all-series data (main, supporting, antagonist, other), else other;
//       affiliation = the first current entry of the data, else "None" (the convention of the other files);
//       debut_arc_ord = the reviewed debut arc (One Piece) or the site arc of the reviewed debut saga (Dragon Ball);
//       debut_medium = anime when that arc is anime only, manga when manga only, else both;
//       spoiler_level = 0 for the first arc, else the arc order (the rule of the files); identity_spoiler false, except the two the editor lists below;
//       no description, no native name, no source_url: nothing is written that was not collected (`no_description: true`, fixture schema).
//   - a character the file has whose debut_arc_ord is later than its reviewed first appearance (the data says site_data_differs) gets the reviewed
//     debut_arc_ord; its spoiler_level is left as it is (it only ever hides more).
//   - Dragon Ball gets its 4 GT sagas as arcs 25 to 28, after Daima (owner, 2026-11-03; episode ranges from Wikipedia's list of GT episodes): the
//     arcs 1 to 24 keep their order, so no verified quiz, fact or level moves. A fact (draft) backs their names and numbers.
//   - a series other than One Piece and Dragon Ball: a character of the pool the file does not have takes the arc whose episode range holds its
//     first episode (else its first chapter); one that matches no arc is not added. Its affiliation is "Unknown": the collected data holds none.
//   - a character added by an earlier run whose slug is no longer in the pool (the owner renamed Oden, Hiyori, Marco and Krieg) is removed with its draft fact.
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

// The 4 GT sagas: the names of the file ("Dragon Ball GT: ..."), the episode ranges of Wikipedia's list of GT episodes (revision 1382887119, 64 episodes),
// and the saga order of the collected data (19 to 22) that a GT character carries.
export const GT_SAGAS = [
  { order: 19, ord: 25, name: 'Dragon Ball GT: Black Star Dragon Ball Saga', episode_from: 1, episode_to: 16 },
  { order: 20, ord: 26, name: 'Dragon Ball GT: Baby Saga', episode_from: 17, episode_to: 40 },
  { order: 21, ord: 27, name: 'Dragon Ball GT: Super Android 17 Saga', episode_from: 41, episode_to: 47 },
  { order: 22, ord: 28, name: 'Dragon Ball GT: Shadow Dragon Saga', episode_from: 48, episode_to: 64 },
];
const GT_SOURCE = { source: 'wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_Dragon_Ball_GT_episodes', ref: '1382887119', fetched_at: '2026-11-03T00:00:00Z' };

/** The 4 GT arcs and the draft fact that backs their names and numbers, added once. */
export function addGtArcs(site, facts) {
  const out = structuredClone(site);
  const outFacts = structuredClone(facts);
  for (const g of GT_SAGAS) {
    if (out.arcs.some((a) => a.ord === g.ord)) continue;
    out.arcs.push({ ord: g.ord, name: g.name, kind: 'saga', episode_from: g.episode_from, episode_to: g.episode_to, source_url: GT_SOURCE.url, status: 'published', anime_only: true });
  }
  if (!outFacts.some((f) => f.field === 'gt_sagas')) {
    const counter = Math.max(0, ...outFacts.map((f) => Number(/-([0-9]+)$/.exec(f.id)?.[1] ?? 0)));
    outFacts.push({
      id: `dragon-ball-gt-sagas-${String(counter + 1).padStart(3, '0')}`,
      site: 'anime',
      entity: { kind: 'series', group_slug: 'dragon-ball' },
      field: 'gt_sagas',
      value: GT_SAGAS.map((g) => `${g.name} (episodes ${g.episode_from} to ${g.episode_to})`),
      category: 'history',
      load_bearing: true,
      spoiler: { arc: 0, scope: 'anime' },
      sources: [GT_SOURCE],
      status: 'draft',
      excerpt: 'Black Star Dragon Ball Saga 16 episodes, Baby Saga 24, Super Android 17 Saga 7, Shadow Dragon Saga 17',
    });
  }
  return { site: out, facts: outFacts };
}

/** The arc of a character of a series with no reviewed debut: the arc holding its first episode, else its first chapter (null when none does). */
export function arcFromFirstAppearance(arcs, label) {
  const ep = /Episode\s+([0-9]+)/i.exec(label ?? '')?.[1];
  const ch = /Chapter\s+([0-9]+)/i.exec(label ?? '')?.[1];
  if (ep !== undefined) {
    const n = Number(ep);
    const hit = arcs.find((a) => a.episode_from !== undefined && n >= a.episode_from && (a.episode_to === undefined || n <= a.episode_to));
    if (hit) return hit.ord;
  }
  if (ch !== undefined) {
    const n = Number(ch);
    const hit = arcs.find((a) => a.chapter_from !== undefined && n >= a.chapter_from && (a.chapter_to === undefined || n <= a.chapter_to));
    if (hit) return hit.ord;
  }
  return null;
}

export function arcOf(series, ch, arcs = []) {
  const f = ch.fields;
  if (series === 'one-piece') return f.debut_arc?.value?.ord ?? null;
  if (series === 'dragon-ball') return f.debut_saga?.value?.site_arc_ord ?? GT_SAGAS.find((g) => g.order === f.debut_saga?.value?.order)?.ord ?? null;
  return arcFromFirstAppearance(arcs, f.first_appearance?.value);
}

export function update({ site, pool, roles, series, facts = [], generatedOn = '2026-11-02' }) {
  const out = structuredClone(site);
  const bySlug = new Map(out.characters.map((c) => [c.slug, c]));
  const arcs = new Map(out.arcs.map((a) => [a.ord, a]));
  const report = { added: [], corrected: [], skipped: [], removed: [] };
  const outFacts = structuredClone(facts);
  // A character added by an earlier run that the pool no longer has (a slug the owner changed): out, with its draft fact.
  const inPool = new Set(pool.characters.map((c) => c.slug));
  for (const c of [...out.characters]) {
    if (c.no_description === true && !inPool.has(c.slug)) {
      out.characters.splice(out.characters.indexOf(c), 1);
      bySlug.delete(c.slug);
      report.removed.push(c.slug);
    }
  }
  for (let i = outFacts.length - 1; i >= 0; i--) if (outFacts[i].status === 'draft' && outFacts[i].field === 'name' && report.removed.includes(outFacts[i].entity?.ref)) outFacts.splice(i, 1);
  // The order of the characters stays 1, 2, 3...: the ones after a removed character move up.
  out.characters.forEach((c, i) => { if (c.ord !== i + 1 && report.removed.length > 0) c.ord = i + 1; });
  let counter = Math.max(0, ...outFacts.map((f) => Number(/-([0-9]+)$/.exec(f.id)?.[1] ?? 0)));
  const named = new Set(outFacts.filter((f) => f.entity?.kind === 'character' && f.field === 'name').map((f) => f.entity.ref));
  for (const ch of pool.characters) {
    const ord = arcOf(series, ch, out.arcs);
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
      affiliation: aff ? aff.trim().slice(0, 120) : (series === 'one-piece' || series === 'dragon-ball' ? 'None' : 'Unknown'),
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
      if (ch.ids?.fandom_url) sources.push({ source: 'fandom', url: ch.ids.fandom_url, ...(ch.ids.fandom_revision ? { ref: String(ch.ids.fandom_revision) } : {}), fetched_at: `${generatedOn}T00:00:00Z` });
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
    const mine = (f.field === 'name' && f.status === 'draft' && report.added.includes(f.entity?.ref)) || (f.field === 'gt_sagas' && f.status === 'draft');
    if (!mine) continue;
    for (const c of out.characters) {
      if (c.slug !== f.entity?.ref && new RegExp(`(^|[^A-Za-z])${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z])`, 'i').test(String(f.value))) f.spoiler.arc = Math.max(f.spoiler.arc, c.spoiler_level);
    }
  }
  return { out, report, outFacts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = readJson(path.join(HERE, 'data', 'all-series.json'));
  const detailed = { 'one-piece': 'one-piece.json', 'dragon-ball': 'dragon-ball.json' };
  for (const entry of all.series) {
    const series = entry.slug;
    const file = path.join(ROOT, 'docs/anime/data/series', `${series}.json`);
    const factsFile = path.join(ROOT, 'docs/anime/data/facts', `${series}.json`);
    const roles = new Map(entry.characters.map((c) => [c.slug, c.fields.role_at_debut?.value]));
    const pool = detailed[series] ? readJson(path.join(HERE, 'data', detailed[series])) : { characters: entry.characters, header: { generated_on: all.header.generated_on } };
    let site = readJson(file);
    let facts = readJson(factsFile);
    if (series === 'dragon-ball') ({ site, facts } = addGtArcs(site, facts));
    const { out, report, outFacts } = update({ site, pool, roles, series, facts, generatedOn: pool.header.generated_on });
    if (report.added.length + report.corrected.length + report.removed.length + report.skipped.length > 0 || series === 'dragon-ball') {
      console.log(`${series}: ${report.added.length} added, ${report.removed.length} removed, ${report.corrected.length} debut arcs corrected, ${report.skipped.length} skipped (${report.skipped.map((x) => x.slug).join(', ')}); ${out.characters.length} characters, ${out.arcs.length} arcs`);
    }
    for (const c of report.corrected) console.log(`  corrected ${c.slug}: debut_arc_ord ${c.from} -> ${c.to} (spoiler_level stays ${c.spoiler_level})`);
    const changed = report.added.length + report.corrected.length + report.removed.length > 0 || series === 'dragon-ball';
    if (changed && !process.argv.includes('--check')) {
      writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
      writeFileSync(factsFile, JSON.stringify(outFacts, null, 2) + '\n');
    }
  }
}
