// Run O1, lane E1a: runs a fixture case. A case is the passing dataset with the files of fixtures/fail/<case>/data
// laid over it, copied to a temporary folder so that the checks see one coherent data folder.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChecks } from '../lib/run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PASS_DATA = join(HERE, 'pass/data');
export const INSPIRATION = join(HERE, 'inspiration-titles.json');
export const NOW = '2026-10-20T00:00:00Z';
export const caseNames = () => readdirSync(join(HERE, 'fail')).filter((n) => existsSync(join(HERE, 'fail', n, 'expect.json'))).sort();

export function loadExpect(name) { return JSON.parse(readFileSync(join(HERE, 'fail', name, 'expect.json'), 'utf8')); }

/** Copies the passing data and the case's files to a temp folder; returns { root, dataDir, target, expect, done }. */
export function materialize(name) {
  const root = mkdtempSync(join(tmpdir(), 'e1a-case-'));
  cpSync(PASS_DATA, join(root, 'data'), { recursive: true });
  const expect = loadExpect(name);
  cpSync(join(HERE, 'fail', name, 'data'), join(root, 'data'), { recursive: true });
  return { root, dataDir: join(root, 'data'), target: join(root, expect.target), expect, done: () => rmSync(root, { recursive: true, force: true }) };
}

export function runCase(name, extra = {}) {
  const c = materialize(name);
  try {
    const report = runChecks([c.target], { dataDir: c.dataDir, inspiration: INSPIRATION, now: NOW, ...extra });
    return { report, expect: c.expect };
  } finally { c.done(); }
}

/** The check codes that fail in a report. */
export function failingCodes(report) {
  const out = new Set();
  for (const e of report.entries) for (const c of e.result.checks) if (!c.pass) out.add(c.code);
  return [...out].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

export function runPass(extra = {}) {
  return runChecks([PASS_DATA], { inspiration: INSPIRATION, now: NOW, ...extra });
}

export const REL = {
  series: 'series/death-note.json',
  facts: 'facts/death-note.json',
  quiz: 'quizzes/death-note/death-note-basics-who-made-it.json',
  daily: 'daily/death-note-true-false-1.json',
};

/**
 * Copies the passing data to a temp folder, lets edit({ dir, read, write }) change it, runs the checks on the
 * given files (paths relative to the data folder) and returns the report.
 */
export function runWith(edit, targetRels, extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'e1a-with-'));
  const dir = join(root, 'data');
  cpSync(PASS_DATA, dir, { recursive: true });
  const api = {
    dir,
    read: (rel) => JSON.parse(readFileSync(join(dir, rel), 'utf8')),
    write: (rel, obj) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), JSON.stringify(obj, null, 1)); },
  };
  try {
    edit(api);
    return runChecks(targetRels.map((r) => join(dir, r)), { dataDir: dir, inspiration: INSPIRATION, now: NOW, ...extra });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

/** The result of one check code on the first item of a report. */
export const codeOf = (report, code, i = 0) => report.entries[i].result.checks.find((c) => c.code === code);
