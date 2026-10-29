// Run O1, lane Q0a: check-network-links (Q-bridges D0; BACKLOG 2.6, the CI gate of the link allowlist).
//
// An anonymous crawl of each site given: every link to another Bunnyverse site must be on the allowlist, carry no `via`,
// have the rel the allowlist asks (nofollow where it says so, followed brand links where it says so), stay under its
// per-page cap; no canonical or alternate head link points to another network site; and on bunnyverse.org/anime the HTML
// never contains "kpopquiz.org" outside the allowlisted links (the mirror on kpopquiz.org: "bunnyverse.org/anime").
// The rules live in apps/quiz/scripts/o1/leak-lib.mjs (unit tests: leak-lib.test.mjs), shared with the Playwright
// leak suite (apps/quiz/e2e/o1/leak/link-leak.o1.ts), so the gate and the suite judge with one implementation.
//
//   ./node_modules/.bin/tsx apps/quiz/scripts/o1/check-network-links.mts --site kpop=http://127.0.0.1:4021 \
//       [--site anime=http://127.0.0.1:4022] [--site hub=http://127.0.0.1:4023] [--urls kpop=<path list>] \
//       [--sitemap 200] [--sitemap kpop=0] [--allowlist <json>] [--out <dir>]
// Page set of a site: the --urls list (kpop default: the 60-URL parity list), else the route map's static paths,
// plus the first --sitemap paths of the site's own sitemap.xml (default 200, Q-bridges D0). The parity list's GETs
// are write-audited (reports/Q0a.md); sitemap paths are not, so a kpop server that reads production without the
// strict guard gets --sitemap kpop=0. gate-checks.sh gives 200 on every site: every kpop server it starts is offline
// or the kept parity build under parity.sh's strict guard (any write refused, before it leaves the machine).
// Output: one line per page (ok, FAIL with the violation, or the status of a page that is not HTML 200), then the
// verdict; deterministic (list order, no time, no byte count). <out>/network-links.txt and .json when --out is given.
// Exit 0 = clean, 1 = a violation, 2 = bad input or a server that does not answer.
import fs from 'node:fs';
import path from 'node:path';

import { type LeakSiteId, LEAK_SITE_IDS, APP_DIR, kpopHtmlPaths, loadContract } from './leak-contract';
import { analyzeHtml, checkLinks, httpGet, readPathList, sitemapPaths } from './leak-lib.mjs';

function fail(msg: string): never {
  console.error(`check-network-links: ${msg}`);
  process.exit(2);
}

const argv = process.argv.slice(2);
const sites = new Map<LeakSiteId, string>();
const urlFiles = new Map<LeakSiteId, string>();
const sitemapN = new Map<LeakSiteId | '*', number>([['*', 200]]);
let allowFile = '';
let outDir = '';
const isSite = (s: string): s is LeakSiteId => (LEAK_SITE_IDS as readonly string[]).includes(s);
for (let i = 0; i < argv.length; i += 1) {
  const k = argv[i];
  const v = argv[i + 1] ?? '';
  const pair = (): [LeakSiteId, string] => {
    const at = v.indexOf('=');
    const s = v.slice(0, at);
    if (at < 1 || !isSite(s)) fail(`${k} wants <site>=<value>, got "${v}"`);
    return [s, v.slice(at + 1)];
  };
  if (k === '--site') sites.set(...pair());
  else if (k === '--urls') urlFiles.set(...pair());
  else if (k === '--sitemap') {
    if (/^\d+$/.test(v)) sitemapN.set('*', Number(v));
    else {
      const [s, n] = pair();
      sitemapN.set(s, Number(n));
    }
  } else if (k === '--allowlist') allowFile = v;
  else if (k === '--out') outDir = v;
  else fail(`unknown option ${k}`);
  i += 1;
}
if (sites.size === 0) fail('give at least one --site <site>=<base url>');
if (!allowFile) {
  const f0 = path.resolve(APP_DIR, '../../docs/o1/contracts/link-allowlist.json');
  allowFile = fs.existsSync(f0) ? f0 : path.join(APP_DIR, 'e2e/o1/leak/link-allowlist.json');
}
const allowlist = JSON.parse(fs.readFileSync(allowFile, 'utf8')) as object;
const contract = await loadContract();

type Line = { site: LeakSiteId; path: string; verdict: 'ok' | 'FAIL' | 'skip'; detail: string };
const out: Line[] = [];
const head: string[] = [`contract: ${contract.source}`, `allowlist: ${path.relative(path.resolve(APP_DIR, '../..'), allowFile)}`];
let violations = 0;
let pagesRead = 0;

for (const site of LEAK_SITE_IDS) {
  const base = sites.get(site)?.replace(/\/+$/, '');
  if (!base) continue;
  const own = urlFiles.has(site)
    ? readPathList(fs.readFileSync(urlFiles.get(site) as string, 'utf8'))
    : site === 'kpop'
      ? kpopHtmlPaths()
      : [...contract.staticPaths[site]];
  const n = sitemapN.get(site) ?? sitemapN.get('*') ?? 0;
  let extra: string[] = [];
  try {
    extra = await sitemapPaths(base, n);
  } catch (e) {
    fail(`${site}: sitemap.xml unreadable at ${base} (${(e as Error).message})`);
  }
  const list = [...new Set([...own, ...extra])];
  head.push(`site ${site}: ${list.length} pages (${own.length} listed, ${list.length - own.length} more from sitemap.xml, cap ${n})`);
  for (const p of list) {
    let r;
    try {
      r = await httpGet(`${base}${p}`);
    } catch (e) {
      fail(`${site} ${p}: ${(e as Error).message}`);
    }
    if (r.status !== 200 || !/text\/html/i.test(r.contentType)) {
      out.push({ site, path: p, verdict: 'skip', detail: `status ${r.status}${r.location ? ` -> ${r.location}` : ''}${r.status === 200 ? ` ${r.contentType.split(';')[0]}` : ''}` });
      continue;
    }
    pagesRead += 1;
    const v = checkLinks({ site, path: p, pageUrl: `${base}${p}`, an: analyzeHtml(r.body), allowlist, contract }).violations;
    if (v.length === 0) out.push({ site, path: p, verdict: 'ok', detail: '' });
    for (const x of v.map((y: { code: string; detail: string }) => `${y.code} ${y.detail}`).sort()) {
      violations += 1;
      out.push({ site, path: p, verdict: 'FAIL', detail: x });
    }
  }
}

const verdict =
  violations === 0
    ? `VERDICT: no cross-site link outside the allowlist (${pagesRead} HTML pages on ${sites.size} site(s))`
    : `VERDICT: ${violations} violation(s) on ${new Set(out.filter((l) => l.verdict === 'FAIL').map((l) => `${l.site} ${l.path}`)).size} page(s)`;
const text = [...head, ...out.map((l) => `${l.verdict === 'skip' ? '-   ' : l.verdict === 'ok' ? 'ok  ' : 'FAIL'} ${l.site} ${l.path}${l.detail ? ` ${l.detail}` : ''}`), verdict, ''].join('\n');
process.stdout.write(text);
if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'network-links.txt'), text);
  fs.writeFileSync(path.join(outDir, 'network-links.json'), `${JSON.stringify({ head, pages: out, violations, pagesRead }, null, 2)}\n`);
}
process.exit(violations === 0 ? 0 : 1);
