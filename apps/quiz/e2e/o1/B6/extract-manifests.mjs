// node extract-manifests.mjs <.next/server/app> <worktree root> <outdir>
// Reads every *_client-reference-manifest.js and writes modules.txt ("<route>\t<client module>", sorted, worktree prefix removed)
// and chunks.txt ("<route>\t<number of distinct chunk files>").
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const [root, wt, out] = process.argv.slice(2);
const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('_client-reference-manifest.js')) files.push(p);
  }
})(root);

const modules = [];
const chunks = [];
for (const f of files.sort()) {
  const ctx = { globalThis: {} };
  ctx.globalThis = ctx;
  vm.runInNewContext(readFileSync(f, 'utf8'), ctx);
  for (const [route, m] of Object.entries(ctx.__RSC_MANIFEST ?? {})) {
    const names = new Set();
    const files = new Set();
    for (const [k, v] of Object.entries(m.clientModules ?? {})) {
      names.add(String(v.name ?? '') === '*' || !v.name ? k.replace(wt, '').replace(/#.*$/, '') : k.replace(wt, '') + '#' + v.name);
      for (const c of v.chunks ?? []) files.add(String(c).replace(/^static\/chunks\//, '').split('?')[0]);
    }
    for (const n of [...names].sort()) modules.push(`${route}\t${n}`);
    chunks.push(`${route}\t${files.size}`);
  }
}
writeFileSync(join(out, 'modules.txt'), [...new Set(modules)].sort().join('\n') + '\n');
writeFileSync(join(out, 'chunks.txt'), chunks.sort().join('\n') + '\n');
console.log(`kpop-chunks: ${modules.length} route-module lines from ${files.length} manifests`);
