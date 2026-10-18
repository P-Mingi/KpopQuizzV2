#!/usr/bin/env node
// Run O1, lane Q0a: the verdict on the writes the freeze hook refused during a parity run (scripts/o1/parity.sh).
//   node scripts/o1/parity/refusals.mjs <freeze>/refused.log <out>/refused.txt
// Exit 0 when no refusal fails the run, 1 when one or more do, 2 on a usage error.
//
// Every refused write stays refused (nothing leaves the machine); this only decides which ones fail the run.
// - A refusal outside the two builds (the servers while the URL list is fetched, a gate check) fails: a GET of the
//   list reached a write (the GET write proof, BACKLOG invariant 1).
// - A refusal of the head build fails unless the base build refused the same request (method, path, reason): the
//   head adds a write at build time, which a production deploy of the head would send.
// - A refusal of a build that the base build also makes is today's behaviour, not the lane's: listed, not failing.
//   Measured in Q0a's offline rehearsal (2026-10-17): each build refuses `rpc ensure_daily_debate` once, from the
//   prerender of a page that renders CommunityContent (lib/db/queries/debate.ts), outside the URL list.
// A line of refused.log is "<phase> <method> <path> <reason>" (freeze-hook.mjs `log`). refused.txt: one line per
// distinct request and phase, sorted, with its count and its verdict; nothing that moves between runs but counts.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function judge(text) {
  const rows = new Map(); // `${phase}\t${rest}` -> count
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const i = line.indexOf(' ');
    const phase = i < 0 ? line : line.slice(0, i);
    const rest = i < 0 ? '' : line.slice(i + 1).trim();
    const k = `${phase}\t${rest}`;
    rows.set(k, (rows.get(k) ?? 0) + 1);
  }
  const baseBuild = new Set([...rows.keys()].filter((k) => k.startsWith('build-base\t')).map((k) => k.split('\t')[1]));
  const out = [];
  let failing = 0;
  for (const [k, count] of [...rows.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const [phase, rest] = k.split('\t');
    let verdict;
    if (phase === 'build-base') verdict = 'listed: refused in the base build (today\'s behaviour)';
    else if (phase === 'build-head') verdict = baseBuild.has(rest) ? 'listed: the base build refused it too' : 'FAILS: a write the head build adds';
    else verdict = 'FAILS: refused outside the builds (a GET of the list reached a write)';
    if (verdict.startsWith('FAILS')) failing++;
    out.push({ phase, request: rest, count, verdict });
  }
  return { failing, rows: out };
}

export function render({ failing, rows }) {
  const lines = rows.map((r) => `${String(r.count).padStart(4)} ${r.phase} ${r.request}  [${r.verdict}]`);
  lines.push(failing ? `refused writes: ${failing} failing` : 'refused writes: none failing');
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [src, dst] = process.argv.slice(2);
  if (!src || !dst) { console.error('usage: refusals.mjs <refused.log> <refused.txt>'); process.exit(2); }
  const v = judge(fs.existsSync(src) ? fs.readFileSync(src, 'utf8') : '');
  fs.writeFileSync(dst, render(v));
  process.exit(v.failing ? 1 : 0);
}
