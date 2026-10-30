#!/usr/bin/env node
// Lot K1 (owner brief of 2026-10-30, RAPPORT-JEUX-DU-JOUR-v2.md sections 5.1, 7.2 and 14): the gender and the idol's OWN
// debut year of every idol that has a Wikidata QID, for the view dle_src_kpop_idol of Kpopdle Idol (020, run O1).
//
// Sources: Wikidata (wbgetentities) and MusicBrainz (ws/2 JSON) only. Never kprofiles, fandom wikis or any fan database.
// - gender:     Wikidata P21 (Q6581072 female, Q6581097 male, anything else: no value, listed) and MusicBrainz artist gender.
// - debut_year: Wikidata P2031 (work period start) and MusicBrainz: the begin of the artist's "member of band" relation to
//               the idol's group (the group's MBID is Wikidata P434 of the group), else the artist's own begin when the
//               artist is not a Person (for a Person that date is the birth date, never used).
// - decision:   both sources agree, or one has it and the other is silent: stored (one entity_sources row per source that
//               gave the value). They disagree: nothing stored, listed with both links.
// - agency and status are never stored: they go to the owner's review list (P264 of the idol, else groups.record_label;
//   P463 with its P580/P582 qualifiers; the MusicBrainz relation dates).
//
// Input: two snapshots of production read with a SELECT only (pipe separated, one row per line), made by the owner or the
// worker through a read-only query:
//   idols.psv : id|group_id|name|wikidata_qid|active t/f|needs_review t/f|detached t/f|adult or minor or none|nationality 1/0
//     select concat_ws('|', i.id, i.group_id, i.name, coalesce(i.wikidata_qid, ''), case when i.active then 't' else 'f' end,
//       case when i.needs_review then 't' else 'f' end, case when i.detached_at is null then 'f' else 't' end,
//       case when i.birth_date is null then 'none' when i.birth_date <= (current_date - interval '18 years')::date
//         then 'adult' else 'minor' end,
//       case when nullif(btrim(i.nationality), '') is null then '0' else '1' end) from public.idols i order by i.id;
//   groups.psv: id|slug|name|wikidata_qid|musicbrainz_mbid|record_label|inception year|generation
//     select concat_ws('|', g.id, g.slug, g.name, coalesce(g.wikidata_qid, ''), coalesce(g.musicbrainz_mbid, ''),
//       coalesce(g.record_label, ''), coalesce(to_char(g.inception_date, 'YYYY'), ''), coalesce(g.generation, ''))
//     from public.groups g where g.id in (select distinct group_id from public.idols) order by g.id;
// No birth date ever leaves the database: the snapshot says adult, minor or none. A Wikidata birth year is read in memory
// only to refuse a "debut" that is not at least 8 years after it; it is never written.
//
// Output (--out): k1-facts.json (every fetched fact and decision), 021a-k1-idol-facts.sql (the additive SQL for the owner)
// and K1-RELECTURE.md (the French review list, kept out of git).
//
// Usage (Node 22): node apps/quiz/scripts/k1-idol-facts.mjs --idols <idols.psv> --groups <groups.psv> --cache <dir> --out <dir>
// Polite: one generic User-Agent with no personal name or email address, MusicBrainz at most 1 request per 1.1 s, Wikidata
// batches of 50 ids, every response cached under --cache (a rerun refetches nothing). No secrets, no database access.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const USER_AGENT = 'KpopQuizDataLot/1.0 (+https://kpopquiz.org/contact)';
const WD_API = 'https://www.wikidata.org/w/api.php';
const MB_API = 'https://musicbrainz.org/ws/2';
const MB_GAP_MS = 1100;
const WD_GAP_MS = 400;
const FEMALE = 'Q6581072';
const MALE = 'Q6581097';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i > 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`missing --${name}`);
}

const IDOLS_FILE = arg('idols');
const GROUPS_FILE = arg('groups');
const CACHE = arg('cache');
const OUT = arg('out');
const SNAPSHOT_DATE = arg('snapshot-date', '2026-10-30');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const last = { wd: 0, mb: 0 };
let fetchedCount = 0;
let cachedCount = 0;

// One cached GET. A 404 is a normal answer ("not in MusicBrainz") and is cached too.
async function getJson(url, kind) {
  const key = createHash('sha1').update(url).digest('hex');
  const dir = path.join(CACHE, kind);
  const file = path.join(dir, `${key}.json`);
  if (existsSync(file)) {
    cachedCount++;
    return JSON.parse(await readFile(file, 'utf8'));
  }
  await mkdir(dir, { recursive: true });
  const gap = kind === 'mb' ? MB_GAP_MS : WD_GAP_MS;
  for (let attempt = 0; ; attempt++) {
    const wait = last[kind] + gap - Date.now();
    if (wait > 0) await sleep(wait);
    last[kind] = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (res.ok || res.status === 404) {
      const body = res.status === 404 ? null : await res.json();
      const entry = { url, status: res.status, fetched_at: new Date().toISOString(), body };
      await writeFile(file, JSON.stringify(entry));
      fetchedCount++;
      return entry;
    }
    if ((res.status === 429 || res.status === 503) && attempt < 5) {
      const retry = Math.min(60, Number(res.headers.get('retry-after')) || 5 * (attempt + 1));
      console.log(`[${kind}] ${res.status}, waiting ${retry} s`);
      await sleep(retry * 1000);
      continue;
    }
    throw new Error(`${kind} ${res.status} for ${url}`);
  }
}

const readPsv = async (file) => (await readFile(file, 'utf8')).split('\n').filter((l) => l.trim() !== '').map((l) => l.split('|'));

const idols = (await readPsv(IDOLS_FILE)).map(([id, groupId, name, qid, active, nr, det, age, nat]) => ({
  id: Number(id), groupId: Number(groupId), name, qid: qid || null, active: active === 't', needsReview: nr === 't',
  detached: det === 't', age, hasNationality: nat === '1',
}));
const groups = new Map((await readPsv(GROUPS_FILE)).map(([id, slug, name, qid, mbid, label, inception, generation]) => [Number(id), {
  id: Number(id), slug, name, qid: qid || null, mbid: mbid || null, recordLabel: label || null, inception: inception || null,
  generation: generation || null,
}]));
for (const i of idols) {
  if (!groups.has(i.groupId)) throw new Error(`idol ${i.id}: group ${i.groupId} missing from the groups snapshot`);
  if (i.qid && !/^Q[1-9]\d*$/.test(i.qid)) throw new Error(`idol ${i.id}: bad QID ${i.qid}`);
}

// ---------------------------------------------------------------- Wikidata
const wdEntities = new Map();
async function wdLoad(ids) {
  const todo = [...new Set(ids)].filter((q) => q && !wdEntities.has(q)).sort();
  for (let k = 0; k < todo.length; k += 50) {
    const batch = todo.slice(k, k + 50);
    const url = `${WD_API}?${new URLSearchParams({ action: 'wbgetentities', format: 'json', ids: batch.join('|'),
      props: 'claims|labels|aliases', languages: 'en|ko|fr' })}`;
    const { body } = await getJson(url, 'wd');
    for (const q of batch) wdEntities.set(q, body?.entities?.[q] ?? null);
  }
}
const label = (q) => {
  const e = wdEntities.get(q);
  return e?.labels?.en?.value ?? e?.labels?.fr?.value ?? e?.labels?.ko?.value ?? q;
};
// Statements of the best rank (preferred if any, else normal; never deprecated).
function best(entity, prop) {
  const all = (entity?.claims?.[prop] ?? []).filter((c) => c.rank !== 'deprecated');
  const pref = all.filter((c) => c.rank === 'preferred');
  return pref.length ? pref : all;
}
const itemId = (c) => (c?.mainsnak?.snaktype === 'value' ? c.mainsnak.datavalue?.value?.id ?? null : null);
const strVal = (c) => (c?.mainsnak?.snaktype === 'value' ? c.mainsnak.datavalue?.value ?? null : null);
function timeYear(v) {
  if (!v || typeof v.time !== 'string' || v.precision < 9) return null;
  const m = /^\+(\d{4})-/.exec(v.time);
  return m ? Number(m[1]) : null;
}
function timeText(v) {
  if (!v || typeof v.time !== 'string') return null;
  const m = /^\+(\d{4})-(\d{2})-(\d{2})/.exec(v.time);
  if (!m) return null;
  if (v.precision >= 11) return `${m[3]}/${m[2]}/${m[1]}`;
  if (v.precision === 10) return `${m[2]}/${m[1]}`;
  return v.precision === 9 ? m[1] : null;
}
const qualTime = (c, p) => {
  const q = c?.qualifiers?.[p]?.find((s) => s.snaktype === 'value');
  return q ? q.datavalue?.value ?? null : null;
};

// ---------------------------------------------------------------- MusicBrainz
const MBID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
async function mbArtist(mbid) {
  if (!MBID_RE.test(mbid)) return null;
  const { status, body } = await getJson(`${MB_API}/artist/${mbid}?inc=artist-rels+url-rels&fmt=json`, 'mb');
  return status === 404 ? null : body;
}
async function mbByWikidata(qid) {
  const resource = `https://www.wikidata.org/wiki/${qid}`;
  const { status, body } = await getJson(`${MB_API}/url?${new URLSearchParams({ resource, inc: 'artist-rels', fmt: 'json' })}`, 'mb');
  if (status === 404 || !body) return [];
  return (body.relations ?? []).filter((r) => r['target-type'] === 'artist' && r.artist?.id).map((r) => r.artist.id);
}
const mbWikidataLinks = (a) => (a?.relations ?? [])
  .filter((r) => r.type === 'wikidata' && r.url?.resource)
  .map((r) => /\/(Q[1-9]\d*)$/.exec(r.url.resource)?.[1])
  .filter(Boolean);
const mbYear = (d) => (typeof d === 'string' && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null);
const mbDateText = (d) => {
  if (typeof d !== 'string') return null;
  const [y, m, dd] = d.split('-');
  return [dd, m, y].filter(Boolean).join('/');
};

// ---------------------------------------------------------------- fetch
console.log(`[k1] ${idols.length} idols, ${idols.filter((i) => i.qid).length} with a QID, ${groups.size} groups`);
await wdLoad([...idols.map((i) => i.qid), ...[...groups.values()].map((g) => g.qid)]);
// Labels of the record labels and of the groups the idols are members of (P264, P463 targets).
const refIds = new Set();
for (const i of idols) {
  const e = i.qid ? wdEntities.get(i.qid) : null;
  for (const c of [...best(e, 'P264'), ...(e?.claims?.P463 ?? []), ...(e?.claims?.P21 ?? [])]) {
    const v = itemId(c);
    if (v) refIds.add(v);
  }
}
await wdLoad([...refIds]);

// Group MBIDs: the snapshot's column (empty in production), else Wikidata P434 of the group, checked in MusicBrainz.
const groupMb = new Map();
for (const g of groups.values()) {
  const ids = [...new Set([g.mbid, ...best(wdEntities.get(g.qid), 'P434').map(strVal)].filter(Boolean))];
  let chosen = null;
  for (const id of ids) {
    const a = await mbArtist(id);
    if (a && a.type !== 'Person') { chosen = { mbid: id, name: a.name, backlink: mbWikidataLinks(a).includes(g.qid) }; break; }
  }
  if (!chosen && g.qid) {
    for (const id of await mbByWikidata(g.qid)) {
      const a = await mbArtist(id);
      if (a && a.type !== 'Person') { chosen = { mbid: id, name: a.name, backlink: true, viaUrl: true }; break; }
    }
  }
  groupMb.set(g.id, chosen);
}

const facts = [];
for (const i of idols) {
  const g = groups.get(i.groupId);
  const f = { id: i.id, group_id: i.groupId, group: g.name, name: i.name, qid: i.qid, active: i.active, needs_review: i.needsReview,
    detached: i.detached, age: i.age, has_nationality: i.hasNationality, wd: null, mb: null, gender: null, debut_year: null,
    notes: [] };
  facts.push(f);
  if (!i.qid) { f.notes.push('no_qid'); continue; }
  const e = wdEntities.get(i.qid);
  if (!e || e.missing !== undefined) { f.notes.push('wd_missing'); continue; }

  // Wikidata facts.
  const p21 = best(e, 'P21').map(itemId).filter(Boolean);
  const wdGender = p21.length === 0 ? null : p21.every((v) => v === FEMALE) ? 'female' : p21.every((v) => v === MALE) ? 'male' : 'other';
  const p2031 = best(e, 'P2031').map((c) => timeYear(c.mainsnak?.datavalue?.value)).filter((y) => y !== null);
  const birthYears = best(e, 'P569').map((c) => timeYear(c.mainsnak?.datavalue?.value)).filter((y) => y !== null);
  const memberOf = (e.claims?.P463 ?? []).filter((c) => c.rank !== 'deprecated' && itemId(c)).map((c) => ({
    qid: itemId(c), name: label(itemId(c)), start: timeText(qualTime(c, 'P580')), end: timeText(qualTime(c, 'P582')),
    rank: c.rank,
  }));
  const labels = best(e, 'P264').filter(itemId).map((c) => ({
    qid: itemId(c), name: label(itemId(c)), start: timeText(qualTime(c, 'P580')), end: timeText(qualTime(c, 'P582')),
  }));
  f.wd = {
    gender: wdGender, gender_values: p21, debut_year: p2031.length ? Math.min(...p2031) : null,
    debut_values: [...new Set(p2031)], member_of: memberOf, labels, dead: best(e, 'P570').length > 0,
    aliases: [...new Set([e.labels?.en?.value, e.labels?.fr?.value, e.labels?.ko?.value,
      ...['en', 'fr', 'ko'].flatMap((l) => (e.aliases?.[l] ?? []).map((a) => a.value))].filter(Boolean))],
    mbids: [...new Set(best(e, 'P434').map(strVal).filter(Boolean))],
  };
  const birthYear = birthYears.length ? Math.min(...birthYears) : null;

  // MusicBrainz artist: Wikidata P434 first, else the MusicBrainz URL relation to the Wikidata item.
  let mbids = f.wd.mbids;
  let via = 'P434';
  if (mbids.length === 0) { mbids = await mbByWikidata(i.qid); via = 'url'; }
  let artist = null;
  let identity = 'none';
  // Several MBIDs (a stage name and a solo alias): the first that is a member of the idol's group wins, else the first valid.
  const groupMbid = groupMb.get(i.groupId)?.mbid ?? null;
  const isMember = (a) => (a.relations ?? []).some((r) => r.type === 'member of band' && r.direction === 'forward' && r.artist?.id === groupMbid);
  for (const id of mbids) {
    const a = await mbArtist(id);
    if (!a) continue;
    const links = mbWikidataLinks(a);
    if (links.length > 0 && !links.includes(i.qid)) { f.notes.push(`mb_identity_mismatch:${id}:${links.join(',')}`); continue; }
    if (!artist || (!isMember(artist) && isMember(a))) {
      artist = a;
      identity = links.includes(i.qid) ? 'both_ways' : 'one_way';
    }
    if (isMember(artist)) break;
  }
  if (mbids.length > 1) f.notes.push(`mb_several_mbids:${mbids.join(',')}`);
  if (artist) {
    const gm = groupMb.get(i.groupId);
    const rels = (artist.relations ?? []).filter((r) => r.type === 'member of band' && r.direction === 'forward' && r.artist?.id);
    const toGroup = gm ? rels.filter((r) => r.artist.id === gm.mbid) : [];
    const begins = toGroup.map((r) => mbYear(r.begin)).filter((y) => y !== null);
    let mbDebut = begins.length ? Math.min(...begins) : null;
    let debutFrom = mbDebut !== null ? 'member_of_group' : null;
    if (mbDebut === null && artist.type && artist.type !== 'Person' && mbYear(artist['life-span']?.begin) !== null) {
      mbDebut = mbYear(artist['life-span'].begin);
      debutFrom = 'career_begin';
    }
    const gRaw = artist.gender ?? null;
    f.mb = {
      mbid: artist.id, name: artist.name, type: artist.type ?? null, via, identity,
      gender: gRaw === null ? null : gRaw === 'Female' ? 'female' : gRaw === 'Male' ? 'male' : 'other', gender_raw: gRaw,
      debut_year: mbDebut, debut_from: debutFrom, group_mbid: gm?.mbid ?? null,
      to_group: toGroup.map((r) => ({ begin: mbDateText(r.begin), end: mbDateText(r.end), ended: !!r.ended })),
      member_of: rels.map((r) => ({ group: r.artist.name, mbid: r.artist.id, begin: mbDateText(r.begin), end: mbDateText(r.end),
        ended: !!r.ended })),
    };
  }

  // Decisions.
  const decide = (a, b, okValue) => {
    const av = a === undefined ? null : a;
    const bv = b === undefined ? null : b;
    if (av !== null && !okValue(av)) return { value: null, status: 'wd_other', wd: av, mb: bv };
    if (bv !== null && !okValue(bv)) return { value: null, status: 'mb_other', wd: av, mb: bv };
    if (av !== null && bv !== null) return av === bv ? { value: av, status: 'agree', wd: av, mb: bv } : { value: null, status: 'conflict', wd: av, mb: bv };
    if (av !== null) return { value: av, status: 'wd_only', wd: av, mb: null };
    if (bv !== null) return { value: bv, status: 'mb_only', wd: null, mb: bv };
    return { value: null, status: 'missing', wd: null, mb: null };
  };
  f.gender = decide(f.wd.gender, f.mb?.gender ?? null, (v) => v === 'female' || v === 'male');
  f.debut_year = decide(f.wd.debut_year, f.mb?.debut_year ?? null, (y) => Number.isInteger(y) && y >= 1980 && y <= 2100);
  // A "debut" less than 8 years after the birth year is a birth date in disguise: refused, listed.
  if (f.debut_year.value !== null && birthYear !== null && f.debut_year.value - birthYear < 8) {
    f.debut_year = { ...f.debut_year, value: null, status: 'too_close_to_birth' };
  }
  for (const k of ['wd', 'mb']) {
    if (f.debut_year[k] !== null && birthYear !== null && f.debut_year[k] - birthYear < 8) f.notes.push(`${k}_debut_close_to_birth`);
  }
}

// Same person on another row: same QID, or a stage name that is a Wikidata alias of this QID (same group).
for (const f of facts) {
  const dupes = [];
  for (const o of facts) {
    if (o.id === f.id) continue;
    if (f.qid && o.qid === f.qid) dupes.push({ id: o.id, name: o.name, group: o.group, active: o.active, why: 'same_qid' });
    else if (!o.qid && o.group_id === f.group_id && f.wd?.aliases?.some((a) => norm(a) === norm(o.name))) {
      dupes.push({ id: o.id, name: o.name, group: o.group, active: o.active, why: 'alias' });
    }
  }
  f.same_person = dupes;
}
function norm(s) { return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, ''); }

// Completeness for the view: active, not needs_review, not detached, adult, nationality, gender and debut_year.
const inView = (f) => f.active && !f.needs_review && !f.detached && f.age === 'adult';
const complete = (f) => inView(f) && f.has_nationality && f.gender?.value && f.debut_year?.value;

await mkdir(OUT, { recursive: true });
const summary = summarize();
await writeFile(path.join(OUT, 'k1-facts.json'), JSON.stringify({ snapshot_date: SNAPSHOT_DATE, summary, groups: Object.fromEntries(
  [...groups.values()].map((g) => [g.id, { ...g, mb: groupMb.get(g.id) }])), facts }, null, 1));
await writeFile(path.join(OUT, '021a-k1-idol-facts.sql'), buildSql());
await writeFile(path.join(OUT, 'K1-RELECTURE.md'), buildReview());
console.log(JSON.stringify(summary, null, 1));
console.log(`[k1] http: ${fetchedCount} fetched, ${cachedCount} from cache`);

function summarize() {
  const withQid = facts.filter((f) => f.qid && f.wd);
  const count = (field, st) => withQid.filter((f) => f[field]?.status === st).length;
  const s = { idols: facts.length, with_qid: withQid.length };
  for (const field of ['gender', 'debut_year']) {
    s[field] = {
      wikidata_has: withQid.filter((f) => f[field]?.wd !== null && f[field]?.wd !== undefined).length,
      musicbrainz_has: withQid.filter((f) => f[field]?.mb !== null && f[field]?.mb !== undefined).length,
      agree: count(field, 'agree'), wd_only: count(field, 'wd_only'), mb_only: count(field, 'mb_only'),
      conflict: count(field, 'conflict'), other: count(field, 'wd_other') + count(field, 'mb_other'),
      too_close_to_birth: count(field, 'too_close_to_birth'), missing: count(field, 'missing'),
      stored: withQid.filter((f) => f[field]?.value).length,
    };
  }
  s.mb_artist_found = withQid.filter((f) => f.mb).length;
  s.groups_with_mbid = [...groupMb.values()].filter(Boolean).length;
  s.view_candidates = facts.filter(inView).length;
  s.complete_active_adults = facts.filter(complete).length;
  const k86 = facts.filter((f) => f.needs_review);
  s.review = { rows: k86.length, adults: k86.filter((f) => f.age === 'adult').length, minors: k86.filter((f) => f.age === 'minor').length,
    no_birth_date: k86.filter((f) => f.age === 'none').length };
  return s;
}

// ---------------------------------------------------------------- SQL
function sqlStr(s) { return `'${String(s).replace(/'/g, "''")}'`; }
function buildSql() {
  const rows = facts.filter((f) => f.qid && f.wd && (f.gender?.value || f.debut_year?.value));
  const values = rows.map((f) => `  (${f.id}, ${sqlStr(f.qid)}, ${f.gender.value ? sqlStr(f.gender.value) : 'null'}, ${f.debut_year.value ?? 'null'})`);
  const src = [];
  for (const f of rows) {
    for (const field of ['gender', 'debut_year']) {
      const d = f[field];
      if (!d.value) continue;
      if (d.wd !== null) src.push(`  (${f.id}, ${sqlStr(f.qid)}, '${field}', 'wikidata', ${sqlStr(f.qid)})`);
      if (d.mb !== null) src.push(`  (${f.id}, ${sqlStr(f.qid)}, '${field}', 'musicbrainz', ${sqlStr(f.mb.mbid)})`);
    }
  }
  const s = summary;
  const per = (field, source) => src.filter((l) => l.includes(`'${field}', '${source}'`)).length;
  const perTxt = ['debut_year', 'gender'].flatMap((fl) => ['musicbrainz', 'wikidata'].map((so) => `${fl} ${so} ${per(fl, so)}`)).join(', ');
  const nG = rows.filter((f) => f.gender.value).length;
  const nD = rows.filter((f) => f.debut_year.value).length;
  return `-- 021a-k1-idol-facts.sql (lot K1, idol data for Kpopdle Idol, owner brief of 2026-10-30; RAPPORT-JEUX-DU-JOUR-v2.md 5.1 and 14)
--
-- What:   adds two nullable columns to public.idols: gender (text, 'female' or 'male' only) and debut_year (integer, the idol's
--         OWN debut year, 1980 to 2100), then fills them for the idols that have a Wikidata QID, with one public.entity_sources
--         row per stored value and source (entity_type 'idol', entity_id = the idol id as text, field 'gender' or 'debut_year',
--         source 'wikidata' with source_ref = the QID, or 'musicbrainz' with source_ref = the artist MBID).
--         Values come from Wikidata (P21, P2031) and MusicBrainz (artist gender; begin of the "member of band" relation to the
--         idol's group), fetched on ${SNAPSHOT_DATE} by apps/quiz/scripts/k1-idol-facts.mjs. A value is stored when both sources
--         agree or when one has it and the other is silent; on a disagreement nothing is stored (the owner's list
--         docs/strategy/o1/dle/K1-RELECTURE.md names every case).
--         Each update is keyed by the idol id AND the QID the value was fetched for, and only fills an empty column: a row whose
--         QID changed, or whose column already holds a value, is skipped (never overwritten). An entity_sources row is written
--         only when the idol holds exactly the sourced value. Additive only: no idol is activated or deactivated here.
-- Why:    the view dle_src_kpop_idol (020, run O1) reads idols.gender and idols.debut_year through to_jsonb(row); without them
--         no idol is complete and Kpopdle Idol has no pool.
-- Rows:   2 columns, 2 check constraints; ${nG} gender values and ${nD} debut years on ${rows.length} idols; ${src.length} entity_sources
--         rows (fewer if a row changed since the snapshot). With the snapshot of ${SNAPSHOT_DATE}, ${s.complete_active_adults} active adult idols
--         are complete afterwards (the view needs every column; min pool 40).
-- Needs:  nothing from run O1 (public.idols and public.entity_sources exist in production). Can run before or after 019 and 020.
-- Verify: select count(*) filter (where gender is not null), count(*) filter (where debut_year is not null) from public.idols;   expect ${nG}, ${nD}
--         select field, source, count(*) from public.entity_sources where entity_type = 'idol' and field in ('gender', 'debut_year') group by 1, 2 order by 1, 2;
--           expect ${perTxt}
--         select count(*) from public.idols where active and birth_date > (current_date - interval '18 years')::date;   expect 0
-- Undo:   021a-k1-idol-facts.rollback.sql (refused while the game kpopdle-idol is active).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.idols') is null or to_regclass('public.entity_sources') is null then
    raise exception '021a-k1-idol-facts: public.idols or public.entity_sources is missing';
  end if;
end $$;

-- Session temp tables (plain, dropped at the end, so the file also runs outside a transaction). The active count before the
-- file is kept for the self-check: this file never activates anybody.
drop table if exists pg_temp.k1_before, pg_temp.k1_values, pg_temp.k1_sources;
create temp table k1_before as select count(*) filter (where active) as active_n from public.idols;

alter table public.idols add column if not exists gender text;
alter table public.idols add column if not exists debut_year integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.idols'::regclass and conname = 'idols_gender_check') then
    alter table public.idols add constraint idols_gender_check check (gender is null or gender in ('female', 'male'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.idols'::regclass and conname = 'idols_debut_year_check') then
    alter table public.idols add constraint idols_debut_year_check check (debut_year is null or debut_year between 1980 and 2100);
  end if;
end $$;

comment on column public.idols.gender is 'female or male, from Wikidata P21 and MusicBrainz (lot K1); null when unknown or not binary in the sources';
comment on column public.idols.debut_year is 'the idol''s own debut year, from Wikidata P2031 and MusicBrainz (lot K1); null when the sources disagree or are silent';

create temp table k1_values (id integer primary key, qid text not null, gender text, debut_year integer);
insert into k1_values (id, qid, gender, debut_year) values
${values.join(',\n')};

create temp table k1_sources (id integer, qid text, field text, source text, source_ref text);
insert into k1_sources (id, qid, field, source, source_ref) values
${src.join(',\n')};

-- From here the file reports its counts as notices.
set client_min_messages = notice;

do $$
declare
  n_g integer;
  n_d integer;
  skip_g integer;
  skip_d integer;
begin
  update public.idols i set gender = v.gender
  from k1_values v
  where i.id = v.id and i.wikidata_qid = v.qid and v.gender is not null and i.gender is null;
  get diagnostics n_g = row_count;
  update public.idols i set debut_year = v.debut_year
  from k1_values v
  where i.id = v.id and i.wikidata_qid = v.qid and v.debut_year is not null and i.debut_year is null;
  get diagnostics n_d = row_count;
  select count(*) into skip_g from k1_values v left join public.idols i on i.id = v.id
  where v.gender is not null and (i.id is null or i.wikidata_qid is distinct from v.qid or i.gender is distinct from v.gender);
  select count(*) into skip_d from k1_values v left join public.idols i on i.id = v.id
  where v.debut_year is not null and (i.id is null or i.wikidata_qid is distinct from v.qid or i.debut_year is distinct from v.debut_year);
  raise notice '021a-k1-idol-facts: filled % gender and % debut_year; skipped (row gone, QID changed or other value kept): % gender, % debut_year',
    n_g, n_d, skip_g, skip_d;
end $$;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
select 'idol', s.id::text, s.field, s.source, s.source_ref, timestamptz '${SNAPSHOT_DATE} 12:00:00+00'
from k1_sources s
join k1_values v on v.id = s.id
join public.idols i on i.id = s.id and i.wikidata_qid = s.qid
where (s.field = 'gender' and i.gender = v.gender) or (s.field = 'debut_year' and i.debut_year = v.debut_year)
on conflict (entity_type, entity_id, field, source) do nothing;

-- Self-check: the columns and checks exist, no value outside them, every value of this file that is stored has its source
-- rows, nobody was activated, no minor is active.
do $$
declare
  n bigint;
begin
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'idols'
      and ((column_name = 'gender' and data_type = 'text') or (column_name = 'debut_year' and data_type = 'integer'))) <> 2 then
    raise exception '021a-k1-idol-facts: idols.gender or idols.debut_year is missing or has the wrong type';
  end if;
  if (select count(*) from pg_constraint where conrelid = 'public.idols'::regclass and conname in ('idols_gender_check', 'idols_debut_year_check') and convalidated) <> 2 then
    raise exception '021a-k1-idol-facts: a check constraint is missing or not validated';
  end if;
  select count(*) into n from public.idols where (gender is not null and gender not in ('female', 'male')) or (debut_year is not null and debut_year not between 1980 and 2100);
  if n > 0 then
    raise exception '021a-k1-idol-facts: % idol(s) hold a value outside the checks', n;
  end if;
  select count(*) into n from k1_sources s join k1_values v on v.id = s.id join public.idols i on i.id = s.id and i.wikidata_qid = s.qid
  where ((s.field = 'gender' and i.gender = v.gender) or (s.field = 'debut_year' and i.debut_year = v.debut_year))
    and not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = s.id::text and e.field = s.field and e.source = s.source);
  if n > 0 then
    raise exception '021a-k1-idol-facts: % stored value(s) have no entity_sources row', n;
  end if;
  if (select count(*) filter (where active) from public.idols) <> (select active_n from k1_before) then
    raise exception '021a-k1-idol-facts: the number of active idols changed (this file never activates)';
  end if;
  select count(*) into n from public.idols where active and birth_date > (current_date - interval '18 years')::date;
  if n > 0 then
    raise exception '021a-k1-idol-facts: % active idol(s) are under 18', n;
  end if;
  select count(*) into n from public.idols where active and birth_date is null;
  raise notice '021a-k1-idol-facts: % active idol(s) have no birth date (the game never shows them; K1 does not touch them)', n;
  select count(*) into n from public.idols i
  where i.active and not i.needs_review and i.detached_at is null and i.birth_date <= (current_date - interval '18 years')::date
    and nullif(btrim(i.nationality), '') is not null and i.gender is not null and i.debut_year is not null;
  raise notice '021a-k1-idol-facts: % active adult idol(s) now have gender, debut_year and nationality', n;
end $$;

drop table if exists pg_temp.k1_before, pg_temp.k1_values, pg_temp.k1_sources;

notify pgrst, 'reload schema';
`;
}

// ---------------------------------------------------------------- French review list
function buildReview() {
  const wdLink = (q) => `[${q}](https://www.wikidata.org/wiki/${q})`;
  const mbLink = (m) => (m ? `[MB](https://musicbrainz.org/artist/${m})` : 'aucune fiche');
  const gTxt = { female: 'femme', male: 'homme', other: 'autre' };
  const srcTxt = (d, kind) => {
    const show = (v) => (kind === 'gender' ? gTxt[v] ?? v : v);
    switch (d?.status) {
      case 'agree': return `${show(d.value)} (Wikidata et MusicBrainz d'accord)`;
      case 'wd_only': return `${show(d.value)} (Wikidata seul, MusicBrainz muet)`;
      case 'mb_only': return `${show(d.value)} (MusicBrainz seul, Wikidata muet)`;
      case 'conflict': return `rien : conflit, Wikidata ${show(d.wd)}, MusicBrainz ${show(d.mb)}`;
      case 'wd_other': return `rien : Wikidata donne une autre valeur (${show(d.wd)})`;
      case 'mb_other': return `rien : MusicBrainz donne une autre valeur (${show(d.mb)})`;
      case 'too_close_to_birth': return `rien : l'annee (${d.wd ?? d.mb}) est trop proche de la naissance`;
      case 'missing': return 'rien : aucune source';
      default: return 'rien';
    }
  };
  const agency = (f) => {
    const cur = (f.wd?.labels ?? []).filter((l) => !l.end);
    const pick = cur.length ? cur : f.wd?.labels ?? [];
    if (pick.length) return `${pick.map((l) => l.name).join(', ')} (Wikidata P264 de l'idol)`;
    const g = groups.get(f.group_id);
    return g.recordLabel ? `${g.recordLabel} (label du groupe dans notre base)` : 'inconnue';
  };
  const status = (f) => {
    const g = groups.get(f.group_id);
    const parts = [];
    const wdRel = (f.wd?.member_of ?? []).filter((m) => m.qid === g.qid);
    if (wdRel.length) {
      parts.push(`Wikidata : ${wdRel.map((m) => `${m.end ? 'ancien membre' : 'membre'}${m.start || m.end ? ` (${m.start ?? '?'} a ${m.end ?? "aujourd'hui"})` : ''}`).join(' ; ')}`);
    } else if ((f.wd?.member_of ?? []).length) {
      parts.push(`Wikidata : pas de P463 vers ${g.name} ; membre de ${f.wd.member_of.map((m) => `${m.name}${m.start || m.end ? ` (${m.start ?? '?'} a ${m.end ?? "aujourd'hui"})` : ''}`).join(', ')}`);
    } else parts.push('Wikidata : aucun P463');
    if (f.mb) {
      if (f.mb.to_group.length) {
        parts.push(`MusicBrainz : ${f.mb.to_group.map((r) => `${r.ended || r.end ? 'ancien membre' : 'membre'} (${r.begin ?? '?'} a ${r.end ?? (r.ended ? 'date inconnue' : "aujourd'hui")})`).join(' ; ')}`);
      } else if (f.mb.member_of.length) {
        parts.push(`MusicBrainz : pas de lien vers ${g.name} ; membre de ${f.mb.member_of.map((r) => `${r.group} (${r.begin ?? '?'} a ${r.end ?? (r.ended ? 'fin inconnue' : "aujourd'hui")})`).join(', ')}`);
      } else parts.push('MusicBrainz : aucun groupe');
    }
    return parts.join('. ');
  };
  const notes = (f) => {
    const out = [];
    for (const d of f.same_person ?? []) {
      out.push(d.why === 'same_qid'
        ? `meme personne que la fiche ${d.id} (${d.name}, ${d.group}, ${d.active ? 'active' : 'inactive'})`
        : `doublon probable de la fiche active ${d.id} (${d.name}, sans QID)`);
    }
    if (f.wd?.dead) out.push('Wikidata indique un deces (P570)');
    if (f.mb?.identity === 'one_way') out.push('MusicBrainz ne renvoie pas vers Wikidata');
    for (const n of f.notes) {
      if (n.startsWith('mb_identity_mismatch')) out.push('la fiche MusicBrainz de P434 pointe vers un autre QID (ecartee)');
      if (n.startsWith('mb_several_mbids')) out.push('plusieurs fiches MusicBrainz');
    }
    if (f.name === f.qid) out.push(`le nom en base est le QID (Wikidata : ${f.wd?.aliases?.[0] ?? '?'}) : a renommer avant d'activer`);
    return out.join(' ; ');
  };
  // Table-safe text; every dash variant becomes a plain hyphen (MusicBrainz names use U+2010, the repo bans long dashes).
  const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/[\u2010-\u2015\u2212]/g, '-');
  // Every band membership the two sources give, with the start year: what the owner needs to pick the idol's own debut.
  const bands = (f) => {
    const cap = (a) => (a.length > 8 ? [...a.slice(0, 8), `et ${a.length - 8} autres`] : a);
    const wd = cap((f.wd?.member_of ?? []).map((m) => `${m.name} ${m.start ? m.start.slice(-4) : '?'}`));
    const mb = cap((f.mb?.member_of ?? []).map((r) => `${r.group} ${r.begin ? r.begin.slice(-4) : '?'}`));
    return [wd.length ? `Wikidata P463 : ${wd.join(', ')}` : '', mb.length ? `MusicBrainz : ${mb.join(', ')}` : ''].filter(Boolean).join('. ');
  };
  const lines = [];
  const s = summary;
  lines.push('# Lot K1 : relecture des 86 fiches et des trous', '');
  lines.push(`Fait le ${SNAPSHOT_DATE} depuis Wikidata et MusicBrainz seulement, sur la base de production lue en SELECT. Aucune ecriture en prod.`, '');
  lines.push('Comment lire :', '');
  lines.push("- Genre et annee de debut : la valeur stockee par 021a et ses sources. \"Wikidata seul\" ou \"MusicBrainz seul\" : l'autre source ne dit rien. En cas de conflit, rien n'est stocke.");
  lines.push("- Agence : Wikidata P264 de l'idol, sinon le label du groupe dans notre base.");
  lines.push('- Statut : Wikidata P463 avec ses dates (P580, P582), et la relation MusicBrainz au groupe.');
  lines.push('- Age : adulte ou mineur. Une fiche mineure ou sans date de naissance ne peut jamais etre activee (021b refuse).');
  lines.push("- Derniere colonne : ecris oui ou non. Puis copie les lignes oui dans 021b-k1-idol-activate.sql sous la forme (id, 'QID').", '');
  const k86 = facts.filter((f) => f.needs_review);
  // What the owner has to decide, computed from the facts.
  const ids = (list) => list.map((f) => `${f.id} ${f.name}`).join(', ');
  const dupRows = k86.filter((f) => (f.same_person ?? []).some((d) => d.active));
  const activeConf = facts.filter((f) => inView(f) && f.debut_year?.status === 'conflict');
  const oneYear = activeConf.filter((f) => Math.abs(f.debut_year.wd - f.debut_year.mb) === 1);
  lines.push('## 0. A decider', '');
  if (dupRows.length) lines.push(`- ${dupRows.length} fiches a relire sont la meme personne qu'une fiche deja active (meme QID, ou nom de scene dans les alias Wikidata) : ${ids(dupRows)}. Les activer cree un doublon dans le jeu.`);
  lines.push(`- ${activeConf.length} idols actives n'ont pas d'annee de debut car les sources ne sont pas d'accord (section 2), dont ${oneYear.length} a un an pres (souvent : emission ou annonce avant le debut officiel). Sans annee, elles restent hors du jeu.`);
  const minors = k86.filter((f) => f.age !== 'adult');
  if (minors.length) lines.push(`- Mineur ou sans date de naissance, jamais actif : ${ids(minors)}.`);
  const qidNames = k86.filter((f) => f.name === f.qid);
  if (qidNames.length) lines.push(`- Nom a corriger avant toute activation : ${ids(qidNames)}.`);
  const dead = k86.filter((f) => f.wd?.dead);
  if (dead.length) lines.push(`- Wikidata indique un deces : ${ids(dead)}.`);
  lines.push('');
  lines.push(`## 1. Les ${k86.length} fiches a relire (${s.review.adults} adultes, ${s.review.minors} mineur${s.review.minors > 1 ? 's' : ''})`, '');
  const byGroup = new Map();
  for (const f of k86) { if (!byGroup.has(f.group)) byGroup.set(f.group, []); byGroup.get(f.group).push(f); }
  for (const [gName, list] of [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const g = groups.get(list[0].group_id);
    lines.push(`### ${gName} (${list.length})`, '');
    lines.push(`Groupe : ${g.qid ? wdLink(g.qid) : 'sans QID'}, ${groupMb.get(g.id) ? mbLink(groupMb.get(g.id).mbid) : 'pas de fiche MusicBrainz trouvee'}.`, '');
    lines.push('| id | Nom de scene | Wikidata | MusicBrainz | Agence | Statut | Genre | Annee de debut | Age | A noter | Activer ? (oui / non) |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
    for (const f of list.sort((a, b) => a.id - b.id)) {
      lines.push(`| ${f.id} | ${esc(f.name)} | ${f.qid ? wdLink(f.qid) : 'aucun'} | ${mbLink(f.mb?.mbid)} | ${esc(agency(f))} | ${esc(status(f))} | ${esc(srcTxt(f.gender, 'gender'))} | ${esc(srcTxt(f.debut_year, 'debut'))} | ${f.age === 'adult' ? 'adulte' : f.age === 'minor' ? 'mineur (jamais actif)' : 'sans date (jamais actif)'} | ${esc(notes(f))} | |`);
    }
    lines.push('');
  }
  lines.push('## 2. Les trous chez les idols actives', '');
  lines.push(`Fiches actives : ${facts.filter((f) => f.active).length}. Dans la vue du jeu (actives, adultes, pas a relire) : ${s.view_candidates}. Completes apres 021a : ${s.complete_active_adults} (il en faut 40).`, '');
  const holes = facts.filter((f) => f.active && (!f.gender?.value || !f.debut_year?.value || !f.has_nationality || f.age !== 'adult' || !f.qid));
  lines.push('| id | Nom | Groupe | Wikidata | MusicBrainz | Genre | Annee de debut | Groupes selon les sources (pour trancher) | Autre trou |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const f of holes.sort((a, b) => a.group.localeCompare(b.group) || a.id - b.id)) {
    const other = [];
    if (!f.qid) other.push('pas de QID : K1 ne peut rien remplir');
    if (f.age === 'none') other.push('pas de date de naissance');
    if (f.age === 'minor') other.push('mineur');
    if (!f.has_nationality) other.push('pas de nationalite (la vue la demande)');
    for (const d of f.same_person ?? []) if (d.why === 'alias') other.push(`la fiche ${d.id} (${d.name}) est peut-etre la meme personne avec un QID`);
    const sameAlias = facts.filter((o) => o.same_person?.some((d) => d.id === f.id && d.why === 'alias'));
    for (const o of sameAlias) other.push(`la fiche a relire ${o.id} (${o.name}, ${o.qid}) est sans doute la meme personne`);
    lines.push(`| ${f.id} | ${esc(f.name)} | ${esc(f.group)} | ${f.qid ? wdLink(f.qid) : 'aucun'} | ${mbLink(f.mb?.mbid)} | ${f.qid ? esc(srcTxt(f.gender, 'gender')) : 'non cherche'} | ${f.qid ? esc(srcTxt(f.debut_year, 'debut')) : 'non cherche'} | ${esc(f.debut_year?.value ? '' : bands(f))} | ${esc(other.join(' ; '))} |`);
  }
  lines.push('');
  // Active idols that a source already lists as a former member of their group (the game shows the group either way).
  const former = facts.filter((f) => f.active && !f.needs_review && f.qid && (
    (f.wd?.member_of ?? []).some((m) => m.qid === groups.get(f.group_id).qid && m.end) || (f.mb?.to_group ?? []).some((r) => r.ended || r.end)));
  if (former.length) {
    lines.push('### Actives, mais ancien membre selon une source', '');
    lines.push("Hors K1 (rien n'est change) : a toi de voir si la fiche reste active.", '');
    lines.push('| id | Nom | Groupe | Statut selon les sources |');
    lines.push('|---|---|---|---|');
    for (const f of former.sort((a, b) => a.group.localeCompare(b.group) || a.id - b.id)) lines.push(`| ${f.id} | ${esc(f.name)} | ${esc(f.group)} | ${esc(status(f))} |`);
    lines.push('');
  }
  lines.push('## 3. Les chiffres', '');
  for (const field of ['gender', 'debut_year']) {
    const c = s[field];
    lines.push(`- ${field === 'gender' ? 'Genre' : 'Annee de debut'} : Wikidata en donne ${c.wikidata_has}, MusicBrainz ${c.musicbrainz_has}. D'accord ${c.agree}, Wikidata seul ${c.wd_only}, MusicBrainz seul ${c.mb_only}, conflits ${c.conflict}, autre valeur ${c.other}, trop proche de la naissance ${c.too_close_to_birth}, rien ${c.missing}. Stockes : ${c.stored}.`);
  }
  lines.push(`- Fiches MusicBrainz trouvees : ${s.mb_artist_found} sur ${s.with_qid} idols avec QID. Groupes avec une fiche MusicBrainz : ${s.groups_with_mbid} sur ${groups.size}.`);
  lines.push('');
  return lines.join('\n');
}
