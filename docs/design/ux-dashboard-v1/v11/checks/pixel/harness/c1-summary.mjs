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
// Every relaxation of the default comparison, with its reason (drivers.mjs `why`), so a
// reviewer can judge each one.
const notes = [];
for (const [id, st] of Object.entries(STATES)) {
  const items = st.lm.filter((l) => l.why || l.phoneBox || l.relTo).map((l) => `${l.name}${l.skip ? ` (styles not compared: ${l.skip.join(', ')})` : ''}${l.phoneBox ? ` (390 box: ${l.phoneBox.join(', ')})` : ''}${l.relTo ? ` (top from ${l.relTo})` : ''}: ${l.why ?? ''}`);
  if (st.note) items.unshift(`state: ${st.note}`);
  if (items.length) notes.push(`- **${id}**: ${items.join('; ')}`);
}
const OBSERVED = [
  'Leaderboard: the H1 "Community", its intro and the "Around the community" section are the live page\'s (SEO lock, P9 report); the prototype H1 is "Leaderboard". Landmarks pass; the page is longer.',
  'Group hubs: the SEO-locked lead and the extra side sections (newest quizzes, read more, fan knowledge) make the page longer; landmarks pass.',
  'Signed-in home: no "Continue playing" and no streak pill (the test user has no unfinished run and no streak): real data.',
  'Community feed: some thread titles stop mid-word at 80 characters; the post page H1 shows the same stored Verse title (data, not layout; noted for P8 / C3).',
  'Passport states are checked as a guest on /u/testtest (owner decision 1): no owner controls, initials instead of a photo.',
  'Header sheet reference: the page behind the scrim shows the Badges tab (the capture reached it from passport-badges); only the sheet is compared.',
  'Settings: Appearance shows the theme the checker forces (localStorage theme); the reference shows System.',
  'Game states use the page agents\' fixtures where the specs do (blindtest questions and silent audio, P6; notifications rows, P11); quiz runs are real questions with the save stubbed (so the results show no "beat" percentile).',
];
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

## Comparison notes (every relaxation and its reason)

Default per landmark: the box parts listed in \`drivers.mjs\` within 2px and all 16 style props.
Photos: fill and initials-fallback text styles are not compared (box, radius, photo edge are).
A radius on a box with no fill, border or shadow is not compared (invisible; the prototype H1
radius is its focus style). A photo edge drawn by an \`::after\` overlay counts as the inset shadow.

${notes.join('\n')}

## Observed, not filed (real data, SEO lock, harness)

${OBSERVED.map((o) => `- ${o}`).join('\n')}

Issues filed: \`v11/issues/<owner>.md\` (ids C1-nnn).
`;
fs.writeFileSync(path.join(DIR, 'README.md'), md);
console.log(JSON.stringify(tally));
