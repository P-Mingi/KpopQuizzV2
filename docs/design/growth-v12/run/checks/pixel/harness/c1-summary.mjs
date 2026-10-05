#!/usr/bin/env node
// C1 (V12 run): builds the state x variant table of run/checks/pixel/SUMMARY.md from every verdict.json
// (v12 states in pixel/<state>/, the v11 regression set in pixel/v11/<state>/). Prints the table and the
// totals; the hand-written parts of SUMMARY.md (method, notes) live in summary-head.txt and summary-notes.txt.
import fs from 'node:fs';
import path from 'node:path';
import { WT } from './drivers-v11.mjs';

const PIX = path.join(WT, 'docs/design/growth-v12/run/checks/pixel');
const CAP = fs.readFileSync(path.join(WT, 'docs/design/growth-v12/capture-v12.mjs'), 'utf8');
const V12 = [...CAP.matchAll(/^\s*\['([a-z0-9-]+)',\s*"/gm)].map((m) => m[1]);
const V11SRC = fs.readFileSync(path.join(WT, 'docs/design/growth-v12/run/checks/capture-prototype-v11.mjs'), 'utf8');
const V11 = [...V11SRC.matchAll(/^\s*'([a-z0-9-]+)':\s*"/gm)].map((m) => m[1]);
const COMBOS = ['1440-light', '1440-dark', '390-light', '390-dark'];

function cell(c) {
  if (!c) return 'not run';
  const lm = c.counts ? ` ${c.counts.pass}/${c.counts.pass + c.counts.fail + c.counts.missing}` : '';
  const px = c.pixel && c.pixel.diffPct !== undefined ? `, ${c.pixel.diffPct}%` : '';
  return `${c.verdict}${lm}${px}`;
}
function failNotes(v) {
  const out = [];
  for (const [k, c] of Object.entries(v.combos ?? {})) {
    if (c.verdict !== 'fail') continue;
    if (c.reason) out.push(`${k}: ${c.reason}`);
    for (const r of c.landmarks ?? []) if (r.status === 'fail' || r.status === 'missing') out.push(`${k} ${r.name}: ${r.status === 'missing' ? 'missing' : r.mismatches.map((m) => `${m.what} ${m.expected} -> ${m.actual}`).join('; ')}`);
    if (k.startsWith('390') && c.overflowX > 0) out.push(`${k}: sideways scroll ${c.overflowX}px`);
  }
  return out;
}
const totals = { pass: 0, fail: 0, 'not verified': 0, 'not run': 0 };
function table(ids, dir, title) {
  const lines = [`## ${title}`, '', '| State | Owner | 1440 light | 1440 dark | 390 light | 390 dark | Notes |', '|---|---|---|---|---|---|---|'];
  const details = [];
  for (const id of ids) {
    const f = path.join(dir, id, 'verdict.json');
    const v = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { combos: {} };
    const cells = COMBOS.map((k) => { const c = v.combos?.[k]; const t = c ? c.verdict : 'not run'; totals[t] = (totals[t] ?? 0) + 1; return cell(c); });
    const note = v.pending ?? v.note ?? '';
    lines.push(`| ${id} | ${v.owner ?? ''} | ${cells.join(' | ')} | ${note.replace(/\|/g, '/')} |`);
    const fn = failNotes(v);
    if (fn.length) details.push(`- **${id}**: ${fn.join(' / ')}`);
  }
  return [...lines, '', ...(details.length ? ['Failures (expected -> actual):', '', ...details, ''] : [])].join('\n');
}
const body = [table(V12, PIX, 'V12 states (40)'), table(V11, path.join(PIX, 'v11'), 'V11 regression set (38)')].join('\n');
const head = fs.existsSync(path.join(PIX, 'harness/summary-head.txt')) ? fs.readFileSync(path.join(PIX, 'harness/summary-head.txt'), 'utf8') : '# C1 pixel check (V12 run)\n';
const notes = fs.existsSync(path.join(PIX, 'harness/summary-notes.txt')) ? fs.readFileSync(path.join(PIX, 'harness/summary-notes.txt'), 'utf8') : '';
const tot = `Totals (${V12.length + V11.length} states x 4 variants): pass ${totals.pass}, fail ${totals.fail}, not verified ${totals['not verified']}, not run ${totals['not run']}.\n`;
fs.writeFileSync(path.join(PIX, 'SUMMARY.md'), `${head}\n${tot}\n${body}\n${notes}`);
console.log(tot);
