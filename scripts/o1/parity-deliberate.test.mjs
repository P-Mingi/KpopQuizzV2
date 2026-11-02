// Run O1, CR-015: unit tests of the deliberate-change judge (node --test scripts/o1/parity-deliberate.test.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { judgeDeliberate, judgeRun, takeElement, withoutAssets } from './parity-deliberate.mjs';

const RECORD = JSON.parse(fs.readFileSync(new URL('../../docs/o1/parity-deliberate/CR-015.json', import.meta.url), 'utf8'));
const HOME = RECORD.pages['/']; const GROUPS = RECORD.pages['/groups'];
const push = (s) => `<script>self.__next_f.push(${JSON.stringify([1, s])})</script>`;
const page = ({ sheets = 1, scripts = 1, body, title = 'T', flight = '0:["x"]\n' }) => `<html><head><title>${title}</title>${'<link rel="stylesheet" href="/_next/static/chunks/<asset>.css" data-precedence="next"/>'.repeat(sheets)}${'<script src="/_next/static/chunks/<asset>.js" async=""></script>'.repeat(scripts)}</head><body><h1>One</h1>${body}${push(flight)}</body></html>`;
const BLOCK = '<div class="kpop-h2-surprise"><div class="kpop-h2-lede-row"><button>Surprise me</button></div></div>';
const OLD_AZ = '<div class="p3-az" id="x"><div class="p3-azl"><a href="/bts-quiz">BTS</a><a href="#letter-B">B</a></div></div>';
const NEW_AZ = '<div class="p3-az kpop-az" id="x"><nav><a href="#letter-B">B</a></nav><div class="p3-azl"><a href="#letter-B">B</a><a href="/bts-quiz">BTS 3 quizzes</a></div></div>';

test('takeElement finds one balanced element, by a whole class name', () => {
  const t = takeElement('<p>a</p><div class="x y"><div>in</div></div><p>b</p>', { tag: 'div', class: 'y' });
  assert.equal(t.count, 1); assert.equal(t.region, '<div class="x y"><div>in</div></div>'); assert.equal(t.rest, '<p>a</p><p>b</p>');
  assert.equal(takeElement('<div class="xy"></div>', { tag: 'div', class: 'y' }).count, 0);
  assert.equal(takeElement('<div class="y"></div><div class="y"></div>', { tag: 'div', class: 'y' }).count, 2);
  assert.equal(takeElement('<div class="y"><div>', { tag: 'div', class: 'y' }).count, 2);
});

test('withoutAssets takes script and style assets only: a preloaded image stays compared', () => {
  const x = withoutAssets('<link rel="stylesheet" href="/a.css"/><link rel="preload" as="script" href="/a.js"/><link rel="preload" as="image" href="/a.png"/><script src="/a.js" async=""></script><script>inline()</script>');
  assert.deepEqual(x.sheets, ['/a.css']);
  assert.equal(x.rest, '<link rel="preload" as="image" href="/a.png"/><script>inline()</script>');
});

test('withoutAssets reads a hashed name as flag-off-diff writes it, a > inside the href', () => {
  const x = withoutAssets('<link rel="stylesheet" href="/_next/static/chunks/<asset>.css" data-precedence="next"/><script src="/_next/static/chunks/<asset>.js" async=""></script><p>kept</p>');
  assert.deepEqual(x.sheets, ['/_next/static/chunks/<asset>.css']);
  assert.equal(x.rest, '<p>kept</p>');
});

test('the home: the added block and one sheet pass, more scripts too', () => {
  const j = judgeDeliberate(page({ body: '<p>q</p>' }), page({ sheets: 2, scripts: 3, body: `${BLOCK}<p>q</p>` }), HOME);
  assert.deepEqual(j.problems, []);
  assert.equal(j.facts.h1Head, 1);
});

test('the home: a change outside the block fails, whatever it is', () => {
  const base = page({ body: '<p>q</p>' });
  assert.match(judgeDeliberate(base, page({ sheets: 2, title: 'New', body: `${BLOCK}<p>q</p>` }), HOME).problems.join(), /outside the element/);
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: `${BLOCK}<p>r</p>` }), HOME).problems.join(), /outside the element/);
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: `${BLOCK}<p>q</p><a href="/random">x</a>` }), HOME).problems.join(), /outside the element/);
});

test('the home: a link in the block fails (no crawlable pick), and so do an h1, a wrong sheet count and anime rows', () => {
  const base = page({ body: '<p>q</p>' });
  const block = (inner) => `<div class="kpop-h2-surprise">${inner}</div><p>q</p>`;
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: block('<a href="/q/x">x</a>') }), HOME).problems.join(), /1 links inside/);
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: block('<h1>x</h1>') }), HOME).problems.join(), /an h1/);
  assert.match(judgeDeliberate(base, page({ sheets: 1, body: block('') }), HOME).problems.join(), /stylesheets: 1 on the head, 2 expected/);
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: block(''), flight: '1:{"href":"/anime/q/x"}\n' }), HOME).problems.join(), /page data holds \/anime\//);
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: block(''), flight: '1:{"site":"anime"}\n' }), HOME).problems.join(), /page data holds "site":"anime"/);
});

test('/groups: the A to Z may change, no link of it may go, nothing around it may change', () => {
  const base = page({ body: `<h2>A to Z</h2>${OLD_AZ}` });
  assert.deepEqual(judgeDeliberate(base, page({ sheets: 2, body: `<h2>A to Z</h2>${NEW_AZ}` }), GROUPS).problems, []);
  const lost = NEW_AZ.replace('<a href="/bts-quiz">BTS 3 quizzes</a>', '');
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: `<h2>A to Z</h2>${lost}` }), GROUPS).problems.join(), /links lost: \/bts-quiz/);
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: `<h2>Groups</h2>${NEW_AZ}` }), GROUPS).problems.join(), /outside the element/);
  assert.match(judgeDeliberate(base, page({ sheets: 2, body: '<h2>A to Z</h2>' }), GROUPS).problems.join(), /1 on the base, 0 on the head/);
});

test('the run: any other page that differs fails, and a recorded page that does not differ fails', () => {
  const pages = { '/': { a: page({ body: '' }), b: page({ sheets: 2, body: BLOCK }) }, '/groups': { a: page({ body: OLD_AZ }), b: page({ sheets: 2, body: NEW_AZ }) } };
  const row = (p, identical) => ({ page: p, identical, status: '200/200' });
  const good = [row('/', false), row('/groups', false), row('/quizzes', true)];
  const r = judgeRun(good, RECORD, (p) => pages[p]);
  assert.equal(r.ok, true); assert.match(r.lines.at(-1), /1 of 1 other pages identical; only CR-015/);
  assert.equal(judgeRun([...good, row('/trending', false)], RECORD, (p) => pages[p]).ok, false);
  assert.equal(judgeRun([row('/', true), row('/groups', false)], RECORD, (p) => pages[p]).ok, false);
  assert.equal(judgeRun([row('/', false)], RECORD, (p) => pages[p]).ok, false);
  assert.equal(judgeRun([{ ...row('/', false), status: '200/500' }, row('/groups', false)], RECORD, (p) => pages[p]).ok, false);
});
