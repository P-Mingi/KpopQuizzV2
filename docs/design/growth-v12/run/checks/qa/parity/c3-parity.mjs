#!/usr/bin/env node
// C3 production parity (V12 prompt section 6): both flags off, feat/v12 (A) vs origin/main (B).
//
//   node c3-parity.mjs --a http://localhost:PA --b http://localhost:PB --out <dir>
//
// 1. docs/release/snapshot.mjs on both bases at the same time (40 URLs + sitemap + robots), then its
//    --compare: status, title, description, canonical, hreflang, robots, H1, parsed JSON-LD, links.
// 2. Server HTML of the 38 pages fetched from A and B in parallel, normalized: `/_next/static/...` paths,
//    the build id and the streamed page data (`self.__next_f` scripts) removed; then diffed line by line.
// 3. sitemap.xml as the set of <url> entries (loc + sorted hreflang alternates, lastmod left out);
//    robots.txt byte for byte.
// GET only, no cookies. Every output goes to <dir>; the summary is printed and saved as summary.txt.

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../../..');
const SNAP = path.join(ROOT, 'docs/release/snapshot.mjs');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const A = arg('--a')?.replace(/\/$/, ''), B = arg('--b')?.replace(/\/$/, ''), OUT = arg('--out');
if (!A || !B || !OUT) { console.error('usage: --a URL --b URL --out DIR'); process.exit(2); }
mkdirSync(path.join(OUT, 'html'), { recursive: true });
const lines = [];
const log = (s) => { lines.push(s); console.log(s); };

const run = (base, out) => new Promise((res, rej) => {
  const p = spawn(process.execPath, [SNAP, '--base', base, '--out', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; p.stderr.on('data', (d) => { err += d; });
  p.on('close', (c) => (c === 0 ? res(err) : rej(new Error(`snapshot ${base} exit ${c}\n${err}`))));
});

// 1. Field snapshot, both bases at once.
const sa = path.join(OUT, 'a.json'), sb = path.join(OUT, 'b.json');
await Promise.all([run(A, sa), run(B, sb)]);
const fieldDiff = execFileSync(process.execPath, [SNAP, '--compare', sb, sa], { encoding: 'utf8' });
writeFileSync(path.join(OUT, 'fields-diff.txt'), fieldDiff);
log(`fields (b = origin/main, a = feat/v12): ${fieldDiff.trim().split('\n').pop()}`);

// 2. Server HTML, normalized.
const urls = Object.keys(JSON.parse(readFileSync(sa, 'utf8')).pages).filter((u) => !u.endsWith('.xml') && !u.endsWith('.txt'));
const get = async (base, u) => {
  const r = await fetch(base + u, { redirect: 'manual', headers: { 'user-agent': 'kpopquiz-c3-parity/1.0' } });
  return { status: r.status, location: r.headers.get('location'), body: await r.text() };
};
const normalize = (html) => {
  const id = (html.match(/\/_next\/static\/([^/"']+)\/_(?:buildManifest|ssgManifest)/) || [])[1];
  let s = html.replace(/<script>self\.__next_f\.push\([\s\S]*?<\/script>/g, '');
  s = s.replace(/\/_next\/static\/[^"'\s)>]+/g, '/_next/static/X');
  if (id) s = s.split(id).join('BUILD_ID');
  return s.replace(/></g, '>\n<');
};
let htmlSame = 0;
const htmlDiffs = [];
for (const u of urls) {
  const [x, y] = await Promise.all([get(A, u), get(B, u)]);
  const slug = u === '/' ? 'root' : u.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_');
  const fa = path.join(OUT, 'html', `${slug}.a.html`), fb = path.join(OUT, 'html', `${slug}.b.html`);
  writeFileSync(fa, `status ${x.status} ${x.location ?? ''}\n${normalize(x.body)}`);
  writeFileSync(fb, `status ${y.status} ${y.location ?? ''}\n${normalize(y.body)}`);
  let d = '';
  try { execFileSync('diff', [fb, fa], { encoding: 'utf8' }); } catch (e) { d = e.stdout || String(e); }
  if (!d) { htmlSame++; continue; }
  writeFileSync(path.join(OUT, 'html', `${slug}.diff`), d);
  const changed = d.split('\n').filter((l) => /^[<>] /.test(l)).length;
  htmlDiffs.push(`${u}: ${changed} changed line(s), html/${slug}.diff`);
}
log(`server HTML: ${htmlSame}/${urls.length} identical after normalization`);
for (const l of htmlDiffs) log(`  ${l}`);

// 3. Sitemap entries with alternates, robots byte for byte.
const entries = (xml) => [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
  const loc = (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1];
  const alt = [...m[1].matchAll(/<xhtml:link\b[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map((x) => `${x[1]}=${x[2]}`).sort();
  return `${loc} ${alt.join(' ')}`.trim();
});
const [smA, smB, rbA, rbB] = await Promise.all([get(A, '/sitemap.xml'), get(B, '/sitemap.xml'), get(A, '/robots.txt'), get(B, '/robots.txt')]);
const ea = new Set(entries(smA.body)), eb = new Set(entries(smB.body));
const onlyA = [...ea].filter((e) => !eb.has(e)), onlyB = [...eb].filter((e) => !ea.has(e));
writeFileSync(path.join(OUT, 'sitemap-diff.txt'), `only feat/v12 (${onlyA.length}):\n${onlyA.join('\n')}\n\nonly origin/main (${onlyB.length}):\n${onlyB.join('\n')}\n`);
log(`sitemap: a ${ea.size} entries, b ${eb.size}; only a ${onlyA.length}, only b ${onlyB.length}`);
const robotsSame = rbA.status === rbB.status && rbA.body === rbB.body;
log(`robots.txt: ${robotsSame ? 'byte identical' : 'DIFFERENT'} (status ${rbA.status} / ${rbB.status})`);
writeFileSync(path.join(OUT, 'summary.txt'), `a ${A} (feat/v12)\nb ${B} (origin/main)\n${new Date().toISOString()}\n${lines.join('\n')}\n`);
