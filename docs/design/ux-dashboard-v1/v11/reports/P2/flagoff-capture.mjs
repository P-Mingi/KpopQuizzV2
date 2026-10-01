// Flag-off parity on ONE dev server (P2): capture the served pages, swap the route file
// (base <-> branch), capture again, compare. One server = one data cache, so live data
// (play counts, tie order, "as of" times) cannot drift between the two captures; only the
// code can differ. Same normalisation as e2e/ux-v1/helpers/flag-off-diff.mjs --structure
// (build ids, hashed assets, client chunk tags and the inline RSC payload removed) plus
// the dev-only per-render request id. Read only (GET).
//   node flagoff-capture.mjs capture <base> <outDir> <path> [<path> ...]
//   node flagoff-capture.mjs compare <dirA> <dirB>

import fs from 'node:fs';
import path from 'node:path';

const [mode, ...rest] = process.argv.slice(2);

function structure(html) {
  return html
    .replace(/(\/?_next\/)?static\/(chunks|css|media)\/[A-Za-z0-9_\-./~%()[\]@]+?\.(js|css|woff2?|png|svg|jpg|webp|avif)(\?v=\d+)?/g, 'static/$2/<asset>.$3')
    .replace(/\/_next\/static\/[A-Za-z0-9_-]{10,}\/(_buildManifest|_ssgManifest)\.js/g, '/_next/static/<build>/$1.js')
    .replace(/module__[A-Za-z0-9_-]{6}__/g, 'module__<h>__')
    .replace(/<script src="static\/chunks\/<asset>\.js" async=""><\/script>/g, '')
    .replace(/<link rel="preload" as="script" fetchPriority="low" href="static\/chunks\/<asset>\.js"\/>/g, '')
    .replace(/<script>self\.__next_f\.push\([\s\S]*?\)<\/script>/g, '')
    .replace(/<script>\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push\([\s\S]*?\)<\/script>/g, '')
    .replace(/self\.__next_r="[^"]*"/g, 'self.__next_r="<rid>"');
}
const file = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9-]+/gi, '_'));

if (mode === 'capture') {
  const [base, out, ...paths] = rest;
  fs.mkdirSync(out, { recursive: true });
  for (const p of paths) {
    const r = await fetch(base + p, { redirect: 'manual', headers: { 'user-agent': 'ux11-p2-flagoff' } });
    const body = await r.text();
    fs.writeFileSync(path.join(out, `${file(p)}.html`), `<!-- status ${r.status} ${r.headers.get('location') ?? ''} -->\n${structure(body)}`);
    process.stdout.write(`captured ${p} ${r.status} ${body.length} B\n`);
  }
} else if (mode === 'compare') {
  const [a, b] = rest;
  let diff = 0;
  for (const f of fs.readdirSync(a).filter((x) => x.endsWith('.html')).sort()) {
    // the popular windows print the render time ("As of <date> at 01:25 UTC"): a clock, not code
    const clock = (h) => h.replace(/As of <!-- -->[^<]*? UTC<!-- -->/g, 'As of <!-- --><time> UTC<!-- -->');
    const ha = clock(fs.readFileSync(path.join(a, f), 'utf8'));
    const hb = clock(fs.existsSync(path.join(b, f)) ? fs.readFileSync(path.join(b, f), 'utf8') : '');
    const same = ha === hb;
    if (!same) diff++;
    let at = -1;
    if (!same) for (let i = 0; i < Math.min(ha.length, hb.length); i++) if (ha[i] !== hb[i]) { at = i; break; }
    process.stdout.write(`${same ? 'IDENTICAL' : 'DIFFERENT'}  ${f.replace('.html', '')}  ${ha.length}/${hb.length}${at >= 0 ? `  at ${at}: A=${JSON.stringify(ha.slice(Math.max(0, at - 60), at + 100))} B=${JSON.stringify(hb.slice(Math.max(0, at - 60), at + 100))}` : ''}\n`);
  }
  process.stdout.write(diff ? `${diff} page(s) differ\n` : 'all pages identical (structure level)\n');
  process.exit(diff ? 1 : 0);
}
