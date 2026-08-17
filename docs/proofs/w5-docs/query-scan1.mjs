import {readdirSync,readFileSync,statSync} from 'fs';
import {execSync} from 'child_process';
const dir='docs';
const files=readdirSync(dir).filter(f=>statSync(`${dir}/${f}`).isFile());
const tracked=new Set(execSync('git ls-files docs --',{encoding:'utf8'}).split('\n').filter(Boolean).map(s=>s.replace('docs/','')).filter(s=>!s.includes('/')));
const PAT=[
 ['EMAIL', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
 ['JWT', /\beyJ[A-Za-z0-9_-]{10,}/g],
 ['SUPABASE_KEY', /service_role|SUPABASE_SERVICE_ROLE|anon[_ ]key/gi],
 ['SK_TOKEN', /\b(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[A-Za-z0-9_-]{20,})/g],
 ['PASSWORD', /\b(password|passwd|ADMIN_PASSWORD)\s*[:=]\s*\S+/gi],
 ['BEARER', /Bearer\s+[A-Za-z0-9._-]{20,}/g],
 ['URL_CREDS', /https?:\/\/[^\/\s]+:[^@\/\s]+@/g],
 ['PHONE', /\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g],
];
const rows=[];
for(const f of files){
  const p=`${dir}/${f}`;
  const body=readFileSync(p,'utf8');
  const hits=[];
  for(const [name,re] of PAT){ const m=body.match(re); if(m) hits.push(`${name}x${m.length}`); }
  const title=(body.split('\n').find(l=>l.trim().startsWith('#'))||body.split('\n')[0]||'').replace(/^#+\s*/,'').slice(0,62);
  rows.push({f,tracked:tracked.has(f),bytes:body.length,lines:body.split('\n').length,hits,title});
}
const un=rows.filter(r=>!r.tracked);
console.log(`top-level docs: ${rows.length}  tracked: ${rows.length-un.length}  untracked: ${un.length}`);
console.log(`\n=== UNTRACKED WITH PATTERN HITS (must be reviewed by hand) ===`);
un.filter(r=>r.hits.length).forEach(r=>console.log(`  ${r.f}  [${r.hits.join(' ')}]  ${r.bytes}b`));
console.log(`  (count: ${un.filter(r=>r.hits.length).length})`);
console.log(`\n=== UNTRACKED, CLEAN ===`);
un.filter(r=>!r.hits.length).sort((a,b)=>a.f.localeCompare(b.f)).forEach(r=>console.log(`  ${r.f.padEnd(46)} ${String(r.lines).padStart(5)}L  ${r.title}`));
