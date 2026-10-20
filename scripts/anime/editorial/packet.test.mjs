// Run O1, lane E1a: the review packet: one self-contained HTML page, flagged items first, a seeded sample.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSPIRATION, NOW, PASS_DATA, REL, materialize, runWith } from './fixtures/runner.mjs';
import { buildPacket } from './packet.mjs';
import { runChecks } from './lib/run.mjs';

const PACKET = join(dirname(fileURLToPath(import.meta.url)), 'packet.mjs');
const common = ['--inspiration', INSPIRATION, '--now', NOW, '--created-at', '2026-10-20T08:00:00Z'];

function makePacket(target, extra = [], dataDir) {
  const dir = mkdtempSync(join(tmpdir(), 'e1a-packet-'));
  const out = join(dir, 'p.html');
  const args = ['--batch', 'test-batch', target, '--out', out, ...(dataDir ? ['--data', dataDir] : []), ...common, ...extra];
  const r = spawnSync(process.execPath, [PACKET, ...args], { encoding: 'utf8' });
  const html = r.status === 0 ? readFileSync(out, 'utf8') : '';
  rmSync(dir, { recursive: true, force: true });
  return { r, html };
}
const sampleRefs = (html) => [...html.matchAll(/<a href="#x-[^"]*"><code>([^<]*)<\/code><\/a>/g)].map((m) => m[1]);

test('packet.mjs writes one HTML file and prints the counts and the seed', () => {
  const { r, html } = makePacket(PASS_DATA, ['--seed', 'seed-one']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /4 items, 0 flagged, \d+ warnings, sample 8 of 32 units, seed seed-one/);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /Sample seed: <code>seed-one<\/code>/);
});

test('the page is self contained: no script, no external asset, only https links and anchors', () => {
  const { html } = makePacket(PASS_DATA, ['--seed', 'a']);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<link\b/i);
  assert.doesNotMatch(html, /\bsrc=/i);
  assert.doesNotMatch(html, /@import|url\(/i);
  assert.doesNotMatch(html, /<img|<iframe|<object|<embed|<video|<audio/i);
  const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 20);
  for (const h of hrefs) assert.ok(h.startsWith('https://') || h.startsWith('#'), h);
  assert.doesNotMatch(html, /http:\/\//);
});

test('the page holds no en dash, no em dash and no emoji', () => {
  const { html } = makePacket(PASS_DATA, ['--seed', 'a']);
  assert.doesNotMatch(html, /[\u{2012}-\u{2015}\u{2212}]/u);
  assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
});

test('flagged items come first, with their failing checks, and are left out of the sample', () => {
  const c = materialize('c05-spoiler-mismatch');
  try {
    const { r, html } = makePacket(c.dataDir, ['--seed', 'flag-seed'], c.dataDir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /1 flagged/);
    const flagged = html.indexOf('id="flagged"'); const sample = html.indexOf('id="sample"'); const titles = html.indexOf('id="titles"');
    assert.ok(flagged > 0 && flagged < sample && sample < titles);
    const flaggedSection = html.slice(flagged, sample);
    assert.match(flaggedSection, /C5 FAIL/);
    assert.match(flaggedSection, /tagged arc 0 but the cited fact dn-near-015 spoils from arc 2/);
    assert.match(flaggedSection, /Flagged items \(1\)/);
    assert.match(flaggedSection, /Who takes over the hunt for Kira in the second part\?/);
    const refs = sampleRefs(html);
    assert.ok(refs.length > 0);
    for (const ref of refs) assert.ok(!ref.includes('death-note-basics-who-made-it.json#'), `a flagged question was sampled: ${ref}`);
  } finally { c.done(); }
});

test('the sample is 25 percent of the units, drawn with the printed seed, the same draw for the same seed', () => {
  const a = makePacket(PASS_DATA, ['--seed', 'same']).html;
  const b = makePacket(PASS_DATA, ['--seed', 'same']).html;
  assert.equal(a, b);
  assert.equal(sampleRefs(a).length, 8);
  const draws = new Set(['s1', 's2', 's3', 's4'].map((s) => sampleRefs(makePacket(PASS_DATA, ['--seed', s]).html).join(',')));
  assert.ok(draws.size > 1, 'different seeds must give different draws');
  const half = makePacket(PASS_DATA, ['--seed', 'x', '--fraction', '0.5']).html;
  assert.equal(sampleRefs(half).length, 16);
});

test('without --seed a seed is derived and printed, and it reproduces the draw', () => {
  const first = makePacket(PASS_DATA).html;
  const seed = /Sample seed: <code>([^<]+)<\/code>/.exec(first)[1];
  assert.match(seed, /^test-batch-[0-9a-f]{8}$/);
  const again = makePacket(PASS_DATA, ['--seed', seed]).html;
  assert.deepEqual(sampleRefs(again), sampleRefs(first));
});

test('each question shows its answer and options next to its cited facts and source links', () => {
  const report = runChecks([PASS_DATA], { inspiration: INSPIRATION, now: NOW });
  const { html } = buildPacket(report, { batch: 'b', seed: 's', createdAt: '2026-10-20T08:00:00Z' });
  const quiz = report.entries.find((e) => e.item.kind === 'quiz').item.data;
  for (const q of quiz.questions) {
    for (const o of q.options) assert.ok(html.includes(o.replace(/&/g, '&amp;')), `option ${o}`);
    for (const id of q.fact_ids) assert.ok(html.includes(`<code>${id}</code>`), id);
    assert.ok(html.includes(`href="${q.source_url}"`));
  }
  assert.equal((html.match(/right answer/g) ?? []).length >= 9, true);
  assert.match(html, /Stored source text:/);
  assert.match(html, /revision 1000000001/);
  const row = report.entries.find((e) => e.item.kind === 'daily').item.data;
  assert.ok(html.includes(row.questions[2].question));
  assert.match(html, /<b>Answer:<\/b> False/);
});

test('a series shows its facts with their sources; its facts file points to the series card', () => {
  const report = runChecks([join(PASS_DATA, 'series'), join(PASS_DATA, 'facts')], { inspiration: INSPIRATION, now: NOW });
  const { html } = buildPacket(report, { batch: 'k1-test', seed: 's', createdAt: '2026-10-20T08:00:00Z' });
  assert.match(html, /Facts with their sources \(15\)/);
  assert.match(html, /The facts of this series are listed with the series card \(15 facts\)/);
  assert.match(html, /Lane K1/);
  assert.match(html, /<td>Part 1<\/td>|<td>1<\/td><td>Part 1<\/td>/);
});

test('the lane is inferred from the kinds and can be set; titles and spoiler labels are listed', () => {
  const report = runChecks([join(PASS_DATA, 'daily')], { inspiration: INSPIRATION, now: NOW });
  assert.match(buildPacket(report, { batch: 'b', seed: 's' }).html, /Lane K3/);
  assert.match(buildPacket(report, { batch: 'b', seed: 's', lane: 'K9' }).html, /Lane K9/);
  const { html } = buildPacket(runChecks([PASS_DATA], { inspiration: INSPIRATION, now: NOW }), { batch: 'b', seed: 's' });
  assert.match(html, /arc 0 both x9/);
  assert.match(html, /arc 0 both x8/);
});

test('a packet is written even when a file is not valid JSON, and the broken file is flagged', () => {
  const report = runWith(({ dir }) => writeFileSync(join(dir, 'quizzes/death-note/broken.json'), '{"title": '), [REL.quiz, 'quizzes/death-note/broken.json']);
  const { html } = buildPacket(report, { batch: 'b', seed: 's' });
  assert.match(html, /not valid JSON/);
  assert.match(html, /Flagged items \(1\)/);
});

test('packet.mjs exits 2 on a usage error', () => {
  const run = (args) => spawnSync(process.execPath, [PACKET, ...args], { encoding: 'utf8' }).status;
  assert.equal(run([PASS_DATA]), 2);
  assert.equal(run(['--batch', 'bad name!', PASS_DATA]), 2);
  assert.equal(run(['--batch', 'b']), 2);
  assert.equal(run(['--batch', 'b', PASS_DATA, '--fraction', '2']), 2);
  assert.equal(run(['--batch', 'b', '/no/such/file.json']), 2);
});

test('no id is used twice in the page, and a note is shown when given', () => {
  const { html } = makePacket(PASS_DATA, ['--seed', 'ids', '--note', 'Fixture data: the revision ids are placeholders.']);
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(html, /Fixture data: the revision ids are placeholders\./);
  for (const href of [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])) assert.ok(ids.includes(href), `no target for #${href}`);
});

test('a file of an odd shape never stops the packet', () => {
  const report = runWith(({ read, write }) => {
    const q = read(REL.quiz); q.sources = [null, 5]; q.questions = [7, null, { question: 3, options: 'x', fact_ids: [{}] }]; write(REL.quiz, q);
    const f = read(REL.facts); f.facts = [null, 'text', { id: 'x', sources: [null] }, ...f.facts.slice(0, 3)]; write(REL.facts, f);
  }, [REL.quiz, REL.facts]);
  assert.equal(report.ok, false);
  const { html } = buildPacket(report, { batch: 'odd', seed: 's', createdAt: '2026-10-20T08:00:00Z' });
  assert.match(html, /Flagged items \(2\)/);
});
