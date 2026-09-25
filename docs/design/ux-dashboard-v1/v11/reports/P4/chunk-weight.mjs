// JS weight per page (flag off): the <script src> chunks a page lists, summed from each build's .next.
import fs from 'node:fs';
import path from 'node:path';
const W = '/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/agent-a4296fee956ce64de';
const builds = { A: `${W}/.p4-base/apps/quiz/.next/static/chunks`, B: `${W}/.p4-bbuild/apps/quiz/.next/static/chunks` };
const ports = { A: 4401, B: 4402 };
const pages = process.argv.slice(2);
for (const p of pages) {
  const row = [];
  for (const k of ['A', 'B']) {
    const html = await (await fetch(`http://localhost:${ports[k]}${p}`)).text();
    const chunks = [...html.matchAll(/<script src="\/_next\/static\/chunks\/([^"]+)"/g)].map((m) => decodeURIComponent(m[1]));
    let bytes = 0;
    const marks = [];
    for (const c of chunks) {
      const f = path.join(builds[k], c);
      if (!fs.existsSync(f)) continue;
      const src = fs.readFileSync(f, 'utf8');
      bytes += src.length;
      for (const needle of ['p4-run', 'p4-gbar', 'p4-tring', 'P4Run', 'ux-v1/p4', 'ShareSheet', 'ux-sheet', 'Leave this quiz']) if (src.includes(needle)) marks.push(`${c}:${needle}`);
    }
    row.push(`${k} ${chunks.length} chunks ${bytes.toLocaleString('en-US')} B${marks.length ? ` [${marks.join(', ')}]` : ''}`);
  }
  console.log(p, '|', row.join(' | '));
}
