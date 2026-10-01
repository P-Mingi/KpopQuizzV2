// Second pass on flag-off-diff's normalised DEV pages (P2): remove what differs between any
// two dev servers of the same code in two folders (per-render request id, the mirror folder
// name inside dev chunk names and stack traces, dev chunk query versions), then compare.
// Adapted from v11/reports/P4/dev-norm.mjs. Read only.
//   node dev-norm.mjs <dir written by flag-off-diff.mjs --out>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const norm = (s) => s
  .replace(/self\.__next_r="[^"]*"/g, 'self.__next_r="<rid>"')
  .replace(/scratchpad\/p2\/fo(-base)?\//g, '<mirror>/')
  .replace(/\?v=\d+/g, '?v=<t>')
  .replace(/:\d+:\d+\)/g, ':<l>:<c>)');
let diff = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.a.html')).sort()) {
  const a = norm(fs.readFileSync(path.join(dir, f), 'utf8'));
  const b = norm(fs.readFileSync(path.join(dir, f.replace('.a.html', '.b.html')), 'utf8'));
  const same = a === b;
  if (!same) diff++;
  let at = -1;
  if (!same) { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) { at = i; break; } }
  console.log(`${same ? 'IDENTICAL' : 'DIFFERENT'}  ${f.replace('.a.html', '')}  ${a.length}/${b.length}${at >= 0 ? `  first diff at ${at}: A=${JSON.stringify(a.slice(Math.max(0, at - 40), at + 120))} B=${JSON.stringify(b.slice(Math.max(0, at - 40), at + 120))}` : ''}`);
}
console.log(diff ? `${diff} page(s) differ` : 'all pages identical');
process.exit(diff ? 1 : 0);
