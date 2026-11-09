#!/usr/bin/env node
// node scripts/anime/a2/corrections/gen.mjs [--out <folder>] [--check] : writes L21, L22 and L23 and their rollbacks from the specs and the (corrected) data.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { LAUNCH, load } from './engine.mjs';
import { writeL21 } from './gen-l21.mjs';
import { writeL22 } from './gen-l22.mjs';
import { writeL23 } from './gen-l23.mjs';

const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : f; };
const D = load();
const out = arg('out', LAUNCH);
const L = writeL21(D, '2026-11-02');
console.log(`L21: ${L.plan.rows.length} rows, ${L.plan.srcs.length} source moves, answers ${JSON.stringify(L.before)} -> ${JSON.stringify(L.after)}`);
const M = writeL22(D);
console.log(`L22: ${M.plan.rows.length} rows, ${M.plan.inserts.length} new rows, ${M.plan.srcs.length} source moves, flips ${M.plan.flips.map((f) => `${f.slug}:${f.from}>${f.to}`).join(' ')}`);
if (!process.argv.includes('--check')) {
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, 'L21-l1-series-games-corrections.sql'), L.up);
  writeFileSync(path.join(out, 'L21-l1-series-games-corrections.rollback.sql'), L.down);
  writeFileSync(path.join(out, 'L22-l1-otakudle-facts-corrections.sql'), M.up);
  writeFileSync(path.join(out, 'L22-l1-otakudle-facts-corrections.rollback.sql'), M.down);
  const N = writeL23();
  writeFileSync(path.join(out, 'L23-l1-otakudle-first-adaptation.sql'), N.up);
  writeFileSync(path.join(out, 'L23-l1-otakudle-first-adaptation.rollback.sql'), N.down);
  console.log(`written in ${out}`);
}
