// Run O1, lane Q0a: unit tests of the parity verdict (node --test scripts/o1/parity/).
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyticsRefs, compareSheets, cssEquivalent, cssVersions, flightRows, judge, judgeFlight, normaliseAnalyticsRef,
  normaliseCssVersion, normaliseFlightId, pageFile, parseFodLog, readList, render, sheetForCompare, splitFlight,
  stylesheetHrefs,
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

test('render: the normalisations a page needed in this run stay out of result.txt (they move with request timing)', () => {
  const run1 = [{ page: '/blindtest/group-bts', status: '200/200', identical: true, normalised: ['analytics-ref', 'flight-rows'], found: [], sheets: 3 }];
  const run2 = [{ page: '/blindtest/group-bts', status: '200/200', identical: true, normalised: [], found: [], sheets: 3 }];
  assert.equal(render(run1, 'urls.txt', 'abc'), render(run2, 'urls.txt', 'abc'));
  assert.doesNotMatch(render(run1, 'urls.txt', 'abc'), /normalised|flight-rows/);
});

test('render is deterministic and has no time or byte count', () => {
  const rows = [{ page: '/', status: '200/200', identical: true, normalised: [], found: [] }];
  const t = render(rows, 'urls.txt', 'abc');
  assert.equal(t, render(rows, 'urls.txt', 'abc'));
  assert.doesNotMatch(t, /\d{4}-\d{2}-\d{2}|bytes/);
  assert.match(t, /identical: true \(1 pages\)/);
});

// N3 and N4 (CR-008). A page as Next writes it: server HTML, then the Flight stream cut into push tags.
const ROWS = [
  '1:"$Sreact.fragment"',
  '2:I[418146,["static/chunks/<asset>.js","static/chunks/<asset>.js"],"ThemeInit"]',
  '3:I[656268,["static/chunks/<asset>.js"],"default"]',
  ':HL["static/chunks/<asset>.css","style"]',
  '0:{"P":null,"b":"<build>","c":["",""],"f":[["$","$L2",null,{}]]}',
  '4:["$","h1",null,{"children":"K-pop Quiz"}]',
];
const stream = (rows) => rows.map((r) => `${r}\n`).join('');
function page(rows, cuts = [], html = '<html><body><h1>K-pop Quiz</h1></body></html>') {
  const s = stream(rows); const parts = []; let i = 0;
  for (const c of cuts) { parts.push(s.slice(i, c)); i = c; }
  parts.push(s.slice(i));
  const pushes = parts.filter(Boolean).map((p) => `<script>self.__next_f.push(${JSON.stringify([1, p])})</script>`).join('');
  return html.replace('</body>', `<script>(self.__next_f=self.__next_f||[]).push([0])</script>${pushes}</body>`);
}
const renumber = (rows) => rows.map((r) => r.replace('I[418146,', 'I[755668,').replace('I[656268,', 'I[882660,'));

test('flightRows: rows, hints and a text row cut on its UTF-8 byte length', () => {
  const text = 'Tr\u00e8s \u00e9t\u00e9\nline two \ud83c\udfb5'; // 2-byte letters, a newline and a 4-byte note inside the text
  const bytes = Buffer.byteLength(text);
  const s = `1:"$Sreact.fragment"\n5:T${bytes.toString(16)},${text}6:["$","p",null,{}]\n:HL["/x.css","style"]\n`;
  const r = flightRows(s);
  assert.equal(r.ok, true);
  assert.deepEqual(r.rows, ['1:"$Sreact.fragment"', `5:T${bytes.toString(16)},${text}`, '6:["$","p",null,{}]', ':HL["/x.css","style"]']);
  // a stream that does not end a row, or a text row whose length no longer holds, is not cut
  assert.equal(flightRows('1:"x"').ok, false);
  assert.equal(flightRows(`5:T${(bytes + 3).toString(16)},${text}`).ok, false);
  assert.equal(flightRows('5:T20,see static/chunks/<asset>.js here 6:[]\n').ok, false);
  assert.equal(flightRows('not a row\n').ok, false);
});

test('N3: only the module id of a client reference row', () => {
  assert.equal(normaliseFlightId('2:I[418146,["static/chunks/<asset>.js"],"ThemeInit"]'), '2:I[<id>,["static/chunks/<asset>.js"],"ThemeInit"]');
  assert.equal(normaliseFlightId('2:I["[project]/x.tsx [app-client] (ecmascript)",["a.js"],"default"]'), '2:I[<id>,["a.js"],"default"]');
  // not a client reference: untouched
  for (const r of ['4:["$","h1",null,{"children":"I[1,"}]', ':HL["/x.css","style"]', '0:{"P":null}']) assert.equal(normaliseFlightId(r), r);
});

test('judgeFlight: other module ids in another build are the same page (flight-ids)', () => {
  const r = judgeFlight(page(ROWS), page(renumber(ROWS)));
  assert.deepEqual(r, { identical: true, normalised: ['flight-ids'], found: [] });
});

test('judgeFlight: the same rows cut into other push tags, in another order (flight-rows)', () => {
  const b = [ROWS[0], ROWS[3], ROWS[1], ROWS[2], ROWS[5], ROWS[4]];
  const r = judgeFlight(page(ROWS, [30]), page(renumber(b), [7, 90, 140]));
  assert.equal(r.identical, true);
  assert.deepEqual(r.normalised, ['flight-ids', 'flight-rows']);
  // the cut alone
  assert.deepEqual(judgeFlight(page(ROWS, [30]), page(ROWS, [12, 64])).normalised, ['flight-rows']);
});

test('judgeFlight: every row and the server HTML stay compared', () => {
  const base = page(ROWS);
  const cases = {
    'a visible string in a row': ROWS.map((r) => r.replace('K-pop Quiz', 'K-pop Quizz')),
    'another export name': ROWS.map((r) => r.replace('"ThemeInit"', '"ThemeInit2"')),
    'another chunk list': ROWS.map((r) => r.replace('"static/chunks/<asset>.js","static/chunks/<asset>.js"]', '"static/chunks/<asset>.js"]')),
    'another row id': ROWS.map((r) => r.replace('3:I[656268,', '7:I[656268,')),
    'a row missing': ROWS.slice(0, -1),
    'a row twice': [...ROWS, ROWS[5]],
    'an error digest': [...ROWS, '8:E{"digest":"679331811"}'],
  };
  for (const [name, rows] of Object.entries(cases)) {
    const r = judgeFlight(base, page(renumber(rows)));
    assert.equal(r.identical, false, name);
    assert.ok(r.found.some((d) => d.at === 'flight row'), name);
  }
  // a digest that differs is not normalised
  assert.equal(judgeFlight(page([...ROWS, '8:E{"digest":"1"}']), page([...ROWS, '8:E{"digest":"2"}'])).identical, false);
  // the HTML outside the push tags, byte for byte
  const html = judgeFlight(base, page(renumber(ROWS), [], '<html><body><h1>K-pop Quizz</h1></body></html>'));
  assert.equal(html.identical, false);
  assert.match(html.found[0].b, /Quizz/);
});

test('judgeFlight: a long row is reported from near its first difference', () => {
  const long = `9:["$","p",null,{"children":"${'x'.repeat(400)} Made by fans, for fans"}]`;
  const r = judgeFlight(page([...ROWS, long]), page([...ROWS, long.replace('for fans', 'for every fan')]));
  assert.equal(r.found.length, 1);
  assert.match(r.found[0].a, /^9:\.\.\.x+ Made by fans, for fans/);
  assert.match(r.found[0].b, /for every fan/);
});

test('judgeFlight: a stream it cannot cut is judged without N4', () => {
  const bin = '<script>self.__next_f.push([3,"AAAA"])</script>';
  const a = page(ROWS).replace('</body>', `${bin}</body>`);
  assert.equal(splitFlight(a).ok, false);
  // N3 alone still applies in place
  assert.deepEqual(judgeFlight(a, page(renumber(ROWS)).replace('</body>', `${bin}</body>`)).normalised, ['flight-ids']);
  // another order is then a difference
  const b = page(renumber([ROWS[0], ROWS[2], ROWS[1], ROWS[3], ROWS[4], ROWS[5]])).replace('</body>', `${bin}</body>`);
  assert.equal(judgeFlight(a, b).identical, false);
});

test('judge: N3 and N4 come after N1 and N2, a plant stays DIFFERENT', async () => {
  const a = page(ROWS); const b = page(renumber(ROWS));
  const r = await judge({ page: '/', a, b, fod: fodDiff, css: noCss, loc: noLoc });
  assert.equal(r.identical, true);
  assert.deepEqual(r.normalised, ['flight-ids']);
  const p = await judge({ page: '/', a, b: page(renumber(ROWS.map((x) => x.replace('K-pop Quiz', 'K-pop Quizz'))), [], '<html><body><h1>K-pop Quizz</h1></body></html>'), fod: fodDiff, css: noCss, loc: noLoc });
  assert.equal(p.identical, false);
  assert.match(p.found[0].b, /Quizz/);
});

// CR-009: stylesheet contents.
const CHUNK = '.a{color:red}.b{background:url(../media/font.0q4ycyfrv-5ay.woff2)}.Card-module__w7_BSq__x{margin:0}';
test('stylesheetHrefs: every stylesheet link in order, once', () => {
  const html = '<link rel="stylesheet" href="/_next/static/chunks/0k~0i.css" data-precedence="next"/><link rel="preload" as="style" href="/p.css"/>'
    + '<link href="/api/ux-v1/a0/styles?v=3061&amp;x=1" rel="stylesheet"/><link rel="stylesheet" href="/_next/static/chunks/0k~0i.css"/><link rel="alternate stylesheet" href="https://fonts.example/a.css"/>';
  assert.deepEqual(stylesheetHrefs(html), ['/_next/static/chunks/0k~0i.css', '/api/ux-v1/a0/styles?v=3061&x=1', 'https://fonts.example/a.css']);
});

test('sheetForCompare: asset names and module hashes only; N1 for the UX sheet only', () => {
  const other = CHUNK.replace('0q4ycyfrv-5ay', '11u06r12fd6v_').replace('w7_BSq', 'XAldaa');
  assert.equal(sheetForCompare(CHUNK, false), sheetForCompare(other, false));
  assert.notEqual(sheetForCompare(CHUNK, false), sheetForCompare(CHUNK.replace('red', 'blue'), false));
  assert.equal(sheetForCompare(BASE_CSS, true), sheetForCompare(B1_CSS, true));
  assert.notEqual(sheetForCompare(BASE_CSS, false), sheetForCompare(B1_CSS, false));
});

const served = (map) => async (h) => (h in map ? { ok: true, body: map[h] } : { ok: false, status: 404 });
test('compareSheets: same CSS under other names passes, a CSS-only change fails with its rule', async () => {
  const ha = ['/_next/static/chunks/aaa.css', '/api/ux-v1/a0/styles?v=1']; const hb = ['/_next/static/chunks/bbb.css', '/api/ux-v1/a0/styles?v=2'];
  const A = served({ [ha[0]]: CHUNK, [ha[1]]: BASE_CSS });
  const same = await compareSheets(ha, hb, A, served({ [hb[0]]: CHUNK.replace('w7_BSq', 'XAldaa'), [hb[1]]: B1_CSS }));
  assert.deepEqual(same, { count: 2, diff: null });
  const plant = await compareSheets(ha, hb, A, served({ [hb[0]]: CHUNK.replace('color:red', 'color:#e11d48'), [hb[1]]: B1_CSS }));
  assert.equal(plant.count, 2);
  assert.match(plant.diff.a, /^sheet 0 static\/chunks\/<asset>\.css rule 0: \.a\{color:red\}$/);
  assert.match(plant.diff.b, /color:#e11d48/);
  // the UX sheet: N1 only, any other change fails
  const ux = await compareSheets(ha, hb, A, served({ [hb[0]]: CHUNK, [hb[1]]: B1_CSS.replace('#B45309', '#B45300') }));
  assert.match(ux.diff.b, /^sheet 1 \/api\/ux-v1\/a0\/styles rule 0: .*#B45300/);
});

test('compareSheets: counts, unreadable sheets and external links', async () => {
  const one = ['/_next/static/chunks/a.css'];
  assert.match((await compareSheets(one, [], served({}), served({}))).diff.b, /0 stylesheets/);
  assert.match((await compareSheets(one, ['/_next/static/chunks/b.css'], served({ [one[0]]: CHUNK }), served({}))).diff.b, /answered 404/);
  const ext = ['https://fonts.example/a.css'];
  const never = async () => { throw new Error('an external sheet is never fetched'); };
  assert.deepEqual(await compareSheets(ext, ext, never, never), { count: 1, diff: null });
  assert.notEqual((await compareSheets(ext, ['https://fonts.example/b.css'], never, never)).diff, null);
});

test('judge: the stylesheet check runs on pages judged identical, and only there', async () => {
  const sheetsSame = async () => ({ count: 3, diff: null });
  const sheetsDiff = async () => ({ count: 3, diff: { a: 'sheet 0 x rule 4: .a{color:red}', b: 'sheet 0 x rule 4: .a{color:blue}' } });
  const ok = await judge({ page: '/', a: 'x', b: 'x', fod: fodSame, css: noCss, loc: noLoc, sheets: sheetsSame });
  assert.equal(ok.identical, true); assert.equal(ok.sheets, 3);
  const ko = await judge({ page: '/', a: 'x', b: 'x', fod: fodSame, css: noCss, loc: noLoc, sheets: sheetsDiff });
  assert.equal(ko.identical, false);
  assert.deepEqual(ko.found.map((d) => d.at), ['css-content']);
  const n3 = await judge({ page: '/', a: page(ROWS), b: page(renumber(ROWS)), fod: fodDiff, css: noCss, loc: noLoc, sheets: sheetsDiff });
  assert.equal(n3.identical, false);
  const never = async () => { throw new Error('a DIFFERENT page is not read again'); };
  const diff = await judge({ page: '/', a: '<p>a</p>', b: '<p>b</p>', fod: fodDiff, css: noCss, loc: noLoc, sheets: never });
  assert.equal(diff.identical, false);
  const t = render([ok, ko], 'urls.txt', 'abc');
  assert.match(t, /^IDENTICAL \/ status 200\/200 css 3$/m);
  assert.match(t, /^DIFFERENT \/ status 200\/200 css 3\n  css-content\n    A: sheet 0 x rule 4: \.a\{color:red\}\n    B: sheet 0 x rule 4: \.a\{color:blue\}$/m);
  assert.equal(t, render([ok, ko], 'urls.txt', 'abc'));
});
