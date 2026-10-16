#!/usr/bin/env node
// Run O1, lane Q0a: the parity verdict, applied after apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs (wrapped, never
// edited). flag-off-diff fetches every URL from A (base) and B (head) in the same second, normalises build ids,
// hashed asset names and CSS-module hashes, writes <out>/<page>.a.html and .b.html and prints one line per page.
// This script re-judges only the pages flag-off-diff found DIFFERENT, with the two normalisations of owner gate G0
// (RUN-O1-PROMPT section 8) and nothing else:
//   N1 css-version: the `?v=` of /api/ux-v1/a0/styles, only when the CSS served by A and by B is equal once every
//      white literal (#fff, #ffffff, any case) reads var(--ux-on-accent) and a declaration of --ux-on-accent whose
//      value is that white is dropped (the token B1 introduces for kpop's literal white; any other CSS change
//      keeps the hash difference, so the page stays DIFFERENT). Both stylesheets are fetched (GET) once per run.
//   N2 analytics-ref: the client reference of the Analytics component in the inline page data (React Flight row
//      I[<module id>,[<chunks>],"Analytics"], or "NetAnalytics", the wrapper B6 adds for beforeSend), replaced by
//      I[<analytics>] on both sides.
// A page whose status differs, or whose redirect target differs (re-read with one GET per side, 3xx only), is
// DIFFERENT whatever its body. Output (deterministic: no time, no byte count, no live number outside a diff):
//   <out>/result.txt  one line per URL in list order, then the verdict line
//   <out>/result.json the same as data
// Exit 0 = every page identical after the allowed normalisations, 1 = a real difference, 2 = bad input.
//
//   node scripts/o1/parity/compare.mjs --a http://127.0.0.1:4011 --b http://127.0.0.1:4012 \
//        --fod-out <flag-off-diff --out dir> --fod-log <flag-off-diff stdout> --urls <list> --out <dir>
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RULES_VERSION = 'q0a-g0-v1';
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
 * stylesheets are equivalent; loc(): async, { a, b } redirect targets.
 */
export async function judge({ page, a, b, fod, css, loc }) {
  const row = { page, status: `${fod.statusA}/${fod.statusB}`, identical: fod.identical, normalised: [], found: [] };
  if (fod.identical) return row;
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
  if (!row.identical) row.found = firstDiffs(na, nb);
  return row;
}

export function render(rows, listName, listSha) {
  const lines = [`# parity verdict, rules ${RULES_VERSION}, list ${listName} sha256 ${listSha}`];
  for (const r of rows) {
    lines.push(`${r.identical ? 'IDENTICAL' : 'DIFFERENT'} ${r.page} status ${r.status}${r.normalised.length ? ` normalised ${r.normalised.join(',')}` : ''}`);
    for (const d of r.found) lines.push(`  node ${d.at}`, `    A: ${d.a}`, `    B: ${d.b}`);
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
  const css = async (va, vb) => {
    const k = `${va} ${vb}`;
    if (!cssCache.has(k)) {
      const [ca, cb] = await Promise.all([get(A, `/api/ux-v1/a0/styles?v=${va}`), get(B, `/api/ux-v1/a0/styles?v=${vb}`)]);
      cssCache.set(k, ca.status === 200 && cb.status === 200 && cssEquivalent(ca.body, cb.body));
    }
    return cssCache.get(k);
  };
  const rows = [];
  for (const [i, page] of pages.entries()) {
    const f = fod.get(page);
    const fa = path.join(fodOut, `${names[i]}.a.html`); const fb = path.join(fodOut, `${names[i]}.b.html`);
    if (!f || !fs.existsSync(fa) || !fs.existsSync(fb)) { process.stderr.write(`compare: flag-off-diff has no result for ${page}\n`); process.exit(2); }
    const loc = async () => { const [x, y] = await Promise.all([get(A, page), get(B, page)]); return { a: x.location, b: y.location }; };
    rows.push(await judge({ page, a: fs.readFileSync(fa, 'utf8'), b: fs.readFileSync(fb, 'utf8'), fod: f, css, loc }));
  }
  const text = render(rows, path.basename(urls), crypto.createHash('sha256').update(listText).digest('hex'));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'result.txt'), text);
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ rules: RULES_VERSION, identical: rows.every((r) => r.identical), rows }, null, 1) + '\n');
  process.stdout.write(text);
  process.exit(rows.every((r) => r.identical) ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
