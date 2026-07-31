// V-POLISH order 3 - album release-date audit against MusicBrainz, the source
// the provenance rows already cite. For every album with a release-group MBID,
// fetch the group's first-release-date and compare. A mismatch is only flagged
// when MusicBrainz is at least as precise as our value and disagrees on the
// shared precision (a bare "2020" cannot indict "2020-02-21"). With --fix,
// full-date mismatches are corrected in place; the provenance row already
// points at the right MBID, so this makes the value match its cited source.
// Usage: node --env-file=.env.local scripts/audit-album-dates.mjs [--fix]
import process from 'node:process';

if (process.env.NODE_ENV === 'production') { console.error('Not against production env.'); process.exit(1); }
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIX = process.argv.includes('--fix');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',').map(Number)) : null;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const UA = 'KpopVerse/1.0 (kpopquiz.org; kaspermaiden@gmail.com)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let albums = await fetch(`${URL_}/rest/v1/albums?select=id,group_id,title,release_date,musicbrainz_mbid&musicbrainz_mbid=not.is.null&order=id`, { headers: H }).then((r) => r.json());
if (ONLY) albums = albums.filter((a) => ONLY.has(a.id));
console.log(`[dates] auditing ${albums.length} albums with MBIDs against MusicBrainz (1 req/s)`);

const mismatches = [];
let checked = 0;
let mbErrors = 0;
for (const a of albums) {
  await sleep(1100); // MusicBrainz rate law
  let mb;
  try {
    const res = await fetch(`https://musicbrainz.org/ws/2/release-group/${a.musicbrainz_mbid}?fmt=json`, { headers: { 'User-Agent': UA } });
    if (!res.ok) { mbErrors++; console.log(`[dates] MB ${res.status} for ${a.title} (${a.musicbrainz_mbid})`); continue; }
    mb = await res.json();
  } catch (e) { mbErrors++; console.log(`[dates] MB fetch failed for ${a.title}: ${e.message}`); continue; }
  checked++;
  const mbDate = (mb['first-release-date'] ?? '').trim();
  const ours = (a.release_date ?? '').slice(0, 10);
  if (!mbDate) continue;
  // compare at the SHARED precision; flag only when MB is at least as precise
  const prec = Math.min(mbDate.length, ours.length || 10);
  if (!ours) {
    if (mbDate.length === 10) mismatches.push({ ...a, mbDate, kind: 'missing-ours' });
    continue;
  }
  if (mbDate.length >= ours.length && mbDate.slice(0, prec) !== ours.slice(0, prec)) {
    mismatches.push({ ...a, mbDate, kind: 'differs' });
    console.log(`[dates] MISMATCH id=${a.id} "${a.title}": ours=${ours} mb=${mbDate}`);
  }
}

console.log(`[dates] checked=${checked} mbErrors=${mbErrors} mismatches=${mismatches.length}`);
for (const m of mismatches) console.log(`  id=${m.id} group=${m.group_id} "${m.title}" ours=${(m.release_date ?? 'null').slice(0, 10)} mb=${m.mbDate} (${m.kind})`);

if (FIX) {
  let fixed = 0;
  for (const m of mismatches) {
    if (m.mbDate.length !== 10) { console.log(`[dates] skip fix (partial MB date): ${m.title}`); continue; }
    const r = await fetch(`${URL_}/rest/v1/albums?id=eq.${m.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ release_date: m.mbDate }) });
    console.log(`[dates] fix id=${m.id} "${m.title}" -> ${m.mbDate}: ${r.status}`);
    if (r.ok) fixed++;
  }
  console.log(`[dates] fixed=${fixed}`);
}
