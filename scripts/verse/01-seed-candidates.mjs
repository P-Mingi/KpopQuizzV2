// W1.2 - Verse seed-list candidates + owner review table.
//
// Reads the W0 spike outputs (Wikidata + MusicBrainz resolution + our ground
// truth) and joins them into ONE human-review table:
//   group -> proposed QID (label AS FETCHED) -> proposed MBID (name AS FETCHED)
//           -> confidence + trap flags.
// The "as fetched" columns are the whole point: they let the owner catch the
// TXT label-vandalism and the FIFTY FIFTY "1:1" mis-pick BEFORE anything is
// ingested (W0 finding 1: no live label search, human-checked seed list).
//
// Modes:
//   (default)  build seed-candidates.json (committed source of truth) + print
//              the review table + write a markdown copy to OUT_MD.
//   --apply    upsert candidates into public.verse_seed_ids as UNCHECKED
//              (checked_at NULL). Requires migration 124 applied. Never marks
//              anything checked - that is a separate owner-confirmed step.
//
// Usage:
//   node scripts/verse/01-seed-candidates.mjs [truthDir] [outMd]
//   node scripts/verse/01-seed-candidates.mjs --apply
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED_JSON = join(HERE, 'seed-candidates.json'); // committed source of truth

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes('--apply');
const CONFIRM = ARGS.includes('--confirm'); // mark seeds checked (owner-approved)

// ---- MusicBrainz fallback MBIDs (W0 finding: 2/30 fail the naive query but
// exist; these are the human-verified correct artist MBIDs). ----
const MB_FALLBACK = {
  'g-i-dle': { mbid: '0068ae6c-7156-40f9-a81f-39294af6a549', name: 'i-dle', note: 'MB fallback: parentheses broke the naive query' },
  'kep1er':  { mbid: '187da628-d21a-4e0f-a93c-456c97a2c032', name: 'Kep1er', note: 'MB fallback: transient 503 during spike' },
};
// MusicBrainz overrides: force-replace an auto-resolved MBID with a human-verified
// one. NCT auto-resolved to the 127 UNIT; owner confirmed the umbrella MBID (the
// units 127/Dream/etc are modeled as group_units by the backfill).
const MB_OVERRIDE = {
  'nct': { mbid: '9c15986d-ff1f-4d91-9708-f50f7445884f', name: 'NCT', note: 'umbrella NCT (owner-confirmed); 127/Dream/U/Wish are units' },
};
// Trap / caveat flags the owner must eyeball.
const TRAP = {
  'txt': 'WIKIDATA LABEL VANDALIZED at audit time ("Tacos de asada y cebollin"). QID is correct; our name stays canonical.',
  'fifty-fifty': 'Wikidata auto-picked wrong item ("1:1"); QID corrected by hand.',
  'hwasa': 'Solo artist (Wikidata person entity), not a group.',
  'jennie': 'Solo artist (Wikidata person entity), not a group.',
  'taeyeon': 'Solo artist (Wikidata person entity), not a group.',
};

function loadSpike() {
  const dir = ARGS.find(a => !a.startsWith('--')) ||
    '/private/tmp/claude-501/-Users-louis-IT-Dev-projects-Bloom/a151441b-ed09-4d25-bff5-4da2936191ac/scratchpad';
  const truth = JSON.parse(readFileSync(join(dir, 'w0-truth.json'), 'utf8'));
  const wd = JSON.parse(readFileSync(join(dir, 'w0-wikidata.json'), 'utf8'));
  const mb = JSON.parse(readFileSync(join(dir, 'w0-musicbrainz.json'), 'utf8'));
  return { truth, wd, mb };
}

function buildCandidates() {
  const { truth, wd, mb } = loadSpike();
  const flagship = new Set(truth.flagship.map(g => g.slug));
  const wdBy = Object.fromEntries(wd.resolution.map(r => [r.slug, r]));
  const mbBy = Object.fromEntries(mb.resolution.map(r => [r.slug, r]));

  const rows = truth.audit.map(g => {
    const w = wdBy[g.slug] || {};
    let m = mbBy[g.slug] || {};
    let mbNote = null;
    if (!m.mbid && MB_FALLBACK[g.slug]) {
      const f = MB_FALLBACK[g.slug];
      m = { mbid: f.mbid, mbName: f.name, type: 'Group' };
      mbNote = f.note;
    }
    if (MB_OVERRIDE[g.slug]) {
      const o = MB_OVERRIDE[g.slug];
      m = { mbid: o.mbid, mbName: o.name, type: 'Group' };
      mbNote = o.note;
    }
    // Overall confidence: downgrade if either side is weak or a trap applies.
    const wConf = w.confidence || 'FAILED';
    const weak = ['AMBIGUOUS', 'UNVERIFIED', 'MEDIUM', 'FAILED'].includes(wConf) || !m.mbid || TRAP[g.slug];
    const confidence = TRAP[g.slug] ? 'REVIEW' : (weak ? 'MEDIUM' : 'HIGH');
    return {
      group_id: g.id,
      slug: g.slug,
      name: g.name,                       // OUR canonical name (never overwritten)
      tier: flagship.has(g.slug) ? 'flagship' : 'long-tail',
      wikidata_qid: w.qid || null,
      wikidata_label: w.label || null,    // AS FETCHED (vandalism check)
      wikidata_confidence: wConf,
      musicbrainz_mbid: m.mbid || null,
      musicbrainz_name: m.mbName || null, // AS FETCHED (mis-pick check)
      confidence,
      flags: [TRAP[g.slug], mbNote].filter(Boolean).join(' | ') || null,
    };
  });
  // flagship first, then long-tail, stable by slug.
  rows.sort((a, b) => (a.tier === b.tier ? a.slug.localeCompare(b.slug) : a.tier === 'flagship' ? -1 : 1));
  return rows;
}

function renderTable(rows, tier) {
  const r = rows.filter(x => x.tier === tier);
  let out = `\n### ${tier === 'flagship' ? 'FLAGSHIP 20 (owner reviews these first)' : 'LONG-TAIL 10'}\n\n`;
  out += '| Group (ours) | Wikidata QID | WD label AS FETCHED | MBID | MB name AS FETCHED | Conf | Flags |\n';
  out += '|---|---|---|---|---|---|---|\n';
  for (const x of r) {
    out += `| ${x.name} | ${x.wikidata_qid || '-'} | ${x.wikidata_label || '-'} | ${x.musicbrainz_mbid ? x.musicbrainz_mbid.slice(0, 8) + '...' : '-'} | ${x.musicbrainz_name || '-'} | ${x.confidence} | ${x.flags || ''} |\n`;
  }
  return out;
}

// ---- shared service-role client (hand-parses repo-root .env.local) ----
let _db;
async function dbClient() {
  if (_db) return _db;
  const { createClient } = await import('@supabase/supabase-js');
  // apps/quiz/.env.local = the prod project (rdkgouofyt) with our data + migration
  // 124. Overridable via QUIZ_ENV.
  const envPath = process.env.QUIZ_ENV || '/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/.env.local';
  const env = Object.fromEntries(readFileSync(envPath, 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
  _db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  return _db;
}

// ---- APPLY mode: upsert into verse_seed_ids as UNCHECKED ----
async function apply() {
  const db = await dbClient();
  const rows = JSON.parse(readFileSync(SEED_JSON, 'utf8'));
  let ok = 0;
  for (const r of rows) {
    const conf = ({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', REVIEW: 'AMBIGUOUS' })[r.confidence] || 'MEDIUM';
    const { error } = await db.from('verse_seed_ids').upsert({
      group_id: r.group_id,
      wikidata_qid: r.wikidata_qid,
      wikidata_label: r.wikidata_label,
      musicbrainz_mbid: r.musicbrainz_mbid,
      musicbrainz_name: r.musicbrainz_name,
      confidence: conf,
      notes: r.flags,
      checked_by: null,     // UNCHECKED - ingestion is gated until owner confirms
      checked_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'group_id' });
    if (error) console.error('  upsert err', r.slug, error.message); else ok++;
  }
  console.log(`Upserted ${ok}/${rows.length} seed rows as UNCHECKED. Owner must review + confirm before ingestion.`);
}

async function confirmChecked() {
  const db = await dbClient();
  const { data, error } = await db.from('verse_seed_ids')
    .update({ checked_by: 'owner', checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .is('checked_at', null)
    .select('group_id');
  if (error) { console.error('confirm err', error.message); return; }
  console.log(`Marked ${data.length} seed rows CHECKED (checked_by=owner). Ingestion is now unblocked for them.`);
}

if (CONFIRM) {
  await confirmChecked();
} else if (APPLY) {
  await apply();
} else {
  const rows = buildCandidates();
  writeFileSync(SEED_JSON, JSON.stringify(rows, null, 2));
  const md = '# Verse seed-list review (W1.2)\n' +
    '\nOwner: eyeball the two "AS FETCHED" columns. Our `name` column is canonical\n' +
    'and is never overwritten by ingestion; these QIDs/MBIDs only decide WHERE we\n' +
    'read open-data facts from. Confirm the flagship 20 before any backfill runs.\n' +
    renderTable(rows, 'flagship') + renderTable(rows, 'long-tail');
  const outMd = ARGS[1] || join(HERE, 'seed-review.md');
  writeFileSync(outMd, md);
  console.log(md);
  console.log(`\nwrote ${SEED_JSON} (committed) and ${outMd}`);
}
