// Second pass on flag-off-diff's normalised dev pages: remove what differs between ANY two dev
// servers (per-render request id, the checkout folder name inside dev stack traces and chunk
// names), then compare. Read only.
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const norm = (s) => s
  .replace(/self\.__next_r="[^"]*"/g, 'self.__next_r="<rid>"')
  .replace(/\.p4-(base|bbuild)/g, '<dir>')
  .replace(/__p4-(base|bbuild)_[A-Za-z0-9._~-]+?\._\.js/g, '<dir>_<chunk>._.js')
  .replace(/:\d+:\d+\)/g, ':<l>:<c>)')
  .replace(/[A-Za-z0-9_~.-]+\._\.js(\?\d+)?(?=[:)])/g, '<devchunk>');
let diff = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.a.html')).sort()) {
  const a = norm(fs.readFileSync(path.join(dir, f), 'utf8'));
  const b = norm(fs.readFileSync(path.join(dir, f.replace('.a.html', '.b.html')), 'utf8'));
  const same = a === b;
  if (!same) diff++;
  let at = -1;
  if (!same) { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) { at = i; break; } }
  console.log(`${same ? 'IDENTICAL' : 'DIFFERENT'}  ${f.replace('.a.html', '')}  ${a.length}/${b.length}${at >= 0 ? `  first diff at ${at}: A=${JSON.stringify(a.slice(at, at + 120))} B=${JSON.stringify(b.slice(at, at + 120))}` : ''}`);
}
console.log(diff ? `${diff} page(s) differ` : 'all pages identical');
process.exit(diff ? 1 : 0);
