#!/usr/bin/env node
// Builds v11/checks/pixel/README.md (summary table) from every <state>/verdict.json and
// _extra/verdict.json. Issues are written by hand-reviewed runs of c1-issues.mjs.

import fs from 'node:fs';
import path from 'node:path';

import { STATES, WT } from './drivers.mjs';

const DIR = path.join(WT, 'docs/design/ux-dashboard-v1/v11/checks/pixel');
const COMBOS = ['1440-light', '1440-dark', '390-light', '390-dark'];
const cell = (c) => {
  if (!c) return 'not run';
  const v = c.verdict === 'pass' ? 'pass' : c.verdict === 'fail' ? '**fail**' : 'not verified';
  const n = c.counts ? ` ${c.counts.pass}/${c.counts.landmarks - c.counts.absent - c.counts.extra}` : '';
  return `${v}${n}${c.pixel ? `, ${c.pixel.diffPct}%` : ''}`;
};
const rows = [];
const tally = { pass: 0, fail: 0, 'not verified': 0, 'not run': 0 };
for (const id of Object.keys(STATES)) {
  const f = path.join(DIR, id, 'verdict.json');
  const v = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { combos: {} };
  for (const k of COMBOS) tally[v.combos[k]?.verdict ?? 'not run']++;
  const fails = [...new Set(COMBOS.flatMap((k) => (v.combos[k]?.landmarks ?? []).filter((r) => r.status === 'fail' || r.status === 'missing').map((r) => r.name)))];
  const why = STATES[id].pending ? STATES[id].pending : fails.length ? `fails: ${fails.join(', ')}` : '';
  const errs = [...new Set(COMBOS.map((k) => v.combos[k]?.reason).filter((r) => r && r.startsWith('driver')))];
  rows.push(`| ${id} | ${STATES[id].owner} | ${COMBOS.map((k) => cell(v.combos[k])).join(' | ')} | ${[why, ...errs].filter(Boolean).join('; ').replace(/\|/g, '/')} |`);
}
let extra = '';
const ef = path.join(DIR, '_extra/verdict.json');
if (fs.existsSync(ef)) {
  const e = JSON.parse(fs.readFileSync(ef, 'utf8'));
  const line = (group) => Object.entries(e[group] ?? {}).filter(([, x]) => x.verdict).map(([k, x]) => `${k}: ${x.verdict === 'pass' ? 'pass' : '**fail**'}`).join(', ');
  extra = ['', '## Extra checks (`_extra/verdict.json`)', '', '| Check | Result |', '|---|---|',
    `| Nav fits at 1280 and 1440 (one line, no overlap, no truncation) | ${line('nav')} |`,
    `| Hover (cards, buttons, tabs, rows, nav links) vs the prototype :hover | ${line('hover')} |`,
    `| Keyboard focus ring vs the prototype :focus-visible | ${line('focus')} |`,
    `| Theme tokens (prototype --x vs --ux-x) | ${line('tokens')} |`,
    `| Reduced motion (no running infinite animation, transitions off) | ${line('motion')} |`].join('\n');
}
const md = `# C1 pixel check (UX v11.2, Phase 3)

Branch \`ux11/c1-check\`. Implementation: the shared flag-ON production build of \`feat/ux-v1-v11\` on
http://localhost:3021 (head in each \`verdict.json\`: \`at\`, \`url\`). Reference:
\`v11/checks/reference/<w>-<theme>-<state>.png\` + \`styles.json\` (\`v11/capture-prototype.mjs\`).
Harness: \`harness/c1-pixel.mjs\` (drivers and landmark maps in \`harness/drivers.mjs\`), extra
checks \`harness/c1-extra.mjs\`, this table \`harness/c1-summary.mjs\`.

Per state and combo: landmark boxes within 2px (x, y, w, h as listed per landmark; text-driven
heights are not compared), computed styles equal to \`styles.json\` for its 27 landmarks and to
the prototype measured live in the same state for the others (px within 0.5), no horizontal
scroll at 390, and a masked pixel diff (photos and text masked on both sides; information only,
real data changes the page length). Cells: verdict, landmarks passed / compared, masked diff %.
Evidence: \`<state>/<w>-<theme>-side.webp\` (reference | implementation), \`-diff.webp\` (red =
differs, blue = masked), \`verdict.json\` (every number). No production write: every mutating
request was answered locally (payloads in \`verdict.json\` \`writes\`).

Totals (152 checks): pass ${tally.pass}, fail ${tally.fail}, not verified ${tally['not verified']}${tally['not run'] ? `, not run ${tally['not run']}` : ''}.

| State | Owner | 1440 light | 1440 dark | 390 light | 390 dark | Notes |
|---|---|---|---|---|---|---|
${rows.join('\n')}
${extra}

Issues filed: \`v11/issues/<owner>.md\` (ids C1-nnn).
`;
fs.writeFileSync(path.join(DIR, 'README.md'), md);
console.log(JSON.stringify(tally));
