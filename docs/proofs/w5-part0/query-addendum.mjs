import {readFileSync,writeFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(make)=>{const out=[];for(let f=0;;f+=1000){const {data,error}=await make().range(f,f+999);if(error)throw new Error(error.message);const rows=data??[];out.push(...rows);if(rows.length<1000)break;}return out;};
const O=[];const say=s=>O.push(s);
const FLOOR_GROUP=100,FLOOR_MATCHUP=100;
const plays=await page(()=>db.from('plays').select('quiz_id,score,total_questions'));
const quizzes=await page(()=>db.from('quizzes').select('id,group_id,status'));
const groups=await page(()=>db.from('groups').select('id,slug,name'));
const qById=new Map(quizzes.map(q=>[q.id,q])),gById=new Map(groups.map(g=>[g.id,g]));
const valid=plays.filter(p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions);
const pct=(a,b)=>b?100*a/b:0;

// two ways of averaging, so the choice is visible
const byGroup=new Map();
for(const p of valid){const q=qById.get(p.quiz_id);if(!q||q.group_id==null)continue;
  if(!byGroup.has(q.group_id))byGroup.set(q.group_id,{n:0,s:0,t:0,pcts:[]});
  const a=byGroup.get(q.group_id);a.n++;a.s+=p.score;a.t+=p.total_questions;a.pcts.push(100*p.score/p.total_questions);}
say('## METHOD CHECK: pooled vs mean-of-plays, per group above floor');
say('pooled = SUM(score)/SUM(total_questions). mean = average of each play\'s own percentage.');
const rows=[...byGroup].filter(([,a])=>a.n>=FLOOR_GROUP).map(([gid,a])=>({slug:gById.get(gid)?.slug,n:a.n,pooled:pct(a.s,a.t),mean:a.pcts.reduce((x,y)=>x+y,0)/a.pcts.length}));
rows.sort((x,y)=>y.pooled-x.pooled).forEach(x=>say(`  ${x.slug.padEnd(16)} n=${String(x.n).padStart(6)}  pooled=${x.pooled.toFixed(1)}%  mean=${x.mean.toFixed(1)}%  diff=${(x.pooled-x.mean).toFixed(1)}pt`));
const maxdiff=Math.max(...rows.map(x=>Math.abs(x.pooled-x.mean)));
say(`largest pooled-vs-mean gap across groups: ${maxdiff.toFixed(1)} pt`);

// general-kpop excluded ranking
say('\n## B-bis. RANKING EXCLUDING general-kpop (a catch-all bucket, not a real group)');
const gk=groups.find(g=>g.slug==='general-kpop');
say(`general-kpop: id=${gk?.id} name="${gk?.name}" plays=${byGroup.get(gk?.id)?.n ?? 0}`);
rows.filter(x=>x.slug!=='general-kpop').sort((a,b)=>b.n-a.n).slice(0,5).forEach((x,i)=>say(`  by plays #${i+1}: ${x.slug} n=${x.n} ${x.pooled.toFixed(1)}%`));

// duels with the winner named
const votes=await page(()=>db.from('duel_votes').select('question_id,winner_id,option_a_id,option_b_id'));
const dr=await page(()=>db.from('duel_ratings').select('question_id,entity_id,entity_name'));
const dq=await page(()=>db.from('duel_questions').select('id,group_slug,question_type,prompt'));
const nameOf=new Map(dr.map(d=>[d.entity_id,d.entity_name]));
const qOf=new Map(dq.map(d=>[d.id,d]));
const pairs=new Map();
for(const v of votes){const ids=[v.option_a_id,v.option_b_id].sort();const k=v.question_id+'::'+ids.join('|');
  if(!pairs.has(k))pairs.set(k,{n:0,w:new Map(),q:v.question_id,ids});const p=pairs.get(k);p.n++;p.w.set(v.winner_id,(p.w.get(v.winner_id)||0)+1);}
const rowsM=[...pairs.values()].filter(p=>p.n>=FLOOR_MATCHUP).map(p=>{
  const sorted=[...p.w.entries()].sort((a,b)=>b[1]-a[1]);
  const [winId,winN]=sorted[0];const loseId=p.ids.find(i=>i!==winId)??sorted[1]?.[0];
  return{n:p.n,share:winN/p.n,winner:nameOf.get(winId)??winId,loser:nameOf.get(loseId)??loseId,prompt:qOf.get(p.q)?.prompt??'',group:qOf.get(p.q)?.group_slug??''};});
say(`\n## F-bis. DUEL MATCHUPS with the winner named (floor ${FLOOR_MATCHUP} votes, ${rowsM.length} of ${pairs.size} qualify)`);
say('### 10 most lopsided');
[...rowsM].sort((a,b)=>b.share-a.share).slice(0,10).forEach((m,i)=>say(`${String(i+1).padStart(2)}. ${(100*m.share).toFixed(1)}% chose ${m.winner} over ${m.loser}  n=${m.n}  [${m.group}] ${m.prompt.slice(0,45)}`));
say('### 10 most contested');
[...rowsM].sort((a,b)=>a.share-b.share).slice(0,10).forEach((m,i)=>say(`${String(i+1).padStart(2)}. ${(100*m.share).toFixed(1)}% ${m.winner} vs ${m.loser}  n=${m.n}  [${m.group}] ${m.prompt.slice(0,45)}`));
say(`\ntotal duel votes at this snapshot: ${votes.length}`);
writeFileSync('/tmp/w5_add.txt',O.join('\n'));
console.log(O.join('\n'));
