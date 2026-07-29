// W3K.3 follow-up: seed group-level awards from Wikidata (read-only fetch, then write).
//
// Pulls award-received (P166) and nomination (P1411) statements per group QID, with the
// point-in-time qualifier (P585) for the year. Every seeded row carries a source
// (the group's Wikidata page). Publish gate: a row auto-publishes only when it has
// year + result + source; otherwise it stays a draft for a curator to complete.
// Idempotent: clears prior wikidata-seeded rows for these groups, then re-inserts.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: groups } = await db.from('groups').select('id, name, wikidata_qid').not('wikidata_qid', 'is', null);
const { data: launchRows } = await db.from('verse_spaces').select('group_id').eq('is_launch', true);
const launch = (launchRows ?? []).map((r) => r.group_id);
const idByQid = Object.fromEntries(groups.map((g) => [g.wikidata_qid, g.id]));
const nameById = Object.fromEntries(groups.map((g) => [g.id, g.name]));
const launchSet = new Set(launch);
const VALUES = groups.map((g) => `wd:${g.wikidata_qid}`).join(' ');
const UA = 'KpopQuizVerse-awards-seed/1.0 (kaspermaiden@gmail.com)';

async function sparql(query) {
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).results.bindings;
}

function q(prop) {
  return `SELECT ?g ?award ?awardLabel ?year WHERE {
    VALUES ?g { ${VALUES} }
    ?g p:${prop} ?st . ?st ps:${prop} ?award .
    OPTIONAL { ?st pq:P585 ?date . BIND(YEAR(?date) AS ?year) }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
}

const rows = [];
const seen = new Set();
for (const [prop, result] of [['P166', 'won'], ['P1411', 'nominated']]) {
  const bindings = await sparql(q(prop));
  for (const b of bindings) {
    const qid = b.g.value.split('/').pop();
    const groupId = idByQid[qid];
    if (!groupId) continue;
    const awardName = (b.awardLabel?.value ?? '').slice(0, 200);
    if (!awardName || awardName.startsWith('Q')) continue; // skip unlabelled items
    const year = b.year ? Number(b.year.value) : null;
    const key = `${groupId}|${awardName}|${year ?? ''}|${result}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      group_id: groupId, award_name: awardName, year, result,
      wikidata_qid: b.award.value.split('/').pop(),
      source_url: `https://www.wikidata.org/wiki/${qid}`,
      source_note: `Wikidata award statement (${prop})`,
      status: year && result ? 'published' : 'draft',
    });
  }
  await new Promise((r) => setTimeout(r, 1200));
}

// Idempotent reseed: clear prior wikidata-seeded rows for these groups.
await db.from('awards').delete().not('wikidata_qid', 'is', null).in('group_id', groups.map((g) => g.id));
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await db.from('awards').insert(rows.slice(i, i + 200));
  if (error) { console.error('insert error:', error.message); process.exit(1); }
}

// Report.
const per = new Map();
for (const r of rows) {
  const p = per.get(r.group_id) ?? { pub: 0, draft: 0 };
  r.status === 'published' ? p.pub++ : p.draft++;
  per.set(r.group_id, p);
}
const pubTotal = rows.filter((r) => r.status === 'published').length;
console.log(`\n=== AWARDS SEED COMPLETE ===`);
console.log(`groups with awards: ${per.size} | rows: ${rows.length} | published: ${pubTotal} | draft: ${rows.length - pubTotal}`);
console.log(`\n=== launch groups ===`);
for (const id of [...per.keys()].filter((id) => launchSet.has(id))) {
  const p = per.get(id);
  console.log(`  ${nameById[id].padEnd(14)} published=${p.pub}  draft=${p.draft}`);
}
console.log(`\n=== all groups (published/draft) ===`);
for (const [id, p] of [...per.entries()].sort((a, b) => (b[1].pub + b[1].draft) - (a[1].pub + a[1].draft))) {
  console.log(`  ${nameById[id].padEnd(16)} pub=${String(p.pub).padStart(2)} draft=${String(p.draft).padStart(2)}${launchSet.has(id) ? '  [launch]' : ''}`);
}
