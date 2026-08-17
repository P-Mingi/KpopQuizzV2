import {readdirSync,readFileSync,statSync} from 'fs';
import {execSync} from 'child_process';
const files=readdirSync('docs').filter(f=>statSync(`docs/${f}`).isFile());
const tracked=new Set(execSync('git ls-files docs --',{encoding:'utf8'}).split('\n').filter(Boolean).map(s=>s.replace('docs/','')).filter(s=>!s.includes('/')));
const un=files.filter(f=>!tracked.has(f));
console.log('second-pass risk checks over the '+un.length+' untracked top-level docs\n');
const flags=[];
for(const f of un){
  const buf=readFileSync(`docs/${f}`);
  const body=buf.toString('utf8');
  const why=[];
  if(!f.toLowerCase().endsWith('.md')) why.push('NOT-MARKDOWN');
  if(buf.includes(0)) why.push('BINARY(NUL)');
  const longest=Math.max(...body.split('\n').map(l=>l.length));
  if(longest>2000) why.push(`LONG-LINE(${longest})`);
  if(buf.length>200000) why.push(`LARGE(${buf.length}b)`);
  if(/-----BEGIN [A-Z ]*PRIVATE KEY/.test(body)) why.push('PRIVATE-KEY-BLOCK');
  if(/\b(?:\d[ -]*?){13,16}\b/.test(body.replace(/\d{4}-\d{2}-\d{2}/g,''))) why.push('CARD-LIKE-DIGITS');
  if(/postgres(ql)?:\/\/|mongodb\+srv:\/\//.test(body)) why.push('DB-CONNECTION-STRING');
  if(why.length) flags.push([f,why.join(' ')]);
}
if(!flags.length) console.log('  no second-pass flags on any file');
else flags.forEach(([f,w])=>console.log(`  ${f.padEnd(46)} ${w}`));
