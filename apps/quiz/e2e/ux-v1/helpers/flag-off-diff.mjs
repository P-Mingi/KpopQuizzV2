#!/usr/bin/env node
// Flag-off parity proof (worker prompt rule 5: "flag off = today's site, byte for
// byte"). Fetches the same pages from two `next start` servers built with the flag
// OFF (A = the base branch, B = the candidate branch), normalises what MUST differ
// between any two builds (build id, content-hashed asset file names), and diffs
// the rest. Exit 0 = identical after normalisation, 1 = a real difference.
//
//   node e2e/ux-v1/helpers/flag-off-diff.mjs --a http://localhost:4001 --b http://localhost:4002 \
//        --out /tmp/flag-off / /quizzes /q/<slug> /bts-quiz /blindtest
//
// Each page is fetched from A and B back to back (same second), so live data
// (play counts) cannot drift between the two. Read only (GET).

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const A = opt('--a', 'http://localhost:4001');
const B = opt('--b', 'http://localhost:4002');
const OUT = opt('--out', null);
const pages = args.length ? args : ['/'];

function normalise(html) {
  return html
    // content-hashed assets: /_next/static/chunks/app/page-3f2a....js, css, media, and the build-id folder
    .replace(/(\/?_next\/)?static\/(chunks|css|media)\/[A-Za-z0-9_\-./~%()[\]@]+?\.(js|css|woff2?|png|svg|jpg|webp|avif)/g, 'static/$2/<asset>.$3')
    .replace(/\/_next\/static\/[A-Za-z0-9_-]{10,}\/(_buildManifest|_ssgManifest)\.js/g, '/_next/static/<build>/$1.js')
    // build id inside the RSC payload ("b":"<id>") and the page's buildId field
    .replace(/(\\?"b\\?":\\?")[A-Za-z0-9_-]{10,}(\\?")/g, '$1<build>$2')
    .replace(/("buildId":")[A-Za-z0-9_-]{10,}(")/g, '$1<build>$2');
}

async function get(base, p) {
  const r = await fetch(base + p, { redirect: 'manual', headers: { 'user-agent': 'ux11-flag-off-diff' } });
  return { status: r.status, location: r.headers.get('location'), body: await r.text() };
}

let diffs = 0;
const rows = [];
for (const p of pages) {
  const [a, b] = await Promise.all([get(A, p), get(B, p)]);
  const na = normalise(a.body);
  const nb = normalise(b.body);
  const same = a.status === b.status && a.location === b.location && na === nb;
  let firstDiff = null;
  if (!same) {
    diffs++;
    const la = na.split(/(?<=>)/); const lb = nb.split(/(?<=>)/);
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
      if (la[i] !== lb[i]) { firstDiff = { at: i, a: (la[i] ?? '').slice(0, 300), b: (lb[i] ?? '').slice(0, 300) }; break; }
    }
  }
  rows.push({ page: p, status: `${a.status}/${b.status}`, bytes: `${a.body.length}/${b.body.length}`, normalisedBytes: na.length, identical: same, firstDiff });
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    const f = p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9-]+/gi, '_');
    fs.writeFileSync(path.join(OUT, `${f}.a.html`), na);
    fs.writeFileSync(path.join(OUT, `${f}.b.html`), nb);
  }
}
for (const r of rows) {
  process.stdout.write(`${r.identical ? 'IDENTICAL' : 'DIFFERENT'}  ${r.page}  status ${r.status}  raw bytes ${r.bytes}  normalised ${r.normalisedBytes}\n`);
  if (r.firstDiff) process.stdout.write(`  first difference at node ${r.firstDiff.at}\n  A: ${r.firstDiff.a}\n  B: ${r.firstDiff.b}\n`);
}
process.stdout.write(diffs ? `${diffs} page(s) differ\n` : `all ${rows.length} pages identical after normalising build ids and hashed asset names\n`);
process.exit(diffs ? 1 : 0);
