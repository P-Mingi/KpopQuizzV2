#!/usr/bin/env node
// Lists every failing landmark (and driver failure, horizontal scroll) of the pixel
// verdicts, grouped by state + landmark + identical mismatch across the four combos, in
// the issue line format of CHECKERS.md. Prints candidates; the reviewed lines are
// written to v11/issues/<owner>.md by hand (each one checked on the evidence first).

import fs from 'node:fs';
import path from 'node:path';

import { STATES, WT } from './drivers.mjs';

const DIR = path.join(WT, 'docs/design/ux-dashboard-v1/v11/checks/pixel');
const groups = new Map();
for (const id of Object.keys(STATES)) {
  const f = path.join(DIR, id, 'verdict.json');
  if (!fs.existsSync(f)) continue;
  const v = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [combo, c] of Object.entries(v.combos)) {
    if (c.verdict !== 'fail') continue;
    const [w, theme] = combo.split('-');
    const items = [];
    if (c.reason) items.push({ lm: 'driver', exp: 'state reached', act: c.reason });
    if (w === '390' && c.overflowX > 0) items.push({ lm: 'page', exp: 'no horizontal scroll at 390', act: `document scrolls ${c.overflowX}px sideways` });
    for (const r of c.landmarks ?? []) {
      if (r.status === 'missing') items.push({ lm: r.name, exp: `${r.proto} present`, act: `${r.impl} not rendered` });
      if (r.status !== 'fail') continue;
      const hard = r.mismatches.filter((m) => !m.info);
      items.push({ lm: r.name, exp: hard.map((m) => `${m.what} ${m.expected}`).join('; '), act: hard.map((m) => `${m.what} ${m.actual}`).join('; '), sel: `${r.proto} -> ${r.impl}` });
    }
    for (const it of items) {
      const key = `${id}|${it.lm}|${it.exp.replace(/-?[\d.]+px|-?\d+(\.\d+)?/g, 'N')}|${it.act.replace(/-?[\d.]+px|-?\d+(\.\d+)?/g, 'N')}`;
      const g = groups.get(key) ?? { id, owner: STATES[id].owner, lm: it.lm, sel: it.sel, rows: [] };
      g.rows.push({ w, theme, exp: it.exp, act: it.act });
      groups.set(key, g);
    }
  }
}
for (const g of groups.values()) {
  const ws = [...new Set(g.rows.map((r) => r.w))].join(',');
  const ts = [...new Set(g.rows.map((r) => r.theme))].join(',');
  const r0 = g.rows[0];
  console.log(`${g.owner} | ${g.id}: ${g.lm}${g.sel ? ` (${g.sel})` : ''} | ${ws} | ${ts} | ${r0.exp} | ${r0.act} | checks/pixel/${g.id}/${r0.w}-${r0.theme}-side.webp`);
}
