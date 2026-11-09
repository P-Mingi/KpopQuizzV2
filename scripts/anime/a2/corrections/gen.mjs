#!/usr/bin/env node
// node scripts/anime/a2/corrections/gen.mjs [--out <folder>] [--check] : writes L21, L22 and L23 and their rollbacks from the specs and the (corrected) data.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { LAUNCH, load } from './engine.mjs';
import { writeL21 } from './gen-l21.mjs';

const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : f; };
const D = load();
const out = arg('out', LAUNCH);
const L = writeL21(D, '2026-11-02');
console.log(`L21: ${L.plan.rows.length} rows, ${L.plan.srcs.length} source moves, answers ${JSON.stringify(L.before)} -> ${JSON.stringify(L.after)}`);
if (!process.argv.includes('--check')) {
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, 'L21-l1-series-games-corrections.sql'), L.up);
  writeFileSync(path.join(out, 'L21-l1-series-games-corrections.rollback.sql'), L.down);
  console.log(`written in ${out}`);
}
