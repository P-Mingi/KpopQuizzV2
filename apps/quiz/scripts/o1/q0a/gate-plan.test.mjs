// Run O1, lane Q0a: unit tests of the gate-checks plan (node --test apps/quiz/scripts/o1/q0a/*.test.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { keptFor, laneSpecs, manifestWired, plan } from './gate-plan.mjs';

const ALL = ['kpop', 'anime', 'hub'];
const base = (over = {}) => ({
  lane: 'X', sites: ALL, dbenv: 'offline', given: {}, kpopGivenSource: 'gate',
  build: { kpop: true, anime: true, hub: true }, parity: 'none', kept: false, keptReason: '',
  wired: { anime: false, hub: false }, requireWired: { anime: false, hub: false },
  sitemapRoute: { anime: { head: false, base: false }, hub: { head: false, base: false } },
  siteScopeScript: false, scopeModule: false, laneSpecs: [], laneSpecsMissing: [], harnessTests: ['a.test.mjs'],
  ...over,
});
const by = (p) => Object.fromEntries(p.checks.map((c) => [c.name, c]));
const actions = (p) => Object.fromEntries(p.checks.map((c) => [c.name, `${c.phase}:${c.action}`]));

test('base of today: neutral diff, three offline builds, sites not wired yet', () => {
  const p = plan(base());
  assert.equal(p.servers.A.kpop.source, 'gate');
  assert.equal(p.servers.A.kpop.url, 'http://kpop.localhost:4021');
  assert.equal(p.servers.A.anime.port, 4022);
  assert.equal(p.servers.B, null);
  assert.deepEqual(actions(p), {
    'harness-unit': 'pre:run', 'site-scope': 'pre:skip',
    'kpop-indexability': 'A:skip', 'kpop-metadata-dupes': 'A:skip', 'kpop-orphans': 'A:skip', 'kpop-sitemap-hygiene': 'A:skip',
    'anime-indexability': 'A:skip', 'anime-metadata-dupes': 'A:skip', 'anime-orphans': 'A:skip', 'anime-sitemap-hygiene': 'A:skip',
    'hub-indexability': 'A:skip', 'hub-metadata-dupes': 'A:skip', 'hub-orphans': 'A:skip', 'hub-sitemap-hygiene': 'A:skip',
    'network-links': 'A:run', leak: 'A:run', 'lane-specs': 'A:skip',
  });
  const c = by(p);
  assert.match(c['kpop-orphans'].reason, /only the kept parity head build/);
  assert.match(c['anime-metadata-dupes'].reason, /no \/sites\/anime rewrite/);
  assert.match(c['hub-orphans'].reason, /hardcodes kpopquiz\.org/);
  assert.deepEqual(c['network-links'].sites, ['kpop']);
  assert.equal(c.leak.excludeContent, false);
  assert.deepEqual(c.leak.require, []);
});

test('kpop diff with the kept parity build: SEO gates on production data, writes checked, content leak kept off it', () => {
  const p = plan(base({ parity: 'ran', kept: true, build: { kpop: false, anime: true, hub: true } }));
  assert.equal(p.servers.A.kpop.source, 'parity');
  assert.equal(p.servers.A.kpop.scope, false);
  assert.equal(p.servers.B, null);
  const c = by(p);
  for (const k of ['indexability', 'metadata-dupes', 'orphans', 'sitemap-hygiene']) assert.equal(c[`kpop-${k}`].action, 'run', k);
  assert.equal(c['kpop-indexability'].env, 'parity');
  assert.equal(c['kpop-orphans'].env, 'offline');
  assert.equal(c['kpop-orphans'].envVar, 'ORPHANCHECK_BASE_URL');
  assert.equal(c['kpop-refused-writes'].action, 'run');
  assert.equal(c.leak.excludeContent, true);
  assert.equal(c['leak-content'].action, 'skip');
  assert.match(c['leak-content'].reason, /request Q0a 11/);
});

test('kept parity build plus a dev kpop build: phase B serves the gate build for the content leak and the lane specs', () => {
  const p = plan(base({ parity: 'ran', kept: true, dbenv: 'dev', scopeModule: true, laneSpecs: ['apps/quiz/e2e/o1/X/a.o1.ts'] }));
  assert.equal(p.siteScope, true);
  assert.equal(p.servers.A.kpop.source, 'parity');
  assert.equal(p.servers.A.kpop.scope, false, 'production flags: SITE_SCOPE stays off on the parity build');
  assert.equal(p.servers.A.anime.scope, true);
  assert.equal(p.servers.B.kpop.source, 'gate');
  assert.equal(p.servers.B.kpop.scope, true);
  const c = by(p);
  assert.equal(`${c['leak-content'].phase}:${c['leak-content'].action}`, 'B:run');
  assert.equal(`${c['lane-specs'].phase}:${c['lane-specs'].action}`, 'B:run');
  assert.equal(c['lane-specs'].kpopUrl, true);
});

test('parity ran without --keep: kpop gates pending with the request, never a silent pass', () => {
  const p = plan(base({ parity: 'ran', kept: false, build: { kpop: false, anime: true, hub: true } }));
  assert.equal(p.servers.A.kpop, null);
  const c = by(p);
  assert.equal(c['kpop-orphans'].action, 'pending');
  assert.match(c['kpop-orphans'].reason, /request Q0a 2/);
  assert.equal(c.leak.action, 'run');
  assert.equal(c['kpop-refused-writes'], undefined);
  assert.equal(c['kpop-leak'].action, 'pending');
  assert.equal(c['kpop-network-links'].action, 'pending');
  // anime and hub unwired, kpop absent: network-links has no site to judge and says so, never a run on nothing.
  assert.equal(c['network-links'].action, 'skip');
  assert.match(c['network-links'].reason, /the anime and hub builds have no \/sites\/<site> rewrite/);
});

test('no kpop server at all when kpop is a site of the lane and no parity ran: a failure', () => {
  const p = plan(base({ build: { kpop: false, anime: true, hub: true } }));
  assert.equal(by(p)['kpop-indexability'].action, 'fail');
});

test('a site with no server: its half of the leak suite and of network-links is its own line, never folded into a green check (r1 M1)', () => {
  // Today's gate on a lane whose diff reaches kpop: parity ran without --keep, no kpop gate build, anime and hub wired.
  const facts = { parity: 'ran', kept: false, build: { kpop: false, anime: true, hub: true },
    wired: { anime: true, hub: true }, requireWired: { anime: true, hub: true } };
  const p = plan(base(facts));
  const c = by(p);
  assert.equal(p.servers.A.kpop, null);
  assert.deepEqual(c.leak.sites, ['anime', 'hub'], 'the leak line names the sites it reads, and kpop is not one');
  assert.deepEqual(c['network-links'].sites, ['anime', 'hub']);
  assert.ok(!c.leak.require.includes('kpop'));
  for (const n of ['kpop-leak', 'kpop-network-links']) {
    assert.equal(`${c[n].phase}:${c[n].action}`, 'A:pending', n);
    assert.equal(c[n].site, 'kpop');
    assert.match(c[n].reason, /^the kpop half of .* did not run: .*request Q0a 2/, n);
  }
  assert.match(c['kpop-leak'].reason, /\(string leak mirror, canonical and OG, link leak, no \/api\/n\/me\)/);
  assert.match(c['kpop-network-links'].reason, /check-network-links/);
  // The same without parity: the kpop build is missing, so a failure like its SEO lines.
  const q = by(plan(base({ ...facts, parity: 'none' })));
  assert.equal(q['kpop-leak'].action, 'fail');
  assert.equal(q['kpop-network-links'].action, 'fail');
  assert.match(q['kpop-leak'].reason, /no \.next-kpop build/);
  // anime and hub: a missing server fails both halves (with the reason), parity or not.
  const h = by(plan(base({ ...facts, build: { kpop: false, anime: true, hub: false } })));
  assert.equal(h['hub-leak'].action, 'fail');
  assert.equal(h['hub-network-links'].action, 'fail');
  assert.match(h['hub-leak'].reason, /\(route leak, site identity, canonical and OG, link leak, no \/api\/n\/me\) did not run: no hub server/);
  assert.deepEqual(h.leak.sites, ['anime']);
  // Every site served: no extra line.
  const all = by(plan(base({ ...facts, kept: true })));
  for (const s of ['kpop', 'anime', 'hub']) assert.equal(all[`${s}-leak`], undefined, s);
  assert.deepEqual(all.leak.sites, ['kpop', 'anime', 'hub']);
});

test('no server for any site: one line per site, kpop pending only when parity ran (request Q0a 2), any other a failure', () => {
  const kpopOnly = by(plan(base({ sites: ['kpop'], parity: 'ran', build: { kpop: false, anime: false, hub: false } })));
  assert.equal(kpopOnly.leak, undefined);
  assert.equal(kpopOnly['network-links'], undefined);
  assert.equal(kpopOnly['kpop-leak'].action, 'pending');
  assert.equal(kpopOnly['kpop-network-links'].action, 'pending');
  const none = by(plan(base({ parity: 'ran', build: { kpop: false, anime: false, hub: false } })));
  assert.deepEqual(['kpop', 'anime', 'hub'].map((s) => none[`${s}-leak`].action), ['pending', 'fail', 'fail']);
  assert.deepEqual(['kpop', 'anime', 'hub'].map((s) => none[`${s}-network-links`].action), ['pending', 'fail', 'fail']);
});

test('wiring required but missing in a build: fail; wired with a sitemap route: run; route lost: fail', () => {
  const req = plan(base({ requireWired: { anime: true, hub: true } }));
  assert.equal(by(req)['anime-metadata-dupes'].action, 'fail');
  assert.match(by(req)['anime-metadata-dupes'].reason, /rewritesFor/);
  assert.deepEqual(by(req).leak.require, ['anime', 'hub']);
  const wired = plan(base({ wired: { anime: true, hub: true }, requireWired: { anime: true, hub: true },
    sitemapRoute: { anime: { head: true, base: false }, hub: { head: false, base: true } } }));
  const c = by(wired);
  assert.equal(c['anime-metadata-dupes'].action, 'run');
  assert.equal(c['hub-metadata-dupes'].action, 'fail');
  assert.match(c['hub-metadata-dupes'].reason, /lost it/);
  assert.deepEqual(c['network-links'].sites, ['kpop', 'anime', 'hub']);
  const none = plan(base({ wired: { anime: true, hub: true } }));
  assert.equal(by(none)['anime-metadata-dupes'].action, 'skip');
  assert.match(by(none)['anime-metadata-dupes'].reason, /no sitemap\.xml route/);
});

test('lane specs: missing files fail, never against the kept parity build', () => {
  assert.equal(by(plan(base({ laneSpecsMissing: ['apps/quiz/e2e/o1/X/gone.o1.ts'] })))['lane-specs'].action, 'fail');
  const p = plan(base({ parity: 'ran', kept: true, build: { kpop: false, anime: true, hub: true }, laneSpecs: ['apps/quiz/e2e/o1/X/a.o1.ts'] }));
  const c = by(p)['lane-specs'];
  assert.equal(`${c.phase}:${c.action}`, 'A:run');
  assert.equal(c.kpopUrl, false);
  assert.match(c.reason, /never run against it/);
});

test('lane specs read only the servers they are given; a site of the lane they are not given has its own line (r2 M1)', () => {
  const spec = ['apps/quiz/e2e/o1/X/a.o1.ts'];
  // Gate builds for the three sites: all three given, no extra line.
  const all = by(plan(base({ laneSpecs: spec })));
  assert.deepEqual(all['lane-specs'].sites, ['kpop', 'anime', 'hub']);
  assert.equal(all['lane-specs'].reason, '');
  for (const s of ['kpop', 'anime', 'hub']) assert.equal(all[`${s}-lane-specs`], undefined, s);
  // The kept parity build and no dev kpop build: kpop is not given, pending on its own line (request 11).
  const kept = by(plan(base({ parity: 'ran', kept: true, build: { kpop: false, anime: true, hub: true }, laneSpecs: spec })));
  assert.deepEqual(kept['lane-specs'].sites, ['anime', 'hub']);
  assert.equal(`${kept['kpop-lane-specs'].phase}:${kept['kpop-lane-specs'].action}`, 'A:pending');
  assert.match(kept['kpop-lane-specs'].reason, /^the kpop half of the lane specs did not run: .*production data.*request Q0a 11/);
  assert.match(kept['lane-specs'].reason, /\(kpop-lane-specs, pending\)$/);
  // Phase B: the dev kpop build is given to them.
  const b = by(plan(base({ parity: 'ran', kept: true, laneSpecs: spec })));
  assert.deepEqual(b['lane-specs'].sites, ['kpop', 'anime', 'hub']);
  assert.equal(b['kpop-lane-specs'], undefined);
  // No kpop server, parity ran without --keep: pending with request 2; without parity: a failure.
  const nokeep = by(plan(base({ parity: 'ran', build: { kpop: false, anime: true, hub: true }, laneSpecs: spec })));
  assert.equal(nokeep['kpop-lane-specs'].action, 'pending');
  assert.match(nokeep['kpop-lane-specs'].reason, /request Q0a 2/);
  assert.deepEqual(nokeep['lane-specs'].sites, ['anime', 'hub']);
  assert.equal(by(plan(base({ build: { kpop: false, anime: true, hub: true }, laneSpecs: spec })))['kpop-lane-specs'].action, 'fail');
  // A missing anime or hub server: a failure on its own line, the others still read.
  const nohub = by(plan(base({ build: { kpop: true, anime: true, hub: false }, laneSpecs: spec })));
  assert.equal(nohub['hub-lane-specs'].action, 'fail');
  assert.match(nohub['hub-lane-specs'].reason, /no hub server/);
  assert.deepEqual(nohub['lane-specs'].sites, ['kpop', 'anime']);
  // A given kpop server with production data and no parity run: not given to the specs, skipped with the reason.
  const given = by(plan(base({ given: { kpop: 'http://127.0.0.1:3106' }, kpopGivenSource: 'parity', laneSpecs: spec })));
  assert.equal(given['kpop-lane-specs'].action, 'skip');
  assert.deepEqual(given['lane-specs'].sites, ['anime', 'hub']);
  // No server for any site of the lane: lane-specs never runs on nothing, each site has its line.
  const none = by(plan(base({ sites: ['kpop'], parity: 'ran', build: { kpop: false, anime: false, hub: false }, laneSpecs: spec })));
  assert.equal(none['lane-specs'].action, 'skip');
  assert.match(none['lane-specs'].reason, /no served site/);
  assert.equal(none['kpop-lane-specs'].action, 'pending');
  // A lane with no site: its specs run as before, with nothing to stand for.
  const nosite = by(plan(base({ sites: [], laneSpecs: spec })));
  assert.equal(nosite['lane-specs'].action, 'run');
  assert.deepEqual(nosite['lane-specs'].sites, []);
});

test('Playwright vectors: file filters first, then the config and --project=<name> as one token (r2 M1)', () => {
  const tail = (project) => ['-c', 'playwright.o1.config.ts', `--project=${project}`];
  const gate = by(plan(base({ laneSpecs: ['apps/quiz/e2e/o1/X/a.o1.ts', 'apps/quiz/e2e/o1/X/b.o1.ts'] })));
  assert.deepEqual(gate.leak.pw, tail('leak'));
  assert.deepEqual(gate['lane-specs'].pw, ['e2e/o1/X/a.o1.ts', 'e2e/o1/X/b.o1.ts', ...tail('lanes')]);
  const b = by(plan(base({ parity: 'ran', kept: true, requireWired: { anime: true, hub: false } })));
  assert.deepEqual(b.leak.pw, ['--grep-invert', 'content-leak\\.o1\\.ts', ...tail('leak')]);
  assert.deepEqual(b['leak-content'].pw, ['leak/content-leak.o1.ts', ...tail('leak')]);
  // leak-content reads the same sites as leak (kpop being the dev gate build in phase B), with the same require list.
  assert.deepEqual(b['leak-content'].sites, b.leak.sites);
  assert.deepEqual(b['leak-content'].require, ['anime']);
  assert.deepEqual(b.leak.require, ['anime']);
  for (const c of Object.values(b).concat(Object.values(gate))) {
    if (!c.pw) continue;
    const i = c.pw.findIndex((x) => x.startsWith('--project'));
    assert.equal(i, c.pw.length - 1, `${c.name}: --project is the last token`);
    assert.match(c.pw[i], /^--project=[a-z-]+$/, c.name);
  }
});

test('parity ran and the kpop server is a gate build (request 11 without request 2): the kpop SEO lines are pending (r2 N1)', () => {
  const c = by(plan(base({ parity: 'ran', kept: false, keptReason: '' })));
  for (const k of ['indexability', 'metadata-dupes', 'orphans', 'sitemap-hygiene']) {
    assert.equal(c[`kpop-${k}`].action, 'pending', k);
    assert.match(c[`kpop-${k}`].reason, /request Q0a 2/, k);
  }
  assert.deepEqual(c.leak.sites, ['kpop', 'anime', 'hub'], 'the leak suite still reads the kpop gate build');
  // A given kpop gate server over a kept build: pending too, and the reason says which.
  const g = by(plan(base({ parity: 'ran', kept: true, given: { kpop: 'http://127.0.0.1:3106' } })));
  assert.equal(g['kpop-orphans'].action, 'pending');
  assert.match(g['kpop-orphans'].reason, /given kpop server/);
  // No parity: unchanged, skipped (the diff cannot reach kpop).
  assert.equal(by(plan(base()))['kpop-orphans'].action, 'skip');
});

test('a lane with no site: only the checks that need no server', () => {
  const p = plan(base({ sites: [] }));
  assert.deepEqual(Object.keys(by(p)), ['harness-unit', 'site-scope', 'lane-specs']);
  assert.equal(by(plan(base({ siteScopeScript: true, harnessTests: [] })))['site-scope'].action, 'run');
  assert.equal(by(plan(base({ harnessTests: [] })))['harness-unit'].action, 'skip');
});

test('given servers replace builds; a given kpop server with production data runs the SEO gates offline', () => {
  const p = plan(base({ given: { kpop: 'http://127.0.0.1:3106', anime: 'http://anime.localhost:3107' }, kpopGivenSource: 'parity',
    build: { kpop: false, anime: false, hub: false }, wired: { anime: true, hub: null } }));
  assert.equal(p.servers.A.kpop.given, true);
  assert.equal(p.servers.A.kpop.source, 'parity');
  assert.equal(p.servers.A.hub, null);
  const c = by(p);
  assert.equal(c['kpop-indexability'].env, 'offline');
  assert.equal(c['kpop-refused-writes'], undefined, 'refused writes are read from the kept frozen state only');
  assert.equal(c['hub-metadata-dupes'].action, 'fail');
  assert.deepEqual(c['network-links'].sites, ['kpop', 'anime']);
});

test('custom ports', () => {
  const p = plan(base({ ports: { kpop: 5001, anime: 5002, hub: 5003 } }));
  assert.equal(p.servers.A.hub.url, 'http://hub.localhost:5003');
});

test('facts: manifest wiring, lane specs, kept build matching the head', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'o1-gate-plan-'));
  try {
    const nx = path.join(d, 'next');
    fs.mkdirSync(nx);
    assert.equal(manifestWired(nx, 'anime'), null);
    fs.writeFileSync(path.join(nx, 'routes-manifest.json'), JSON.stringify({ rewrites: { beforeFiles: [{ source: '/', destination: '/sites/anime' }], afterFiles: [], fallback: [] } }));
    assert.equal(manifestWired(nx, 'anime'), true);
    assert.equal(manifestWired(nx, 'hub'), false);
    fs.writeFileSync(path.join(nx, 'routes-manifest.json'), JSON.stringify({ rewrites: [] }));
    assert.equal(manifestWired(nx, 'anime'), false);

    const wt = path.join(d, 'wt');
    fs.mkdirSync(path.join(wt, 'apps/quiz/e2e/o1/X'), { recursive: true });
    fs.writeFileSync(path.join(wt, 'apps/quiz/e2e/o1/X/a.o1.ts'), '');
    fs.writeFileSync(path.join(wt, 'apps/quiz/e2e/o1/X/b.spec.ts'), '');
    const lj = path.join(d, 'lanes.json');
    fs.writeFileSync(lj, JSON.stringify({ X: { specs: ['X/a.o1.ts', 'apps/quiz/e2e/o1/X/b.spec.ts', 'X/c.o1.ts'] }, Y: {} }));
    assert.deepEqual(laneSpecs(lj, 'X', wt), { found: ['apps/quiz/e2e/o1/X/a.o1.ts'], missing: ['apps/quiz/e2e/o1/X/b.spec.ts', 'apps/quiz/e2e/o1/X/c.o1.ts'] });
    assert.deepEqual(laneSpecs(lj, 'Y', wt), { found: [], missing: [] });
    assert.deepEqual(laneSpecs(path.join(d, 'none.json'), 'X', wt), { found: [], missing: [] });

    const kw = path.join(d, 'kept-head');
    fs.mkdirSync(path.join(kw, 'apps/quiz/.next'), { recursive: true });
    const fz = path.join(d, 'freeze');
    fs.mkdirSync(fz);
    const kf = path.join(d, 'kept.json');
    assert.match(keptFor(kf, 'a'.repeat(40)).why, /no kept parity build/);
    fs.writeFileSync(kf, JSON.stringify({ base: 'b'.repeat(40), head: 'a'.repeat(40), worktree: kw, freeze: fz }));
    assert.match(keptFor(kf, 'c'.repeat(40)).why, /not of this head/);
    assert.match(keptFor(kf, 'a'.repeat(40)).why, /no build any more/);
    fs.writeFileSync(path.join(kw, 'apps/quiz/.next/BUILD_ID'), 'x');
    assert.equal(keptFor(kf, 'a'.repeat(40)).kept.freeze, fz);
    fs.rmSync(fz, { recursive: true });
    assert.match(keptFor(kf, 'a'.repeat(40)).why, /frozen data state is gone/);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
