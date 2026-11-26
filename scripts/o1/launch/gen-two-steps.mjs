#!/usr/bin/env node
// Otakudle in two steps (owner request of 2026-11-26, lane OTK-E, run O1): writes the data files L42a of step 2 from docs/anime/data/dle/step2/.
//
//   node scripts/o1/launch/gen-two-steps.mjs [--data <folder>] [--series <folder>] [--out <folder>] [--max-bytes <n>] [--check]
//
// Reads  docs/anime/data/dle/step2/<series-slug>.json (the columns and the values of each series, validated by validateSeries: the contract of the owner's request)
//        and docs/anime/data/series/<series-slug>.json (the characters and the arcs of each series).
// Writes docs/pending-migrations/multisite/launch/L42a-l1-otakudle-two-steps-data.sql and its rollback (L42a1, L42a2 ... when one file would pass --max-bytes, 1.2 MB by default:
//        the Supabase SQL Editor takes about 1.5 MB). L42-l1-otakudle-two-steps.sql (the engine) is hand written.
// --check: writes nothing, prints the counts. Same input, same output.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildData, l04Characters, validateSeries } from './dle-step2.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };

/** [{data, series}] of a folder of step 2 files, sorted by slug; throws with every problem of the contract. */
export function readInputs(dataDir, seriesDir, l04File = path.join(ROOT, 'docs/pending-migrations/multisite/launch/L04-K1-series.sql')) {
  const l04 = l04Characters(readFileSync(l04File, 'utf8'));
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  const inputs = [];
  const bad = [];
  for (const f of files) {
    const raw = readFileSync(path.join(dataDir, f), 'utf8');
    const data = JSON.parse(raw);
    if (`${data.series_slug}.json` !== f) bad.push(`${f}: series_slug is ${data.series_slug}`);
    const series = { ...JSON.parse(readFileSync(path.join(seriesDir, f), 'utf8')), characters: l04.get(f.slice(0, -5)) ?? [] };
    bad.push(...validateSeries(data, series, raw));
    inputs.push({ data, series });
  }
  if (bad.length) throw new Error(`the data does not hold the contract:\n${bad.join('\n')}`);
  return inputs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inputs = readInputs(arg('data', path.join(ROOT, 'docs/anime/data/dle/step2')), arg('series', path.join(ROOT, 'docs/anime/data/series')));
  const files = buildData(inputs, { maxBytes: Number(arg('max-bytes', 1_200_000)) });
  for (const f of files) console.log(`${f.name}: ${f.series.length} series, ${f.rows.facts} facts, ${f.rows.sources} sources, ${Buffer.byteLength(f.sql)} bytes`);
  if (!process.argv.includes('--check')) {
    const dir = arg('out', path.join(ROOT, 'docs/pending-migrations/multisite/launch'));
    mkdirSync(dir, { recursive: true });
    for (const f of files) {
      writeFileSync(path.join(dir, f.name), f.sql);
      writeFileSync(path.join(dir, f.rollbackName), f.rollback);
      console.log(`written: ${path.join(dir, f.name)}`);
    }
  }
}
