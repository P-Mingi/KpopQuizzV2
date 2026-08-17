import {readFileSync} from 'fs';
import {execSync} from 'child_process';
const files=execSync('git ls-files docs --',{encoding:'utf8'}).split('\n').filter(f=>f&&/\.(md|txt|mts|mjs|sql|json)$/.test(f));
const naive=[
 ['EMAIL', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
 ['WORD service_role', /service_role|anon[_ ]key/gi],
 ['WORD password', /\bpassword\b/gi],
 ['JWT-shape', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g],
 ['TOKEN-shape', /\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[A-Za-z0-9_-]{30,})\b/g],
 ['CONN-STRING', /(postgres(ql)?|mongodb(\+srv)?):\/\/[^\s`'"]+/g],
 ['URL-CREDS', /https?:\/\/[^\/\s:]+:[^@\/\s]+@/g],
 ['BEARER', /Bearer\s+[A-Za-z0-9._-]{20,}/g],
];
const tally={};
const emailVals=new Set();
for(const f of files){
  let body; try{ body=readFileSync(f,'utf8'); }catch{ continue; }
  for(const [name,re] of naive){
    const m=body.match(re);
    if(m){ tally[name]=(tally[name]||0)+m.length; if(name==='EMAIL') m.forEach(x=>emailVals.add(x)); }
  }
}
console.log('files scanned (tracked under docs/):',files.length);
console.log('\nnaive pattern tally across the whole tracked corpus:');
Object.entries(tally).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k.padEnd(20)} ${v}`));
console.log('\ndistinct email values found:');
[...emailVals].sort().forEach(v=>console.log('  '+v));
