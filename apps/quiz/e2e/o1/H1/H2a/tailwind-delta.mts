// Run O1, lot H2a: the kpop sheet must not grow. Tailwind scans every file under src, so a word of a new file that names a utility would add a
// rule to kpopquiz.org's CSS. This builds the sheet from the files as they are and from the files as they were at the base commit (new files
// left out) and prints the rules of the first that the second lacks.
//   node_modules/.bin/tsx apps/quiz/e2e/o1/H1/H2a/tailwind-delta.mts [baseRef=HEAD~N]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { globSync } from 'node:fs';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

import tailwindConfig from '../../../../tailwind.config';

const APP = join(import.meta.dirname, '..', '..', '..', '..') + '/';
const base = process.argv[2] ?? '37caf3e';
const git = (args: string[]): string => execFileSync('git', args, { cwd: APP, encoding: 'utf8', maxBuffer: 1 << 28 });
const patterns = tailwindConfig.content as readonly string[];
const scanned = [...new Set(patterns.flatMap((p) => globSync(p.replace(/^\.\//, ''), { cwd: APP })))].sort();
const inBase = new Set(git(['ls-tree', '-r', '--name-only', base, '--', 'src']).split('\n').map((f) => f.replace(/^apps\/quiz\//, '')));
const root = git(['rev-parse', '--show-prefix']).trim();

async function rules(content: { raw: string; extension: string }[]): Promise<string[]> {
  const from = `${APP}src/styles/globals.css`;
  const result = await postcss([tailwindcss({ ...tailwindConfig, content })]).process(readFileSync(from, 'utf8'), { from });
  const out: string[] = [];
  result.root.walkRules((r) => {
    const ctx: string[] = [];
    for (let p = r.parent; p && p.type === 'atrule'; p = p.parent) ctx.unshift(`@${(p as { name: string }).name} ${(p as { params: string }).params}`);
    out.push(`${ctx.join(' ')} ${r.selector} { ${(r.nodes ?? []).map(String).join('; ')} }`);
  });
  return out;
}
const ext = (f: string): string => f.slice(f.lastIndexOf('.') + 1);
const now = scanned.map((f) => ({ raw: readFileSync(`${APP}${f}`, 'utf8'), extension: ext(f) }));
const then = scanned.filter((f) => inBase.has(`${root}${f}`) || inBase.has(f)).map((f) => ({ raw: git(['show', `${base}:${root}${f}`]), extension: ext(f) }));
const a = await rules(now);
const b = await rules(then);
const left = new Map<string, number>();
for (const r of b) left.set(r, (left.get(r) ?? 0) + 1);
const added = a.filter((r) => { const n = left.get(r) ?? 0; if (n > 0) { left.set(r, n - 1); return false; } return true; });
console.log(`rules now ${a.length}, at ${base} ${b.length}, added ${added.length}`);
for (const r of added) console.log('+', r.slice(0, 200));
process.exit(added.length ? 1 : 0);
