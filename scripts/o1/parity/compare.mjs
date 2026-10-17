#!/usr/bin/env node
// Run O1, lane Q0a: the parity verdict, applied after apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs (wrapped, never
// edited). flag-off-diff fetches every URL from A (base) and B (head) in the same second, normalises build ids,
// hashed asset names and CSS-module hashes, writes <out>/<page>.a.html and .b.html and prints one line per page.
// This script re-judges the pages flag-off-diff found DIFFERENT with the two normalisations of owner gate G0
// (RUN-O1-PROMPT section 8) and the two of CR-008 (LEDGER, 2026-10-17), and nothing else:
//   N1 css-version: the `?v=` of /api/ux-v1/a0/styles, only when the CSS served by A and by B is equal once every
//      white literal (#fff, #ffffff, any case) reads var(--ux-on-accent) and a declaration of --ux-on-accent whose
//      value is that white is dropped (the token B1 introduces for kpop's literal white; any other CSS change
//      keeps the hash difference, so the page stays DIFFERENT). Both stylesheets are fetched (GET) once per run.
//   N2 analytics-ref: the client reference of the Analytics component in the inline page data (React Flight row
//      I[<module id>,[<chunks>],"Analytics"], or "NetAnalytics", the wrapper B6 adds for beforeSend), replaced by
//      I[<analytics>] on both sides.
//   N3 flight-ids (CR-008): in the inline page data, a Flight client reference row `<row>:I[<module id>,` reads
//      `<row>:I[<id>,` on both sides. Only the module id: the row id, the chunk list and the export name stay
//      compared. Turbopack numbers client modules per build, so one module has two ids in two builds.
//   N4 flight-rows (CR-008): the Flight stream of a page (every `self.__next_f.push([1,"..."])` tag, joined in
//      document order) is compared as the sorted list of its rows, so how it is cut into push tags, where those tags
//      sit in the document and the order in which rows stream do not count. Every row is still compared (as a
//      multiset), and the rest of the document (the server HTML without those tags) byte for byte. A stream that
//      cannot be parsed for certain (a push of another kind, a text row whose length no longer holds after
//      flag-off-diff's asset names) is not re-cut: the page is judged without N4.
// Then, stricter (CR-009): every page judged identical so far is fetched once more from A and B (GET) for its raw
// stylesheet links, and the content of every stylesheet it links (same-origin, fetched once per run and side) is
// compared in link order after the asset-name normalisation (hashed chunk and media names, CSS-module hashes) and,
// for the UX sheet only, N1. A difference makes the page DIFFERENT as css-content, with the first differing rule.
// A page whose status differs, or whose redirect target differs (re-read with one GET per side, 3xx only), is
// DIFFERENT whatever its body. Output (deterministic: no time, no byte count, no live number outside a diff):
//   <out>/result.txt  one line per URL in list order (verdict, status pair, stylesheets compared, and the differing
//                     nodes, rows or rule of a DIFFERENT page), then the verdict line
//   <out>/result.json the same as data, plus the normalisations each page needed in this run. Those stay out of
//                     result.txt: whether a page needed one depends on what flag-off-diff saw on that request (a page
//                     whose rows stream in a random order needs N4 on one run and nothing on the next), its verdict
//                     does not (report D51).
// Exit 0 = every page identical after the allowed normalisations, 1 = a real difference, 2 = bad input.
//
//   node scripts/o1/parity/compare.mjs --a http://127.0.0.1:4011 --b http://127.0.0.1:4012 \
//        --fod-out <flag-off-diff --out dir> --fod-log <flag-off-diff stdout> --urls <list> --out <dir>
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RULES_VERSION = 'q0a-g0-v2';
export const ANALYTICS_EXPORTS = ['Analytics', 'NetAnalytics'];
const CSS_HREF_RE = /\/api\/ux-v1\/a0\/styles\?v=([0-9a-f]{6,64})/g;

/** flag-off-diff's file name for a page (same expression as the helper). */
export function pageFile(p) {
  return p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9-]+/gi, '_');
}

/** The URL list: one path per line, # comments and blank lines ignored, order kept. */
export function readList(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

/** flag-off-diff's stdout: page -> { identical, statusA, statusB }. */
export function parseFodLog(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^(IDENTICAL|DIFFERENT) \((?:bytes|structure)\)\s+(\S+)\s+status (\d+)\/(\d+)\s/);
    if (m) out.set(m[2], { identical: m[1] === 'IDENTICAL', statusA: Number(m[3]), statusB: Number(m[4]) });
  }
  return out;
}

/** N1, the CSS side: white literal to the token, the token's own white declaration dropped. */
export function cssForCompare(css) {
  return css
    .replace(/#(?:ffffff|fff)(?![0-9a-f])/gi, 'var(--ux-on-accent)')
    .replace(/--ux-on-accent\s*:\s*var\(--ux-on-accent\)\s*(?:!important\s*)?(;|(?=\}))/g, '');
}
export function cssEquivalent(cssA, cssB) {
  return cssForCompare(cssA) === cssForCompare(cssB);
}
/** The distinct ?v= values of the UX stylesheet links of a page. */
export function cssVersions(html) {
  return [...new Set([...html.matchAll(CSS_HREF_RE)].map((m) => m[1]))];
}
/** N1, the HTML side: every ?v= of the UX stylesheet reads <css>. */
export function normaliseCssVersion(html) {
  return html.replace(CSS_HREF_RE, '/api/ux-v1/a0/styles?v=<css>');
}

// N2: a Flight client reference row of the Analytics export, quotes plain or escaped (inside the push strings).
const Q = '(?:\\\\?")';
const ANALYTICS_RE = new RegExp(
  `I\\[(?:\\d+|${Q}[^"\\\\]*${Q}),\\[[^\\]]*\\],${Q}(?:${ANALYTICS_EXPORTS.join('|')})${Q}(?:,\\d+)?\\]`, 'g');
export function analyticsRefs(html) {
  return (html.match(ANALYTICS_RE) ?? []).length;
}
export function normaliseAnalyticsRef(html) {
  return html.replace(ANALYTICS_RE, 'I[<analytics>]');
}

// N4: the inline Flight stream. A push tag carries [1,"<chunk>"] (the bootstrap `(self.__next_f=...).push([0])` has
// another form and stays in the document). Next writes the array with JSON.stringify plus HTML escapes, so it parses.
const PUSH_RE = /<script>self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g;
/** The document without its Flight push tags, and the stream those tags carry, joined in document order. */
export function splitFlight(html) {
  let stream = ''; let pushes = 0; let ok = true;
  const rest = html.replace(PUSH_RE, (m, arr) => {
    let v;
    try { v = JSON.parse(arr); } catch { ok = false; return m; }
    if (Array.isArray(v) && v.length === 2 && v[0] === 1 && typeof v[1] === 'string') { stream += v[1]; pushes++; return ''; }
    ok = false; return m; // form state or binary chunks: not re-cut
  });
  return { ok, rest, stream, pushes };
}

function utf8End(s, start, bytes) { // index after `bytes` UTF-8 bytes of s from start, or -1
  let j = start; let n = 0;
  while (n < bytes && j < s.length) {
    const c = s.codePointAt(j);
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    j += c > 0xffff ? 2 : 1;
  }
  return n === bytes ? j : -1;
}
const ROW_HEAD = /([0-9a-f]*):(?:T([0-9a-f]+),)?/y;
const NORMALISED_MARK = /<asset>|<build>|module__<h>__/;
/**
 * The rows of a Flight stream. A row is `<hex id>:<payload>\n`, a hint `:H<code>[...]\n` (empty id), or a text row
 * `<hex id>:T<hex byte length>,<text>` with no newline. ok is false when the stream does not cut into rows for certain.
 */
export function flightRows(stream) {
  const rows = []; let i = 0;
  while (i < stream.length) {
    ROW_HEAD.lastIndex = i;
    const m = ROW_HEAD.exec(stream);
    if (!m) return { ok: false, rows };
    if (m[2] !== undefined) {
      const end = utf8End(stream, ROW_HEAD.lastIndex, parseInt(m[2], 16));
      // flag-off-diff's names change lengths: a text row holding one is not cut on its declared length
      if (end < 0 || NORMALISED_MARK.test(stream.slice(ROW_HEAD.lastIndex, end))) return { ok: false, rows };
      if (end < stream.length) { ROW_HEAD.lastIndex = end; if (!ROW_HEAD.exec(stream)) return { ok: false, rows }; }
      rows.push(stream.slice(i, end)); i = end;
    } else {
      const nl = stream.indexOf('\n', i);
      if (nl < 0) return { ok: false, rows };
      rows.push(stream.slice(i, nl)); i = nl + 1;
    }
  }
  return { ok: true, rows };
}

// N3: the module id of a client reference row, numeric (production) or a string id, quotes plain.
const CLIENT_REF_RE = /^([0-9a-f]+):I\[(?:\d+|"(?:[^"\\]|\\.)*"),/;
export function normaliseFlightId(row) {
  return row.replace(CLIENT_REF_RE, '$1:I[<id>,');
}
// N3 in place, used only to name what changed the verdict: the same rule on each push string, at a row start inside
// it (the escaped quotes of the push string's own JSON are handled by parsing it).
function flightIdsInPlace(html) {
  return html.replace(PUSH_RE, (m, arr) => {
    let v;
    try { v = JSON.parse(arr); } catch { return m; }
    if (!(Array.isArray(v) && v.length === 2 && v[0] === 1 && typeof v[1] === 'string')) return m;
    const s = v[1].replace(/(^|\n)([0-9a-f]+):I\[(?:\d+|"(?:[^"\\]|\\.)*"),/g, '$1$2:I[<id>,');
    return `<script>self.__next_f.push(${JSON.stringify([1, s])})</script>`;
  });
}
const sorted = (rows) => [...rows].sort();
function sameRows(a, b) {
  if (a.length !== b.length) return false;
  const x = sorted(a); const y = sorted(b);
  return x.every((r, i) => r === y[i]);
}
/** Rows of a not in b and of b not in a (multisets), sorted, paired for the report. */
function rowDiffs(a, b, max) {
  const count = new Map();
  for (const r of a) count.set(r, (count.get(r) ?? 0) + 1);
  const onlyB = [];
  for (const r of b) { const c = count.get(r) ?? 0; if (c > 0) count.set(r, c - 1); else onlyB.push(r); }
  const onlyA = [];
  for (const [r, c] of count) for (let k = 0; k < c; k++) onlyA.push(r);
  onlyA.sort(); onlyB.sort();
  const out = [];
  for (let k = 0; k < Math.max(onlyA.length, onlyB.length) && out.length < max; k++) {
    const x = onlyA[k] ?? ''; const y = onlyB[k] ?? '';
    // a long row is shown from a little before its first differing character
    let c = 0;
    while (c < x.length && c < y.length && x[c] === y[c]) c++;
    const from = c > 200 ? c - 80 : 0;
    const cut = (r) => (from ? `${r.slice(0, r.indexOf(':') + 1)}...` : '') + r.slice(from, from + 300);
    out.push({ at: 'flight row', a: cut(x), b: cut(y) });
  }
  return out;
}
/**
 * N3 and N4 on two bodies flag-off-diff found different (after N1 and N2). Returns { identical, normalised, found }.
 * found holds the differing nodes of the document without its push tags, then the rows only one side has.
 */
export function judgeFlight(a, b) {
  const sa = splitFlight(a); const sb = splitFlight(b);
  const ra = sa.ok ? flightRows(sa.stream) : { ok: false, rows: [] };
  const rb = sb.ok ? flightRows(sb.stream) : { ok: false, rows: [] };
  if (!ra.ok || !rb.ok) {
    // not re-cut: N3 alone, in place
    const ia = flightIdsInPlace(a); const ib = flightIdsInPlace(b);
    if (ia === ib) return { identical: true, normalised: ['flight-ids'], found: [] };
    return { identical: false, normalised: [], found: firstDiffs(a, b) };
  }
  const na = ra.rows.map(normaliseFlightId); const nb = rb.rows.map(normaliseFlightId);
  const restSame = sa.rest === sb.rest; const rowsSame = sameRows(na, nb);
  if (restSame && rowsSame) {
    const normalised = [];
    if (!sameRows(ra.rows, rb.rows)) normalised.push('flight-ids');
    if (flightIdsInPlace(a) !== flightIdsInPlace(b)) normalised.push('flight-rows');
    return { identical: true, normalised, found: [] };
  }
  const found = restSame ? [] : firstDiffs(sa.rest, sb.rest);
  if (!rowsSame) found.push(...rowDiffs(na, nb, Math.max(0, 6 - found.length)));
  return { identical: false, normalised: [], found };
}

// CR-009: stylesheet contents. Same-origin links only (an external href is compared as written: it is in the HTML).
const LINK_RE = /<link\b[^>]*>/gi;
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i')); return m ? m[1].replace(/&amp;/g, '&') : null; };
/** The stylesheet hrefs of a raw page, in document order, each once. */
export function stylesheetHrefs(html) {
  const out = [];
  for (const m of html.matchAll(LINK_RE)) {
    const rel = attr(m[0], 'rel'); const href = attr(m[0], 'href');
    if (rel && rel.toLowerCase().split(/\s+/).includes('stylesheet') && href && !out.includes(href)) out.push(href);
  }
  return out;
}
export const isLocalHref = (h) => h.startsWith('/') && !h.startsWith('//');
export const isUxSheet = (h) => /^\/api\/ux-v1\/a0\/styles(?:\?|$)/.test(h);
/** A stylesheet as compared: flag-off-diff's asset-name rules, the relative chunk and media names CSS uses, and N1 for the UX sheet. */
export function sheetForCompare(css, ux) {
  const named = css
    .replace(/(\/?_next\/)?static\/(chunks|css|media)\/[A-Za-z0-9_\-./~%()[\]@]+?\.(js|css|woff2?|png|svg|jpg|webp|avif)/g, 'static/$2/<asset>.$3')
    .replace(/\.\.\/(chunks|css|media)\/[A-Za-z0-9_\-.~%@]+?\.(js|css|woff2?|ttf|otf|eot|png|svg|jpg|jpeg|gif|webp|avif|ico)/g, '../$1/<asset>.$2')
    .replace(/module__[A-Za-z0-9_-]{6}__/g, 'module__<h>__');
  return ux ? cssForCompare(named) : named;
}
const sheetName = (h) => (isUxSheet(h) ? '/api/ux-v1/a0/styles' : sheetForCompare(h, false));
/**
 * Compare the stylesheets two versions of a page link, in order. getA(href), getB(href): async { ok, body } or
 * { ok: false, status }. Returns { count, diff } with diff null when every sheet holds the same CSS.
 */
export async function compareSheets(ha, hb, getA, getB) {
  const count = Math.max(ha.length, hb.length);
  if (ha.length !== hb.length) return { count, diff: { a: `${ha.length} stylesheets`, b: `${hb.length} stylesheets` } };
  for (let i = 0; i < ha.length; i++) {
    const x = ha[i]; const y = hb[i];
    if (!isLocalHref(x) || !isLocalHref(y)) {
      if (x !== y) return { count, diff: { a: `sheet ${i} ${x}`, b: `sheet ${i} ${y}` } };
      continue;
    }
    if (isUxSheet(x) !== isUxSheet(y)) return { count, diff: { a: `sheet ${i} ${sheetName(x)}`, b: `sheet ${i} ${sheetName(y)}` } };
    const [ca, cb] = await Promise.all([getA(x), getB(y)]);
    if (!ca.ok || !cb.ok) {
      return { count, diff: { a: `sheet ${i} ${sheetName(x)} answered ${ca.ok ? 200 : ca.status}`, b: `sheet ${i} ${sheetName(y)} answered ${cb.ok ? 200 : cb.status}` } };
    }
    const na = sheetForCompare(ca.body, isUxSheet(x)); const nb = sheetForCompare(cb.body, isUxSheet(y));
    if (na !== nb) {
      const la = na.split(/(?<=\})/); const lb = nb.split(/(?<=\})/);
      let k = 0;
      while (k < Math.max(la.length, lb.length) && la[k] === lb[k]) k++;
      const where = `sheet ${i} ${sheetName(x)} rule ${k}: `;
      return { count, diff: { a: where + (la[k] ?? '(none)').trim().slice(0, 240), b: where + (lb[k] ?? '(none)').trim().slice(0, 240) } };
    }
  }
  return { count, diff: null };
}

/** The first differing nodes, split after each '>' like flag-off-diff does. */
export function firstDiffs(a, b, max = 6) {
  const la = a.split(/(?<=>)/); const lb = b.split(/(?<=>)/); const found = [];
  for (let i = 0; i < Math.max(la.length, lb.length) && found.length < max; i++) {
    if (la[i] !== lb[i]) found.push({ at: i, a: (la[i] ?? '').slice(0, 300), b: (lb[i] ?? '').slice(0, 300) });
  }
  return found;
}

/**
 * Judge one page. a, b: flag-off-diff's normalised bodies; fod: its verdict; css(va, vb): async, true when the two
 * UX stylesheets are equivalent (N1); loc(): async, { a, b } redirect targets; sheets(): async, optional, the
 * CR-009 check of a page judged identical: { count, diff } from compareSheets.
 */
export async function judge({ page, a, b, fod, css, loc, sheets }) {
  const row = { page, status: `${fod.statusA}/${fod.statusB}`, identical: fod.identical, normalised: [], found: [], sheets: 0 };
  if (!fod.identical) {
    if (fod.statusA !== fod.statusB) { row.found = firstDiffs(a, b); return row; }
    if (fod.statusA >= 300 && fod.statusA < 400) {
      const l = await loc();
      if (l.a !== l.b) { row.found = [{ at: -1, a: `location ${l.a}`, b: `location ${l.b}` }]; return row; }
    }
    let na = a; let nb = b;
    const va = cssVersions(a); const vb = cssVersions(b);
    if (va.length === 1 && vb.length === 1 && va[0] !== vb[0] && await css(va[0], vb[0])) {
      na = normaliseCssVersion(na); nb = normaliseCssVersion(nb); row.normalised.push('css-version');
    }
    if (na !== nb) {
      const xa = normaliseAnalyticsRef(na); const xb = normaliseAnalyticsRef(nb);
      if (xa !== na || xb !== nb) { na = xa; nb = xb; row.normalised.push('analytics-ref'); }
    }
    row.identical = na === nb;
    if (!row.identical) {
      const f = judgeFlight(na, nb);
      row.identical = f.identical; row.found = f.found; row.normalised.push(...f.normalised);
    }
    if (!row.identical) return row;
  }
  if (sheets) {
    const s = await sheets();
    row.sheets = s.count;
    if (s.diff) { row.identical = false; row.found = [{ at: 'css-content', a: s.diff.a, b: s.diff.b }]; }
  }
  return row;
}

export function render(rows, listName, listSha) {
  const lines = [`# parity verdict, rules ${RULES_VERSION}, list ${listName} sha256 ${listSha}`];
  for (const r of rows) {
    lines.push(`${r.identical ? 'IDENTICAL' : 'DIFFERENT'} ${r.page} status ${r.status}${r.sheets ? ` css ${r.sheets}` : ''}`);
    for (const d of r.found) lines.push(`  ${typeof d.at === 'number' ? `node ${d.at}` : d.at}`, `    A: ${d.a}`, `    B: ${d.b}`);
  }
  const diff = rows.filter((r) => !r.identical).length;
  lines.push(diff ? `identical: false (${diff} of ${rows.length} pages differ)` : `identical: true (${rows.length} pages)`);
  return lines.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const A = opt('--a'); const B = opt('--b'); const fodOut = opt('--fod-out'); const fodLog = opt('--fod-log');
  const urls = opt('--urls'); const out = opt('--out');
  if (!A || !B || !fodOut || !fodLog || !urls || !out) {
    process.stderr.write('usage: compare.mjs --a <url> --b <url> --fod-out <dir> --fod-log <file> --urls <file> --out <dir>\n');
    process.exit(2);
  }
  const listText = fs.readFileSync(urls, 'utf8');
  const pages = readList(listText);
  const names = pages.map(pageFile);
  if (new Set(names).size !== names.length) { process.stderr.write('compare: two URLs map to the same flag-off-diff file\n'); process.exit(2); }
  const fod = parseFodLog(fs.readFileSync(fodLog, 'utf8'));
  const cssCache = new Map();
  const get = async (base, p) => {
    const r = await fetch(base + p, { redirect: 'manual', headers: { 'user-agent': 'o1-parity-compare' } });
    return { status: r.status, location: r.headers.get('location'), body: await r.text() };
  };
  // Every stylesheet is read once per run and side (N1 and the CR-009 check share the reads).
  const sheetReads = new Map();
  const sheet = (base, href) => {
    const k = `${base} ${href}`;
    if (!sheetReads.has(k)) sheetReads.set(k, get(base, href).then((r) => (r.status === 200 ? { ok: true, body: r.body } : { ok: false, status: r.status })));
    return sheetReads.get(k);
  };
  const css = async (va, vb) => {
    const k = `${va} ${vb}`;
    if (!cssCache.has(k)) {
      const [ca, cb] = await Promise.all([sheet(A, `/api/ux-v1/a0/styles?v=${va}`), sheet(B, `/api/ux-v1/a0/styles?v=${vb}`)]);
      cssCache.set(k, ca.ok && cb.ok && cssEquivalent(ca.body, cb.body));
    }
    return cssCache.get(k);
  };
  const rows = [];
  for (const [i, page] of pages.entries()) {
    const f = fod.get(page);
    const fa = path.join(fodOut, `${names[i]}.a.html`); const fb = path.join(fodOut, `${names[i]}.b.html`);
    if (!f || !fs.existsSync(fa) || !fs.existsSync(fb)) { process.stderr.write(`compare: flag-off-diff has no result for ${page}\n`); process.exit(2); }
    const loc = async () => { const [x, y] = await Promise.all([get(A, page), get(B, page)]); return { a: x.location, b: y.location }; };
    // CR-009: flag-off-diff keeps no raw body, so the page is read once more from each side for its stylesheet links.
    const sheets = async () => {
      const [pa, pb] = await Promise.all([get(A, page), get(B, page)]);
      if (pa.status !== f.statusA || pb.status !== f.statusB) {
        return { count: 0, diff: { a: `page answered ${pa.status} on the stylesheet read`, b: `page answered ${pb.status} on the stylesheet read` } };
      }
      return compareSheets(stylesheetHrefs(pa.body), stylesheetHrefs(pb.body), (h) => sheet(A, h), (h) => sheet(B, h));
    };
    rows.push(await judge({ page, a: fs.readFileSync(fa, 'utf8'), b: fs.readFileSync(fb, 'utf8'), fod: f, css, loc, sheets }));
  }
  const text = render(rows, path.basename(urls), crypto.createHash('sha256').update(listText).digest('hex'));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'result.txt'), text);
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ rules: RULES_VERSION, identical: rows.every((r) => r.identical), rows }, null, 1) + '\n');
  process.stdout.write(text);
  process.exit(rows.every((r) => r.identical) ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
