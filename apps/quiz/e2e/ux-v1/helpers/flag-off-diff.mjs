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
const LEVEL = args.includes('--structure') ? 'structure' : 'bytes';
if (LEVEL === 'structure') args.splice(args.indexOf('--structure'), 1);
const pages = args.length ? args : ['/'];

function normalise(html) {
  return html
    // content-hashed assets: /_next/static/chunks/app/page-3f2a....js, css, media, and the build-id folder
    .replace(/(\/?_next\/)?static\/(chunks|css|media)\/[A-Za-z0-9_\-./~%()[\]@]+?\.(js|css|woff2?|png|svg|jpg|webp|avif)/g, 'static/$2/<asset>.$3')
    .replace(/\/_next\/static\/[A-Za-z0-9_-]{10,}\/(_buildManifest|_ssgManifest)\.js/g, '/_next/static/<build>/$1.js')
    // CSS-module / next/font class names carry a hash of the file path (differs when
    // the two builds live in different folders)
    .replace(/module__[A-Za-z0-9_-]{6}__/g, 'module__<h>__')
    // build id inside the RSC payload ("b":"<id>") and the page's buildId field
    .replace(/(\\?"b\\?":\\?")[A-Za-z0-9_-]{10,}(\\?")/g, '$1<build>$2')
    .replace(/("buildId":")[A-Za-z0-9_-]{10,}(")/g, '$1<build>$2');
}

// Second level (--structure): the served document without the JS plumbing, i.e.
// without the client chunk <script src> tags, their preloads and the inline RSC
// hydration payload (self.__next_f.push), whose client-module ids and chunk lists
// change whenever any client code in the shared layout changes. Kept: every
// element, attribute and text a user or a crawler reads, the head (title, meta,
// canonical, hreflang, stylesheets, fonts), JSON-LD and the pre-paint theme script.
function structure(html) {
  return normalise(html)
    .replace(/<script src="static\/chunks\/<asset>\.js" async=""><\/script>/g, '')
    .replace(/<link rel="preload" as="script" fetchPriority="low" href="static\/chunks\/<asset>\.js"\/>/g, '')
    .replace(/<script>self\.__next_f\.push\([\s\S]*?\)<\/script>/g, '')
    .replace(/<script>\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push\([\s\S]*?\)<\/script>/g, '');
}

async function get(base, p) {
  const r = await fetch(base + p, { redirect: 'manual', headers: { 'user-agent': 'ux11-flag-off-diff' } });
  return { status: r.status, location: r.headers.get('location'), body: await r.text() };
}

let diffs = 0;
const rows = [];
for (const p of pages) {
  const [a, b] = await Promise.all([get(A, p), get(B, p)]);
  const norm = LEVEL === 'structure' ? structure : normalise;
  const na = norm(a.body);
  const nb = norm(b.body);
  const scripts = (h) => (h.match(/<script src="\/_next\/static\/chunks\/[^"]+"/g) ?? []).length;
  const same = a.status === b.status && a.location === b.location && na === nb;
  const found = [];
  if (!same) {
    diffs++;
    const la = na.split(/(?<=>)/); const lb = nb.split(/(?<=>)/);
    for (let i = 0; i < Math.max(la.length, lb.length) && found.length < 6; i++) {
      if (la[i] !== lb[i]) found.push({ at: i, a: (la[i] ?? '').slice(0, 300), b: (lb[i] ?? '').slice(0, 300) });
    }
  }
  rows.push({ page: p, status: `${a.status}/${b.status}`, bytes: `${a.body.length}/${b.body.length}`, normalisedBytes: `${na.length}/${nb.length}`, scripts: `${scripts(a.body)}/${scripts(b.body)}`, identical: same, found });
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    const f = p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9-]+/gi, '_');
    fs.writeFileSync(path.join(OUT, `${f}.a.html`), na);
    fs.writeFileSync(path.join(OUT, `${f}.b.html`), nb);
  }
}
for (const r of rows) {
  process.stdout.write(`${r.identical ? 'IDENTICAL' : 'DIFFERENT'} (${LEVEL})  ${r.page}  status ${r.status}  raw bytes ${r.bytes}  normalised ${r.normalisedBytes}  js chunks ${r.scripts}\n`);
  for (const d of r.found) process.stdout.write(`  node ${d.at}\n    A: ${d.a}\n    B: ${d.b}\n`);
}
process.stdout.write(diffs ? `${diffs} page(s) differ\n` : `all ${rows.length} pages identical after normalising build ids and hashed asset names\n`);
process.exit(diffs ? 1 : 0);
