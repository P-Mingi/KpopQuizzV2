import {readFileSync,writeFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(m)=>{const o=[];for(let f=0;;f+=1000){const {data,error}=await m().range(f,f+999);if(error)throw new Error(error.message);const rows=data??[];o.push(...rows);if(rows.length<1000)break;}return o;};
const O=[];const say=s=>O.push(s);const pct=(a,b)=>b?100*a/b:0;const R=x=>x.toFixed(1);
const plays=await page(()=>db.from('plays').select('quiz_id,score,total_questions,player_id,created_at,time_taken_seconds'));
const quizzes=await page(()=>db.from('quizzes').select('id,group_id,status,difficulty,created_at,question_count,slug,title'));
const groups=await page(()=>db.from('groups').select('id,slug'));
const songs=await page(()=>db.from('songs').select('group_id,gender'));
const qById=new Map(quizzes.map(q=>[q.id,q])),gById=new Map(groups.map(g=>[g.id,g]));
const gender=new Map();{const m=new Map();songs.forEach(s=>{if(s.group_id==null)return;if(!m.has(s.group_id))m.set(s.group_id,new Set());m.get(s.group_id).add(s.gender);});for(const[g,st]of m){const v=[...st].filter(Boolean);if(v.length===1)gender.set(g,v[0]);}}
const valid=plays.filter(p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions);
const TIERS=['easy','medium','hard'];
const per={'Mar+Apr':valid.filter(p=>p.created_at<'2026-05-01'),'May-Aug':valid.filter(p=>p.created_at>='2026-05-01')};

say('# I3. GIRL vs BOY, BY PERIOD (published quizzes only)');
for(const [label,set] of Object.entries(per)){
  const cell=new Map();const ref={easy:0,medium:0,hard:0};
  for(const p of set){const q=qById.get(p.quiz_id);if(!q||q.status!=='published')continue;
    const g=gender.get(q.group_id);if(g!=='gg'&&g!=='bg')continue;const d=q.difficulty;if(!TIERS.includes(d))continue;
    const k=g+'|'+d;if(!cell.has(k))cell.set(k,{n:0,s:0,t:0});const c=cell.get(k);c.n++;c.s+=p.score;c.t+=p.total_questions;ref[d]++;}
  const tot=TIERS.reduce((s,d)=>s+ref[d],0);
  const pooled=g=>{const S=TIERS.reduce((s,d)=>s+(cell.get(g+'|'+d)?.s??0),0),T=TIERS.reduce((s,d)=>s+(cell.get(g+'|'+d)?.t??0),0),N=TIERS.reduce((s,d)=>s+(cell.get(g+'|'+d)?.n??0),0);return[pct(S,T),N];};
  const std=g=>{const have=TIERS.filter(d=>(cell.get(g+'|'+d)?.n??0)>0);const w=have.reduce((s,d)=>s+ref[d],0);
    return have.reduce((s,d)=>s+(ref[d]/w)*pct(cell.get(g+'|'+d).s,cell.get(g+'|'+d).t),0);};
  const [gp,gn]=pooled('gg'),[bp,bn]=pooled('bg');
  say(`\n${label}: reference play mix easy=${ref.easy} medium=${ref.medium} hard=${ref.hard} (${tot})`);
  say(`  raw          gg ${R(gp)}% (n=${gn})   bg ${R(bp)}% (n=${bn})   gap ${R(gp-bp)} pt`);
  say(`  standardised gg ${R(std('gg'))}%          bg ${R(std('bg'))}%          gap ${R(std('gg')-std('bg'))} pt`);
  for(const d of TIERS){const g=cell.get('gg|'+d),b=cell.get('bg|'+d);
    say(`    ${d.padEnd(7)} gg ${g?R(pct(g.s,g.t))+'% (n='+g.n+')':'-'}   bg ${b?R(pct(b.s,b.t))+'% (n='+b.n+')':'-'}`);}
}

say('\n\n# J. WHAT CHANGED BETWEEN APRIL AND MAY (data only)');
const months=[...new Set(valid.map(p=>p.created_at.slice(0,7)))].sort();
say('\n## J1. per month: plays, score, difficulty mix OF WHAT WAS PLAYED');
say('month | plays | score | easy% | medium% | hard% | unlabelled/other%');
for(const m of months){
  const s=valid.filter(p=>p.created_at.slice(0,7)===m);
  const S=s.reduce((x,p)=>x+p.score,0),T=s.reduce((x,p)=>x+p.total_questions,0);
  const c={easy:0,medium:0,hard:0,other:0};
  s.forEach(p=>{const q=qById.get(p.quiz_id);const d=q?.difficulty;if(TIERS.includes(d))c[d]++;else c.other++;});
  say(`${m} | ${String(s.length).padStart(6)} | ${R(pct(S,T))}% | ${R(pct(c.easy,s.length))} | ${R(pct(c.medium,s.length))} | ${R(pct(c.hard,s.length))} | ${R(pct(c.other,s.length))}`);
}
say('\n## J2. quizzes PUBLISHED per month (by quizzes.created_at) and their difficulty mix');
const qm=new Map();
for(const q of quizzes.filter(q=>q.status==='published')){const m=q.created_at.slice(0,7);if(!qm.has(m))qm.set(m,{n:0,easy:0,medium:0,hard:0});const c=qm.get(m);c.n++;if(TIERS.includes(q.difficulty))c[q.difficulty]++;}
say('month | published | easy | medium | hard');
[...qm].sort().forEach(([m,c])=>say(`${m} | ${String(c.n).padStart(9)} | ${String(c.easy).padStart(4)} | ${String(c.medium).padStart(6)} | ${String(c.hard).padStart(4)}`));
say('\n## J3. per month: signed-in share, plays per distinct signed-in player, perfect/zero share');
say('month | plays | signedIn% | distinct signed-in players | plays per player (signed-in only) | perfect% | zero%');
for(const m of months){
  const s=valid.filter(p=>p.created_at.slice(0,7)===m);
  const si=s.filter(p=>p.player_id);
  const dp=new Set(si.map(p=>p.player_id)).size;
  const perf=s.filter(p=>p.score===p.total_questions).length, zero=s.filter(p=>p.score===0).length;
  say(`${m} | ${String(s.length).padStart(6)} | ${R(pct(si.length,s.length))} | ${String(dp).padStart(5)} | ${dp?R(si.length/dp):'-'} | ${R(pct(perf,s.length))} | ${R(pct(zero,s.length))}`);
}
say('\n## J4. per month: concentration of volume (share of plays on the top N quizzes)');
say('month | plays | distinct quizzes | top1% | top5% | top10% | top20%');
for(const m of months){
  const s=valid.filter(p=>p.created_at.slice(0,7)===m);
  const c=new Map();s.forEach(p=>c.set(p.quiz_id,(c.get(p.quiz_id)||0)+1));
  const sorted=[...c.values()].sort((a,b)=>b-a);
  const share=n=>R(pct(sorted.slice(0,n).reduce((x,y)=>x+y,0),s.length));
  say(`${m} | ${String(s.length).padStart(6)} | ${String(c.size).padStart(4)} | ${share(1)} | ${share(5)} | ${share(10)} | ${share(20)}`);
}
say('\n## J5. per month: quiz length mix and median time taken');
say('month | mean total_questions | median time_taken_seconds | plays with time null');
for(const m of months){
  const s=valid.filter(p=>p.created_at.slice(0,7)===m);
  const mean=s.reduce((x,p)=>x+p.total_questions,0)/s.length;
  const times=s.map(p=>p.time_taken_seconds).filter(t=>t!=null).sort((a,b)=>a-b);
  const med=times.length?times[Math.floor(times.length/2)]:null;
  say(`${m} | ${mean.toFixed(2)} | ${med??'-'} | ${s.length-times.length}`);
}
say('\n## J6. the single most-played quiz per month');
for(const m of months){
  const s=valid.filter(p=>p.created_at.slice(0,7)===m);
  const c=new Map();s.forEach(p=>c.set(p.quiz_id,(c.get(p.quiz_id)||0)+1));
  const [id,n]=[...c].sort((a,b)=>b[1]-a[1])[0];
  const q=qById.get(id);
  const sub=s.filter(p=>p.quiz_id===id);
  say(`${m}: ${n} plays (${R(pct(n,s.length))}% of month) [${q?.difficulty}] ${q?.title?.slice(0,55)} score=${R(pct(sub.reduce((x,p)=>x+p.score,0),sub.reduce((x,p)=>x+p.total_questions,0)))}%`);
}
say('\n## J7. below-floor groups: quiz counts and first/last publish (PART 4.2)');
const byGroupPlays=new Map();
for(const p of valid){const q=qById.get(p.quiz_id);if(!q||q.group_id==null)continue;byGroupPlays.set(q.group_id,(byGroupPlays.get(q.group_id)||0)+1);}
const below=[...byGroupPlays].filter(([,n])=>n<100).sort((a,b)=>b[1]-a[1]);
say('group | plays | published quizzes | difficulty mix | oldest quiz | newest quiz');
for(const [gid,n] of below){
  const qs=quizzes.filter(q=>q.group_id===gid&&q.status==='published');
  const mix=TIERS.map(d=>`${d[0]}${qs.filter(q=>q.difficulty===d).length}`).join(' ');
  const ds=qs.map(q=>q.created_at).sort();
  say(`${(gById.get(gid)?.slug??gid).padEnd(14)} | ${String(n).padStart(5)} | ${String(qs.length).padStart(3)} | ${mix} | ${ds[0]?.slice(0,10)??'-'} | ${ds[ds.length-1]?.slice(0,10)??'-'}`);
}
writeFileSync('/tmp/w5j.txt',O.join('\n'));
console.log(O.join('\n'));
