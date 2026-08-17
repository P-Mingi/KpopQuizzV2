import {readFileSync,writeFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(m)=>{const o=[];for(let f=0;;f+=1000){const {data,error}=await m().range(f,f+999);if(error)throw new Error(error.message);const rows=data??[];o.push(...rows);if(rows.length<1000)break;}return o;};
const O=[];const say=s=>O.push(s);
const FLOOR=100, TIERS=['easy','medium','hard'];
const plays=await page(()=>db.from('plays').select('quiz_id,score,total_questions,player_id,created_at'));
const quizzes=await page(()=>db.from('quizzes').select('id,group_id,status,difficulty,created_at,question_count,slug,title'));
const groups=await page(()=>db.from('groups').select('id,slug,generation'));
const songs=await page(()=>db.from('songs').select('group_id,gender'));
const qById=new Map(quizzes.map(q=>[q.id,q])), gById=new Map(groups.map(g=>[g.id,g]));
const genderByGroup=new Map();{const m=new Map();songs.forEach(s=>{if(s.group_id==null)return;if(!m.has(s.group_id))m.set(s.group_id,new Set());m.get(s.group_id).add(s.gender);});for(const[g,st]of m){const v=[...st].filter(Boolean);if(v.length===1)genderByGroup.set(g,v[0]);}}
const valid=plays.filter(p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions);
const pct=(a,b)=>b?100*a/b:0;
const R2=x=>Number(x.toFixed(1));
const rOf=A=>{if(A.length<3)return NaN;const mx=A.reduce((s,x)=>s+x[0],0)/A.length,my=A.reduce((s,x)=>s+x[1],0)/A.length;
 const cov=A.reduce((s,x)=>s+(x[0]-mx)*(x[1]-my),0),sx=Math.sqrt(A.reduce((s,x)=>s+(x[0]-mx)**2,0)),sy=Math.sqrt(A.reduce((s,x)=>s+(x[1]-my)**2,0));return cov/(sx*sy);};

function ladder(playSet,label){
  // per group per tier
  const cell=new Map(); // gid -> tier -> {n,s,t}
  const refTier={easy:0,medium:0,hard:0};
  for(const p of playSet){const q=qById.get(p.quiz_id); if(!q||q.group_id==null)continue;
    const d=q.difficulty??'unlabelled'; if(!TIERS.includes(d))continue;
    if(!cell.has(q.group_id))cell.set(q.group_id,{});
    const c=cell.get(q.group_id); if(!c[d])c[d]={n:0,s:0,t:0};
    c[d].n++;c[d].s+=p.score;c[d].t+=p.total_questions; refTier[d]++;}
  const refTot=TIERS.reduce((s,d)=>s+refTier[d],0);
  const rows=[];
  for(const [gid,c] of cell){
    const n=TIERS.reduce((s,d)=>s+(c[d]?.n??0),0);
    if(n<FLOOR)continue;
    const S=TIERS.reduce((s,d)=>s+(c[d]?.s??0),0), T=TIERS.reduce((s,d)=>s+(c[d]?.t??0),0);
    // direct standardisation over the tiers this group actually has, weights renormalised
    const have=TIERS.filter(d=>(c[d]?.n??0)>0);
    const wsum=have.reduce((s,d)=>s+refTier[d],0);
    const std=have.reduce((s,d)=>s+(refTier[d]/wsum)*pct(c[d].s,c[d].t),0);
    rows.push({slug:gById.get(gid)?.slug??String(gid),gid,plays:n,raw:pct(S,T),std,
      tiers:Object.fromEntries(TIERS.map(d=>[d,c[d]?{n:c[d].n,pct:pct(c[d].s,c[d].t)}:null])),
      covered:have.join('+'), refShare:(wsum/refTot)});
  }
  const byRaw=[...rows].sort((a,b)=>b.raw-a.raw), byStd=[...rows].sort((a,b)=>b.std-a.std);
  const rankRaw=new Map(byRaw.map((x,i)=>[x.slug,i+1])), rankStd=new Map(byStd.map((x,i)=>[x.slug,i+1]));
  say(`\n### ${label}: reference mix (plays) easy=${refTier.easy} medium=${refTier.medium} hard=${refTier.hard} (total ${refTot})`);
  say(`groups above floor(${FLOOR}) in this period: ${rows.length}`);
  say('rank_std | group | raw% | std% | plays | rank_raw | move | tiers covered | easy n/% | medium n/% | hard n/%');
  for(const x of byStd){
    const t=d=>x.tiers[d]?`${x.tiers[d].n}/${R2(x.tiers[d].pct)}%`:'-';
    const mv=rankRaw.get(x.slug)-rankStd.get(x.slug);
    say(`${String(rankStd.get(x.slug)).padStart(2)} | ${x.slug.padEnd(14)} | ${R2(x.raw).toFixed(1).padStart(5)} | ${R2(x.std).toFixed(1).padStart(5)} | ${String(x.plays).padStart(6)} | ${String(rankRaw.get(x.slug)).padStart(2)} | ${(mv>0?'+':'')+mv} | ${x.covered.padEnd(18)} | ${t('easy').padStart(11)} | ${t('medium').padStart(12)} | ${t('hard')}`);
  }
  const rRaw=rOf(rows.map(x=>[Math.log10(x.plays),x.raw]));
  const rStd=rOf(rows.map(x=>[Math.log10(x.plays),x.std]));
  say(`correlation log10(plays) vs RAW score : r = ${rRaw.toFixed(3)}  (n=${rows.length})`);
  say(`correlation log10(plays) vs STD score : r = ${rStd.toFixed(3)}  (n=${rows.length})`);
  const noGk=rows.filter(x=>x.slug!=='general-kpop');
  say(`   without general-kpop: raw r = ${rOf(noGk.map(x=>[Math.log10(x.plays),x.raw])).toFixed(3)}  std r = ${rOf(noGk.map(x=>[Math.log10(x.plays),x.std])).toFixed(3)}  (n=${noGk.length})`);
  return {rows,byStd,byRaw,rRaw,rStd};
}

say('# H. DIFFICULTY-STANDARDISED GROUP LADDER (all periods)');
say('standardisation: direct, weights = the combined PLAY mix across all groups in scope,');
say('renormalised over the tiers a group actually has plays in (stated per row).');
const all=ladder(valid,'H1 ALL (2026-03-10 to 2026-08-17)');

say('\n\n# I. SPLIT BY REGIME');
const A=valid.filter(p=>p.created_at<'2026-05-01'), B=valid.filter(p=>p.created_at>='2026-05-01');
say(`Mar+Apr usable plays: ${A.length}   May-Aug usable plays: ${B.length}`);
const la=ladder(A,'I1 MAR+APR'); const lb=ladder(B,'I2 MAY-AUG');
// ranking stability
const common=la.rows.map(x=>x.slug).filter(s=>lb.rows.some(y=>y.slug===s));
say(`\ngroups above floor in BOTH periods: ${common.length}`);
const ra=new Map(la.byStd.map((x,i)=>[x.slug,i+1])), rb=new Map(lb.byStd.map((x,i)=>[x.slug,i+1]));
const pairs=common.map(s=>[ra.get(s),rb.get(s)]);
const spear=(()=>{const n=pairs.length;const d2=pairs.reduce((s,[a,b])=>s+(a-b)**2,0);return 1-(6*d2)/(n*(n*n-1));})();
say(`Spearman rank correlation of the STANDARDISED ladder, Mar+Apr vs May-Aug: rho = ${spear.toFixed(3)} (n=${common.length})`);
say('group | rank Mar+Apr | rank May-Aug | std% Mar+Apr | std% May-Aug');
for(const s of common.sort((x,y)=>ra.get(x)-ra.get(y))){
  const a=la.rows.find(x=>x.slug===s), b=lb.rows.find(x=>x.slug===s);
  say(`  ${s.padEnd(14)} ${String(ra.get(s)).padStart(2)} -> ${String(rb.get(s)).padStart(2)}   ${R2(a.std).toFixed(1)}% -> ${R2(b.std).toFixed(1)}%`);
}
writeFileSync('/tmp/w5h.txt',O.join('\n'));
console.log(O.join('\n'));
