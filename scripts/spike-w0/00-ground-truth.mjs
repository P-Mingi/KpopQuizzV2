// W0 spike - export ground-truth from OUR DB for the coverage cross-check.
// Read-only. Writes JSON to the scratchpad for the Wikidata/MusicBrainz scripts.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const ENV = process.env.QUIZ_ENV || '/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/.env.local';
const env = Object.fromEntries(readFileSync(ENV,'utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OUT = process.argv[2];

const FLAGSHIP = ['bts','blackpink','stray-kids','twice','aespa','newjeans','seventeen','ive','txt','enhypen','le-sserafim','itzy','nct','exo','red-velvet','g-i-dle','ateez','nmixx','riize','babymonster'];

const { data: groups } = await db.from('groups').select('id,name,slug,generation,fandom_name,is_custom,needs_review');
const all = (groups||[]).filter(g=>g.slug!=='general-kpop');
// Flagship = the 20 by slug directly (they are real launch groups regardless of
// our internal curation flags, e.g. BABYMONSTER carries needs_review).
const flagship = FLAGSHIP.map(s => all.find(g=>g.slug===s)).filter(Boolean);
// Long-tail sample from the clean, non-flagship remainder.
const rest = all.filter(g=>!g.is_custom && !g.needs_review && !FLAGSHIP.includes(g.slug));
// deterministic "random 10" from the long tail: even spread by sorted slug, every Nth
rest.sort((a,b)=>a.slug.localeCompare(b.slug));
const step = Math.max(1, Math.floor(rest.length/10));
const sample10 = [];
for (let i=0; i<rest.length && sample10.length<10; i+=step) sample10.push(rest[i]);
const audit = [...flagship, ...sample10];

// rosters (ground truth for members)
const { data: nag } = await db.from('games').select('group_id,content').eq('game_type','name_all_members').eq('status','published');
const rosterByGroup = {};
for (const row of (nag||[])) {
  const members = Array.isArray(row.content?.members) ? row.content.members.map(m=>m?.name).filter(Boolean) : [];
  if (members.length) rosterByGroup[row.group_id] = members;
}

// 100-song sample for MusicBrainz matching
let songs=[], from=0;
while(true){ const {data}=await db.from('songs').select('title,artist_name,group_id').eq('status','active').not('group_id','is',null).range(from,from+999); if(!data||!data.length)break; songs.push(...data); if(data.length<1000)break; from+=1000; }
// deterministic sample of 100 spread across the list
const songStep = Math.max(1, Math.floor(songs.length/100));
const songSample = [];
for (let i=0;i<songs.length && songSample.length<100;i+=songStep) songSample.push(songs[i]);

const out = {
  generatedNote: 'W0 ground truth from our DB (read-only)',
  flagship: flagship.map(g=>({id:g.id,name:g.name,slug:g.slug,generation:g.generation,fandom_name:g.fandom_name,roster:rosterByGroup[g.id]||null})),
  sample10: sample10.map(g=>({id:g.id,name:g.name,slug:g.slug,generation:g.generation,fandom_name:g.fandom_name,roster:rosterByGroup[g.id]||null})),
  audit: audit.map(g=>({id:g.id,name:g.name,slug:g.slug,fandom_name:g.fandom_name,roster:rosterByGroup[g.id]||null})),
  songSample,
  totals: { totalGroups: all.length, longTailPool: rest.length, totalSongsWithGroup: songs.length, rostersAvailable: Object.keys(rosterByGroup).length },
};
writeFileSync(OUT, JSON.stringify(out,null,2));
console.log('flagship:', flagship.length, '| sample10:', sample10.map(g=>g.slug).join(','));
console.log('rosters available:', out.totals.rostersAvailable, '| songs w/ group:', songs.length, '| song sample:', songSample.length);
console.log('wrote', OUT);
