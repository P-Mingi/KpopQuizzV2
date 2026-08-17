import {readFileSync,writeFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(m)=>{const o=[];for(let f=0;;f+=1000){const {data,error}=await m().range(f,f+999);if(error)throw new Error(error.message);const rows=data??[];o.push(...rows);if(rows.length<1000)break;}return o;};
const O=[];const say=s=>O.push(s);const pct=(a,b)=>b?100*a/b:0;const R=(x,d=1)=>Number(x).toFixed(d);
const TIERS=['easy','medium','hard'];
const plays=await page(()=>db.from('plays').select('quiz_id,score,total_questions,created_at'));
const quizzes=await page(()=>db.from('quizzes').select('id,group_id,status,difficulty,title,slug'));
const groups=await page(()=>db.from('groups').select('id,slug,generation'));
const songs=await page(()=>db.from('songs').select('group_id,gender'));
const votes=await page(()=>db.from('duel_votes').select('question_id,option_a_id,option_b_id,created_at'));
const qById=new Map(quizzes.map(q=>[q.id,q])),gById=new Map(groups.map(g=>[g.id,g]));
const gender=new Map();{const m=new Map();songs.forEach(s=>{if(s.group_id==null)return;if(!m.has(s.group_id))m.set(s.group_id,new Set());m.get(s.group_id).add(s.gender);});for(const[g,st]of m){const v=[...st].filter(Boolean);if(v.length===1)gender.set(g,v[0]);}}
const valid=plays.filter(p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions);
const A=valid.filter(p=>p.created_at<'2026-05-01'), B=valid.filter(p=>p.created_at>='2026-05-01');
// H reference mix (all periods, tier-labelled plays only)
const REF={easy:0,medium:0,hard:0};
for(const p of valid){const q=qById.get(p.quiz_id);if(!q||q.group_id==null)continue;const d=q.difficulty;if(TIERS.includes(d))REF[d]++;}
const REFTOT=TIERS.reduce((s,d)=>s+REF[d],0);
say(`# REFERENCE MIX (section H's, used for every standardised figure below)`);
say(`easy=${REF.easy} medium=${REF.medium} hard=${REF.hard} total=${REFTOT}`);
const stdOf=cells=>{const have=TIERS.filter(d=>(cells[d]?.n??0)>0);if(!have.length)return null;
  const w=have.reduce((s,d)=>s+REF[d],0);return {val:have.reduce((s,d)=>s+(REF[d]/w)*pct(cells[d].s,cells[d].t),0),have};};
const bucket=(set,keyFn)=>{const m=new Map();
  for(const p of set){const q=qById.get(p.quiz_id);if(!q||q.group_id==null)continue;const d=q.difficulty;if(!TIERS.includes(d))continue;
    const k=keyFn(q);if(k==null)continue;if(!m.has(k))m.set(k,{});const c=m.get(k);if(!c[d])c[d]={n:0,s:0,t:0};
    c[d].n++;c[d].s+=p.score;c[d].t+=p.total_questions;}
  return m;};

// ---------- K. GENERATIONS
say('\n\n# K. GENERATIONS, STANDARDISED AND SPLIT');
const genOf=q=>{const g=gById.get(q.group_id);const v=(g?.generation??'').trim();return v||'(not recorded)';};
const GENS=['2nd Gen','3rd Gen','4th Gen','5th Gen','(not recorded)'];
for(const [label,set] of [['K1 ALL',valid],['K2 MAR+APR',A],['K3 MAY-AUG',B]]){
  const m=bucket(set,genOf);
  say(`\n### ${label}`);
  say('generation | groups | plays | raw% | std% | tiers | easy n/% | medium n/% | hard n/%');
  for(const g of GENS){
    const c=m.get(g); if(!c){say(`${g.padEnd(15)} | (no plays in this window)`);continue;}
    const n=TIERS.reduce((s,d)=>s+(c[d]?.n??0),0), S=TIERS.reduce((s,d)=>s+(c[d]?.s??0),0), T=TIERS.reduce((s,d)=>s+(c[d]?.t??0),0);
    const grp=new Set(); for(const p of set){const q=qById.get(p.quiz_id);if(q&&genOf(q)===g&&TIERS.includes(q.difficulty))grp.add(q.group_id);}
    const st=stdOf(c);
    const tf=d=>c[d]?`${c[d].n}/${R(pct(c[d].s,c[d].t))}%`:'-';
    const stTxt = st.have.length===1 ? `NOT STANDARDISABLE (${st.have[0]} only)` : R(st.val)+'%';
    say(`${g.padEnd(15)} | ${String(grp.size).padStart(6)} | ${String(n).padStart(6)} | ${R(pct(S,T)).padStart(5)} | ${stTxt.padStart(28)} | ${st.have.join('+')} | ${tf('easy')} | ${tf('medium')} | ${tf('hard')}`);
  }
  // quizzes + difficulty mix per generation (published)
  say('published quizzes per generation (all time, not window-specific):');
  for(const g of GENS){
    const qs=quizzes.filter(q=>q.status==='published'&&q.group_id!=null&&genOf(q)===g);
    say(`  ${g.padEnd(15)} quizzes=${String(qs.length).padStart(3)}  ${TIERS.map(d=>d[0]+':'+qs.filter(q=>q.difficulty===d).length).join(' ')}`);
  }
}

// ---------- L. QUIZZES ON MAY-AUG
say('\n\n# L. HARDEST/EASIEST QUIZZES ON THE REPORTING WINDOW (May-Aug)');
const quizAgg=(set)=>{const m=new Map();
  for(const p of set){const q=qById.get(p.quiz_id);if(!q||q.status!=='published')continue;
    if(!m.has(p.quiz_id))m.set(p.quiz_id,{n:0,s:0,t:0});const c=m.get(p.quiz_id);c.n++;c.s+=p.score;c.t+=p.total_questions;}
  return m;};
const allQ=quizAgg(valid), bQ=quizAgg(B);
const allAbove=[...allQ].filter(([,c])=>c.n>=50).map(([id,c])=>({id,n:c.n,pctv:pct(c.s,c.t)}));
const bAbove=[...bQ].filter(([,c])=>c.n>=50).map(([id,c])=>({id,n:c.n,pctv:pct(c.s,c.t)}));
say(`quizzes above the 50-play floor, ALL history : ${allAbove.length} (matches C1's 227)`);
say(`quizzes above the 50-play floor, MAY-AUG only: ${bAbove.length}`);
const allSet=new Set(allAbove.map(x=>x.id));
say(`of the May-Aug qualifiers, also in C1's list : ${bAbove.filter(x=>allSet.has(x.id)).length}`);
const fmt=x=>{const q=qById.get(x.id);return `${R(x.pctv).padStart(5)}%  n=${String(x.n).padStart(4)}  [${q.difficulty}] ${q.title.slice(0,58)}`;};
say('\n### May-Aug: 15 LOWEST scoring above floor');
[...bAbove].sort((a,b)=>a.pctv-b.pctv).slice(0,15).forEach((x,i)=>say(`${String(i+1).padStart(2)}. ${fmt(x)}`));
say('\n### May-Aug: 15 HIGHEST scoring above floor');
[...bAbove].sort((a,b)=>b.pctv-a.pctv).slice(0,15).forEach((x,i)=>say(`${String(i+1).padStart(2)}. ${fmt(x)}`));
// overlap of the published extremes
const lowAll=new Set([...allAbove].sort((a,b)=>a.pctv-b.pctv).slice(0,15).map(x=>x.id));
const lowB=[...bAbove].sort((a,b)=>a.pctv-b.pctv).slice(0,15).map(x=>x.id);
const hiAll=new Set([...allAbove].sort((a,b)=>b.pctv-a.pctv).slice(0,15).map(x=>x.id));
const hiB=[...bAbove].sort((a,b)=>b.pctv-a.pctv).slice(0,15).map(x=>x.id);
say(`\nentries in BOTH lowest-15 lists : ${lowB.filter(id=>lowAll.has(id)).length}  -> ${lowB.filter(id=>lowAll.has(id)).map(id=>qById.get(id).title.slice(0,40)).join(' | ')}`);
say(`entries in BOTH highest-15 lists: ${hiB.filter(id=>hiAll.has(id)).length}  -> ${hiB.filter(id=>hiAll.has(id)).map(id=>qById.get(id).title.slice(0,40)).join(' | ')}`);

// ---------- M. GIRL GROUP FINDING HARDENED (May-Aug)
say('\n\n# M. THE GIRL-GROUP GAP, HARDENED (May-Aug only)');
const perGroupTier=bucket(B,q=>{const g=gender.get(q.group_id);return (g==='gg'||g==='bg')?q.group_id:null;});
const sideCells=side=>{const c={};
  for(const [gid,cells] of perGroupTier){ if(gender.get(gid)!==side)continue;
    for(const d of TIERS){ if(!cells[d])continue; if(!c[d])c[d]={n:0,s:0,t:0}; c[d].n+=cells[d].n;c[d].s+=cells[d].s;c[d].t+=cells[d].t; } }
  return c;};
const report=(exclude=null)=>{
  const mk=side=>{const c={};
    for(const [gid,cells] of perGroupTier){ if(gender.get(gid)!==side)continue; if(exclude!=null&&gid===exclude)continue;
      for(const d of TIERS){ if(!cells[d])continue; if(!c[d])c[d]={n:0,s:0,t:0}; c[d].n+=cells[d].n;c[d].s+=cells[d].s;c[d].t+=cells[d].t; } }
    return c;};
  const g=mk('gg'),b=mk('bg');const sg=stdOf(g),sb=stdOf(b);
  return {gg:sg?.val,bg:sb?.val,gap:(sg&&sb)?sg.val-sb.val:null,
    ggN:TIERS.reduce((s,d)=>s+(g[d]?.n??0),0), bgN:TIERS.reduce((s,d)=>s+(b[d]?.n??0),0)};
};
const base=report();
say(`baseline (May-Aug, all groups with a derived gender):`);
say(`  gg std ${R(base.gg)}% (n=${base.ggN})   bg std ${R(base.bg)}% (n=${base.bgN})   gap ${R(base.gap)} pt`);
say('\nper-tier plays and scores:');
for(const side of ['gg','bg']){const c=sideCells(side);
  say(`  ${side}: `+TIERS.map(d=>c[d]?`${d} n=${c[d].n} ${R(pct(c[d].s,c[d].t))}%`:`${d} -`).join('  |  '));}
// groups clearing the floor within May-Aug
const bPlaysByGroup=new Map();
for(const p of B){const q=qById.get(p.quiz_id);if(!q||q.group_id==null)continue;bPlaysByGroup.set(q.group_id,(bPlaysByGroup.get(q.group_id)||0)+1);}
for(const side of ['gg','bg']){
  const all=[...bPlaysByGroup].filter(([gid])=>gender.get(gid)===side);
  const ab=all.filter(([,n])=>n>=100);
  say(`\n${side}: groups with any May-Aug play = ${all.length}, groups clearing 100 plays IN-WINDOW = ${ab.length}`);
  say('   '+ab.sort((a,b)=>b[1]-a[1]).map(([gid,n])=>`${gById.get(gid)?.slug}(${n})`).join(', '));
}
say('\n### LEAVE-ONE-OUT: the standardised gap with each group removed');
say('removed | side | plays removed | gg std | bg std | gap | change vs baseline');
const involved=[...perGroupTier.keys()].sort((a,b)=>(bPlaysByGroup.get(b)||0)-(bPlaysByGroup.get(a)||0));
const loo=[];
for(const gid of involved){
  const rr=report(gid);
  if(rr.gap==null)continue;
  loo.push({slug:gById.get(gid)?.slug,side:gender.get(gid),n:bPlaysByGroup.get(gid)||0,...rr,delta:rr.gap-base.gap});
}
loo.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
loo.forEach(x=>say(`${(x.slug??'?').padEnd(14)} | ${x.side} | ${String(x.n).padStart(5)} | ${R(x.gg).padStart(5)} | ${R(x.bg).padStart(5)} | ${R(x.gap).padStart(5)} | ${(x.delta>0?'+':'')+R(x.delta)} pt`));
const worst=loo[0];
say(`\nlargest single-group swing: ${worst.slug} (${worst.side}), gap moves ${R(worst.delta)} pt, from ${R(base.gap)} to ${R(worst.gap)}`);
say(`baseline gap = ${R(base.gap)} pt. Does any single removal exceed the gap itself? ${loo.some(x=>Math.abs(x.delta)>Math.abs(base.gap))?'YES':'NO'}`);
say(`gap stays positive (gg above bg) in all leave-one-out runs? ${loo.every(x=>x.gap>0)?'YES':'NO'}  (min gap ${R(Math.min(...loo.map(x=>x.gap)))}, max ${R(Math.max(...loo.map(x=>x.gap)))})`);

// ---------- N. INVENTORY
say('\n\n# N. WHAT MAY-AUG CAN SUPPORT');
say(`usable plays in window            : ${B.length}`);
const gAb=[...bPlaysByGroup].filter(([,n])=>n>=100);
say(`groups with any play              : ${bPlaysByGroup.size}`);
say(`groups clearing 100 plays         : ${gAb.length}`);
say(`quizzes with any play (published) : ${bQ.size}`);
say(`quizzes clearing 50 plays         : ${bAbove.length}`);
const vB=votes.filter(v=>v.created_at>='2026-05-01');
const pr=new Map();
for(const v of vB){const ids=[v.option_a_id,v.option_b_id].sort().join('|');const k=v.question_id+'::'+ids;pr.set(k,(pr.get(k)||0)+1);}
say(`duel votes in window              : ${vB.length} (of ${votes.length} all time)`);
say(`duel matchups with any vote       : ${pr.size}`);
say(`duel matchups clearing 100 votes  : ${[...pr.values()].filter(n=>n>=100).length}`);
writeFileSync('/tmp/w5m.txt',O.join('\n'));
console.log(O.join('\n'));
