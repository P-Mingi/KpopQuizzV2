// W1.3 - Wikidata backfill (resumable, rate-limited, ALLOWLIST-ONLY).
//
// Reads ONLY human-checked seeds (verse_seed_ids.checked_at NOT NULL) - W0
// finding: zero ingestion for unchecked groups. For each group it fetches, from
// Wikidata SPARQL, ONLY the whitelisted properties below. Personal-life
// properties (spouse P26, partner P451, child P40, parents P22/P25, sibling
// P3373, residence P551, children-count P1971) are NEVER in any query, so the
// data is never fetched and never stored (living-persons policy at FETCH).
//
// Canonical precedence: our group name/slug/fandom_name and our roster member
// names are NEVER overwritten. Wikidata fills NET-NEW columns only, and every
// written fact gets an entity_sources row. Curator entity_overrides win at read.
//
// Idols: the roster (name-all game) is the canonical member LIST. Roster members
// are upserted and enriched with matched Wikidata facts. Wikidata members with
// NO roster match are NOT published - they are inserted inactive + needs_review
// (a review flag, never an auto-add of an unknown human).
//
// Usage:  node scripts/verse/02-wikidata-backfill.mjs [--fresh]
//   --fresh ignores the resume manifest and reprocesses every checked group.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// ---- the ONLY Wikidata properties this backfill ever requests ----
const ALLOWLIST = {
  group: { P571: 'inception_date', P264: 'record_label', P495: 'origin_country', P856: 'official_website' },
  idol:  { P569: 'birth_date', P27: 'nationality', P1559: 'name_hangul' },
  linkage: ['P463', 'P527'], // member-of / has-part, to enumerate members
};

const UA = 'KpopQuizVerse-W1-Backfill/1.0 (Verse entity ingestion; contact kaspermaiden@gmail.com)';
const SPARQL = 'https://query.wikidata.org/sparql';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MANIFEST = join(tmpdir(), 'verse_wikidata_backfill.json');
const FRESH = process.argv.includes('--fresh');

async function sparql(query) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`${SPARQL}?query=${encodeURIComponent(query)}&format=json`,
      { headers: { 'User-Agent': UA, 'Accept': 'application/sparql-results+json' } });
    if (r.status === 429 || r.status >= 500) { await sleep(2500); continue; } // transient (429/5xx incl. 502)
    if (!r.ok) throw new Error(`SPARQL ${r.status}: ${(await r.text()).slice(0, 160)}`);
    await sleep(350);
    return r.json();
  }
  throw new Error('SPARQL retries exhausted');
}

function db() {
  const envPath = process.env.QUIZ_ENV || '/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/.env.local';
  const env = Object.fromEntries(readFileSync(envPath, 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
  return import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } }));
}

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function fetchGroupFields(qid) {
  const rows = (await sparql(`
SELECT ?inception ?labelLabel ?countryLabel ?website WHERE {
  OPTIONAL { wd:${qid} wdt:P571 ?inception. }
  OPTIONAL { wd:${qid} wdt:P264 ?label. }
  OPTIONAL { wd:${qid} wdt:P495 ?country. }
  OPTIONAL { wd:${qid} wdt:P856 ?website. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`)).results.bindings;
  const out = { inception_date: null, record_label: null, origin_country: null, official_website: null };
  for (const r of rows) {
    if (r.inception && !out.inception_date) out.inception_date = r.inception.value.slice(0, 10);
    if (r.labelLabel && !out.record_label) out.record_label = r.labelLabel.value;
    if (r.countryLabel && !out.origin_country) out.origin_country = r.countryLabel.value;
    if (r.website && !out.official_website) out.official_website = r.website.value;
  }
  return out;
}

async function fetchMembers(qid) {
  const rows = (await sparql(`
SELECT ?person ?personLabel ?dob ?citizenLabel ?native WHERE {
  { ?person wdt:P463 wd:${qid}. } UNION { wd:${qid} wdt:P527 ?person. }
  ?person wdt:P31 wd:Q5.
  OPTIONAL { ?person wdt:P569 ?dob. }
  OPTIONAL { ?person wdt:P27 ?citizen. }
  OPTIONAL { ?person wdt:P1559 ?native. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`)).results.bindings;
  const byQid = {};
  for (const r of rows) {
    const pid = r.person.value.split('/').pop();
    if (!byQid[pid]) byQid[pid] = {
      qid: pid, name: r.personLabel?.value || pid,
      birth_date: r.dob ? r.dob.value.slice(0, 10) : null,
      nationality: r.citizenLabel?.value || null,
      name_hangul: r.native?.value || null,
    };
  }
  return Object.values(byQid);
}

async function loadRosters(supabase, groupIds) {
  const { data } = await supabase.from('games').select('group_id,content')
    .eq('game_type', 'name_all_members').eq('status', 'published').in('group_id', groupIds);
  const by = {};
  for (const row of (data || [])) {
    const members = Array.isArray(row.content?.members) ? row.content.members : [];
    if (members.length) by[row.group_id] = members;
  }
  return by;
}

async function srcRows(supabase, entity_type, entity_id, fields, source_ref) {
  // one entity_sources row per non-null field
  const rows = Object.entries(fields).filter(([, v]) => v != null).map(([field]) => ({
    entity_type, entity_id: String(entity_id), field, source: 'wikidata', source_ref, fetched_at: new Date().toISOString(),
  }));
  if (rows.length) await supabase.from('entity_sources').upsert(rows, { onConflict: 'entity_type,entity_id,field,source' });
}

async function main() {
  const supabase = await db();
  const { data: seeds } = await supabase.from('verse_seed_ids')
    .select('group_id,wikidata_qid,checked_at,groups(slug,name)')
    .not('checked_at', 'is', null).not('wikidata_qid', 'is', null);
  const checked = seeds || [];
  console.log(`Checked+resolvable groups: ${checked.length}`);
  if (!checked.length) { console.log('Nothing to ingest (gate: no checked groups).'); return; }

  const done = (!FRESH && existsSync(MANIFEST)) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  const rosters = await loadRosters(supabase, checked.map(s => s.group_id));
  const report = [];

  for (const s of checked) {
    const gid = s.group_id, qid = s.wikidata_qid, slug = s.groups?.slug || gid;
    if (done[gid]) { console.log(`  skip ${slug} (manifest)`); continue; }
    try {
      // --- group fields (allowlist) ---
      const gf = await fetchGroupFields(qid);
      await supabase.from('groups').update({ ...gf, wikidata_qid: qid }).eq('id', gid);
      await srcRows(supabase, 'group', gid, gf, qid);

      // --- members ---
      const wd = await fetchMembers(qid);
      const wdUsed = new Set();
      const roster = rosters[gid] || [];
      let matched = 0;
      for (let i = 0; i < roster.length; i++) {
        const m = roster[i];
        const name = m?.name;
        if (!name) continue;
        // find best WD match by normalized name
        const hit = wd.find(w => !wdUsed.has(w.qid) && (norm(w.name) === norm(name) || norm(w.name).includes(norm(name)) || norm(name).includes(norm(w.name))));
        const positions = typeof m.position === 'string' ? m.position.split(',').map(x => x.trim()).filter(Boolean) : [];
        const idolRow = {
          group_id: gid, name, photo_url: m.photo_url || null, positions, ord: i, active: true,
          name_hangul: hit?.name_hangul || null, birth_date: hit?.birth_date || null,
          nationality: hit?.nationality || null, wikidata_qid: hit?.qid || null,
          needs_review: false, review_reason: null,
        };
        const { data: up } = await supabase.from('idols').upsert(idolRow, { onConflict: 'group_id,name' }).select('id').single();
        if (hit) {
          wdUsed.add(hit.qid); matched++;
          if (up?.id) await srcRows(supabase, 'idol', up.id, { birth_date: hit.birth_date, nationality: hit.nationality, name_hangul: hit.name_hangul }, hit.qid);
        }
      }
      // WD members with no roster match -> inactive review flags (never published)
      let flagged = 0;
      for (const w of wd) {
        if (wdUsed.has(w.qid)) continue;
        flagged++;
        await supabase.from('idols').upsert({
          group_id: gid, name: w.name, wikidata_qid: w.qid, birth_date: w.birth_date,
          nationality: w.nationality, name_hangul: w.name_hangul, active: false, ord: 999,
          needs_review: true, review_reason: 'Wikidata lists this member but not in our name-all roster; confirm before activating.',
        }, { onConflict: 'group_id,name' });
      }

      done[gid] = true;
      writeFileSync(MANIFEST, JSON.stringify(done, null, 2));
      const line = { slug, fields: Object.values(gf).filter(Boolean).length, roster: roster.length, wd: wd.length, matched, flagged };
      report.push(line);
      console.log(`  ${slug.padEnd(14)} fields=${line.fields}/4 roster=${roster.length} wdMembers=${wd.length} matched=${matched} flagged=${flagged}`);
    } catch (e) {
      console.error(`  ERROR ${slug}: ${e.message}`);
    }
  }

  const totals = report.reduce((a, r) => ({ groups: a.groups + 1, idols: a.idols + r.matched + (r.roster - r.matched > 0 ? r.roster - r.matched : 0), flags: a.flags + r.flagged }), { groups: 0, idols: 0, flags: 0 });
  console.log(`\n=== WIKIDATA BACKFILL DONE ===`);
  console.log(`groups: ${report.length} | roster idols upserted: ${report.reduce((a, r) => a + r.roster, 0)} | wd-matched: ${report.reduce((a, r) => a + r.matched, 0)} | review flags (wd-only): ${totals.flags}`);
  console.log(`Allowlist properties fetched: group[${Object.keys(ALLOWLIST.group).join(',')}] idol[${Object.keys(ALLOWLIST.idol).join(',')}] linkage[${ALLOWLIST.linkage.join(',')}]`);
}

main();
