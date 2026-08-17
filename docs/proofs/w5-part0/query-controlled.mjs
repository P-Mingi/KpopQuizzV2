import {readFileSync,writeFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(m)=>{const o=[];for(let f=0;;f+=1000){const {data}=await m().range(f,f+999);const rows=data??[];o.push(...rows);if(rows.length<1000)break;}return o;};
const O=[];const say=s=>{O.push(s);console.log(s);};
const plays=await page(()=>db.from('plays').select('quiz_id,score,total_questions'));
const quizzes=await page(()=>db.from('quizzes').select('id,group_id,status,difficulty'));
const groups=await page(()=>db.from('groups').select('id,slug'));
const songs=await page(()=>db.from('songs').select('group_id,gender'));
const qById=new Map(quizzes.map(q=>[q.id,q])),gById=new Map(groups.map(g=>[g.id,g]));
const genderByGroup=new Map();{const m=new Map();songs.forEach(s=>{if(s.group_id==null)return;if(!m.has(s.group_id))m.set(s.group_id,new Set());m.get(s.group_id).add(s.gender);});for(const[g,s]of m){const v=[...s].filter(Boolean);if(v.length===1)genderByGroup.set(g,v[0]);}}
const valid=plays.filter(p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions);
const pct=(a,b)=>b?100*a/b:0;
const byGroup=new Map();
for(const p of valid){const q=qById.get(p.quiz_id);if(!q||q.group_id==null)continue;if(!byGroup.has(q.group_id))byGroup.set(q.group_id,{n:0,s:0,t:0});const a=byGroup.get(q.group_id);a.n++;a.s+=p.score;a.t+=p.total_questions;}
const above=[...byGroup].filter(([,a])=>a.n>=100).map(([gid,a])=>({slug:gById.get(gid)?.slug,plays:a.n,pctv:pct(a.s,a.t)}));
const rOf=A=>{const mx=A.reduce((s,x)=>s+x[0],0)/A.length,my=A.reduce((s,x)=>s+x[1],0)/A.length;
 const cov=A.reduce((s,x)=>s+(x[0]-mx)*(x[1]-my),0),sx=Math.sqrt(A.reduce((s,x)=>s+(x[0]-mx)**2,0)),sy=Math.sqrt(A.reduce((s,x)=>s+(x[1]-my)**2,0));return cov/(sx*sy);};
say('## B3-bis. correlation log10(plays) vs score%, above floor');
say(`  all 27 groups            : r = ${rOf(above.map(g=>[Math.log10(g.plays),g.pctv])).toFixed(3)}`);
const noGk=above.filter(g=>g.slug!=='general-kpop');
say(`  26 groups, no general-kpop: r = ${rOf(noGk.map(g=>[Math.log10(g.plays),g.pctv])).toFixed(3)}`);

say('\n## D-bis. GIRL vs BOY, CONTROLLED FOR DIFFICULTY (per-difficulty pooled score)');
const cell=new Map();
for(const p of valid){const q=qById.get(p.quiz_id);if(!q||q.status!=='published')continue;
  const gd=genderByGroup.get(q.group_id);if(gd!=='gg'&&gd!=='bg')continue;
  const k=gd+'|'+(q.difficulty??'null');if(!cell.has(k))cell.set(k,{n:0,s:0,t:0});const a=cell.get(k);a.n++;a.s+=p.score;a.t+=p.total_questions;}
say('difficulty | gg score (n) | bg score (n) | gap (gg - bg)');
const totals={gg:{s:0,t:0,n:0},bg:{s:0,t:0,n:0}};
for(const d of ['easy','medium','hard']){
  const g=cell.get('gg|'+d)??{n:0,s:0,t:0}, b=cell.get('bg|'+d)??{n:0,s:0,t:0};
  say(`  ${d.padEnd(7)} | ${pct(g.s,g.t).toFixed(1)}% (${g.n}) | ${pct(b.s,b.t).toFixed(1)}% (${b.n}) | ${(pct(g.s,g.t)-pct(b.s,b.t)).toFixed(1)} pt`);
  totals.gg.s+=g.s;totals.gg.t+=g.t;totals.gg.n+=g.n;totals.bg.s+=b.s;totals.bg.t+=b.t;totals.bg.n+=b.n;
}
say(`  POOLED  | ${pct(totals.gg.s,totals.gg.t).toFixed(1)}% (${totals.gg.n}) | ${pct(totals.bg.s,totals.bg.t).toFixed(1)}% (${totals.bg.n}) | ${(pct(totals.gg.s,totals.gg.t)-pct(totals.bg.s,totals.bg.t)).toFixed(1)} pt`);
// difficulty-standardised: weight each difficulty by the COMBINED play mix
const wsum=['easy','medium','hard'].reduce((s,d)=>s+((cell.get('gg|'+d)?.n??0)+(cell.get('bg|'+d)?.n??0)),0);
let ggStd=0,bgStd=0;
for(const d of ['easy','medium','hard']){
  const g=cell.get('gg|'+d)??{n:0,s:0,t:0}, b=cell.get('bg|'+d)??{n:0,s:0,t:0};
  const w=(g.n+b.n)/wsum;
  ggStd+=w*pct(g.s,g.t); bgStd+=w*pct(b.s,b.t);
}
say(`\ndirect-standardised to the COMBINED difficulty mix:`);
say(`  gg = ${ggStd.toFixed(1)}%   bg = ${bgStd.toFixed(1)}%   gap = ${(ggStd-bgStd).toFixed(1)} pt`);
writeFileSync('/tmp/w5_d.txt',O.join('\n'));
