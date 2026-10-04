// F6a real-data probe: read-only POST /api/blind-test/generate + anon reads of `songs`.
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = process.argv[3];
const KPDH = [3412534541, 3412534591, 3412534551, 3412534561, 3412534581, 3412534601, 3412534611, 3412534621, 3412534631, 3541756631, 3412534641, 3412534651];
async function songs(ids) {
  const r = await fetch(`${URL_}/rest/v1/songs?select=id,deezer_track_id,year,is_title_track,is_curated,status&id=in.(${ids.join(',')})`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  return r.json();
}
async function gen(playlist, count = 10) {
  const r = await fetch(`${base}/api/blind-test/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playlist, count, mode: 'challenge' }) });
  return { status: r.status, body: await r.json() };
}
const out = { runs: [] };
const plan = (process.argv[4] || 'kpop-legends,title-tracks,kpop-demon-hunters,twice,gg,all').split(',');
for (const p of plan) {
  for (let k = 0; k < 3; k++) {
    const { status, body } = await gen(p, p === 'kpop-demon-hunters' ? 12 : 15);
    if (status !== 200) { out.runs.push({ playlist: p, status, body }); break; }
    const rows = await songs(body.questions.map((q) => q.song_id));
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    let kpdh = 0, kpdhWithCover = 0, other = 0, otherNoCover = 0;
    for (const q of body.questions) {
      const s = byId[q.song_id];
      const has = Boolean(q.album_cover_medium || q.album_cover_big || q.reveal.cover);
      if (KPDH.includes(Number(s?.deezer_track_id))) { kpdh++; if (has) kpdhWithCover++; } else { other++; if (!has) otherNoCover++; }
    }
    out.runs.push({ playlist: p, status, n: body.questions.length, kpdh, kpdhWithCover, other, otherNoCover,
      years: [...new Set(rows.map((r) => r.year))].sort(), titleTrack: [...new Set(rows.map((r) => r.is_title_track))], curated: [...new Set(rows.map((r) => r.is_curated))] });
  }
}
console.log(JSON.stringify(out, null, 1));
