// Run O1, lane E1a: the command line of check.mjs (exit codes, text and JSON reports).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSPIRATION, NOW, PASS_DATA, materialize } from './fixtures/runner.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK = join(HERE, 'check.mjs');
const run = (args) => spawnSync(process.execPath, [CHECK, ...args], { encoding: 'utf8' });
const base = ['--inspiration', INSPIRATION, '--now', NOW];

test('check.mjs exits 0 on the passing dataset and says so', () => {
  const r = run([PASS_DATA, ...base]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^OK: 4 files, 4 items, 4 pass, 0 fail/m);
});

test('check.mjs exits 1 on a failing fixture and prints the failing check with its location', () => {
  const c = materialize('c05-spoiler-mismatch');
  try {
    const r = run([c.target, '--data', c.dataDir, ...base]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /C5 FAIL q9 \/questions\/8\/spoiler: tagged arc 0 but the cited fact dn-near-015 spoils from arc 2/);
    assert.match(r.stdout, /^FAILED: /m);
  } finally { c.done(); }
});

test('check.mjs reads the data folder from the file path when --data is not given', () => {
  const c = materialize('c04-unbacked');
  try {
    const r = run([c.target, '--inspiration', INSPIRATION, '--now', NOW]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /C4 FAIL q1/);
  } finally { c.done(); }
});

test('check.mjs --json prints one JSON document with the 14 checks of every item', () => {
  const c = materialize('c07-copy');
  try {
    const r = run([c.target, '--json', '--data', c.dataDir, ...base]);
    assert.equal(r.status, 1);
    const j = JSON.parse(r.stdout);
    assert.equal(j.tool, 'e1a-check');
    assert.equal(j.ok, false);
    assert.equal(j.thresholds.c7_run_words, 8);
    assert.equal(j.summary.failed, 1);
    assert.deepEqual(j.summary.failed_by_code, { C7: 1 });
    const item = j.files[0].items[0];
    assert.equal(item.checks.length, 14);
    assert.deepEqual(item.checks.map((x) => x.code), Array.from({ length: 14 }, (_, i) => `C${i + 1}`));
    assert.equal(item.checks.find((x) => x.code === 'C7').notes[0].q, 1);
  } finally { c.done(); }
});

test('check.mjs exits 2 on a usage error, an unknown option or a missing path', () => {
  assert.equal(run([]).status, 2);
  assert.equal(run([PASS_DATA, '--nope']).status, 2);
  assert.equal(run(['/no/such/path.json']).status, 2);
  assert.equal(run([PASS_DATA, '--data']).status, 2);
});

test('check.mjs takes several files and folders and reports all of them', () => {
  const r = run([join(PASS_DATA, 'series'), join(PASS_DATA, 'quizzes'), ...base]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /OK: 2 files, 2 items/);
});
