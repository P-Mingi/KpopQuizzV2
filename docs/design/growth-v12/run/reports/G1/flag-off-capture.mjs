#!/usr/bin/env node
// G1 flag-off proof, capture step. Read only (GET). Fetches a list of pages from
// ONE dev server and saves, per page, the served document reduced to what a
// visitor or a crawler reads (the same "structure" level as
// apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs: no client chunk tags, no RSC
// hydration payload, hashed asset names normalised). Run it twice, once on the
// base (feat/v12 at 836f276) and once on the candidate, both with every flag off,
// then compare the two folders with flag-off-compare.mjs.
//
//   node flag-off-capture.mjs --base http://localhost:3061 --out <dir> <path> [<path> ...]

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const BASE = opt('--base', 'http://localhost:3061');
const OUT = opt('--out', null);
if (!OUT || args.length === 0) { console.error('usage: flag-off-capture.mjs --base <url> --out <dir> <path>...'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

function structure(body) {
  return body
    .replace(/(\/?_next\/)?static\/(chunks|css|media)\/[A-Za-z0-9_\-./~%()[\]@]+?\.(js|css|woff2?|png|svg|jpg|webp|avif)(\?[A-Za-z0-9_=.&-]*)?/g, 'static/$2/<asset>.$3')
    .replace(/module__[A-Za-z0-9_-]{6}__/g, 'module__<h>__')
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
    .replace(/<link rel="preload" as="script"[^>]*\/>/g, '')
    .replace(/<script[^>]*>self\.__next_f\.push\([\s\S]*?\)<\/script>/g, '')
    .replace(/<script[^>]*>\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push\([\s\S]*?\)<\/script>/g, '')
    // one element per line, so a diff names the element that moved
    .replace(/></g, '>\n<');
}

const file = (p) => (p.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'home');
const index = [];
for (const p of args) {
  const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) G1-flag-off-capture' } });
  const raw = await r.text();
  const isJson = (r.headers.get('content-type') ?? '').includes('json');
  const body = isJson ? JSON.stringify(JSON.parse(raw), null, 1) : structure(raw);
  fs.writeFileSync(path.join(OUT, `${file(p)}.txt`), `${r.status} ${r.headers.get('location') ?? ''}\n${body}\n`);
  index.push({ path: p, status: r.status, bytes: body.length });
  console.log(r.status, body.length, p);
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
