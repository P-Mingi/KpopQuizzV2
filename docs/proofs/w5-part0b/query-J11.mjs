import {readFileSync,writeFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(m)=>{const o=[];for(let f=0;;f+=1000){const {data,error}=await m().range(f,f+999);if(error)throw new Error(error.message);const rows=data??[];o.push(...rows);if(rows.length<1000)break;}return o;};
const O=[];const say=s=>O.push(s);const pct=(a,b)=>b?100*a/b:0;const R=x=>x.toFixed(1);
const plays=await page(()=>db.from('plays').select('score,total_questions,player_id,created_at,time_taken_seconds,quiz_id'));
const valid=plays.filter(p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions);
const A=valid.filter(p=>p.created_at<'2026-05-01');
const c=new Map(); A.filter(p=>p.player_id).forEach(p=>{if(!c.has(p.player_id))c.set(p.player_id,[]);c.get(p.player_id).push(p);});
const stats=[...c].map(([pid,ps])=>{
  const S=ps.reduce((x,p)=>x+p.score,0),T=ps.reduce((x,p)=>x+p.total_questions,0);
  const t=ps.map(p=>p.time_taken_seconds).filter(x=>x!=null).sort((a,b)=>a-b);
  return {n:ps.length,score:pct(S,T),med:t.length?t[Math.floor(t.length/2)]:null};});
const q=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(p*(s.length-1))];};
say('# J11. DO ALL 56 Mar+Apr ACCOUNTS SHARE ONE FINGERPRINT?');
say(`accounts: ${stats.length}`);
for(const [label,vals] of [['plays per account',stats.map(s=>s.n)],['score %',stats.map(s=>s.score)],['median seconds',stats.map(s=>s.med).filter(x=>x!=null)]]){
  say(`${label.padEnd(18)} min=${R(Math.min(...vals))}  p25=${R(q(vals,0.25))}  median=${R(q(vals,0.5))}  p75=${R(q(vals,0.75))}  max=${R(Math.max(...vals))}`);
}
const inBand=stats.filter(s=>s.score>=58&&s.score<=65).length;
const timeBand=stats.filter(s=>s.med!=null&&s.med>=90&&s.med<=115).length;
const playBand=stats.filter(s=>s.n>=100).length;
say(`accounts scoring 58-65%          : ${inBand} of ${stats.length}`);
say(`accounts with median 90-115 sec  : ${timeBand} of ${stats.filter(s=>s.med!=null).length}`);
say(`accounts with >=100 plays        : ${playBand} of ${stats.length}`);
// same for May-Aug as the control
const B=valid.filter(p=>p.created_at>='2026-05-01');
const cB=new Map(); B.filter(p=>p.player_id).forEach(p=>{if(!cB.has(p.player_id))cB.set(p.player_id,[]);cB.get(p.player_id).push(p);});
const sB=[...cB].map(([pid,ps])=>{const S=ps.reduce((x,p)=>x+p.score,0),T=ps.reduce((x,p)=>x+p.total_questions,0);
  const t=ps.map(p=>p.time_taken_seconds).filter(x=>x!=null).sort((a,b)=>a-b);
  return {n:ps.length,score:pct(S,T),med:t.length?t[Math.floor(t.length/2)]:null};});
say(`\nCONTROL, May-Aug accounts: ${sB.length}`);
for(const [label,vals] of [['plays per account',sB.map(s=>s.n)],['score %',sB.map(s=>s.score)],['median seconds',sB.map(s=>s.med).filter(x=>x!=null)]]){
  say(`${label.padEnd(18)} min=${R(Math.min(...vals))}  p25=${R(q(vals,0.25))}  median=${R(q(vals,0.5))}  p75=${R(q(vals,0.75))}  max=${R(Math.max(...vals))}`);
}
say(`accounts scoring 58-65%          : ${sB.filter(s=>s.score>=58&&s.score<=65).length} of ${sB.length}`);
say(`accounts with >=100 plays        : ${sB.filter(s=>s.n>=100).length} of ${sB.length}`);
writeFileSync('/tmp/w5l.txt',O.join('\n'));
console.log(O.join('\n'));
