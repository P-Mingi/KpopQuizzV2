// Workstream T1.5 one-time seed of mv_tracking. Resolves the OFFICIAL YouTube
// video id for each flagship EVERGREEN MV via the Data API (never hand-typed),
// using a max-views heuristic: the official MV is virtually always the
// highest-view result for "<artist> <song>".
//
// Comebacks are deliberately NOT auto-resolved here. A spike showed that
// "latest upload" search (order=date) is dominated by fan reactions, shorts,
// and commentary rather than official MVs, so seeding it would poison the data.
// The comeback calendar is curated by the owner in /admin/industry instead.
// Spotify stays dormant and is not touched.
//
//   npx tsx scripts/seed-industry-mvs.mts resolve   # search + pick + print + write manifest (NO db write)
//   npx tsx scripts/seed-industry-mvs.mts insert    # read manifest, insert evergreens into mv_tracking

import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { createClient } from '@supabase/supabase-js';

const MANIFEST = join(tmpdir(), 'industry_seed_manifest.json');

// Section B (owner-approved): one evergreen flagship MV per group.
const EVERGREENS: Array<{ gid: number; artist: string; song: string }> = [
  { gid: 1, artist: 'BTS', song: 'Dynamite' },
  { gid: 2, artist: 'BLACKPINK', song: 'DDU-DU DDU-DU' },
  { gid: 3, artist: 'Stray Kids', song: "God's Menu" },
  { gid: 4, artist: 'TWICE', song: 'TT' },
  { gid: 5, artist: 'aespa', song: 'Next Level' },
  { gid: 6, artist: 'NewJeans', song: 'Ditto' },
  { gid: 7, artist: 'SEVENTEEN', song: 'Super' },
  { gid: 8, artist: 'EXO', song: 'Love Shot' },
  { gid: 9, artist: '(G)I-DLE', song: 'TOMBOY' },
  { gid: 11, artist: 'LE SSERAFIM', song: 'ANTIFRAGILE' },
  { gid: 13, artist: 'Red Velvet', song: 'Psycho' },
  { gid: 14, artist: 'ATEEZ', song: 'Bouncy' },
  { gid: 15, artist: 'ENHYPEN', song: 'Bite Me' },
  { gid: 16, artist: 'TXT', song: '0X1=LOVESONG' },
  { gid: 17, artist: 'ITZY', song: 'WANNABE' },
  { gid: 18, artist: 'NMIXX', song: 'DASH' },
  { gid: 71, artist: 'RIIZE', song: 'Get A Guitar' },
  { gid: 63, artist: 'BABYMONSTER', song: 'SHEESH' },
  { gid: 10, artist: 'IVE', song: 'LOVE DIVE' },
  { gid: 34, artist: 'NCT 127', song: 'Kick It' },
];

interface Resolved {
  category: 'evergreen';
  gid: number; artist: string; want: string;
  video_id: string; title: string; channel: string; views: number; flag?: string;
}

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const KEY = env.YOUTUBE_API_KEY;
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function search(q: string): Promise<string[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=${encodeURIComponent(q)}&maxResults=6&key=${KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`search ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const j = (await r.json()) as { items?: Array<{ id?: { videoId?: string } }> };
  return (j.items ?? []).map((i) => i.id?.videoId).filter((v): v is string => !!v);
}

interface Detail { id: string; title: string; channel: string; views: number }
async function details(ids: string[]): Promise<Detail[]> {
  if (ids.length === 0) return [];
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(',')}&key=${KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`videos ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const j = (await r.json()) as { items?: Array<{ id: string; snippet?: { title?: string; channelTitle?: string }; statistics?: { viewCount?: string } }> };
  return (j.items ?? []).map((it) => ({ id: it.id, title: it.snippet?.title ?? '', channel: it.snippet?.channelTitle ?? '', views: Number(it.statistics?.viewCount ?? 0) }));
}

async function resolveEvergreen(e: { gid: number; artist: string; song: string }): Promise<Resolved | null> {
  const ds = await details(await search(`${e.artist} ${e.song}`));
  if (ds.length === 0) return null;
  const best = ds.sort((a, b) => b.views - a.views)[0]!; // official MV = highest views
  const titleMatch = norm(best.title).includes(norm(e.song).slice(0, 10));
  return { category: 'evergreen', gid: e.gid, artist: e.artist, want: e.song, video_id: best.id, title: best.title, channel: best.channel, views: best.views, flag: titleMatch ? undefined : 'title-mismatch?' };
}

async function doResolve(): Promise<void> {
  if (!KEY) { console.log('YOUTUBE_API_KEY missing; aborting.'); process.exit(1); }
  const out: Resolved[] = [];
  for (const e of EVERGREENS) {
    try { const r = await resolveEvergreen(e); if (r) out.push(r); else console.log(`  NO RESULT: ${e.artist} ${e.song}`); }
    catch (err) { console.log(`  ERR ${e.artist}: ${(err as Error).message}`); }
    await sleep(200);
  }
  writeFileSync(MANIFEST, JSON.stringify(out, null, 2));
  console.log(`Resolved ${out.length}/${EVERGREENS.length} evergreens -> ${MANIFEST}`);
  for (const r of out) console.log(`  ${r.artist} (${r.want}) -> ${r.video_id} | ${(r.views / 1e6).toFixed(0)}M | ${r.channel}${r.flag ? `  <<${r.flag}>>` : ''}`);
}

async function doInsert(): Promise<void> {
  const rows = (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Resolved[]).filter((r) => r.category === 'evergreen');
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  const payload = rows.map((r) => ({ video_id: r.video_id, title: r.want.slice(0, 200), artist: r.artist, group_id: r.gid, category: 'evergreen' as const, active: true }));
  const { error } = await db.from('mv_tracking').upsert(payload, { onConflict: 'video_id' });
  if (error) { console.log('INSERT ERROR:', error.message); process.exit(1); }
  const { count } = await db.from('mv_tracking').select('id', { count: 'exact', head: true });
  console.log(`Inserted/updated ${payload.length} evergreen MVs. mv_tracking now has ${count} rows.`);
}

const mode = process.argv[2];
if (mode === 'resolve') await doResolve();
else if (mode === 'insert') await doInsert();
else { console.log('usage: seed-industry-mvs.mts resolve|insert'); process.exit(1); }
