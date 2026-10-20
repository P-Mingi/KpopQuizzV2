#!/usr/bin/env node
// Run O1, lot f, lane E1a: the review packet of a batch, one self-contained HTML file.
//
//   node scripts/anime/editorial/packet.mjs --batch <name> <files...> --out docs/anime/editorial/packets/<name>.html
//        [--lane K2] [--seed <text>] [--fraction 0.25] [--created-at <iso>] [--note <text>] [--data <dir>] [--inspiration <file>] [--facts-draft-ok]
//
// Runs the checks C1 to C14 (check.mjs) on the files, then writes: summary counts, every flagged item first with its
// failing checks, a seeded 25 percent sample of the questions (the seed is printed in the page and can be passed back
// with --seed), the titles and spoiler labels, and every item. Each question shows its answer and options next to the
// cited facts and source links; each series shows its facts with their sources and stored excerpts.
// Plain HTML and CSS: no script, no external asset; it reads on a phone. Exit 0 once the packet is written (a flagged
// item is not an error here: it is what the packet is for), 2 on a usage or read error.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { REPO_ROOT } from './lib/schema.mjs';
import { runChecks } from './lib/run.mjs';
import { drawSample, defaultSeed, unitsOf } from './lib/sample.mjs';
import { renderPacket } from './lib/html.mjs';
import { isMain, parseArgs } from './lib/args.mjs';
import { THRESHOLDS } from './lib/thresholds.mjs';

const HELP = 'usage: node scripts/anime/editorial/packet.mjs --batch <name> <files...> [--out <file.html>] [--lane K2] [--seed <text>] [--fraction 0.25] [--created-at <iso>] [--note <text>] [--data <dir>] [--inspiration <file>] [--facts-draft-ok]';

const laneOf = (entries) => {
  const kinds = new Set(entries.map((e) => e.item.kind));
  if (kinds.has('daily') && !kinds.has('quiz')) return 'K3';
  if (kinds.has('quiz')) return 'K2';
  return 'K1';
};

/** Builds the packet for already run checks: returns { html, model }. Pure apart from the clock default. */
export function buildPacket(report, opts) {
  const entries = report.entries;
  const createdAt = opts.createdAt ?? new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z');
  const fraction = opts.fraction ?? THRESHOLDS.sample_fraction;
  const seed = opts.seed ?? defaultSeed(opts.batch, createdAt, unitsOf(entries));
  const sample = drawSample(entries, { fraction, seed });
  const model = { batch: opts.batch, note: opts.note, lane: opts.lane ?? laneOf(entries), seed, fraction, createdAt, entries, ctx: report.ctx, sample, thresholds: report.ctx.thresholds };
  return { html: renderPacket(model), model };
}

if (isMain(import.meta.url)) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['--batch', '--out', '--lane', '--seed', '--fraction', '--created-at', '--data', '--inspiration', '--now', '--note'], ['--facts-draft-ok', '--help']);
  } catch (e) { console.error(`${e.message}\n${HELP}`); process.exit(2); }
  const f = args.flags;
  if (f['--help']) { console.error(HELP); process.exit(0); }
  const batch = f['--batch'];
  if (!batch || !/^[A-Za-z0-9._-]{1,60}$/.test(batch) || args.paths.length === 0) { console.error(HELP); process.exit(2); }
  const fraction = f['--fraction'] === undefined ? undefined : Number(f['--fraction']);
  if (fraction !== undefined && !(fraction > 0 && fraction <= 1)) { console.error('--fraction must be above 0 and at most 1'); process.exit(2); }
  try {
    const report = runChecks(args.paths, { dataDir: f['--data'], inspiration: f['--inspiration'], allowDraftFacts: Boolean(f['--facts-draft-ok']), now: f['--now'] });
    if (report.entries.length === 0) { console.error('packet: no content file in the given paths'); process.exit(2); }
    const { html, model } = buildPacket(report, { batch, lane: f['--lane'], seed: f['--seed'], fraction, createdAt: f['--created-at'], note: f['--note'] });
    const out = f['--out'] ? resolve(f['--out']) : join(REPO_ROOT, 'docs/anime/editorial/packets', `${batch}.html`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    const s = report.summary;
    console.log(`packet ${out}: ${s.items} items, ${s.failed} flagged, ${s.warnings} warnings, sample ${model.sample.refs.length} of ${model.sample.total} units, seed ${model.seed}${s.items > 50 ? ' (a review batch holds 1 to 50 items: split it)' : ''}`);
  } catch (e) {
    console.error(`packet: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
  }
}
