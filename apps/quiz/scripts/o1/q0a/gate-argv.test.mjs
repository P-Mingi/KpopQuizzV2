// Run O1, lane Q0a: the Playwright argument vectors of the gate plan, listed by the installed Playwright
// (node --test apps/quiz/scripts/o1/q0a/*.test.mjs). gate-checks.sh runs `playwright test <pw>` with the plan's `pw`
// of each check and nothing else, so listing the same vector here proves what each gate line would run: the files and
// the project. Review Q0a r2 M1: a file filter after `--project <name>` was read as a project name, so leak-content
// and lane-specs stopped with `Project(s) "<file>" not found` on every run; the control case below is that vector.
// No browser starts (`--list`), no server, no network.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { CONTENT_LEAK_FILE, PW_CONFIG, plan } from './gate-plan.mjs';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'); // apps/quiz
const PW = path.join(APP, 'node_modules/.bin/playwright');
const LEAK_FILES = fs.readdirSync(path.join(APP, 'e2e/o1/leak')).filter((f) => f.endsWith('.o1.ts')).map((f) => `leak/${f}`).sort();

const facts = (over = {}) => ({
  lane: 'X', sites: ['kpop', 'anime', 'hub'], dbenv: 'offline', given: {}, kpopGivenSource: 'gate',
  build: { kpop: true, anime: true, hub: true }, parity: 'none', kept: false, keptReason: '',
  wired: { anime: true, hub: true }, requireWired: { anime: false, hub: false },
  sitemapRoute: { anime: { head: false, base: false }, hub: { head: false, base: false } },
  siteScopeScript: false, scopeModule: false, laneSpecs: [], laneSpecsMissing: [], harnessTests: [],
  ...over,
});
const check = (p, name) => p.checks.find((c) => c.name === name);

/** `playwright test --list --reporter=json <pw>` in `cwd`: exit status, files listed (relative to testDir), projects. */
function list(cwd, pw) {
  const r = spawnSync(PW, ['test', '--list', '--reporter=json', ...pw], {
    cwd, encoding: 'utf8', timeout: 120_000, env: { ...process.env, O1_PW_REPORT: '', FORCE_COLOR: '0' },
  });
  const files = new Set(); const projects = new Set();
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* an error before the listing: no JSON */ }
  const walk = (s) => {
    for (const x of s.suites || []) walk(x);
    for (const sp of s.specs || []) { files.add(sp.file); for (const t of sp.tests || []) projects.add(t.projectName); }
  };
  for (const s of json?.suites || []) walk(s);
  return { status: r.status, files: [...files].sort(), projects: [...projects].sort(), out: `${r.stdout}\n${r.stderr}`.slice(0, 2000) };
}

test('the installed Playwright and the O1 config are where gate-checks.sh calls them', () => {
  assert.ok(fs.existsSync(PW), `${PW} is missing`);
  assert.ok(fs.existsSync(path.join(APP, PW_CONFIG)), `${PW_CONFIG} is missing`);
  assert.ok(LEAK_FILES.includes(CONTENT_LEAK_FILE), `${CONTENT_LEAK_FILE} is not in e2e/o1/leak`);
});

test('control: the r2 vector (a file after --project <name>) stops before any test, so this test sees the defect', () => {
  const r = list(APP, ['-c', PW_CONFIG, '--project', 'leak', CONTENT_LEAK_FILE]);
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /Project\(s\) "leak\/content-leak\.o1\.ts" not found/);
});

test('leak on gate builds: every file of the leak project, nothing else', () => {
  const c = check(plan(facts()), 'leak');
  assert.equal(c.excludeContent, false);
  const r = list(APP, c.pw);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(r.projects, ['leak']);
  assert.deepEqual(r.files, LEAK_FILES);
});

test('leak with the kept parity build: every leak file but the content leak; leak-content in phase B: the content leak alone', () => {
  const p = plan(facts({ parity: 'ran', kept: true, dbenv: 'dev' }));
  const leak = check(p, 'leak');
  assert.equal(leak.excludeContent, true);
  const a = list(APP, leak.pw);
  assert.equal(a.status, 0, a.out);
  assert.deepEqual(a.projects, ['leak']);
  assert.deepEqual(a.files, LEAK_FILES.filter((f) => f !== CONTENT_LEAK_FILE));
  const lc = check(p, 'leak-content');
  assert.equal(`${lc.phase}:${lc.action}`, 'B:run');
  const b = list(APP, lc.pw);
  assert.equal(b.status, 0, b.out);
  assert.deepEqual(b.projects, ['leak']);
  assert.deepEqual(b.files, [CONTENT_LEAK_FILE]);
});

test('lane-specs: exactly the listed specs of the lane, in project lanes, on a stand-in head with the same config', () => {
  // A stand-in apps/quiz: the head's config, the installed node_modules, two specs of lane X and one leak file.
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'o1-gate-argv-'));
  try {
    const app = path.join(d, 'apps/quiz');
    fs.mkdirSync(path.join(app, 'e2e/o1/X'), { recursive: true });
    fs.mkdirSync(path.join(app, 'e2e/o1/leak'), { recursive: true });
    fs.copyFileSync(path.join(APP, PW_CONFIG), path.join(app, PW_CONFIG));
    fs.symlinkSync(fs.realpathSync(path.join(APP, 'node_modules')), path.join(app, 'node_modules'));
    const spec = (title) => `import { test } from '@playwright/test';\ntest(${JSON.stringify(title)}, () => {});\n`;
    fs.writeFileSync(path.join(app, 'e2e/o1/X/a.o1.ts'), spec('a'));
    fs.writeFileSync(path.join(app, 'e2e/o1/X/b.o1.ts'), spec('b'));
    fs.writeFileSync(path.join(app, 'e2e/o1/leak/z.o1.ts'), spec('z'));
    const one = check(plan(facts({ laneSpecs: ['apps/quiz/e2e/o1/X/a.o1.ts'] })), 'lane-specs');
    assert.equal(one.action, 'run');
    const r1 = list(app, one.pw);
    assert.equal(r1.status, 0, r1.out);
    assert.deepEqual(r1.projects, ['lanes']);
    assert.deepEqual(r1.files, ['X/a.o1.ts']);
    // Phase B (kept parity build plus a dev kpop build): the same vector shape, both specs.
    const two = check(plan(facts({ parity: 'ran', kept: true, dbenv: 'dev', laneSpecs: ['apps/quiz/e2e/o1/X/a.o1.ts', 'apps/quiz/e2e/o1/X/b.o1.ts'] })), 'lane-specs');
    assert.equal(`${two.phase}:${two.action}`, 'B:run');
    const r2 = list(app, two.pw);
    assert.equal(r2.status, 0, r2.out);
    assert.deepEqual(r2.projects, ['lanes']);
    assert.deepEqual(r2.files, ['X/a.o1.ts', 'X/b.o1.ts']);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
