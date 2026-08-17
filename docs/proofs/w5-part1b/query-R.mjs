import {readFileSync} from 'fs';
import {createRequire} from 'module';
const r=createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/');
const {createClient}=r('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync('apps/quiz/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(m)=>{const o=[];for(let f=0;;f+=1000){const {data,error}=await m().range(f,f+999);if(error)throw new Error(error.message);const rows=data??[];o.push(...rows);if(rows.length<1000)break;}return o;};
const pct=(a,b)=>b?100*a/b:0, R=(x,d=1)=>x.toFixed(d);

// Section A recorded the newest play at snapshot time. That instant IS the closing boundary.
const OPEN='2026-05-01T00:00:00+00:00';
const CLOSE='2026-08-17T12:30:50.619691+00:00';

const plays=await page(()=>db.from('plays').select('score,total_questions,created_at'));
// Section N's usable-play definition, unchanged from section 0c.
const usable=p=>p.total_questions>0&&p.score>=0&&p.score<=p.total_questions;

const inWindowSnapshot=plays.filter(p=>usable(p)&&p.created_at>=OPEN&&p.created_at<=CLOSE);
const inWindowLive=plays.filter(p=>usable(p)&&p.created_at>=OPEN);

console.log('=== PART 2: does the recorded boundary reproduce section N exactly? ===');
console.log(`  open  : ${OPEN}`);
console.log(`  close : ${CLOSE}   (section A's "newest play", i.e. the snapshot instant)`);
console.log(`  usable in-window plays AT the snapshot boundary : ${inWindowSnapshot.length}`);
console.log(`  section N published                             : 17425`);
console.log(`  match                                           : ${inWindowSnapshot.length===17425?'EXACT':'NO ('+(inWindowSnapshot.length-17425)+' difference)'}`);
console.log(`  usable in-window plays with an OPEN window (now) : ${inWindowLive.length}`);
console.log(`  plays added since the snapshot                   : ${inWindowLive.length-inWindowSnapshot.length}`);

console.log('\n=== PART 1: perfect and zero scores, on exactly that basis ===');
const perfect=inWindowSnapshot.filter(p=>p.score===p.total_questions).length;
const zero=inWindowSnapshot.filter(p=>p.score===0).length;
console.log(`  denominator (usable in-window attempts) : ${inWindowSnapshot.length}`);
console.log(`  perfect (score = total_questions)       : ${perfect}  = ${R(pct(perfect,inWindowSnapshot.length),1)}%`);
console.log(`  zero    (score = 0)                     : ${zero}  = ${R(pct(zero,inWindowSnapshot.length),1)}%`);
console.log('\n  for contrast, the figures currently in the draft (dataset G5, ALL HISTORY):');
const allUsable=plays.filter(usable);
const pA=allUsable.filter(p=>p.score===p.total_questions).length, zA=allUsable.filter(p=>p.score===0).length;
console.log(`    all history n=${allUsable.length}: perfect ${R(pct(pA,allUsable.length),1)}%  zero ${R(pct(zA,allUsable.length),1)}%`);
