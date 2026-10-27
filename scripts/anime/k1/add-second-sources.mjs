#!/usr/bin/env node
// Run O1, lane K1: records the second sources found for the single source load bearing facts (owner decision D-105).
//
//   node scripts/anime/k1/add-second-sources.mjs <found dir> [--data docs/anime/data] [--apply]
//
// <found dir>/<slug>.json = { slug, results: [{ id, sources: [{ source, url, ref?, fetched_at, excerpt, check }], none_reason?, conflict? }] }.
// Dry run by default. With --apply each accepted source is appended to the sources of its fact (source, url, ref, fetched_at: the
// fact.schema.json shape) and the whole record (with the short excerpt and the check in our own words) goes to
// <data>/second-sources.json, one entry per fact and url. "press" is Oricon or Anime News Network: kept in the files, never
// loaded into entity_sources, never the strong source of check C2.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOSTS = { wikidata: ['wikidata.org'], press: ['oricon.co.jp', 'animenewsnetwork.com'] };
const BANNED = /myanimelist|jikan\.moe|fandom\.com|animethemes\.moe|kprofiles|anilist\.co|sporcle|wikipedia\.org|musicbrainz\.org/i;
const DASH = /[\u2013\u2014]|--/; // en dash, em dash, double hyphen
const EMOJI = /\p{Extended_Pictographic}/u;
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const hostIs = (h, d) => h === d || h.endsWith(`.${d}`);

export function validateSource(s) {
  const p = [];
  if (!['wikidata', 'official', 'press'].includes(s?.source)) return [`unknown kind ${s?.source}`];
  if (typeof s.url !== 'string' || !/^https:\/\//.test(s.url)) p.push('url is not https');
  const h = hostOf(s.url ?? '');
  if (!h) p.push('url has no host');
  if (BANNED.test(s.url ?? '')) p.push('banned or already used host');
  if (s.source in HOSTS && !HOSTS[s.source].some((d) => hostIs(h, d))) p.push(`host ${h} is not a ${s.source} host`);
  if (s.source === 'official' && ['oricon.co.jp', 'animenewsnetwork.com', 'wikidata.org'].some((d) => hostIs(h, d))) p.push('official kind on a press or Wikidata host');
  if (s.source === 'wikidata' && !/^Q[0-9]+$/.test(s.ref ?? '')) p.push('wikidata needs ref = QID');
  if (s.source !== 'wikidata' && s.ref !== undefined && !/^.{1,80}$/.test(String(s.ref))) p.push('bad ref');
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(s.fetched_at ?? '')) p.push('fetched_at is not an ISO UTC time');
  if (typeof s.excerpt !== 'string' || s.excerpt.length < 1 || s.excerpt.length > 160 || /[\n\r]/.test(s.excerpt)) p.push('excerpt must be one line of 1 to 160 characters');
  if (typeof s.check !== 'string' || s.check.length < 5 || s.check.length > 200 || /[\n\r]/.test(s.check)) p.push('check must be one line of 5 to 200 characters');
  for (const k of ['excerpt', 'check']) if (typeof s[k] === 'string' && (DASH.test(s[k]) || EMOJI.test(s[k]))) p.push(`${k} has a dash or an emoji`);
  return p;
}

function layout(raw) {
  const data = JSON.parse(raw); const nl = raw.endsWith('\n') ? '\n' : '';
  const indent = [2, 1, 4].find((n) => JSON.stringify(data, null, n) + nl === raw);
  if (indent === undefined) throw new Error('not in a 1, 2 or 4 space JSON layout');
  return { data, indent, nl };
}

export function addSecondSources(foundDir, dataDir, { apply = false } = {}) {
  const sidePath = join(dataDir, 'second-sources.json');
  const side = existsSync(sidePath) ? JSON.parse(readFileSync(sidePath, 'utf8')) : [];
  const sideKey = new Set(side.map((x) => `${x.fact_id}|${x.url}`));
  const conflictRows = [];
  const tally = { added: { wikidata: 0, official: 0, press: 0 }, factsWithStrong: new Set(), factsWithAny: new Set(), none: 0, conflicts: [], rejected: [], unknown: [], skipped: 0 };
  for (const name of readdirSync(foundDir).filter((x) => x.endsWith('.json')).sort()) {
    const found = JSON.parse(readFileSync(join(foundDir, name), 'utf8'));
    const slug = found.slug ?? name.replace(/\.json$/, '');
    const fpath = join(dataDir, 'facts', `${slug}.json`);
    const { data: facts, indent, nl } = layout(readFileSync(fpath, 'utf8'));
    let changed = false;
    for (const r of found.results ?? []) {
      const fact = facts.find((f) => f.id === r.id);
      if (!fact) { tally.unknown.push(r.id); continue; }
      if (r.conflict) {
        // a source that disagrees (or only partly agrees) with the fact: nothing is added to the fact; the evidence goes to
        // <data>/second-sources-conflicts.json for the owner
        tally.conflicts.push(`${r.id}: ${r.conflict}`);
        conflictRows.push({ fact_id: r.id, note: r.conflict, ...(r.sources?.length ? { not_added_sources: r.sources.map((s) => s.url) } : {}) });
        continue;
      }
      if (!r.sources?.length) { tally.none += 1; continue; }
      for (const s of r.sources) {
        const probs = validateSource(s);
        if (probs.length) { tally.rejected.push(`${r.id} ${s?.source}: ${probs.join('; ')}`); continue; }
        if (fact.sources.some((x) => x.source === s.source) && s.source !== 'press') { tally.skipped += 1; continue; }
        if (fact.sources.some((x) => x.url === s.url)) { tally.skipped += 1; continue; }
        if (fact.sources.length >= 5) { tally.rejected.push(`${r.id}: already 5 sources`); continue; }
        const src = { source: s.source, url: s.url };
        if (s.ref !== undefined) src.ref = String(s.ref);
        src.fetched_at = s.fetched_at;
        fact.sources.push(src); changed = true;
        tally.added[s.source] += 1; tally.factsWithAny.add(r.id);
        if (s.source !== 'press') tally.factsWithStrong.add(r.id);
        if (!sideKey.has(`${r.id}|${s.url}`)) { side.push({ fact_id: r.id, source: s.source, url: s.url, ...(s.ref !== undefined ? { ref: String(s.ref) } : {}), fetched_at: s.fetched_at, excerpt: s.excerpt, check: s.check }); sideKey.add(`${r.id}|${s.url}`); }
      }
    }
    if (apply && changed) writeFileSync(fpath, JSON.stringify(facts, null, indent) + nl);
  }
  side.sort((a, b) => (a.fact_id < b.fact_id ? -1 : a.fact_id > b.fact_id ? 1 : a.url < b.url ? -1 : 1));
  if (apply) {
    writeFileSync(sidePath, JSON.stringify(side, null, 2) + '\n');
    conflictRows.sort((a, b) => (a.fact_id < b.fact_id ? -1 : 1));
    writeFileSync(join(dataDir, 'second-sources-conflicts.json'), JSON.stringify(conflictRows, null, 2) + '\n');
  }
  return tally;
}

function main(argv) {
  const di = argv.indexOf('--data');
  const dataDir = resolve(di >= 0 ? argv[di + 1] : 'docs/anime/data');
  const foundDir = resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--data') ?? '');
  const apply = argv.includes('--apply');
  const t = addSecondSources(foundDir, dataDir, { apply });
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} ${foundDir}`);
  console.log(`sources added: wikidata ${t.added.wikidata}, official ${t.added.official}, press ${t.added.press}; facts with a wikidata or official second source ${t.factsWithStrong.size}; facts with any second source ${t.factsWithAny.size}; facts with none ${t.none}; skipped (kind or url already there) ${t.skipped}`);
  for (const [k, v] of [['rejected', t.rejected], ['conflicts', t.conflicts], ['unknown fact ids', t.unknown]]) if (v.length) console.log(`${k} (${v.length}):\n${v.map((x) => `  ${x}`).join('\n')}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
