#!/usr/bin/env node
// Run O1, lane K1: the owner's switch from draft to verified for the anime facts, after the owner has read the packet
// docs/anime/editorial/packets/facts-30.html and said ok.
//
//   node scripts/anime/k1/verify-facts.mjs [--data docs/anime/data] [--apply] [--hold-single-source] [--list]
//
// Dry run by default: it prints what it would do and writes nothing. With --apply it sets every fact of
// <data>/facts/*.json that is not rejected to status "verified" and stamps verified_at (one timestamp for the whole
// run). A rejected fact is never touched; a fact that is already verified keeps its verified_at.
// The sourcing rule of the editorial check (C2) wants two sources, one of them Wikidata or official, on a verified
// load bearing fact. The run lists the facts that lack the second source. By default they are verified like the others
// (the owner's decision is "every fact that is not rejected"); with --hold-single-source they stay draft instead, so
// that `check.mjs` has nothing to fail on.
// After --apply, `node scripts/anime/k1/load-fixtures.mjs <target> --data <data>` publishes each verified fact that has a
// text as a published trivia row (data-load.mjs maps verified to published).

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STRONG = new Set(['wikidata', 'official']);

/** True when a load bearing fact lacks the second source (two sources, one of them Wikidata or official). */
export function lacksSecondSource(f) {
  if (f.load_bearing !== true) return false;
  const s = Array.isArray(f.sources) ? f.sources : [];
  return !(s.length >= 2 && s.some((x) => STRONG.has(x?.source)));
}

/** Rewrites a facts file in the layout it already has (JSON.stringify with 1, 2 or 4 spaces, with or without a final newline). */
function rewrite(raw, mutate) {
  const data = JSON.parse(raw);
  const nl = raw.endsWith('\n') ? '\n' : '';
  const indent = [2, 1, 4].find((n) => JSON.stringify(data, null, n) + nl === raw);
  if (indent === undefined) throw new Error('not in a 1, 2 or 4 space JSON layout: the file would be reformatted');
  const counts = mutate(data);
  return { text: JSON.stringify(data, null, indent) + nl, counts };
}

/** Plans (and, with apply, performs) the switch. Pure over the directory; `now` is an ISO string. */
export function verifyFacts(dataDir, { apply = false, holdSingleSource = false, now = new Date().toISOString() } = {}) {
  const dir = join(dataDir, 'facts');
  if (!existsSync(dir)) throw new Error(`no facts directory in ${dataDir}`);
  const total = { files: 0, facts: 0, toVerify: 0, alreadyVerified: 0, rejected: 0, draftHeld: 0, singleSource: [], changedFiles: [] };
  for (const name of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const path = join(dir, name);
    const raw = readFileSync(path, 'utf8');
    let changed = 0;
    const { text } = rewrite(raw, (facts) => {
      if (!Array.isArray(facts)) throw new Error(`${name}: expected an array of facts`);
      for (let i = 0; i < facts.length; i += 1) {
        const f = facts[i];
        total.facts += 1;
        if (f.status === 'rejected') { total.rejected += 1; continue; }
        if (f.status === 'verified') { total.alreadyVerified += 1; continue; }
        const weak = lacksSecondSource(f);
        if (weak) total.singleSource.push(f.id);
        if (weak && holdSingleSource) { total.draftHeld += 1; continue; }
        total.toVerify += 1; changed += 1;
        if (!apply) continue;
        // keep the key order: verified_at right after status
        const out = {};
        for (const [k, v] of Object.entries(f)) { if (k === 'verified_at') continue; out[k] = k === 'status' ? 'verified' : v; if (k === 'status') out.verified_at = now; }
        facts[i] = out;
      }
    });
    total.files += 1;
    if (changed > 0) { total.changedFiles.push(name); if (apply) writeFileSync(path, text); }
  }
  return total;
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--') && a !== '--data'));
  const di = argv.indexOf('--data');
  const dataDir = resolve(di >= 0 ? argv[di + 1] : 'docs/anime/data');
  const apply = flags.has('--apply');
  const r = verifyFacts(dataDir, { apply, holdSingleSource: flags.has('--hold-single-source') });
  const verb = apply ? 'verified' : 'would verify';
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} ${dataDir}`);
  console.log(`${r.facts} facts in ${r.files} files: ${verb} ${r.toVerify}, already verified ${r.alreadyVerified}, rejected and untouched ${r.rejected}${r.draftHeld ? `, held as draft ${r.draftHeld}` : ''}`);
  console.log(`load bearing facts without a second Wikidata or official source (check C2 fails them once verified): ${r.singleSource.length}${flags.has('--hold-single-source') ? ' (held)' : ''}`);
  const shown = flags.has('--list') ? r.singleSource : r.singleSource.slice(0, 15);
  if (shown.length > 0) console.log(`${shown.map((x) => `  ${x}`).join('\n')}${shown.length < r.singleSource.length ? `\n  ... and ${r.singleSource.length - shown.length} more (--list shows all)` : ''}`);
  if (!apply) console.log('Nothing written. Add --apply to write the files.');
  else console.log(`Wrote ${r.changedFiles.length} files. Next: node scripts/anime/k1/load-fixtures.mjs dev --data ${dataDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
