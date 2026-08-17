import {readFileSync,writeFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(m)=>{const o=[];for(let f=0;;f+=1000){const {data,error}=await m().range(f,f+999);if(error)throw new Error(error.message);const rows=data??[];o.push(...rows);if(rows.length<1000)break;}return o;};
const O=[];const say=s=>O.push(s);const pct=(a,b)=>b?100*a/b:0;const R=(x,d=1)=>Number(x).toFixed(d);
const plays=await page(()=>db.from('plays').select('quiz_id,score,total_questions,created_at'));
const quizzes=await page(()=>db.from('quizzes').select('id,group_id,status,difficulty,title'));
const groups=await page(()=>db.from('groups').select('id,slug'));
const songs=await page(()=>db.from('songs').select('group_id,gender'));
const qById=new Map(quizzes.map(q=>[q.id,q])),gById=new Map(groups.map(g=>[g.id,g]));
const gender=new Map();{const m=new Map();songs.forEach(s=>{if(s.group_id==null)return;if(!m.has(s.group_id))m.set(s.group_id,new Set());m.get(s.group_id).add(s.gender);});for(const[g,st]of m){const v=[...st].filter(Boolean);if(v.length===1)gender.set(g,v[0]);}}
const valid=plays.filter(p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions);
const B=valid.filter(p=>p.created_at>='2026-05-01');
// per-quiz aggregate within May-Aug
const agg=new Map();
for(const p of B){const q=qById.get(p.quiz_id);if(!q||q.status!=='published')continue;
  if(!agg.has(p.quiz_id))agg.set(p.quiz_id,{n:0,s:0,t:0});const c=agg.get(p.quiz_id);c.n++;c.s+=p.score;c.t+=p.total_questions;}
const quizRows=[...agg].map(([id,c])=>{const q=qById.get(id);return{id,title:q.title,diff:q.difficulty,gid:q.group_id,
  side:gender.get(q.group_id)??null,n:c.n,pctv:pct(c.s,c.t)};}).filter(x=>x.side==='gg'||x.side==='bg');
const stats=arr=>{const s=[...arr].sort((a,b)=>a-b);const q=p=>s[Math.floor(p*(s.length-1))];
  return {n:s.length,min:s[0],p25:q(0.25),med:q(0.5),p75:q(0.75),max:s[s.length-1]};};

say('# O. THE WITHIN-LABEL TEST (May-Aug, quiz level, gg vs bg)');
say('Unit of analysis is the QUIZ, not the play: each quiz contributes one score, so a');
say('heavily-played quiz cannot carry a side. Score per quiz = SUM(score)/SUM(total_questions)');
say('over that quiz\'s May-Aug plays.');
for(const FLOOR of [50,20,10]){
  say(`\n## floor = ${FLOOR} May-Aug plays per quiz`);
  for(const d of ['medium','easy','hard']){
    const gg=quizRows.filter(x=>x.diff===d&&x.side==='gg'&&x.n>=FLOOR).map(x=>x.pctv);
    const bg=quizRows.filter(x=>x.diff===d&&x.side==='bg'&&x.n>=FLOOR).map(x=>x.pctv);
    if(gg.length===0&&bg.length===0){say(`  ${d.padEnd(7)}: no quizzes on either side at this floor`);continue;}
    const f=a=>`n=${String(a.n).padStart(2)} min=${R(a.min)} p25=${R(a.p25)} med=${R(a.med)} p75=${R(a.p75)} max=${R(a.max)}`;
    const G=gg.length?stats(gg):null, Bb=bg.length?stats(bg):null;
    say(`  ${d.padEnd(7)} gg: ${G?f(G):'NO QUIZZES'}`);
    say(`  ${d.padEnd(7)} bg: ${Bb?f(Bb):'NO QUIZZES'}`);
    if(G&&Bb) say(`  ${d.padEnd(7)} median difference (gg - bg): ${R(G.med-Bb.med)} pt`);
  }
}
say('\n## the medium quizzes themselves (floor 20), so the buckets are auditable');
for(const side of ['gg','bg']){
  const rows=quizRows.filter(x=>x.diff==='medium'&&x.side===side&&x.n>=20).sort((a,b)=>a.pctv-b.pctv);
  say(`\n### ${side} medium, ${rows.length} quizzes`);
  rows.forEach(x=>say(`  ${R(x.pctv).padStart(5)}%  n=${String(x.n).padStart(4)}  ${gById.get(x.gid)?.slug?.padEnd(13)} ${x.title.slice(0,55)}`));
}

// ---------- P. FORMATS
say('\n\n# P. MATCHED FORMATS');
say('RULE: each quiz is assigned to the FIRST matching pattern below, tested in this order');
say('against the lowercased title. A quiz matching nothing is "(unclassified)" and is shown.');
const RULES=[
  ['true-or-false', /true or false|true-or-false|\bt\/f\b/],
  ['members',       /member|who is this|which member|name all|bias(es)?\b/],
  ['discography',   /discograph|album|title track|b-side|deep cut|song quiz|guess the song|name that song|complete the .*title/],
  ['timeline-era',  /timeline|debut|era|which year|came out|generation/],
  ['intruder',      /intruder|non-|odd one|find the/],
  ['photo-visual',  /recogni[sz]e|photo|picture|image|kids\b/],
  ['label-company', /company|label|entertainment|jyp|sm\b|yg\b|hybe/],
  ['lyrics',        /lyric/],
  ['general-fan',   /how well do you know|ultimate|real .*(army|stay|once|blink|carat|engene|moa|atiny)|only real|challenge|fan/],
];
const fmtOf=t=>{const s=t.toLowerCase();for(const [name,re] of RULES) if(re.test(s)) return name; return '(unclassified)';};
const FLOOR=20;
const pool=quizRows.filter(x=>x.n>=FLOOR);
say(`\npool: May-Aug quizzes with >= ${FLOOR} plays whose group has a derived gender: ${pool.length}`);
say('\n## every assignment, so the buckets can be audited');
[...pool].sort((a,b)=>fmtOf(a.title).localeCompare(fmtOf(b.title))||a.side.localeCompare(b.side)).forEach(x=>
  say(`  ${fmtOf(x.title).padEnd(15)} ${x.side} ${R(x.pctv).padStart(5)}% n=${String(x.n).padStart(4)} [${x.diff}] ${x.title.slice(0,52)}`));
say('\n## formats with quizzes on BOTH sides');
const byFmt=new Map();
for(const x of pool){const f=fmtOf(x.title);if(!byFmt.has(f))byFmt.set(f,{gg:[],bg:[]});byFmt.get(f)[x.side].push(x);}
say('format | gg quizzes | gg median | gg plays | bg quizzes | bg median | bg plays | median gap (gg-bg)');
let both=0;
for(const [f,v] of [...byFmt].sort()){
  if(!v.gg.length||!v.bg.length){say(`${f.padEnd(15)} | ONE SIDE ONLY: gg=${v.gg.length} bg=${v.bg.length}`);continue;}
  both++;
  const gm=stats(v.gg.map(x=>x.pctv)), bm=stats(v.bg.map(x=>x.pctv));
  const gp=v.gg.reduce((s,x)=>s+x.n,0), bp=v.bg.reduce((s,x)=>s+x.n,0);
  say(`${f.padEnd(15)} | ${String(v.gg.length).padStart(10)} | ${R(gm.med).padStart(9)} | ${String(gp).padStart(8)} | ${String(v.bg.length).padStart(10)} | ${R(bm.med).padStart(9)} | ${String(bp).padStart(8)} | ${R(gm.med-bm.med).padStart(6)} pt`);
}
say(`formats with quizzes on both sides: ${both} of ${byFmt.size}`);
const dirs=[...byFmt].filter(([,v])=>v.gg.length&&v.bg.length).map(([f,v])=>({f,d:stats(v.gg.map(x=>x.pctv)).med-stats(v.bg.map(x=>x.pctv)).med}));
say(`of those, gg median above bg median in: ${dirs.filter(x=>x.d>0).length}; bg above gg in: ${dirs.filter(x=>x.d<0).length}; tied: ${dirs.filter(x=>x.d===0).length}`);

// ---------- Q. catalogue unevenness
say('\n\n# Q. CATALOGUE UNEVENNESS PER GROUP (May-Aug)');
const pubByGroup=new Map();
for(const q of quizzes.filter(q=>q.status==='published')) if(q.group_id!=null) pubByGroup.set(q.group_id,(pubByGroup.get(q.group_id)||0)+1);
const playByGroup=new Map(), easyByGroup=new Map();
for(const p of B){const q=qById.get(p.quiz_id);if(!q||q.group_id==null)continue;
  playByGroup.set(q.group_id,(playByGroup.get(q.group_id)||0)+1);
  if(q.difficulty==='easy') easyByGroup.set(q.group_id,(easyByGroup.get(q.group_id)||0)+1);}
const rows=[...playByGroup].filter(([,n])=>n>=100).map(([gid,n])=>({slug:gById.get(gid)?.slug,side:gender.get(gid)??'-',
  pub:pubByGroup.get(gid)??0,plays:n,easy:easyByGroup.get(gid)??0})).sort((a,b)=>b.plays-a.plays);
say(`groups clearing 100 May-Aug plays: ${rows.length}`);
say('group | side | published quizzes (all time) | May-Aug plays | easy plays | easy share');
rows.forEach(x=>say(`${x.slug.padEnd(14)} | ${x.side} | ${String(x.pub).padStart(3)} | ${String(x.plays).padStart(5)} | ${String(x.easy).padStart(5)} | ${R(pct(x.easy,x.plays)).padStart(5)}%`));
const shares=rows.map(x=>pct(x.easy,x.plays));
const st=stats(shares);
say(`\neasy-share across those ${rows.length} groups: min=${R(st.min)}% p25=${R(st.p25)}% median=${R(st.med)}% p75=${R(st.p75)}% max=${R(st.max)}%`);
say(`range = ${R(st.max-st.min)} percentage points`);
const pubs=rows.map(x=>x.pub); const sp=stats(pubs);
say(`published quizzes across those groups: min=${sp.min} median=${sp.med} max=${sp.max}`);
writeFileSync('/tmp/w5o.txt',O.join('\n'));
console.log(O.join('\n'));
