// Run O1, lane Q0a: the plan of scripts/o1/gate-checks.sh, as data.
//
// gate-checks.sh asks this module which servers to start and which checks to run, skip or mark pending, for one gate
// worktree. The decision table is `plan(facts)`, a pure function with unit tests (gate-plan.test.mjs); `gatherFacts`
// reads the facts (build folders, the kept parity build, the lane's specs, the base and head sources); the command
// line prints the plan as JSON for the shell:
//   node apps/quiz/scripts/o1/q0a/gate-plan.mjs --lane <L> --wt <worktree> --ev <evidence dir> --sites "kpop anime hub"
//       --dbenv offline|scratch|dev --head <sha> --base <sha> --kept-file <KPQ/cache/parity/kept.json>
//       --lanes-json <docs/o1/lanes.json> [--ports "4021 4022 4023"]
// Given servers (tests, a person): O1_GATE_URL_KPOP, O1_GATE_URL_ANIME, O1_GATE_URL_HUB replace the build of that
// site; O1_GATE_KPOP_SOURCE=parity says a given kpop server holds production data (default gate).
//
// The decision per check and why (the same table is in the header of gate-checks.sh):
//   kpop check:indexability, metadata-dupes, orphans, sitemap-hygiene grade production data (a floor of 600 sitemap
//     URLs, the 15 priority hubs, the live catalogue, the article registry). They run only on the kept parity head
//     build (frozen production state, writes refused). The offline or dev kpop build would fail them by construction.
//   anime and hub: check:metadata-dupes is site-agnostic (it keeps the path of any loc) and runs on the gate build of
//     a wired site with a sitemap.xml route. check:indexability, orphans and sitemap-hygiene hardcode kpopquiz.org
//     and the kpop catalogue (toLocal rewrites only that origin, so a bunnyverse.org/anime loc would be fetched from the
//     internet): skipped with that reason until a per-site version exists.
//   Lane specs and the content leak never meet the kept parity build: a browser on it would reach the production
//     Supabase directly, and production holds no anime row (Verrou 0), so the content leak would prove nothing.
//   Every Playwright check carries its argument vector (`pw`, after `playwright test`), built here once so a test can
//     list it with the installed Playwright (gate-argv.test.mjs): file filters first, then `--project=<name>` as one
//     token. `--project <name>` takes several names, so a file after it was read as a project name and the run
//     stopped with `Project(s) "<file>" not found` (review Q0a r2 M1).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeHtml, httpGet } from '../leak-lib.mjs';

export const SITES = ['kpop', 'anime', 'hub'];
export const SEO_CHECKS = ['indexability', 'metadata-dupes', 'orphans', 'sitemap-hygiene'];
export const SEO_ENV = {
  indexability: 'INDEXCHECK_BASE_URL',
  'metadata-dupes': 'METADUPE_BASE_URL',
  orphans: 'ORPHANCHECK_BASE_URL',
  'sitemap-hygiene': 'SITEMAP_BASE_URL',
};
const DEFAULT_PORTS = { kpop: 4021, anime: 4022, hub: 4023 };
// The tests of the leak suite that read each site's server (apps/quiz/e2e/o1/leak/*.o1.ts; the content leak and the
// spoiler JSON-LD cases have their own conditions).
const LEAK_TESTS = {
  kpop: 'string leak mirror, canonical and OG, link leak, no /api/n/me',
  anime: 'route leak, site identity, string leak, canonical and OG, link leak, no /api/n/me',
  hub: 'route leak, site identity, canonical and OG, link leak, no /api/n/me',
};
// The Playwright config of the O1 suites (apps/quiz, harness checkout for the leak suite, head for the lane specs).
export const PW_CONFIG = 'playwright.o1.config.ts';
export const CONTENT_LEAK_FILE = 'leak/content-leak.o1.ts';
export const CONTENT_LEAK_GREP = 'content-leak\\.o1\\.ts';

/**
 * The arguments after `playwright test` for one project: file filters (paths relative to apps/quiz, read by
 * Playwright as patterns on the file path) first, then the grep, the config and `--project=<name>` as one token.
 */
export function pwArgs(project, { files = [], grepInvert = '' } = {}) {
  return [...files, ...(grepInvert ? ['--grep-invert', grepInvert] : []), '-c', PW_CONFIG, `--project=${project}`];
}

const WHY = {
  kpopGate:
    'the diff cannot reach the kpop build (gate.sh ran no parity), and these gates grade production data (a floor of ' +
    '600 sitemap URLs, the priority hubs, the live catalogue): only the kept parity head build has it, an offline or ' +
    'dev kpop build fails them by construction',
  kpopNoKeep:
    'parity ran without --keep, so no kpop build with production data is left for this head (request Q0a 2: gate.sh ' +
    'passes --keep to parity.sh)',
  kpopGivenOverKept:
    'parity ran and kept its head build, but a given kpop server (O1_GATE_URL_KPOP) replaces it and holds no ' +
    'production data',
  specsProduction:
    'the kpop server of this gate holds production data (the kept parity build, or a given server with ' +
    'O1_GATE_KPOP_SOURCE=parity): lane specs never run against it, and gate.sh built no kpop on the dev branch ' +
    '(request Q0a 11)',
  noSpecSite: 'no served site to give the lane specs: each site of the lane has its own <site>-lane-specs line',
  siteOnly: (site, check) =>
    `check:${check} hardcodes kpopquiz.org and the kpop catalogue (its toLocal rewrites only that origin, so a ` +
    `${site} loc would be fetched from the internet; its floor, hubs and articles are kpop's): not meaningful on ${site}`,
  unwired: (site) => `the ${site} build has no /sites/${site} rewrite (F0 wiring not in this head): it serves kpop pages`,
  unwiredRequired: (site) =>
    `the base or head next.config.ts wires the sites (rewritesFor) but the ${site} build has no /sites/${site} rewrite`,
  noSitemap: (site) => `no sitemap.xml route for ${site} in this head yet (app/sites/[site]/sitemap.xml, O1 and H1)`,
  lostSitemap: (site) => `the base has a sitemap.xml route for ${site} (app/sites/[site]/sitemap.xml) and the head lost it`,
  contentNoDevKpop:
    'the kpop server of this gate is the kept parity build (production data, which holds no anime row) and gate.sh ' +
    'built no kpop on the dev branch (request Q0a 11): the content leak runs only on a dev kpop build',
  noScopeScript: "B2's apps/quiz/scripts/o1/check-site-scope.mts is not in this head yet",
  noLinkSite: (live) =>
    `no served site to judge: the ${live.join(' and ')} build${live.length > 1 ? 's' : ''} ha${live.length > 1 ? 've' : 's'} no ` +
    '/sites/<site> rewrite (F0 wiring not in this head), so they serve kpop pages; a missing kpop server has its own line',
  absentHalf: (site, check, why) =>
    `the ${site} half of ${check === 'leak' ? `the leak suite (${LEAK_TESTS[site]})` : 'check-network-links'} did not run: ${why}`,
  absentSpecs: (site, why) => `the ${site} half of the lane specs did not run: ${why}`,
};

/**
 * @typedef {{ source: 'parity' | 'gate', site: string, url: string, port: number, given: boolean,
 *   build?: string, scope: boolean }} Server
 * @typedef {{ name: string, site: string | null, kind: string, phase: 'pre' | 'A' | 'B', action: 'run' | 'skip' |
 *   'pending' | 'fail', reason: string, [k: string]: unknown }} Check
 */

/** The decision table. Facts in, servers and checks out; no I/O. */
export function plan(f) {
  const sites = SITES.filter((s) => f.sites.includes(s));
  const ports = { ...DEFAULT_PORTS, ...(f.ports || {}) };
  const scope = f.dbenv !== 'offline' && !!f.scopeModule;
  /** @type {Record<string, Server | null>} */
  const A = {};
  /** @type {Record<string, string>} */
  const missing = {};
  for (const s of sites) {
    const given = f.given?.[s] || null;
    const url = (p) => `http://${s}.localhost:${p}`;
    if (given) A[s] = { source: s === 'kpop' ? f.kpopGivenSource || 'gate' : 'gate', site: s, url: given, port: 0, given: true, scope };
    else if (s === 'kpop' && f.kept) A[s] = { source: 'parity', site: s, url: url(ports.kpop), port: ports.kpop, given: false, scope: false };
    else if (f.build?.[s]) A[s] = { source: 'gate', site: s, url: url(ports[s]), port: ports[s], given: false, build: `.next-${s}`, scope };
    else {
      A[s] = null;
      missing[s] = s === 'kpop' && f.parity === 'ran' ? f.keptReason || WHY.kpopNoKeep : `no ${s} server: no .next-${s} build in the gate worktree`;
    }
  }
  // Phase B: the kpop gate build replaces the kept parity build for the checks that must never meet production.
  const B = A.kpop?.source === 'parity' && !A.kpop.given && f.build?.kpop
    ? { kpop: { source: 'gate', site: 'kpop', url: `http://kpop.localhost:${ports.kpop}`, port: ports.kpop, given: false, build: '.next-kpop', scope } }
    : null;

  /** @type {Check[]} */
  const checks = [];
  const add = (c) => checks.push({ site: null, phase: 'A', reason: '', ...c });
  add({ name: 'harness-unit', kind: 'harness-unit', phase: 'pre', action: f.harnessTests?.length ? 'run' : 'skip', files: f.harnessTests || [],
    reason: f.harnessTests?.length ? '' : 'no harness unit test in this head' });
  add({ name: 'site-scope', kind: 'site-scope', phase: 'pre', action: f.siteScopeScript ? 'run' : 'skip', reason: f.siteScopeScript ? '' : WHY.noScopeScript });

  for (const s of sites) {
    const srv = A[s];
    for (const c of SEO_CHECKS) {
      const name = `${s}-${c}`;
      const base = { name, site: s, kind: 'seo', check: c, envVar: SEO_ENV[c] };
      if (s === 'kpop') {
        // check:indexability reads the catalogue itself: through the kept frozen state when parity.sh serves it.
        if (srv?.source === 'parity') add({ ...base, action: 'run', env: c === 'indexability' && !srv.given ? 'parity' : 'offline' });
        // A kpop gate build when parity ran (request 11 without request 2): the diff reaches kpop, so pending, never
        // a skip that says it cannot (review Q0a r2 N1).
        else if (srv && f.parity === 'ran') add({ ...base, action: 'pending', reason: f.kept ? WHY.kpopGivenOverKept : f.keptReason || WHY.kpopNoKeep });
        else if (srv) add({ ...base, action: 'skip', reason: WHY.kpopGate });
        else add({ ...base, action: f.parity === 'ran' ? 'pending' : 'fail', reason: missing.kpop });
        continue;
      }
      if (c !== 'metadata-dupes') { add({ ...base, action: 'skip', reason: WHY.siteOnly(s, c) }); continue; }
      if (!srv) { add({ ...base, action: 'fail', reason: missing[s] }); continue; }
      const wired = f.wired?.[s];
      if (wired === false) {
        add({ ...base, action: f.requireWired?.[s] ? 'fail' : 'skip', reason: f.requireWired?.[s] ? WHY.unwiredRequired(s) : WHY.unwired(s) });
        continue;
      }
      const sm = f.sitemapRoute?.[s] || { head: false, base: false };
      if (sm.head) add({ ...base, action: 'run', env: 'offline' });
      else add({ ...base, action: sm.base ? 'fail' : 'skip', reason: sm.base ? WHY.lostSitemap(s) : WHY.noSitemap(s) });
    }
  }

  const live = sites.filter((s) => A[s]);
  const require = sites.filter((s) => s !== 'kpop' && f.requireWired?.[s]);
  if (live.length) {
    // network-links judges a site by its domain rules: an unwired anime or hub build (kpop pages) is left out; the
    // leak suite's site identity test fails it when the wiring is required. `sites` is what each check reads:
    // gate-checks.sh fails the check when one of them did not start, so it never stands for a site it did not read.
    const linkSites = live.filter((s) => s === 'kpop' || f.wired?.[s] !== false);
    if (linkSites.length) add({ name: 'network-links', kind: 'network-links', action: 'run', sites: linkSites });
    else add({ name: 'network-links', kind: 'network-links', action: 'skip', sites: [], reason: WHY.noLinkSite(live) });
    const excludeContent = A.kpop?.source === 'parity';
    add({ name: 'leak', kind: 'leak', action: 'run', sites: live, excludeContent, require,
      pw: pwArgs('leak', excludeContent ? { grepInvert: CONTENT_LEAK_GREP } : {}) });
  }
  // A site of the lane with no server: its half of the leak suite and of network-links cannot run, and the suite
  // skips the tests of a site it is not given. Each such half gets its own line, pending or failed like the site's SEO
  // lines (kpop when parity ran without --keep: pending, request Q0a 2; any other missing server: a failure), so the
  // `leak` and `network-links` lines never stand for a site they did not read (review Q0a r1 M1).
  for (const s of sites) {
    if (A[s]) continue;
    const action = s === 'kpop' && f.parity === 'ran' ? 'pending' : 'fail';
    add({ name: `${s}-leak`, site: s, kind: 'absent', action, reason: WHY.absentHalf(s, 'leak', missing[s]) });
    add({ name: `${s}-network-links`, site: s, kind: 'absent', action, reason: WHY.absentHalf(s, 'network-links', missing[s]) });
  }
  if (A.kpop?.source === 'parity' && !A.kpop.given) add({ name: 'kpop-refused-writes', site: 'kpop', kind: 'refused-writes', action: 'run' });
  if (A.kpop?.source === 'parity') {
    // Phase B: the same sites as `leak`, with the kpop gate build in place of the kept parity build.
    if (B) add({ name: 'leak-content', kind: 'leak-content', phase: 'B', action: 'run', sites: live, require, pw: pwArgs('leak', { files: [CONTENT_LEAK_FILE] }) });
    else add({ name: 'leak-content', kind: 'leak-content', action: 'skip', reason: WHY.contentNoDevKpop });
  }

  // Lane specs read the gate builds of their phase only (never a kpop server with production data). `sites` is what
  // they are given: gate-checks.sh fails the line when one of them did not start, and a site of the lane they are
  // not given has its own `<site>-lane-specs` line, like the leak halves above (a spec skips a site it has no URL for).
  const specPhase = B ? 'B' : 'A';
  if (f.laneSpecsMissing?.length) {
    add({ name: 'lane-specs', kind: 'lane-specs', phase: specPhase, action: 'fail',
      reason: `listed in lanes.json but missing in the head: ${f.laneSpecsMissing.join(' ')}` });
  } else if (!f.laneSpecs?.length) {
    add({ name: 'lane-specs', kind: 'lane-specs', phase: specPhase, action: 'skip', reason: `lanes.json lists no specs for ${f.lane}` });
  } else {
    const specSrv = B ? { ...A, ...B } : A;
    const specSites = sites.filter((s) => specSrv[s]?.source === 'gate');
    const absent = sites.filter((s) => !specSites.includes(s)).map((s) => {
      const srv = specSrv[s];
      const action = s === 'kpop' && f.parity === 'ran' ? 'pending' : srv ? 'skip' : 'fail';
      return { name: `${s}-lane-specs`, site: s, kind: 'absent', phase: specPhase, action,
        reason: WHY.absentSpecs(s, srv ? WHY.specsProduction : missing[s]) };
    });
    const files = f.laneSpecs.map((x) => x.replace(/^apps\/quiz\//, ''));
    if (specSites.length || !sites.length) {
      add({ name: 'lane-specs', kind: 'lane-specs', phase: specPhase, action: 'run', files: f.laneSpecs, sites: specSites,
        kpopUrl: specSites.includes('kpop'), pw: pwArgs('lanes', { files }),
        reason: absent.map((c) => `${c.reason} (${c.name}, ${c.action})`).join('; ') });
    } else {
      add({ name: 'lane-specs', kind: 'lane-specs', phase: specPhase, action: 'skip', files: f.laneSpecs, sites: [], reason: WHY.noSpecSite });
    }
    for (const c of absent) add(c);
  }
  return { sites, dbenv: f.dbenv, siteScope: scope, servers: { A, B }, checks };
}

// ---------------------------------------------------------------------------------------------------------------
// Facts

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function gitHas(wt, rev, file) {
  if (!rev) return false;
  try { execFileSync('git', ['-C', wt, 'cat-file', '-e', `${rev}:${file}`], { stdio: 'ignore' }); return true; } catch { return false; }
}

function gitShow(wt, rev, file) {
  if (!rev) return '';
  try { return execFileSync('git', ['-C', wt, 'show', `${rev}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; }
}

/** true: the build's routes-manifest has the /sites/<site> rewrites; false: it has none; null: no manifest. */
export function manifestWired(dir, site) {
  const f = path.join(dir, 'routes-manifest.json');
  if (!exists(f)) return null;
  const r = JSON.parse(fs.readFileSync(f, 'utf8')).rewrites;
  const list = Array.isArray(r) ? r : r && typeof r === 'object' ? Object.values(r).flatMap((x) => (Array.isArray(x) ? x : [])) : [];
  return list.some((x) => typeof x?.destination === 'string' && x.destination.startsWith(`/sites/${site}`));
}

/** The lane's specs from lanes.json: paths relative to the repo root or to apps/quiz/e2e/o1. */
export function laneSpecs(lanesJson, lane, wt) {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(lanesJson, 'utf8')); } catch { /* no config: no specs */ }
  const list = Array.isArray(cfg?.[lane]?.specs) ? cfg[lane].specs : [];
  const found = []; const missing = [];
  for (const s of list) {
    const rel = s.startsWith('apps/') ? s : path.posix.join('apps/quiz/e2e/o1', s);
    (exists(path.join(wt, rel)) && /\.o1\.ts$/.test(rel) ? found : missing).push(rel);
  }
  return { found, missing };
}

/** The kept parity head build, when it is the one of this head. */
export function keptFor(keptFile, head) {
  if (!keptFile || !exists(keptFile)) return { kept: null, why: 'no kept parity build (parity.sh --keep wrote no kept.json)' };
  let k;
  try { k = JSON.parse(fs.readFileSync(keptFile, 'utf8')); } catch { return { kept: null, why: 'kept.json is not readable' }; }
  if (k.head !== head) return { kept: null, why: `the kept parity build is of ${String(k.head).slice(0, 12)}, not of this head ${head.slice(0, 12)}` };
  if (!exists(path.join(k.worktree || '', 'apps/quiz/.next/BUILD_ID'))) return { kept: null, why: 'the kept parity head worktree has no build any more' };
  if (!exists(k.freeze || '')) return { kept: null, why: 'the kept frozen data state is gone' };
  return { kept: k, why: '' };
}

function parityState(ev) {
  if (exists(path.join(ev, 'parity.json'))) return 'ran';
  try {
    const row = fs.readFileSync(path.join(ev, 'steps.tsv'), 'utf8').split('\n').find((l) => l.startsWith('parity\t'));
    const rc = row?.split('\t')[1];
    if (rc && /^\d+$/.test(rc)) return 'ran';
  } catch { /* no steps file */ }
  return 'none';
}

async function probeWired(url, site) {
  try {
    const r = await httpGet(`${url.replace(/\/+$/, '')}/`, { timeoutMs: 15000 });
    return analyzeHtml(r.body).htmlAttrs['data-site'] === site;
  } catch {
    return false;
  }
}

export async function gatherFacts(o, env = process.env) {
  const app = path.join(o.wt, 'apps/quiz');
  const given = {};
  for (const s of SITES) given[s] = env[`O1_GATE_URL_${s.toUpperCase()}`] || null;
  const build = {};
  for (const s of SITES) build[s] = exists(path.join(app, `.next-${s}`, 'BUILD_ID'));
  const parity = parityState(o.ev);
  const { kept, why } = parity === 'ran' || o.keptAlways ? keptFor(o.keptFile, o.head) : { kept: null, why: '' };
  const wired = {}; const requireWired = {}; const sitemapRoute = {};
  const cfgWires = (rev) => /\brewritesFor\b/.test(gitShow(o.wt, rev, 'apps/quiz/next.config.ts'));
  const wiresBase = cfgWires(o.base); const wiresHead = cfgWires(o.head);
  for (const s of ['anime', 'hub']) {
    wired[s] = given[s] ? await probeWired(given[s], s) : build[s] ? manifestWired(path.join(app, `.next-${s}`), s) : null;
    requireWired[s] = wiresBase || wiresHead;
    const route = 'apps/quiz/src/app/sites/[site]/sitemap.xml/route.ts';
    sitemapRoute[s] = { head: gitHas(o.wt, o.head, route), base: gitHas(o.wt, o.base, route) };
  }
  const tests = [];
  for (const d of ['scripts/o1/parity', 'apps/quiz/scripts/o1', 'apps/quiz/scripts/o1/q0a']) {
    const dir = path.join(o.wt, d);
    if (!exists(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.test.mjs')) tests.push(path.posix.join(d, f));
  }
  const specs = laneSpecs(o.lanesJson, o.lane, o.wt);
  const ports = {};
  if (o.ports) o.ports.split(/\s+/).filter(Boolean).forEach((p, i) => { ports[SITES[i]] = Number(p); });
  return {
    lane: o.lane, sites: o.sites.split(/\s+/).filter(Boolean), dbenv: o.dbenv, ports,
    given, kpopGivenSource: env.O1_GATE_KPOP_SOURCE === 'parity' ? 'parity' : 'gate',
    build, parity, kept: !!kept, keptReason: kept ? '' : why ? `${WHY.kpopNoKeep}; ${why}` : '', keptInfo: kept,
    wired, requireWired, sitemapRoute,
    siteScopeScript: exists(path.join(app, 'scripts/o1/check-site-scope.mts')),
    scopeModule: exists(path.join(app, 'src/lib/site/scope.ts')),
    laneSpecs: specs.found, laneSpecsMissing: specs.missing, harnessTests: tests,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Command line

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = a[i + 1] ?? '';
  for (const k of ['lane', 'wt', 'ev', 'dbenv', 'head']) if (!o[k]) { console.error(`gate-plan: --${k} is required`); process.exit(2); }
  o.sites = o.sites || '';
  const facts = await gatherFacts(o);
  const p = plan(facts);
  process.stdout.write(`${JSON.stringify({ ...p, facts: { ...facts, keptInfo: facts.keptInfo } }, null, 1)}\n`);
}
