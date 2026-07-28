// W0.1 - Wikidata coverage audit (READ-ONLY spike).
// Sources: query.wikidata.org SPARQL + www.wikidata.org wbsearchentities API.
// Policy: official public query services. We send a descriptive User-Agent, one
// request at a time with a delay, and do NOT scrape any website. See:
//   https://www.wikidata.org/wiki/Wikidata:Data_access  (API etiquette)
//   https://query.wikidata.org/  (SPARQL endpoint; fair-use, identify yourself)
// Wikidata content is CC0 (public domain).
//
// Consumes the ground-truth JSON from 00-ground-truth.mjs. Emits a JSON report.
import { readFileSync, writeFileSync } from 'fs';

const TRUTH = process.argv[2];
const OUT   = process.argv[3];
const truth = JSON.parse(readFileSync(TRUTH, 'utf8'));

const UA = 'KpopQuizVerse-W0-Spike/1.0 (feasibility audit; contact kaspermaiden@gmail.com) node-fetch';
const SPARQL = 'https://query.wikidata.org/sparql';
const API = 'https://www.wikidata.org/w/api.php';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Search aliases for names that label-search resolves poorly.
const ALIAS = {
  'g-i-dle': ['(G)I-DLE', 'I-dle'],
  'txt': ['Tomorrow X Together', 'TXT band'],
  'nct': ['NCT (band)', 'NCT'],
  'nct-dream': ['NCT Dream'],
  'le-sserafim': ['Le Sserafim'],
  'fifty-fifty': ['Fifty Fifty (South Korean group)'],
  'riize': ['Riize'],
  'babymonster': ['Babymonster'],
};

// Curated QID seed overrides. W0 finding: label-search + auto-scoring mis-picks
// two of thirty. These are the human-verified QIDs a real ingestion seed list
// would carry. TXT's entity is correct under search but its English label is
// vandalized ("Tacos de asada y cebollin"); we still pin the QID for clarity.
const QID_OVERRIDE = {
  'fifty-fifty': 'Q116731010', // South Korean girl group (auto-scorer picked Q20970430 "1:1")
  'txt': 'Q60550265',          // Tomorrow X Together (label vandalized upstream at audit time)
};

// Wikidata classes that count as "a music group" for resolution confidence.
const GROUP_CLASS_HINT = /(group|band|duo|ensemble|boy|girl)/i;

async function apiSearch(term) {
  const url = `${API}?action=wbsearchentities&search=${encodeURIComponent(term)}&language=en&uselang=en&format=json&type=item&limit=6&origin=*`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!r.ok) throw new Error(`API ${r.status} for ${term}`);
  const j = await r.json();
  return (j.search || []).map(s => ({ qid: s.id, label: s.label, desc: s.description || '' }));
}

async function sparql(query) {
  const url = `${SPARQL}?query=${encodeURIComponent(query)}&format=json`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/sparql-results+json' } });
  if (!r.ok) throw new Error(`SPARQL ${r.status}: ${(await r.text()).slice(0,200)}`);
  const j = await r.json();
  return j.results.bindings;
}

// Resolve a group slug -> best QID + confidence, honestly.
async function resolve(g) {
  if (QID_OVERRIDE[g.slug]) {
    return { slug: g.slug, name: g.name, qid: QID_OVERRIDE[g.slug], bestLabel: g.name,
      bestDesc: 'curated QID override (auto-resolution unreliable)', bestTypes: [],
      confidence: 'OVERRIDE', candidates: [] };
  }
  const terms = [g.name, ...(ALIAS[g.slug] || [])];
  const seen = new Map();
  for (const t of terms) {
    let cands;
    try { cands = await apiSearch(t); } catch (e) { cands = []; }
    await sleep(350);
    for (const c of cands) if (!seen.has(c.qid)) seen.set(c.qid, c);
  }
  const cands = [...seen.values()];
  if (!cands.length) return { slug: g.slug, name: g.name, qid: null, confidence: 'FAILED', note: 'no search hits', candidates: [] };

  // Verify via P31 (instance of) on all candidates in one query.
  const values = cands.map(c => `wd:${c.qid}`).join(' ');
  let p31rows = [];
  try {
    p31rows = await sparql(`SELECT ?item ?typeLabel WHERE { VALUES ?item { ${values} } OPTIONAL { ?item wdt:P31 ?type. } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
    await sleep(400);
  } catch (e) { /* fall through to search-desc heuristic */ }
  const typesByQid = {};
  for (const row of p31rows) {
    const qid = row.item.value.split('/').pop();
    (typesByQid[qid] ||= []).push(row.typeLabel?.value || '');
  }
  // Score: a candidate whose P31 or description looks group-like wins.
  const scored = cands.map(c => {
    const types = typesByQid[c.qid] || [];
    const groupish = types.some(t => GROUP_CLASS_HINT.test(t)) || GROUP_CLASS_HINT.test(c.desc);
    const kpopish = /(k-pop|korean|south korea)/i.test(c.desc) || /(k-pop|korean)/i.test(types.join(' '));
    return { ...c, types, score: (groupish ? 2 : 0) + (kpopish ? 1 : 0) };
  }).sort((a,b) => b.score - a.score);

  const best = scored[0];
  const runnerUp = scored[1];
  let confidence = 'HIGH';
  if (best.score === 0) confidence = 'UNVERIFIED';
  else if (runnerUp && runnerUp.score >= best.score) confidence = 'AMBIGUOUS';
  else if (best.score < 3) confidence = 'MEDIUM';
  return {
    slug: g.slug, name: g.name, qid: best.qid, bestLabel: best.label, bestDesc: best.desc,
    bestTypes: best.types, confidence,
    candidates: scored.slice(0, 4).map(c => ({ qid: c.qid, label: c.label, desc: c.desc, score: c.score })),
  };
}

// ---- run resolution for all 30 audit groups ----
const audit = truth.audit;
console.log(`Resolving ${audit.length} groups against Wikidata...`);
const resolved = [];
for (const g of audit) {
  const r = await resolve(g);
  resolved.push({ ...r, roster: g.roster || null, id: g.id });
  console.log(`  ${g.slug.padEnd(14)} -> ${r.qid || 'FAIL'} [${r.confidence}] ${r.bestLabel || ''}`);
}

const withQid = resolved.filter(r => r.qid);
const qids = withQid.map(r => r.qid);

// ---- group-field matrix ----
const valuesG = qids.map(q => `wd:${q}`).join(' ');
const groupFields = await sparql(`
SELECT ?g ?inception ?label ?labelLabel ?country ?countryLabel ?website ?fanbase WHERE {
  VALUES ?g { ${valuesG} }
  OPTIONAL { ?g wdt:P571 ?inception. }
  OPTIONAL { ?g wdt:P264 ?label. }
  OPTIONAL { ?g wdt:P495 ?country. }
  OPTIONAL { ?g wdt:P856 ?website. }
  OPTIONAL { ?g wdt:P8409 ?fanbase. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`);
await sleep(400);
// P8409 = "fandom" (name of fanbase) if present. Aggregate per group.
const gf = {};
for (const row of groupFields) {
  const q = row.g.value.split('/').pop();
  const e = (gf[q] ||= { inception:null, labels:new Set(), country:null, website:null, fandom:null });
  if (row.inception) e.inception = row.inception.value.slice(0,10);
  if (row.labelLabel) e.labels.add(row.labelLabel.value);
  if (row.countryLabel) e.country = row.countryLabel.value;
  if (row.website) e.website = row.website.value;
  if (row.fanbase) e.fandom = row.fanbase.value;
}

// ---- members (idol coverage) ----
// Members via P463 (member of) inverse and P527 (has part). Union both.
const members = await sparql(`
SELECT ?g ?person ?personLabel ?dob ?citizenLabel ?nativeName WHERE {
  VALUES ?g { ${valuesG} }
  { ?person wdt:P463 ?g. } UNION { ?g wdt:P527 ?person. }
  ?person wdt:P31 wd:Q5.
  OPTIONAL { ?person wdt:P569 ?dob. }
  OPTIONAL { ?person wdt:P27 ?citizen. }
  OPTIONAL { ?person wdt:P1559 ?nativeName. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`);
await sleep(400);
const byGroup = {};
for (const row of members) {
  const q = row.g.value.split('/').pop();
  const pid = row.person.value.split('/').pop();
  const m = (byGroup[q] ||= {});
  if (!m[pid]) m[pid] = {
    qid: pid, name: row.personLabel?.value || pid,
    dob: row.dob ? row.dob.value.slice(0,10) : null,
    nationality: row.citizenLabel?.value || null,
    hangul: row.nativeName?.value || null,
  };
}

// ---- LIVING-PERSONS probe: which excluded personal-life properties are populated? ----
// Collect every resolved member QID, ask which sensitive props are set (to PROVE
// the ingestion whitelist must exclude them at fetch, not just at schema).
const allMemberQids = [...new Set(members.map(r => r.person.value.split('/').pop()))];
let sensitive = [];
if (allMemberQids.length) {
  const vv = allMemberQids.map(q => `wd:${q}`).join(' ');
  sensitive = await sparql(`
SELECT ?prop (COUNT(DISTINCT ?person) AS ?people) WHERE {
  VALUES ?person { ${vv} }
  VALUES ?prop { wdt:P26 wdt:P451 wdt:P40 wdt:P22 wdt:P25 wdt:P3373 wdt:P551 wdt:P1971 }
  ?person ?prop ?val.
} GROUP BY ?prop`);
  await sleep(300);
}
const SENS_NAME = { P26:'spouse', P451:'unmarried partner', P40:'child', P22:'father', P25:'mother', P3373:'sibling', P551:'residence', P1971:'number of children' };
const sensitiveHits = sensitive.map(r => ({ prop: r.prop.value.split('/').pop(), name: SENS_NAME[r.prop.value.split('/').pop()], people: +r.people.value }));

// ---- assemble matrices + member cross-check vs our rosters ----
const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const groupRows = withQid.map(r => {
  const f = gf[r.qid] || {};
  const wdMembers = Object.values(byGroup[r.qid] || {});
  const roster = r.roster || [];
  const rosterNorm = roster.map(norm);
  const wdNorm = wdMembers.map(m => norm(m.name));
  const matched = roster.filter(n => wdNorm.some(w => w===norm(n) || w.includes(norm(n)) || norm(n).includes(w)));
  const dobCov = wdMembers.length ? wdMembers.filter(m=>m.dob).length / wdMembers.length : 0;
  const natCov = wdMembers.length ? wdMembers.filter(m=>m.nationality).length / wdMembers.length : 0;
  const hanCov = wdMembers.length ? wdMembers.filter(m=>m.hangul).length / wdMembers.length : 0;
  return {
    slug: r.slug, name: r.name, qid: r.qid, confidence: r.confidence,
    inception: f.inception || null,
    label: f.labels ? [...f.labels].join('; ') || null : null,
    country: f.country || null,
    website: f.website ? 'yes' : null,
    fandom: f.fandom || null,
    wdMemberCount: wdMembers.length,
    ourRosterCount: roster.length || null,
    matchedMembers: roster.length ? matched.length : null,
    dobCoverage: +(dobCov*100).toFixed(0),
    natCoverage: +(natCov*100).toFixed(0),
    hangulCoverage: +(hanCov*100).toFixed(0),
    members: wdMembers,
  };
});

const report = {
  generated: 'W0.1 Wikidata audit',
  source: { sparql: SPARQL, api: API, license: 'CC0 (public domain)', policy: 'https://www.wikidata.org/wiki/Wikidata:Data_access' },
  resolution: resolved.map(r => ({ slug:r.slug, qid:r.qid, confidence:r.confidence, label:r.bestLabel, desc:r.bestDesc, candidates:r.candidates })),
  groupMatrix: groupRows,
  sensitivePropsFound: sensitiveHits,
  summary: {
    resolved: withQid.length, total: audit.length,
    failed: resolved.filter(r=>!r.qid).map(r=>r.slug),
    ambiguous: resolved.filter(r=>r.confidence==='AMBIGUOUS'||r.confidence==='UNVERIFIED').map(r=>({slug:r.slug,conf:r.confidence})),
    fieldPresence: {
      inception: groupRows.filter(r=>r.inception).length,
      label: groupRows.filter(r=>r.label).length,
      country: groupRows.filter(r=>r.country).length,
      website: groupRows.filter(r=>r.website).length,
      fandom: groupRows.filter(r=>r.fandom).length,
    },
  },
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log('\n=== WIKIDATA SUMMARY ===');
console.log('resolved:', report.summary.resolved, '/', report.summary.total, '| failed:', report.summary.failed.join(',')||'none', '| ambiguous:', report.summary.ambiguous.map(a=>a.slug+':'+a.conf).join(',')||'none');
console.log('field presence (of', withQid.length, 'resolved):', JSON.stringify(report.summary.fieldPresence));
console.log('sensitive personal-life props populated on our idols:', sensitiveHits.map(s=>`${s.name}(${s.people})`).join(', ')||'none');
console.log('wrote', OUT);
