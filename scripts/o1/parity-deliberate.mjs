#!/usr/bin/env node
// Run O1, CR-015: the judge of a deliberate change to kpopquiz.org pages, read after a parity run. parity.sh compares two commits, and the
// base commit is the only reference there is: no stored page, no known-difference list. A deliberate change therefore makes parity exit 1
// on its pages, as it should, and that verdict is not touched: this script lives outside scripts/o1/parity/ so the harness version and every
// cache key stay as they were, and neither parity.sh, gate.sh nor merge-lane.sh reads it. It replaces the judgement by hand of such a run
// (D-108, D-114) with a check: given the run's folder and a record (docs/o1/parity-deliberate/<CR>.json), exit 0 only when
//   1. every page outside the record is IDENTICAL in result.json (the stylesheets they link included, CR-009), and every page in it DIFFERENT;
//   2. each recorded page has one status on both sides, and outside its declared element its server HTML is byte for byte the base's, title,
//      meta, canonical, JSON-LD, headings and links included (N5 applied, as compare.mjs does). Only script and style asset tags may differ:
//      their names are hashed, and a page's own code moves them. Their number is checked: exactly addedStylesheets more sheets, and every
//      sheet of the base still linked;
//   3. the declared element holds what the record allows: no h1, at most regionMaxLinks links, and with keepLinks every link of the base's;
//   4. no flightForbid string is in the head's page data.
// Not judged: the rows of the page data of a recorded page beyond 4 (an added server component renumbers them). Their counts are printed.
//   node scripts/o1/parity-deliberate.mjs --run <KPQ/cache/parity/<key>> --record docs/o1/parity-deliberate/CR-015.json
// Exit 0 = only the recorded change, 1 = anything else, 2 = bad input.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { firstDiffs, flightRows, normaliseFlightId, normaliseTextSeparators, pageFile, splitFlight } from './parity/compare.mjs';

/** The one element with this tag and class: { count, region, rest }. Balanced on the same tag. More than one is reported, never guessed. */
export function takeElement(html, { tag, class: cls }) {
  const open = new RegExp(`<${tag}\\b[^>]*\\sclass="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`, 'g');
  const hits = [...html.matchAll(open)];
  if (hits.length !== 1) return { count: hits.length, region: '', rest: html };
  const start = hits[0].index;
  const walk = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, 'g');
  walk.lastIndex = start;
  let depth = 0;
  for (let m = walk.exec(html); m; m = walk.exec(html)) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      const end = m.index + m[0].length;
      return { count: 1, region: html.slice(start, end), rest: html.slice(0, start) + html.slice(end) };
    }
  }
  return { count: 2, region: '', rest: html }; // never closed: not one element
}

// The attributes of a tag, quoted values whole: flag-off-diff writes hashed names as <asset>, a '>' inside an href.
const ATTRS = '(?:[^>"]|"[^"]*")*';
const SHEET_RE = new RegExp(`<link\\b(?=${ATTRS}\\srel="stylesheet")${ATTRS}>`, 'g');
const ASSET_RES = [
  new RegExp(`<link\\b(?=${ATTRS}\\srel="preload")(?=${ATTRS}\\sas="(?:style|script)")${ATTRS}>`, 'g'),
  new RegExp(`<script\\b(?=${ATTRS}\\ssrc=")${ATTRS}></script>`, 'g'),
];
const hrefOf = (t) => t.match(/\shref="([^"]*)"/)?.[1] ?? t;
/** The document without its asset tags, and the stylesheet links it held. */
export function withoutAssets(html) {
  const sheets = (html.match(SHEET_RE) ?? []).map(hrefOf);
  let rest = html.replace(SHEET_RE, '');
  for (const re of ASSET_RES) rest = rest.replace(re, '');
  return { rest, sheets };
}
const links = (html) => [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((m) => m[1]);

/** One recorded page: { problems, facts }. a and b are flag-off-diff's normalised bodies. */
export function judgeDeliberate(a, b, rule) {
  const problems = [];
  const sa = splitFlight(normaliseTextSeparators(a)); const sb = splitFlight(normaliseTextSeparators(b));
  let restA = sa.rest; let restB = sb.rest; let region = ''; let baseRegion = '';
  const el = rule.replaced ?? rule.added;
  if (!el) return { problems: ['the record declares no element'], facts: {} };
  const tb = takeElement(restB, el);
  if (tb.count > 1) problems.push(`head: ${tb.count} elements ${el.tag}.${el.class}, one allowed`);
  region = tb.region; restB = tb.rest;
  const ta = takeElement(restA, el);
  if (rule.added) {
    if (ta.count !== 0) problems.push(`base already holds ${el.tag}.${el.class}: not an added element`);
  } else {
    if (ta.count > 1) problems.push(`base: ${ta.count} elements ${el.tag}.${el.class}, one allowed`);
    // Offline a read fails and neither side lists: present on both or on neither.
    if (ta.count !== tb.count) problems.push(`${el.tag}.${el.class}: ${ta.count} on the base, ${tb.count} on the head`);
    baseRegion = ta.region; restA = ta.rest;
  }
  const xa = withoutAssets(restA); const xb = withoutAssets(restB);
  if (xa.rest !== xb.rest) {
    for (const d of firstDiffs(xa.rest, xb.rest, 3)) problems.push(`outside the element, node ${d.at}: base ${d.a} | head ${d.b}`);
  }
  const want = xa.sheets.length + (rule.addedStylesheets ?? 0);
  if (xb.sheets.length !== want) problems.push(`stylesheets: ${xb.sheets.length} on the head, ${want} expected`);
  const lost = xa.sheets.filter((h) => !xb.sheets.includes(h));
  if (lost.length) problems.push(`stylesheets lost: ${lost.join(' ')}`);
  if (/<h1\b/.test(region)) problems.push('an h1 inside the element');
  const inRegion = links(region);
  if (rule.regionMaxLinks !== undefined && inRegion.length > rule.regionMaxLinks) problems.push(`${inRegion.length} links inside the element, at most ${rule.regionMaxLinks}`);
  if (rule.keepLinks) {
    const gone = [...new Set(links(baseRegion))].filter((h) => !inRegion.includes(h));
    if (gone.length) problems.push(`links lost: ${gone.join(' ')}`);
  }
  for (const s of rule.flightForbid ?? []) if (sb.stream.includes(s) || sb.stream.includes(s.replaceAll('"', '\\"'))) problems.push(`page data holds ${s}`);
  const ra = sa.ok ? flightRows(sa.stream) : { ok: false, rows: [] }; const rb = sb.ok ? flightRows(sb.stream) : { ok: false, rows: [] };
  const setA = new Set(ra.rows.map(normaliseFlightId)); const setB = new Set(rb.rows.map(normaliseFlightId));
  return {
    problems,
    facts: {
      linksBase: links(sa.rest).length, linksHead: links(sb.rest).length, h1Head: (sb.rest.match(/<h1\b/g) ?? []).length,
      rowsOnlyBase: [...setA].filter((r) => !setB.has(r)).length, rowsOnlyHead: [...setB].filter((r) => !setA.has(r)).length,
    },
  };
}

/** The whole run. rows: result.json's. read(page): { a, b }. Returns { ok, lines }. */
export function judgeRun(rows, record, read) {
  const lines = []; let ok = true;
  const fail = (s) => { ok = false; lines.push(`FAIL ${s}`); };
  for (const page of Object.keys(record.pages)) if (!rows.some((r) => r.page === page)) fail(`${page} is not in the run`);
  for (const r of rows) {
    const rule = record.pages[r.page];
    if (!rule) { if (!r.identical) fail(`${r.page} differs and is not in ${record.cr}`); continue; }
    if (r.identical) { fail(`${r.page} is in ${record.cr} but identical: the recorded change is not there`); continue; }
    const [sa, sb] = String(r.status).split('/');
    if (sa !== sb) { fail(`${r.page} status ${r.status}`); continue; }
    const { a, b } = read(r.page);
    const j = judgeDeliberate(a, b, rule);
    for (const p of j.problems) fail(`${r.page} ${p}`);
    lines.push(`${j.problems.length ? 'DIFFERENT' : 'ONLY THE RECORDED CHANGE'} ${r.page} ${JSON.stringify(j.facts)}`);
  }
  const others = rows.filter((r) => !record.pages[r.page]);
  lines.push(`${others.filter((r) => r.identical).length} of ${others.length} other pages identical; ${ok ? `only ${record.cr}` : 'not only the recorded change'}`);
  return { ok, lines };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const run = opt('--run'); const rec = opt('--record');
  if (!run || !rec) { process.stderr.write('usage: parity-deliberate.mjs --run <parity run folder> --record <record.json>\n'); process.exit(2); }
  let rows; let record;
  try {
    rows = JSON.parse(fs.readFileSync(path.join(run, 'result.json'), 'utf8')).rows;
    record = JSON.parse(fs.readFileSync(rec, 'utf8'));
  } catch (e) { process.stderr.write(`parity-deliberate: ${e.message}\n`); process.exit(2); }
  const read = (page) => ({
    a: fs.readFileSync(path.join(run, 'diff', `${pageFile(page)}.a.html`), 'utf8'),
    b: fs.readFileSync(path.join(run, 'diff', `${pageFile(page)}.b.html`), 'utf8'),
  });
  const { ok, lines } = judgeRun(rows, record, read);
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exit(ok ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
