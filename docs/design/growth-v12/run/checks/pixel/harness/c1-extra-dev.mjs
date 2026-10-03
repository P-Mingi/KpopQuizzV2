#!/usr/bin/env node
// C1 (V12 run): applies the owner deviations (deviations.mjs: v11 A0 fix 5 warm ground and surfaces, fix 8 94% glass)
// to the extra checks' verdicts. A mismatch is cleared only when the actual value IS the deviated value of the
// expected one (exact), and is kept in `deviated` with its reason; nothing else changes. Theme tokens: the five
// tokens behind those deviations, prototype value -> shipped value.
import fs from 'node:fs';
import path from 'node:path';
import { WT } from './drivers-v11.mjs';
import { devValue } from './deviations.mjs';

const DIR = path.join(WT, 'docs/design/growth-v12/run/checks/pixel/_extra');
const TOKENS = { '--page': ['#FFFFFF', '#FAF8F5'], '--surface': ['#F7F6F4', '#F1EFEA'], '--surface-2': ['#F0EEEA', '#EAE7E1'], '--pink-ink': ['#C93868', '#C43565'], '--nav-bg': ['rgba(255,255,255,.86)', 'rgba(250, 248, 245, .94)'] };
const n = (v) => String(v ?? '').replace(/\s+/g, '').toLowerCase();

for (const file of ['verdict.json', 'verdict-v12.json']) {
  const f = path.join(DIR, file);
  if (!fs.existsSync(f)) continue;
  const V = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const kind of ['hover', 'focus']) {
    for (const [key, x] of Object.entries(V[kind] ?? {})) {
      const theme = key.endsWith('-dark') ? 'dark' : 'light';
      const keep = []; const dev = [...(x.deviated ?? [])];
      for (const m of x.mismatches) {
        const prop = m.what.split(' ').pop();
        if (devValue(theme, '*', prop, m.expected) === m.actual) dev.push({ ...m, why: 'owner deviation (v11 A0 fix 5 / fix 8)' }); else keep.push(m);
      }
      x.mismatches = keep; x.deviated = dev; x.verdict = keep.length ? 'fail' : 'pass';
    }
  }
  for (const [theme, t] of Object.entries(V.tokens ?? {})) {
    if (theme !== 'light') continue;
    const keep = []; const dev = [...(t.deviated ?? [])];
    for (const m of t.mismatches) (TOKENS[m.what] && n(TOKENS[m.what][0]) === n(m.expected) && n(TOKENS[m.what][1]) === n(m.actual) ? dev : keep).push(m);
    t.mismatches = keep; t.deviated = dev; t.verdict = keep.length ? 'fail' : 'pass';
  }
  fs.writeFileSync(f, JSON.stringify(V, null, 1));
  const sum = (k) => Object.fromEntries(Object.entries(V[k] ?? {}).map(([a, b]) => [a, b.verdict]));
  console.log(file, JSON.stringify({ hover: sum('hover'), focus: sum('focus'), tokens: sum('tokens'), motion: sum('motion') }));
}
