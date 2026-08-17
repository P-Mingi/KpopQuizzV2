import {readFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(m)=>{const o=[];for(let f=0;;f+=1000){const {data}=await m().range(f,f+999);const rows=data??[];o.push(...rows);if(rows.length<1000)break;}return o;};
const plays=await page(()=>db.from('plays').select('score,total_questions,created_at'));
const usable=p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions;
const OPEN='2026-05-01T00:00:00+00:00';
console.log('=== does the PUBLISHED (second-truncated) timestamp reproduce 17,425? ===');
for(const [label,close] of [
  ['full precision  2026-08-17T12:30:50.619691+00:00','2026-08-17T12:30:50.619691+00:00'],
  ['as published    2026-08-17T12:30:50Z','2026-08-17T12:30:50+00:00'],
  ['next second     2026-08-17T12:30:51Z','2026-08-17T12:30:51+00:00'],
  ['end of that day 2026-08-18T00:00:00Z','2026-08-18T00:00:00+00:00'],
]){
  const n=plays.filter(p=>usable(p)&&p.created_at>=OPEN&&p.created_at<=close).length;
  console.log(`  ${label.padEnd(48)} -> ${n}  ${n===17425?'(matches N)':'(differs by '+(n-17425)+')'}`);
}
console.log('\n=== exact shares on the reproducing boundary ===');
const w=plays.filter(p=>usable(p)&&p.created_at>=OPEN&&p.created_at<='2026-08-17T12:30:50.619691+00:00');
const perf=w.filter(p=>p.score===p.total_questions).length, zero=w.filter(p=>p.score===0).length;
console.log(`  n=${w.length}  perfect=${perf} (${(100*perf/w.length).toFixed(3)}%)  zero=${zero} (${(100*zero/w.length).toFixed(3)}%)`);
console.log(`  perfect as a fraction: 1 in ${(w.length/perf).toFixed(2)}`);
