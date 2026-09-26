#!/usr/bin/env node
// C3: summarise the QA spec records (QA_OUT/qa-a11y.jsonl, qa-keyboard.jsonl) into a markdown file.
// Keeps the LAST record per (state, width, theme, who) so a retried test counts once.
//   node qa-summary.mjs <qa-dir> <out.md> [--legacy state1,state2]
import fs from 'node:fs';
import path from 'node:path';

const [, , dir, out, ...rest] = process.argv;
const li = rest.indexOf('--legacy');
const LEGACY = new Set(li >= 0 ? rest[li + 1].split(',') : []);
const read = (f) => { const p = path.join(dir, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; };
const last = (rows, key) => { const m = new Map(); for (const r of rows) m.set(key(r), r); return [...m.values()]; };

const axe = last(read('qa-a11y.jsonl').filter((r) => r.kind === 'axe'), (r) => `${r.state}|${r.width}|${r.theme}|${r.who}`);
const notes = read('qa-a11y.jsonl').filter((r) => r.kind === 'note');
const kb = read('qa-keyboard.jsonl');
const walks = last(kb.filter((r) => r.kind === 'walk'), (r) => `${r.state}|${r.width}`);
const dialogs = last(kb.filter((r) => r.kind === 'dialog'), (r) => `${r.state}|${r.width}|${r.who ?? 'guest'}`);
const sr = last(kb.filter((r) => r.kind === 'sr'), (r) => `${r.state}|${r.width}`);

let md = `# QA accessibility results (C3)\n\nWhole-document axe-core (serious + critical only), keyboard walk, sheets and game semantics on the shared flag-on build. Records: \`results/qa-a11y.jsonl\`, \`results/qa-keyboard.jsonl\` (last record per state kept). The number after an axe rule is its failing nodes, counted up to 8.\n\n## axe, serious + critical\n\n`;
const states = [...new Set(axe.map((r) => `${r.owner}|${r.state}|${r.who}`))];
md += `| Owner | State | Who | 1440 light | 1440 dark | 390 light | 390 dark |\n|---|---|---|---|---|---|---|\n`;
const cell = (r) => (r ? (r.serious.length ? r.serious.map((s) => `${s.id} (${r.detail?.find((d) => d.id === s.id)?.nodes.length ?? s.nodes.length})`).join(', ') : '0') : 'not run');
let clean = 0; let dirty = 0; let legacyDirty = 0;
for (const s of states.sort()) {
  const [owner, state, who] = s.split('|');
  const get = (w, t) => axe.find((r) => r.owner === owner && r.state === state && r.who === who && r.width === w && r.theme === t);
  const cells = [get(1440, 'light'), get(1440, 'dark'), get(390, 'light'), get(390, 'dark')];
  for (const c of cells) if (c) { if (c.serious.length === 0) clean++; else if (LEGACY.has(state)) legacyDirty++; else dirty++; }
  md += `| ${owner} | ${state}${LEGACY.has(state) ? ' (legacy content)' : ''} | ${who} | ${cells.map(cell).join(' | ')} |\n`;
}
md += `\nTotals: ${clean} state x width x theme runs with 0 serious / critical; ${dirty} with findings on v11 surfaces; ${legacyDirty} with findings on legacy content inside the shell (all present with the flag off too, see evidence/a11y-legacy-pages-on-vs-off.txt).\n`;
const detailRows = axe.filter((r) => r.serious.length && !LEGACY.has(r.state));
if (detailRows.length) {
  md += `\n### Findings on v11 surfaces (nodes)\n\n`;
  for (const r of detailRows) for (const d of r.detail ?? []) for (const n of d.nodes.slice(0, 4)) md += `- ${r.owner} ${r.state} ${r.width} ${r.theme} ${r.who}: ${d.id} at \`${n.target}\`: ${n.summary.slice(0, 200)}\n`;
}
if (notes.length) { md += `\n### Notes\n\n`; for (const n of last(notes, (r) => `${r.state}|${r.width}|${r.theme}`)) md += `- ${n.owner} ${n.state} ${n.width} ${n.theme}: ${n.note}\n`; }

md += `\n## Keyboard walk (Tab from the top until focus cycles; light)\n\n| Owner | State | Width | Controls | Tab stops | Unreached | Stops without a focus indicator | Focus to body | Disclosures ok / checked |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const w of walks.sort((a, b) => a.owner.localeCompare(b.owner) || a.width - b.width)) {
  md += `| ${w.owner} | ${w.state}${w.pending ? ' (pending)' : ''} | ${w.width} | ${w.candidates} | ${w.stops} | ${w.unreached.length ? w.unreached.slice(0, 4).join('; ') + (w.unreached.length > 4 ? ` (+${w.unreached.length - 4})` : '') : '0'} | ${w.noRing.length ? w.noRing.slice(0, 4).join('; ') + (w.noRing.length > 4 ? ` (+${w.noRing.length - 4})` : '') : '0'} | ${w.focusToBody} | ${w.disclosures.checked - w.disclosures.failed.length} / ${w.disclosures.checked}${w.disclosures.failed.length ? ': ' + w.disclosures.failed.join('; ') : ''} |\n`;
}
md += `\n## Sheets and popovers\n\n| Owner | Dialog | Width | Who | Role | Name | Modal | Focus in | Tab trap | Escape (+focus back) | X (+focus back) | Backdrop (+focus back) | Problems |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
const yn = (v) => (v === null || v === undefined ? '-' : v ? 'yes' : 'NO');
for (const d of dialogs.sort((a, b) => a.state.localeCompare(b.state) || a.width - b.width)) {
  const r = d.result;
  md += `| ${d.owner} | ${d.state} | ${d.width} | ${d.who ?? 'guest'} | ${r.role} | ${r.accName} | ${r.modal ?? '-'} | ${yn(r.focusInside)} | ${yn(r.trapOk)} | ${yn(r.escape)} (${yn(r.escapeFocus)}) | ${yn(r.x)} (${yn(r.xFocus)}) | ${yn(r.backdrop)} (${yn(r.backdropFocus)}) | ${d.problems.join('; ') || 'none'} |\n`;
}
md += `\n## Game semantics (screen reader)\n\n`;
for (const s of sr) md += `- ${s.owner} ${s.state} at ${s.width}: ${s.timer ? `timer "${s.timer}", ` : ''}${s.focusedOnQuestion ? `focus on ${s.focusedOnQuestion}, ` : ''}answers group ${s.answersGroup}, live region after an answer "${s.afterAnswer}", at the end "${s.atEnd}", H1 ${JSON.stringify(s.h1)}\n`;
fs.writeFileSync(out, md);
process.stdout.write(md);
