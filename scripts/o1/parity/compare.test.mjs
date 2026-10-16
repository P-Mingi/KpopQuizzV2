// Run O1, lane Q0a: unit tests of the parity verdict (node --test scripts/o1/parity/).
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyticsRefs, cssEquivalent, cssVersions, judge, normaliseAnalyticsRef, normaliseCssVersion, pageFile, parseFodLog,
  readList, render,
} from './compare.mjs';

const BASE_CSS = 'html.ux-v1{--ux-pink:#E8467C;--ux-warn:#B45309;}.ux-btn-primary{background:var(--ux-pink-fill);color: #fff;}.ux-thm-cv.is-dark{color: #fff;}.ux-card{background:#FFFFFF;}';
const B1_CSS = 'html.ux-v1{--ux-pink:#E8467C;--ux-warn:#B45309;--ux-on-accent: #FFFFFF;}.ux-btn-primary{background:var(--ux-pink-fill);color: var(--ux-on-accent);}.ux-thm-cv.is-dark{color: #fff;}.ux-card{background:#FFFFFF;}';

test('pageFile matches flag-off-diff names', () => {
  assert.equal(pageFile('/'), 'home');
  assert.equal(pageFile('/q/bts-quiz'), 'q_bts-quiz');
  assert.equal(pageFile('/sitemap.xml'), 'sitemap_xml');
});

test('readList keeps order and drops comments', () => {
  assert.deepEqual(readList('# x\n/\n\n/a\n  # y\n/b\n'), ['/', '/a', '/b']);
});

test('parseFodLog reads verdict and status', () => {
  const m = parseFodLog('IDENTICAL (bytes)  /  status 200/200  raw bytes 10/10  normalised 9/9  js chunks 3/3\nDIFFERENT (bytes)  /q/x  status 200/404  raw bytes 1/2  normalised 1/2  js chunks 0/0\n  node 3\n');
  assert.deepEqual(m.get('/'), { identical: true, statusA: 200, statusB: 200 });
  assert.deepEqual(m.get('/q/x'), { identical: false, statusA: 200, statusB: 404 });
});

test('N1: the white literal to --ux-on-accent is equivalent, any other change is not', () => {
  assert.equal(cssEquivalent(BASE_CSS, BASE_CSS), true);
  assert.equal(cssEquivalent(BASE_CSS, B1_CSS), true);
  // the token defined with another value is a visible change
  assert.equal(cssEquivalent(BASE_CSS, B1_CSS.replace('--ux-on-accent: #FFFFFF;', '--ux-on-accent: #000;')), false);
  // any other edit (a colour, a new rule) is a visible change
  assert.equal(cssEquivalent(BASE_CSS, B1_CSS.replace('#B45309', '#B45300')), false);
  assert.equal(cssEquivalent(BASE_CSS, B1_CSS + '.x{color:red}'), false);
  // #fff inside a longer hex is not white
  assert.equal(cssEquivalent('a{color:#fff0}', 'a{color:var(--ux-on-accent)0}'), false);
  // the token declared last in a block without its semicolon: only the declaration goes, the separator stays
  assert.equal(cssEquivalent('a{color:#fff}b{x:1;}', 'a{color:var(--ux-on-accent)}b{x:1;--ux-on-accent:#fff}'), true);
  assert.equal(cssEquivalent('a{color:#fff}b{x:1}', 'a{color:var(--ux-on-accent)}b{x:1;--ux-on-accent:#fff}'), false);
});

test('N1: the ?v= value is read and replaced', () => {
  const html = '<link rel="stylesheet" href="/api/ux-v1/a0/styles?v=1cd4d03aef0f"/><script>self.__next_f.push([1,"\\"href\\":\\"/api/ux-v1/a0/styles?v=1cd4d03aef0f\\""])</script>';
  assert.deepEqual(cssVersions(html), ['1cd4d03aef0f']);
  assert.equal(normaliseCssVersion(html).includes('1cd4d03aef0f'), false);
  assert.equal(normaliseCssVersion(html).split('?v=<css>').length - 1, 2);
});

test('N2: the Analytics client reference, plain and escaped, numeric or string id', () => {
  const plain = '2:I[94512,["static/chunks/<asset>.js"],"Analytics"]';
  const escaped = 'self.__next_f.push([1,"2:I[94512,[\\"static/chunks/<asset>.js\\",\\"static/chunks/<asset>.js\\"],\\"Analytics\\"]\\n"])';
  const wrapper = 'self.__next_f.push([1,"2:I[30177,[\\"static/chunks/<asset>.js\\"],\\"NetAnalytics\\"]\\n"])';
  const strId = '2:I["[project]/x.tsx [app-client]",["static/chunks/<asset>.js"],"Analytics",1]';
  assert.equal(analyticsRefs(plain), 1);
  assert.equal(analyticsRefs(escaped), 1);
  assert.equal(analyticsRefs(strId), 1);
  assert.equal(normaliseAnalyticsRef(escaped), normaliseAnalyticsRef(wrapper));
  // another component is never touched
  const other = 'self.__next_f.push([1,"3:I[111,[\\"static/chunks/<asset>.js\\"],\\"SpeedInsights\\"]\\n"])';
  assert.equal(normaliseAnalyticsRef(other), other);
});

const fodSame = { identical: true, statusA: 200, statusB: 200 };
const fodDiff = { identical: false, statusA: 200, statusB: 200 };
const noCss = async () => { throw new Error('css must not be fetched'); };
const noLoc = async () => { throw new Error('location must not be fetched'); };

test('judge: identical pages pass through', async () => {
  const r = await judge({ page: '/', a: 'x', b: 'x', fod: fodSame, css: noCss, loc: noLoc });
  assert.equal(r.identical, true);
  assert.deepEqual(r.normalised, []);
});

test('judge: a planted visible string stays DIFFERENT', async () => {
  const a = '<html><h1>K-pop Quiz</h1></html>'; const b = '<html><h1>K-pop Quizz</h1></html>';
  const r = await judge({ page: '/', a, b, fod: fodDiff, css: noCss, loc: noLoc });
  assert.equal(r.identical, false);
  assert.equal(r.found.length, 1);
  assert.match(r.found[0].b, /Quizz/);
});

test('judge: N1 applies only when the stylesheets are equivalent', async () => {
  const a = '<link href="/api/ux-v1/a0/styles?v=aaaaaaaaaaaa"/><p>x</p>'; const b = '<link href="/api/ux-v1/a0/styles?v=bbbbbbbbbbbb"/><p>x</p>';
  const ok = await judge({ page: '/', a, b, fod: fodDiff, css: async () => true, loc: noLoc });
  assert.equal(ok.identical, true);
  assert.deepEqual(ok.normalised, ['css-version']);
  const ko = await judge({ page: '/', a, b, fod: fodDiff, css: async () => false, loc: noLoc });
  assert.equal(ko.identical, false);
  // N1 never hides a body change next to the hash
  const c = b.replace('<p>x</p>', '<p>y</p>');
  const both = await judge({ page: '/', a, b: c, fod: fodDiff, css: async () => true, loc: noLoc });
  assert.equal(both.identical, false);
});

test('judge: N2 applies to the Analytics reference only', async () => {
  const a = '<p>x</p><script>self.__next_f.push([1,"2:I[94512,[\\"static/chunks/<asset>.js\\"],\\"Analytics\\"]\\n"])</script>';
  const b = '<p>x</p><script>self.__next_f.push([1,"2:I[30177,[\\"static/chunks/<asset>.js\\",\\"static/chunks/<asset>.js\\"],\\"NetAnalytics\\"]\\n"])</script>';
  const r = await judge({ page: '/', a, b, fod: fodDiff, css: noCss, loc: noLoc });
  assert.equal(r.identical, true);
  assert.deepEqual(r.normalised, ['analytics-ref']);
  const r2 = await judge({ page: '/', a, b: b.replace('<p>x</p>', '<p>z</p>'), fod: fodDiff, css: noCss, loc: noLoc });
  assert.equal(r2.identical, false);
});

test('judge: a status or redirect difference is never normalised', async () => {
  const s = await judge({ page: '/x', a: '', b: '', fod: { identical: false, statusA: 200, statusB: 404 }, css: noCss, loc: noLoc });
  assert.equal(s.identical, false);
  const l = await judge({ page: '/x', a: '', b: '', fod: { identical: false, statusA: 301, statusB: 301 }, css: noCss, loc: async () => ({ a: '/', b: '/quizzes' }) });
  assert.equal(l.identical, false);
  assert.match(l.found[0].b, /quizzes/);
});

test('render is deterministic and has no time or byte count', () => {
  const rows = [{ page: '/', status: '200/200', identical: true, normalised: [], found: [] }];
  const t = render(rows, 'urls.txt', 'abc');
  assert.equal(t, render(rows, 'urls.txt', 'abc'));
  assert.doesNotMatch(t, /\d{4}-\d{2}-\d{2}|bytes/);
  assert.match(t, /identical: true \(1 pages\)/);
});
