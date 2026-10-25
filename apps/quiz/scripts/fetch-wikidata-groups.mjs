// SEO Mission 2 (owner, 2026-10-14; rulebook section 7): the Wikidata IDs used in our
// MusicGroup JSON-LD `sameAs` are fetched by this script, never typed by hand.
//
// For every group below it asks Wikidata (read-only, public API, generic User-Agent) for
// the item linked to the group's English Wikipedia article, and stores what it found in
// src/data/wikidata-groups.json (versioned): the QID, the Wikipedia URL, the official
// website(s) (P856), the inception date (P571), the record labels (P264) and the members
// (P527) with their English labels. The page reads only `qid`, `wikipedia` and `official`;
// the other fields are kept as the second source the hub fact tables are checked against.
//
// Usage (from apps/quiz): node scripts/fetch-wikidata-groups.mjs
// No secrets, no database, no personal data in any request.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../src/data/wikidata-groups.json', import.meta.url));
const API = 'https://www.wikidata.org/w/api.php';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

// slug on kpopquiz.org -> exact English Wikipedia article title.
const GROUPS = [
  { slug: 'bts', enwiki: 'BTS' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  // Polite: a rate-limited answer (429) waits (Retry-After, else 15 s) and tries again, 4 times at most.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if (res.status !== 429 || attempt >= 3) throw new Error(`wikidata ${res.status} for ${url}`);
    const wait = Math.min(60, Number(res.headers.get('retry-after')) || 15);
    console.log(`[wikidata] rate limited, waiting ${wait} s`);
    await sleep(wait * 1000);
  }
}

const claimValues = (entity, prop) => (entity.claims?.[prop] ?? [])
  .filter((c) => c.rank !== 'deprecated' && c.mainsnak?.snaktype === 'value')
  .map((c) => c.mainsnak.datavalue.value);

async function labels(ids) {
  if (ids.length === 0) return {};
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const data = await api({ action: 'wbgetentities', ids: ids.slice(i, i + 50).join('|'), props: 'labels', languages: 'en' });
    for (const [id, e] of Object.entries(data.entities ?? {})) out[id] = e.labels?.en?.value ?? null;
    await sleep(500);
  }
  return out;
}

const result = {};
for (const g of GROUPS) {
  const data = await api({ action: 'wbgetentities', sites: 'enwiki', titles: g.enwiki, props: 'claims|sitelinks', sitefilter: 'enwiki' });
  const [qid, entity] = Object.entries(data.entities ?? {})[0] ?? [];
  if (!qid || !/^Q\d+$/.test(qid) || entity.missing !== undefined) throw new Error(`no Wikidata item for enwiki:${g.enwiki}`);
  const title = entity.sitelinks?.enwiki?.title ?? g.enwiki;
  const labelIds = claimValues(entity, 'P264').map((v) => v.id);
  const memberIds = claimValues(entity, 'P527').map((v) => v.id);
  const names = await labels([...labelIds, ...memberIds]);
  const inception = claimValues(entity, 'P571').map((v) => v.time)[0] ?? null;
  result[g.slug] = {
    qid,
    wikidata: `https://www.wikidata.org/wiki/${qid}`,
    wikipedia: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    official: claimValues(entity, 'P856'),
    inception: inception ? inception.replace(/^\+/, '').slice(0, 10) : null,
    recordLabels: labelIds.map((id) => ({ qid: id, label: names[id] ?? null })),
    members: memberIds.map((id) => ({ qid: id, label: names[id] ?? null })),
  };
  console.log(`[wikidata] ${g.slug}: ${qid} (${title})`);
  await sleep(500);
}

const file = {
  _note: 'Written by scripts/fetch-wikidata-groups.mjs from the public Wikidata API. Do not edit by hand: re-run the script.',
  fetchedAt: new Date().toISOString().slice(0, 10),
  groups: result,
};
await writeFile(OUT, `${JSON.stringify(file, null, 2)}\n`);
console.log(`[wikidata] wrote ${Object.keys(result).length} group(s) to src/data/wikidata-groups.json`);
