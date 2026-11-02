#!/usr/bin/env node
// Lot K2, step 1 of 3: fetch (network, cached in ~/kpq-o1/k2-cache). Nothing is decided here.
//   node scripts/kpop/k2/k2-fetch.mjs [--only slug,slug]
// For each target group: the English Wikipedia article (wikitext), its Wikidata item (inception, labels, MusicBrainz id), the people
// Wikidata says are members (SPARQL on P463 with start and end dates), the people the article lists. For each person: the Wikidata item,
// the English Wikipedia article (wikitext and plain intro), the MusicBrainz artist. Sources: Wikidata, MusicBrainz, English Wikipedia only.
// Output: ~/kpq-o1/k2-cache/k2-raw.json (outside the repository: it holds the birth dates of people who may be minors).
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CACHE_DIR, chunk, mb, norm, qs, sparql, stats, wd, wp } from './lib.mjs';
import { GROUPS, YES_021B } from './groups.mjs';

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const log = (...a) => console.log(...a);

// ---- Wikipedia helpers
async function wpPages(titles, extra = {}) {   // titles -> map normalized title -> page (redirects followed)
  const out = new Map();
  for (const part of chunk(titles, 20)) {
    const r = await wp({ action: 'query', titles: part.join('|'), redirects: 1, prop: 'pageprops|revisions', rvprop: 'content', rvslots: 'main', ...extra });
    const q = r.body.query;
    const map = new Map();
    for (const t of part) map.set(t, t);
    for (const n of q.normalized ?? []) for (const [k, v] of map) if (v === n.from) map.set(k, n.to);
    for (const n of q.redirects ?? []) for (const [k, v] of map) if (v === n.from) map.set(k, n.to);
    const byTitle = new Map((q.pages ?? []).map((p) => [p.title, p]));
    for (const [k, v] of map) { const p = byTitle.get(v); if (p && !p.missing) out.set(k, p); }
  }
  return out;
}
async function wpExtracts(titles) {   // plain-text intro, by final title
  const out = new Map();
  for (const part of chunk(titles, 20)) {
    const r = await wp({ action: 'query', titles: part.join('|'), prop: 'extracts', exintro: 1, explaintext: 1, exlimit: 20, redirects: 1 });
    for (const p of r.body.query.pages ?? []) if (!p.missing) out.set(p.title, p.extract ?? '');
  }
  return out;
}
const pageText = (p) => p?.revisions?.[0]?.slots?.main?.content ?? '';

// ---- Wikidata helpers
async function wdEntities(ids, props = 'labels|aliases|claims|sitelinks') {
  const out = new Map();
  for (const part of chunk([...new Set(ids)].filter(Boolean), 50)) {
    const r = await wd({ action: 'wbgetentities', ids: part.join('|'), props, languages: 'en|ko', sitefilter: 'enwiki' });
    for (const [id, e] of Object.entries(r.body.entities ?? {})) if (!e.missing) out.set(id, e);
  }
  return out;
}
const claimIds = (e, p) => (e?.claims?.[p] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);

// ---- MusicBrainz
async function mbArtist(mbid) {
  const r = await mb(`artist/${mbid}`, { inc: 'artist-rels' });
  return r.body;
}
// Fallback when Wikidata has no MusicBrainz id: MusicBrainz's own link to the Wikidata item (url relation).
async function mbByWikidata(qid) {
  const r = await mb('url', { resource: `https://www.wikidata.org/wiki/${qid}`, inc: 'artist-rels' });
  const rel = r.body?.relations?.find((x) => x['target-type'] === 'artist' && x.artist);
  return rel ? rel.artist.id : null;
}
// Every release group of a group, to date its first official release (the owner's rule for a debut year).
async function mbReleaseGroups(mbid) {
  const all = [];
  for (let off = 0; off < 600; off += 100) {
    const r = await mb('release-group', { artist: mbid, limit: 100, offset: off });
    const rgs = r.body?.['release-groups'] ?? [];
    for (const g of rgs) all.push({ id: g.id, title: g.title, type: g['primary-type'] ?? null, secondary: g['secondary-types'] ?? [], date: g['first-release-date'] || null });
    if (off + 100 >= (r.body?.['release-group-count'] ?? 0)) break;
  }
  return all;
}

const raw = { fetched_at: new Date().toISOString(), groups: {}, persons: {}, yes021b: {} };

async function doGroup(g) {
  log(`\n== ${g.slug}`);
  const pages = await wpPages(g.titles);
  let page = null;
  for (const t of g.titles) if (pages.get(t)) { page = pages.get(t); break; }
  if (!page) { log(`  no English Wikipedia page for ${g.titles.join(' / ')}`); raw.groups[g.slug] = { ...g, error: 'no Wikipedia page' }; return; }
  const qid = page.pageprops?.wikibase_item ?? null;
  const entry = { ...g, wikipedia_title: page.title, shortdesc: page.pageprops?.['wikibase-shortdesc'] ?? null, qid, wikitext: pageText(page) };
  log(`  ${page.title} | ${entry.shortdesc} | ${qid}`);
  if (qid) {
    const ents = await wdEntities([qid]);
    const e = ents.get(qid);
    entry.wd = e ? { label: e.labels?.en?.value ?? null, claims: pickGroupClaims(e), mbid: (e.claims?.P434 ?? [])[0]?.mainsnak?.datavalue?.value ?? null } : null;
    const labelIds = (entry.wd?.claims.P264 ?? []).map((c) => c.id);
    const labelEnts = await wdEntities(labelIds, 'labels');
    entry.wd_labels = Object.fromEntries([...labelEnts].map(([id, x]) => [id, x.labels?.en?.value ?? null]));
    // Wikidata members: P463 on the person (with start and end), and P527 on the group
    const q = `SELECT ?p ?s ?e WHERE { ?p p:P463 ?st . ?st ps:P463 wd:${qid} . OPTIONAL{?st pq:P580 ?s} OPTIONAL{?st pq:P582 ?e} }`;
    const sp = await sparql(q);
    entry.wd_members = (sp.body?.results?.bindings ?? []).map((b) => ({ qid: b.p.value.split('/').pop(), start: b.s?.value ?? null, end: b.e?.value ?? null }));
    entry.wd_has_part = claimIds(e, 'P527');
    if (!entry.wd?.mbid) entry.wd = { ...(entry.wd ?? {}), mbid: await mbByWikidata(qid) };
    if (entry.wd?.mbid) {
      entry.mb_release_groups = await mbReleaseGroups(entry.wd.mbid);
      const m = await mbArtist(entry.wd.mbid);
      entry.mb = m ? { id: m.id, name: m.name, begin: m['life-span']?.begin ?? null, end: m['life-span']?.end ?? null, ended: m['life-span']?.ended ?? null,
        members: (m.relations ?? []).filter((r) => r.type === 'member of band' && r.direction === 'backward' && r.artist)
          .map((r) => ({ id: r.artist.id, name: r.artist.name, begin: r.begin ?? null, end: r.end ?? null, ended: r.ended ?? false })) } : null;
    }
  }
  raw.groups[g.slug] = entry;
}
function pickGroupClaims(e) {
  const out = {};
  for (const p of ['P571', 'P576', 'P264']) {
    out[p] = (e.claims?.[p] ?? []).map((c) => {
      const v = c.mainsnak?.datavalue?.value;
      return { id: v?.id ?? null, time: v?.time ?? null, rank: c.rank, end: c.qualifiers?.P582?.[0]?.datavalue?.value?.time ?? null };
    });
  }
  return out;
}

async function doPersons() {
  // Candidate people: every link of the members fields of each article + the Wikidata P463 people. Titles first.
  const titleSet = new Set();
  for (const g of Object.values(raw.groups)) {
    if (!g.wikitext) continue;
    for (const t of linkTargets(g.wikitext)) titleSet.add(t);
  }
  log(`\n== ${titleSet.size} linked article titles`);
  const pages = await wpPages([...titleSet]);
  const titleToQid = {};
  for (const [t, p] of pages) titleToQid[t] = { title: p.title, qid: p.pageprops?.wikibase_item ?? null };
  raw.title_to_qid = titleToQid;
  const qids = new Set();
  for (const v of Object.values(titleToQid)) if (v.qid) qids.add(v.qid);
  for (const g of Object.values(raw.groups)) for (const m of g.wd_members ?? []) qids.add(m.qid);
  for (const y of YES_021B) qids.add(y[1]);
  log(`   ${qids.size} candidate QIDs`);
  const ents = await wdEntities([...qids]);
  const enTitles = [];
  for (const [id, e] of ents) {
    const tt = e.sitelinks?.enwiki?.title;
    raw.persons[id] = { qid: id, label: e.labels?.en?.value ?? null, ko: e.labels?.ko?.value ?? null, aliases: (e.aliases?.en ?? []).map((a) => a.value),
      enwiki: tt ?? null, claims: personClaims(e) };
    if (tt) enTitles.push(tt);
  }
  const labelIds = new Set();
  for (const p of Object.values(raw.persons)) for (const k of ['P27', 'P21']) for (const c of p.claims[k] ?? []) if (c.id) labelIds.add(c.id);
  const le = await wdEntities([...labelIds], 'labels');
  raw.labels = Object.fromEntries([...le].map(([id, x]) => [id, x.labels?.en?.value ?? null]));
  // English Wikipedia: wikitext and plain intro of each person
  const ppages = await wpPages(enTitles);
  const ext = await wpExtracts(enTitles);
  for (const p of Object.values(raw.persons)) {
    if (!p.enwiki) continue;
    const pg = ppages.get(p.enwiki);
    p.wp = pg ? { title: pg.title, wikitext_head: pageText(pg).slice(0, 6000), intro: ext.get(pg.title) ?? ext.get(p.enwiki) ?? '' } : null;
  }
  // MusicBrainz: the Wikidata MBID, else the member list of the group's MusicBrainz page matched by name
  const byNorm = new Map();
  for (const g of Object.values(raw.groups)) for (const m of g.mb?.members ?? []) byNorm.set(`${g.slug}|${norm(m.name)}`, m.id);
  const want = new Map();   // mbid -> qid
  for (const p of Object.values(raw.persons)) {
    let id = p.claims.P434?.[0]?.value;
    if (!id && p.claims.P463?.some((c) => !c.end)) { id = await mbByWikidata(p.qid); if (id) p.mb_via = 'wikidata-url'; }
    if (id) want.set(id, p.qid);
  }
  raw.mb_by_group_name = Object.fromEntries(byNorm);
  log(`   MusicBrainz lookups: ${want.size} by Wikidata id`);
  let i = 0;
  for (const [id, qid] of want) {
    i++;
    if (i % 20 === 0) log(`   mb ${i}/${want.size}`);
    const a = await mbArtist(id);
    raw.persons[qid].mb = a ? {
      id: a.id, name: a.name, type: a.type ?? null, gender: a.gender ?? null, begin: a['life-span']?.begin ?? null, area: a.area ? { name: a.area.name, codes: a.area['iso-3166-1-codes'] ?? [] } : null,
      begin_area: a['begin-area'] ? { name: a['begin-area'].name, codes: a['begin-area']['iso-3166-1-codes'] ?? [] } : null,
      groups: (a.relations ?? []).filter((r) => r.type === 'member of band' && r.direction === 'forward' && r.artist)
        .map((r) => ({ id: r.artist.id, name: r.artist.name, begin: r.begin ?? null, end: r.end ?? null, ended: r.ended ?? false })),
    } : null;
  }
}
function personClaims(e) {
  const out = {};
  for (const p of ['P569', 'P570', 'P21', 'P27', 'P434', 'P2031', 'P463', 'P742', 'P1559', 'P106']) {
    out[p] = (e.claims?.[p] ?? []).map((c) => {
      const v = c.mainsnak?.datavalue?.value;
      const q = (k) => c.qualifiers?.[k]?.[0]?.datavalue?.value?.time ?? null;
      if (p === 'P569' || p === 'P570') return { time: v?.time ?? null, precision: v?.precision ?? null, rank: c.rank };
      if (p === 'P2031') return { time: v?.time ?? null, precision: v?.precision ?? null, rank: c.rank };
      if (p === 'P434') return { value: typeof v === 'string' ? v : null, rank: c.rank };
      if (p === 'P742' || p === 'P1559') return { text: typeof v === 'string' ? v : v?.text ?? null };
      if (p === 'P463') return { id: v?.id ?? null, start: q('P580'), end: q('P582'), rank: c.rank };
      return { id: v?.id ?? null, rank: c.rank };
    });
  }
  return out;
}

// All [[Target|shown]] targets inside the members fields and sections (cheap and generous: the build step decides what is a member).
function linkTargets(wikitext) {
  const out = new Set();
  const region = memberRegions(wikitext);
  for (const m of region.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) out.add(m[1].trim().replace(/_/g, ' '));
  return out;
}
export function memberRegions(wikitext) {
  let text = '';
  // infobox fields (current/past/members), until the next "| name =" parameter or the end of the box
  for (const key of ['current_members', 'past_members', 'former_members', 'members']) {
    const re = new RegExp(`\\|\\s*${key}\\s*=([\\s\\S]*?)(?=\\n\\s*\\|\\s*[a-z_]+\\s*=|\\n\\}\\})`, 'i');
    const m = wikitext.match(re);
    if (m) text += `\n${m[1]}`;
  }
  // "Members" section (level 2) until the next level-2 heading
  const s = wikitext.match(/\n==\s*(?:Members|Current members|Line-?up)[^=\n]*==\s*\n([\s\S]*?)(?=\n==[^=])/i);
  if (s) text += `\n${s[1]}`;
  return text;
}

// Every member MusicBrainz lists for a target group (birth date, gender, area), so that a person Wikidata does not link to MusicBrainz
// can still be matched by his or her Hangul name inside the group (the match is then checked by the birth dates agreeing).
async function doMbMembers() {
  raw.mb_artists = {};
  let n = 0;
  for (const g of Object.values(raw.groups)) {
    for (const m of g.mb?.members ?? []) {
      if (raw.mb_artists[m.id]) continue;
      n++;
      if (n % 25 === 0) log(`   mb member ${n}`);
      const a = await mbArtist(m.id);
      raw.mb_artists[m.id] = a ? { id: a.id, name: a.name, type: a.type ?? null, gender: a.gender ?? null, begin: a['life-span']?.begin ?? null,
        area: a.area ? { name: a.area.name, codes: a.area['iso-3166-1-codes'] ?? [] } : null,
        begin_area: a['begin-area'] ? { name: a['begin-area'].name, codes: a['begin-area']['iso-3166-1-codes'] ?? [] } : null } : null;
    }
  }
}

async function doYes() {
  // The Wikipedia pages of the 021b groups, for the status check of the 12 (current list, no end date on Wikidata).
  const titles = [...new Set(YES_021B.map((y) => y[3]))];
  const pages = await wpPages(titles);
  for (const t of titles) {
    const p = pages.get(t);
    raw.yes021b[t] = p ? { title: p.title, qid: p.pageprops?.wikibase_item ?? null, wikitext: pageText(p) } : null;
  }
  const gq = Object.values(raw.yes021b).map((x) => x?.qid).filter(Boolean);
  for (const [title, x] of Object.entries(raw.yes021b)) {
    if (!x?.qid) continue;
    const sp = await sparql(`SELECT ?p ?s ?e WHERE { ?p p:P463 ?st . ?st ps:P463 wd:${x.qid} . OPTIONAL{?st pq:P580 ?s} OPTIONAL{?st pq:P582 ?e} }`);
    x.wd_members = (sp.body?.results?.bindings ?? []).map((b) => ({ qid: b.p.value.split('/').pop(), start: b.s?.value ?? null, end: b.e?.value ?? null }));
  }
  void gq;
}

const todo = GROUPS.filter((g) => !only || only.includes(g.slug));
for (const g of todo) await doGroup(g);
await doPersons();
await doMbMembers();
await doYes();
await mkdir(CACHE_DIR, { recursive: true });
const outFile = path.join(CACHE_DIR, only ? 'k2-raw-partial.json' : 'k2-raw.json');
await writeFile(outFile, JSON.stringify(raw));
log(`\nwritten ${outFile}; network requests ${stats.fetched}, from cache ${stats.cached}`);
