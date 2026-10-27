// Run O1, lane E1a: the rules this lane's own files must keep, and the sync of fixtures and thresholds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THRESHOLDS } from './lib/thresholds.mjs';
import { buildExamplePacket, buildFixtures } from './fixtures/build.mjs';
import { REPO_ROOT } from './lib/schema.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const OWN = [...walk(HERE), ...(existsSync(join(REPO_ROOT, 'docs/anime/editorial')) ? walk(join(REPO_ROOT, 'docs/anime/editorial')) : [])];

test('the thresholds written in the header of check.mjs are the ones in the code', () => {
  const header = readFileSync(join(HERE, 'check.mjs'), 'utf8').split('\nimport ')[0];
  for (const [key, value] of Object.entries(THRESHOLDS)) assert.ok(new RegExp(`${key} ${String(value).replace('.', '\\.')}(?:\\s|$)`).test(header), `${key} ${value} is not in the header`);
});

test('the fixtures on disk are what build.mjs makes', () => {
  for (const [rel, text] of buildFixtures()) {
    const path = join(HERE, 'fixtures', rel);
    assert.ok(existsSync(path), `${rel} is missing: run node scripts/anime/editorial/fixtures/build.mjs`);
    assert.equal(readFileSync(path, 'utf8'), text, `${rel} is out of date: run node scripts/anime/editorial/fixtures/build.mjs`);
  }
});

test('the example packet on disk is what packet.mjs makes of the passing dataset', async () => {
  const path = join(HERE, 'fixtures/example-packet.html');
  assert.ok(existsSync(path), 'missing: run node scripts/anime/editorial/fixtures/build.mjs');
  assert.equal(readFileSync(path, 'utf8'), await buildExamplePacket(), 'out of date: run node scripts/anime/editorial/fixtures/build.mjs');
});

test('no file of this lane holds an en dash, an em dash or an emoji', () => {
  const bad = [];
  for (const f of OWN) {
    const text = readFileSync(f, 'utf8');
    if (/[\u{2013}\u{2014}]/u.test(text) || /\p{Extended_Pictographic}/u.test(text)) bad.push(relative(REPO_ROOT, f));
  }
  assert.deepEqual(bad, []);
});

test('no file of this lane makes a network call or reads the secrets folder', () => {
  const bad = [];
  const words = ['fet' + 'ch(', 'node:ht' + 'tp', 'node:ht' + 'tps', 'node:n' + 'et', 'XMLHttp' + 'Request', 'Web' + 'Socket', 'kpq-o1/sec' + 'rets', 'child_process.exec'];
  for (const f of OWN.filter((p) => /\.(mjs|js)$/.test(p) && !p.endsWith('hygiene.test.mjs') && !p.endsWith('cli.test.mjs') && !p.endsWith('packet.test.mjs'))) {
    const text = readFileSync(f, 'utf8');
    for (const w of words) if (text.includes(w)) bad.push(`${relative(REPO_ROOT, f)}: ${w}`);
  }
  assert.deepEqual(bad, []);
});

test('no fixture or committed packet carries an image field or an image link', () => {
  const bad = [];
  for (const f of OWN.filter((p) => p.endsWith('.json') || p.endsWith('.html'))) {
    const text = readFileSync(f, 'utf8');
    if (/"(?:image|image_url|img|photo|cover|artwork|thumbnail)"\s*:/.test(text) && !/fail[\\/]c14/.test(f)) bad.push(relative(REPO_ROOT, f));
    if (/<img\b/i.test(text)) bad.push(relative(REPO_ROOT, f));
  }
  assert.deepEqual(bad, []);
});
