#!/usr/bin/env node
// C3 parity, second pass (V12 prompt section 6 allowed differences, COMMON rule 12):
//   node c3-parity-normalize.mjs <run dir>
// Reads <run>/html/*.a.html (feat/v12) and *.b.html (origin/main) written by c3-parity.mjs, applies the
// normalizations below on top of the first pass, and writes <run>/normalized.txt: per URL, every changed
// line pair left after normalization, with its class.
// Normalizations (each is a value nobody sees or an allowed difference):
//   N1 build hash of the CSS module class of next/font (`<name>-module__<hash>__variable`): a build artifact
//      like the /_next/static paths.
// Classified, not hidden (each line pair is printed with its class):
//   C1 recomputed guess-from-clues figures: an "avg N%" chip or a "Ranked from N quizzes" line, or the /stats
//      Dataset JSON-LD built from the same rankings (owner decisions 1 and 2, score helpers always on).
//   C2 live counters: a play / like / view / member count or a relative time that moved between the two fetches.
//   OTHER: anything else. Any OTHER blocks the merge.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RUN = process.argv[2];
if (!RUN) { console.error('usage: c3-parity-normalize.mjs <run dir>'); process.exit(2); }
const H = path.join(RUN, 'html');
const n1 = (s) => s.replace(/(-module__)[A-Za-z0-9_-]+?(__variable)/g, '$1HASH$2');
const num = (s) => s.replace(/\d[\d.,]*\s*[KkMm]?/g, '#');
const SCRIPT = '<script src="/_next/static/X" async="">';
const classOf = (a, b) => {
  // a clue quiz chip: the recomputed figure also moves its colour class (owner decision 2: green to red)
  if (/quiz-score/.test(a) && num(a).replace(/score-[a-z]+/, 'score-C') === num(b).replace(/score-[a-z]+/, 'score-C')) return 'C1 recomputed score figure';
  if (num(a) === num(b)) {
    if (/avg\b|average|Ranked from|"@type":"Dataset"|"@type":"ItemList"|%/.test(a + b)) return 'C1 recomputed score figure';
    return 'C2 live counter';
  }
  if (/"@type":"Dataset"|"@type":"ItemList"/.test(a) && /"@type":"Dataset"|"@type":"ItemList"/.test(b)) return 'C1 recomputed score figure (JSON-LD of the rankings)';
  return 'OTHER';
};
const out = [];
const tally = {};
for (const f of readdirSync(H).filter((x) => x.endsWith('.a.html')).sort()) {
  const slug = f.slice(0, -7);
  let A = n1(readFileSync(path.join(H, f), 'utf8')).split('\n');
  const B = n1(readFileSync(path.join(H, `${slug}.b.html`), 'utf8')).split('\n');
  const pairs = [];
  // C3: one more async script chunk on feat/v12 only. Not hidden: printed with its own class, then the rest
  // of the page is compared without it.
  const extra = A.filter((l) => l === SCRIPT).length - B.filter((l) => l === SCRIPT).length;
  if (extra > 0) {
    for (let k = 0; k < extra; k++) {
      const i = A.findIndex((l, j) => l === SCRIPT && A[j + 1] === '</script>' && B[j] !== SCRIPT);
      if (i < 0) break;
      A = [...A.slice(0, i), ...A.slice(i + 2)];
    }
    pairs.push([`${extra} extra async <script src="/_next/static/..."> on feat/v12`, '', 'C3 extra JS chunk (see summary)']);
  }
  if (A.length !== B.length) pairs.push([`(line count a ${A.length} b ${B.length})`, '', 'OTHER']);
  else for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) pairs.push([A[i], B[i], classOf(A[i], B[i])]);
  const classes = [...new Set(pairs.map((p) => p[2]))];
  for (const c of classes) tally[c] = (tally[c] ?? 0) + 1;
  out.push(`${slug}: ${pairs.length ? classes.join(', ') : 'identical'}`);
  for (const [a, b, c] of pairs) out.push(`  [${c}]\n    b ${b.slice(0, 600)}\n    a ${a.slice(0, 600)}`);
}
const head = `# a = feat/v12 (both flags off), b = origin/main (both flags off); N1 applied\n# pages with a class: ${JSON.stringify(tally)}\n`;
writeFileSync(path.join(RUN, 'normalized.txt'), head + out.join('\n') + '\n');
console.log(head + out.filter((l) => !l.startsWith(' ')).join('\n'));
