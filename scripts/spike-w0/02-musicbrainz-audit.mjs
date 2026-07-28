// W0.2 - MusicBrainz coverage audit (READ-ONLY spike).
// Source: musicbrainz.org/ws/2 JSON API. Etiquette followed strictly:
//   - descriptive User-Agent with contact (required)
//   - <= 1 request/second (we pace at 1100ms; single-threaded)
//   See https://musicbrainz.org/doc/MusicBrainz_API and
//       https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
// Licensing: MusicBrainz CORE data (artists, release groups, recordings, dates)
// is public domain / CC0. See https://musicbrainz.org/doc/About/Data_License
// No website scraping; API only.
import { readFileSync, writeFileSync } from 'fs';

const TRUTH = process.argv[2];
const OUT   = process.argv[3];
const truth = JSON.parse(readFileSync(TRUTH, 'utf8'));

const UA = 'KpopQuizVerse-W0-Spike/1.0 ( kaspermaiden@gmail.com )';
const BASE = 'https://musicbrainz.org/ws/2';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PACE = 1100; // ms between requests (>1s to stay polite)

let reqCount = 0;
async function mb(path) {
  reqCount++;
  const url = `${BASE}/${path}${path.includes('?') ? '&' : '?'}fmt=json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
    if (r.status === 503) { await sleep(2000); continue; } // rate-limit backoff
    if (!r.ok) throw new Error(`MB ${r.status} ${path}`);
    await sleep(PACE);
    return r.json();
  }
  throw new Error(`MB retries exhausted ${path}`);
}

// Search aliases for hard names.
const ALIAS = {
  'g-i-dle': '(G)I-DLE',
  'txt': 'TOMORROW X TOGETHER',
  'le-sserafim': 'LE SSERAFIM',
  'fifty-fifty': 'FIFTY FIFTY',
  'nct': 'NCT',
  'nct-dream': 'NCT DREAM',
};

function pickArtist(cands, name) {
  if (!cands || !cands.length) return null;
  const isKR = a => (a.area?.name || a['begin-area']?.name || '').match(/korea/i) ||
                    (a.country === 'KR') ||
                    (a.tags || []).some(t => /k-pop|kpop/i.test(t.name));
  // Prefer Group type + Korea + high score.
  const scored = cands.map(a => ({
    a, s: (a.type === 'Group' ? 2 : 0) + (isKR(a) ? 2 : 0) + (a.score ? a.score/100 : 0),
  })).sort((x, y) => y.s - x.s);
  return scored[0].a;
}

// ---- resolve artist MBIDs ----
const audit = truth.audit;
console.log(`Resolving ${audit.length} artists on MusicBrainz (1 req/sec, be patient)...`);
const artists = [];
for (const g of audit) {
  const q = ALIAS[g.slug] || g.name;
  let cands = [];
  try { const j = await mb(`artist/?query=${encodeURIComponent('artist:"' + q + '"')}&limit=6`); cands = j.artists || []; }
  catch (e) { console.log('  search err', g.slug, e.message); }
  const best = pickArtist(cands, q);
  artists.push({ slug: g.slug, name: g.name, mbid: best?.id || null, mbName: best?.name || null,
    type: best?.type || null, area: best?.area?.name || best?.country || null, score: best?.score || null,
    disambiguation: best?.disambiguation || null });
  console.log(`  ${g.slug.padEnd(14)} -> ${best?.id ? best.id.slice(0,8) : 'FAIL'} [${best?.type||'?'}] ${best?.name||''} ${best?.disambiguation? '('+best.disambiguation+')':''}`);
}

// ---- per-artist release-group discography ----
const KR = /(korean|한국|하이브|대한민국)/i;
const JP = /(japanese|日本|japan)/i;
function langOf(rg) {
  // Heuristic: title script / disambiguation. Refined later for the 3 deep-dives.
  const t = (rg.title || '') + ' ' + (rg.disambiguation || '');
  if (/[぀-ヿ一-鿿]/.test(rg.title) || JP.test(t) || /japanese/i.test(t)) return 'JP-likely';
  return 'KR/other';
}
const withMbid = artists.filter(a => a.mbid);
const disco = [];
for (const a of withMbid) {
  let rgs = [];
  try {
    // all primary types; MB caps limit at 100 per page.
    const j = await mb(`release-group?artist=${a.mbid}&limit=100`);
    rgs = j['release-groups'] || [];
  } catch (e) { console.log('  rg err', a.slug, e.message); }
  const byType = {};
  let withDate = 0, secondaryNoise = 0, jpLikely = 0;
  for (const rg of rgs) {
    const pt = rg['primary-type'] || 'Other';
    byType[pt] = (byType[pt] || 0) + 1;
    if (rg['first-release-date']) withDate++;
    const sec = rg['secondary-types'] || [];
    if (sec.length) secondaryNoise++; // compilation/live/remix/DJ-mix = version noise
    if (langOf(rg) === 'JP-likely') jpLikely++;
  }
  disco.push({ slug: a.slug, name: a.name, mbid: a.mbid, total: rgs.length, byType,
    withDate, datePct: rgs.length ? +(withDate/rgs.length*100).toFixed(0) : 0,
    secondaryNoise, jpLikely });
  console.log(`  ${a.slug.padEnd(14)} RGs=${String(rgs.length).padStart(3)} ${JSON.stringify(byType)} dated=${disco[disco.length-1].datePct}% noise=${secondaryNoise} jp~=${jpLikely}`);
}

// ---- deep-dive: tracklist + KR/JP + reissue noise for 3 flagship groups ----
const DEEP = ['bts', 'twice', 'stray-kids'];
const deepDives = [];
for (const slug of DEEP) {
  const a = withMbid.find(x => x.slug === slug);
  if (!a) continue;
  // fetch albums (primary Album, exclude secondary) with releases to count versions + language.
  let rgs = [];
  try { const j = await mb(`release-group?artist=${a.mbid}&type=album&limit=100`); rgs = j['release-groups'] || []; } catch {}
  let albums = 0, withTracklistSample = 0, krCount = 0, jpCount = 0, reissuePairs = 0, sampleTrack = null;
  for (const rg of rgs.slice(0, 12)) { // sample up to 12 albums to bound requests
    albums++;
    let rel = null;
    try {
      const j = await mb(`release?release-group=${rg.id}&inc=recordings&limit=25`);
      const rels = j.releases || [];
      if (rels.length > 1) reissuePairs++; // multiple releases in one album RG = versions/reissues
      // language/country from releases
      const anyJP = rels.some(x => (x.country === 'JP') || /jpn|japanese/i.test(JSON.stringify(x['text-representation']||{})));
      const anyKR = rels.some(x => (x.country === 'KR') || /kor|korean/i.test(JSON.stringify(x['text-representation']||{})));
      if (anyJP && !anyKR) jpCount++; else krCount++;
      rel = rels[0];
      const tl = rel?.media?.[0]?.tracks;
      if (tl && tl.length) { withTracklistSample++; if (!sampleTrack) sampleTrack = { album: rg.title, tracks: tl.length, first: tl[0]?.title }; }
    } catch (e) { /* skip */ }
  }
  deepDives.push({ slug, mbid: a.mbid, albumsSampled: albums, tracklistPresent: withTracklistSample,
    krAlbums: krCount, jpAlbums: jpCount, reissueMultiReleaseRGs: reissuePairs, sampleTrack });
  console.log(`  DEEP ${slug}: albums~${albums} tracklists=${withTracklistSample} KR=${krCount} JP=${jpCount} multiReleaseRGs=${reissuePairs}`);
}

// ---- 100-song cross-match against our DB catalog ----
console.log('Cross-matching 100 songs (recording search)...');
const norm = s => (s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').trim();
const songSample = truth.songSample.slice(0, 100);
let matched = 0, checked = 0;
const misses = [];
for (const s of songSample) {
  checked++;
  const title = s.title || '';
  const artist = s.artist_name || '';
  let hit = false;
  try {
    const q = `recording:"${title}" AND artist:"${artist}"`;
    const j = await mb(`recording?query=${encodeURIComponent(q)}&limit=3`);
    const recs = j.recordings || [];
    hit = recs.some(r => norm(r.title).includes(norm(title)) || norm(title).includes(norm(r.title)));
  } catch (e) { /* count as miss */ }
  if (hit) matched++; else misses.push(`${artist} - ${title}`);
  if (checked % 20 === 0) console.log(`   ...${checked}/100 matched ${matched}`);
}

const report = {
  generated: 'W0.2 MusicBrainz audit',
  source: { base: BASE, license: 'CC0 / public domain (core data)', policy: 'https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting', dataLicense: 'https://musicbrainz.org/doc/About/Data_License' },
  totalRequests: reqCount,
  resolution: artists,
  discography: disco,
  deepDives,
  songCrossMatch: { checked, matched, matchRatePct: +(matched/checked*100).toFixed(0),
    method: 'recording?query=recording:"title" AND artist:"artist", fuzzy title contains', missesSample: misses.slice(0, 25) },
  summary: {
    resolved: withMbid.length, total: audit.length,
    failed: artists.filter(a => !a.mbid).map(a => a.slug),
    groupType: artists.filter(a => a.type === 'Group').length,
  },
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log('\n=== MUSICBRAINZ SUMMARY ===');
console.log('artists resolved:', withMbid.length, '/', audit.length, '| failed:', report.summary.failed.join(',') || 'none');
console.log('song cross-match:', matched, '/', checked, `(${report.songCrossMatch.matchRatePct}%)`);
console.log('total API requests:', reqCount);
console.log('wrote', OUT);
