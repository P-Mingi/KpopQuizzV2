import {readFileSync,writeFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(make)=>{const out=[];for(let f=0;;f+=1000){const {data,error}=await make().range(f,f+999);if(error)throw new Error(error.message);const rows=data??[];out.push(...rows);if(rows.length<1000)break;}return out;};
const O=[];const say=(s='')=>O.push(s);

const FLOOR_GROUP=100, FLOOR_QUIZ=50, FLOOR_MATCHUP=100;

const plays=await page(()=>db.from('plays').select('quiz_id,score,total_questions,player_id,created_at'));
const quizzes=await page(()=>db.from('quizzes').select('id,group_id,title,slug,difficulty,status,question_count'));
const groups=await page(()=>db.from('groups').select('id,name,slug,generation'));
const songs=await page(()=>db.from('songs').select('group_id,gender'));
const qById=new Map(quizzes.map(q=>[q.id,q])), gById=new Map(groups.map(g=>[g.id,g]));
const genderByGroup=new Map();
{const m=new Map();songs.forEach(s=>{if(s.group_id==null)return;if(!m.has(s.group_id))m.set(s.group_id,new Set());m.get(s.group_id).add(s.gender);});
 for(const [gid,set] of m){const v=[...set].filter(Boolean);if(v.length===1)genderByGroup.set(gid,v[0]);}}
const valid=plays.filter(p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions);

const pct=(num,den)=>den?(100*num/den):0;
const agg=()=>({n:0,s:0,t:0});
const add=(a,p)=>{a.n++;a.s+=p.score;a.t+=p.total_questions;};

// ---- B: per group
const byGroup=new Map();
for(const p of valid){const q=qById.get(p.quiz_id); if(!q||q.group_id==null)continue;
  if(!byGroup.has(q.group_id))byGroup.set(q.group_id,agg()); add(byGroup.get(q.group_id),p);}
const groupRows=[...byGroup].map(([gid,a])=>({slug:gById.get(gid)?.slug??`id:${gid}`,name:gById.get(gid)?.name??'?',gen:gById.get(gid)?.generation??null,gender:genderByGroup.get(gid)??null,plays:a.n,scorePct:pct(a.s,a.t)}));
const above=groupRows.filter(g=>g.plays>=FLOOR_GROUP), below=groupRows.filter(g=>g.plays<FLOOR_GROUP);
say('## B. PER GROUP (usable plays; percentage = SUM(score)/SUM(total_questions))');
say(`floor = ${FLOOR_GROUP} usable plays. above floor: ${above.length}, below floor: ${below.length}`);
say('\n### ranked by score, above floor');
[...above].sort((a,b)=>b.scorePct-a.scorePct).forEach((g,i)=>say(`${String(i+1).padStart(2)}. ${g.slug.padEnd(16)} ${g.scorePct.toFixed(1).padStart(5)}%  n=${String(g.plays).padStart(6)}  gen=${g.gen??'-'}  gender=${g.gender??'-'}`));
say('\n### ranked by plays, above floor');
[...above].sort((a,b)=>b.plays-a.plays).forEach((g,i)=>say(`${String(i+1).padStart(2)}. ${g.slug.padEnd(16)} n=${String(g.plays).padStart(6)}  ${g.scorePct.toFixed(1).padStart(5)}%`));
say('\n### BELOW FLOOR (listed, never ranked)');
below.sort((a,b)=>b.plays-a.plays).forEach(g=>say(`   ${g.slug.padEnd(16)} n=${String(g.plays).padStart(5)}  ${g.scorePct.toFixed(1)}%`));
// correlation plays vs score
const A=above.map(g=>[Math.log10(g.plays),g.scorePct]);
const mx=A.reduce((s,x)=>s+x[0],0)/A.length, my=A.reduce((s,x)=>s+x[1],0)/A.length;
const cov=A.reduce((s,x)=>s+(x[0]-mx)*(x[1]-my),0);
const sx=Math.sqrt(A.reduce((s,x)=>s+(x[0]-mx)**2,0)), sy=Math.sqrt(A.reduce((s,x)=>s+(x[1]-my)**2,0));
say(`\nPearson r between log10(plays) and score%, above floor, n=${A.length}: ${(cov/(sx*sy)).toFixed(3)}`);

// ---- C: per quiz
const byQuiz=new Map();
for(const p of valid){if(!p.quiz_id)continue; if(!byQuiz.has(p.quiz_id))byQuiz.set(p.quiz_id,agg()); add(byQuiz.get(p.quiz_id),p);}
const quizRows=[...byQuiz].map(([id,a])=>{const q=qById.get(id);return{slug:q?.slug??id,title:q?.title??'?',status:q?.status,diff:q?.difficulty,plays:a.n,scorePct:pct(a.s,a.t)};}).filter(q=>q.status==='published');
const qAbove=quizRows.filter(q=>q.plays>=FLOOR_QUIZ);
say(`\n## C. PER QUIZ (published only). floor = ${FLOOR_QUIZ} usable plays. above: ${qAbove.length} of ${quizRows.length}`);
say('\n### 15 LOWEST scoring, above floor');
[...qAbove].sort((a,b)=>a.scorePct-b.scorePct).slice(0,15).forEach((q,i)=>say(`${String(i+1).padStart(2)}. ${q.scorePct.toFixed(1).padStart(5)}%  n=${String(q.plays).padStart(5)}  [${q.diff}] ${q.title.slice(0,60)}`));
say('\n### 15 HIGHEST scoring, above floor');
[...qAbove].sort((a,b)=>b.scorePct-a.scorePct).slice(0,15).forEach((q,i)=>say(`${String(i+1).padStart(2)}. ${q.scorePct.toFixed(1).padStart(5)}%  n=${String(q.plays).padStart(5)}  [${q.diff}] ${q.title.slice(0,60)}`));

// ---- D: gender
say('\n## D. GIRL GROUPS vs BOY GROUPS (gender DERIVED from songs.gender, see notes)');
for(const kind of ['gg','bg']){
  const gs=above.filter(g=>g.gender===kind);
  const tot=gs.reduce((s,g)=>s+g.plays,0);
  const num=[...byGroup].filter(([gid])=>genderByGroup.get(gid)===kind&&(byGroup.get(gid).n>=FLOOR_GROUP));
  const S=num.reduce((s,[,a])=>s+a.s,0), T=num.reduce((s,[,a])=>s+a.t,0);
  const qCount=quizzes.filter(q=>q.status==='published'&&genderByGroup.get(q.group_id)===kind).length;
  const dmix={}; quizzes.filter(q=>q.status==='published'&&genderByGroup.get(q.group_id)===kind).forEach(q=>dmix[q.difficulty]=(dmix[q.difficulty]||0)+1);
  say(`${kind}: groups above floor=${gs.length}  plays=${tot}  score=${pct(S,T).toFixed(1)}%  published quizzes=${qCount}  difficulty mix=${JSON.stringify(dmix)}`);
}
say('other gender values present on groups above floor: '+JSON.stringify([...new Set(above.map(g=>g.gender))]));

// ---- E: generations
say('\n## E. GENERATIONS (groups.generation, real column)');
const byGen=new Map();
for(const [gid,a] of byGroup){const gen=gById.get(gid)?.generation??null; const k=gen??'(not recorded)';
  if(!byGen.has(k))byGen.set(k,{n:0,s:0,t:0,groups:0}); const x=byGen.get(k); x.n+=a.n;x.s+=a.s;x.t+=a.t;x.groups++;}
[...byGen].sort().forEach(([k,x])=>say(`${k.padEnd(16)} groups=${String(x.groups).padStart(2)}  plays=${String(x.n).padStart(6)}  score=${pct(x.s,x.t).toFixed(1)}%`));

// ---- F: duels
const votes=await page(()=>db.from('duel_votes').select('question_id,voter_hash,winner_id,option_a_id,option_b_id'));
const dq=await page(()=>db.from('duel_questions').select('id,group_slug,question_type,prompt,min_votes'));
const dr=await page(()=>db.from('duel_ratings').select('question_id,entity_id,entity_name,wins,losses'));
say('\n## F. DUEL VOTES  ** COLOUR ONLY **');
say(`total votes: ${votes.length}`);
say(`distinct voter_hash: ${new Set(votes.map(v=>v.voter_hash)).size}`);
say(`votes per voter (mean): ${(votes.length/new Set(votes.map(v=>v.voter_hash)).size).toFixed(1)}`);
const pairs=new Map();
for(const v of votes){const a=[v.option_a_id,v.option_b_id].sort().join('|');const k=v.question_id+'::'+a;
  if(!pairs.has(k))pairs.set(k,{n:0,w:new Map(),q:v.question_id,ids:a});const p=pairs.get(k);p.n++;p.w.set(v.winner_id,(p.w.get(v.winner_id)||0)+1);}
const nameById=new Map(dr.map(d=>[d.entity_id,d.entity_name]));
const mAbove=[...pairs.values()].filter(p=>p.n>=FLOOR_MATCHUP).map(p=>{const c=[...p.w.values()].sort((a,b)=>b-a);const share=c[0]/p.n;
  const [x,y]=p.ids.split('|');return{n:p.n,share,label:`${nameById.get(x)??x} vs ${nameById.get(y)??y}`};});
say(`matchups with >= ${FLOOR_MATCHUP} votes: ${mAbove.length} of ${pairs.size}`);
say('\n### 10 most lopsided (winner share of that matchup)');
[...mAbove].sort((a,b)=>b.share-a.share).slice(0,10).forEach((m,i)=>say(`${String(i+1).padStart(2)}. ${(100*m.share).toFixed(1)}%  n=${String(m.n).padStart(4)}  ${m.label.slice(0,60)}`));
say('\n### 10 most contested (closest to 50%)');
[...mAbove].sort((a,b)=>a.share-b.share).slice(0,10).forEach((m,i)=>say(`${String(i+1).padStart(2)}. ${(100*m.share).toFixed(1)}%  n=${String(m.n).padStart(4)}  ${m.label.slice(0,60)}`));

// ---- G extras
say('\n## G. EXTRAS');
const byDiff=new Map();
for(const p of valid){const q=qById.get(p.quiz_id); if(!q||q.status!=='published')continue; const k=q.difficulty??'(null)';
  if(!byDiff.has(k))byDiff.set(k,agg()); add(byDiff.get(k),p);}
say('score by the quiz difficulty LABEL (published):');
[...byDiff].forEach(([k,a])=>say(`  ${String(k).padEnd(8)} plays=${String(a.n).padStart(6)}  score=${pct(a.s,a.t).toFixed(1)}%`));
const si={n:0,s:0,t:0},an={n:0,s:0,t:0};
for(const p of valid){const x=p.player_id?si:an;x.n++;x.s+=p.score;x.t+=p.total_questions;}
say(`signed-in plays: n=${si.n} score=${pct(si.s,si.t).toFixed(1)}%`);
say(`anonymous plays: n=${an.n} score=${pct(an.s,an.t).toFixed(1)}%`);
const byMonth=new Map();
for(const p of valid){const m=p.created_at.slice(0,7); if(!byMonth.has(m))byMonth.set(m,agg()); add(byMonth.get(m),p);}
say('plays and score by month:');
[...byMonth].sort().forEach(([m,a])=>say(`  ${m}  plays=${String(a.n).padStart(6)}  score=${pct(a.s,a.t).toFixed(1)}%`));
const lenB=new Map();
for(const p of valid){const k=p.total_questions; if(!lenB.has(k))lenB.set(k,agg()); add(lenB.get(k),p);}
say('score by quiz length (total_questions), lengths with >=200 plays:');
[...lenB].sort((a,b)=>a[0]-b[0]).filter(([,a])=>a.n>=200).forEach(([k,a])=>say(`  ${String(k).padStart(3)} questions  plays=${String(a.n).padStart(6)}  score=${pct(a.s,a.t).toFixed(1)}%`));
const perfect=valid.filter(p=>p.score===p.total_questions).length, zero=valid.filter(p=>p.score===0).length;
say(`perfect scores: ${perfect} (${pct(perfect,valid.length).toFixed(1)}% of ${valid.length})`);
say(`zero scores   : ${zero} (${pct(zero,valid.length).toFixed(1)}%)`);
writeFileSync('/tmp/w5_full.txt',O.join('\n'));
console.log(O.join('\n'));
