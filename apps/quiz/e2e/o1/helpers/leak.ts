// Run O1, lane Q0a: shared helpers of the leak suite (apps/quiz/e2e/o1/leak/*.o1.ts, config playwright.o1.config.ts).
//
// The suite tests servers it is given, never starts one, and reads them anonymously (no cookie, GET only):
//   O1_LEAK_KPOP_URL, O1_LEAK_ANIME_URL, O1_LEAK_HUB_URL   base URL of each site under test; a missing one skips
//                                                         that site's tests with the reason.
//   O1_LEAK_ANIME_NEXT, O1_LEAK_HUB_NEXT                  optional build folder (.next-<site>): its routes-manifest
//                                                         says whether the build is wired as that site.
//   O1_LEAK_REQUIRE                                       sites that must be live (comma list): for them a build
//                                                         that is not wired fails instead of skipping.
//   O1_LEAK_SITEMAP_N                                     sitemap paths added to an anime or hub page set (20).
//   O1_LEAK_KPOP_SITEMAP_N                                the same on kpop (0: the kpop set is the parity list,
//                                                         whose GETs are write-audited).
//   O1_LEAK_CASES                                         extra folder of leak-cases*.json files (self-test).
// Wiring: before F0's rewrites are in next.config.ts an anime or hub build is a kpop build under another name, so
// every anime and hub test skips, saying so; gate-checks.sh sets O1_LEAK_REQUIRE once the target has the wiring.
import fs from 'node:fs';
import path from 'node:path';

import { type LeakContract, type LeakSiteId, APP_DIR, kpopHtmlPaths, loadContract } from '../../../scripts/o1/leak-contract';
import { analyzeHtml, httpGet, readPathList, sitemapPaths } from '../../../scripts/o1/leak-lib.mjs';

export type { LeakSiteId };
export const LEAK_DIR = path.join(APP_DIR, 'e2e/o1/leak');

export interface Fetched {
  readonly path: string;
  readonly url: string;
  readonly status: number;
  readonly location: string | null;
  readonly contentType: string;
  readonly body: string;
}

export type SiteState = { state: 'absent' | 'unwired' | 'live'; reason: string };

const ENV_KEY: Record<LeakSiteId, string> = { kpop: 'KPOP', anime: 'ANIME', hub: 'HUB' };

export function baseUrl(site: LeakSiteId): string | null {
  const v = process.env[`O1_LEAK_${ENV_KEY[site]}_URL`];
  return v ? v.replace(/\/+$/, '') : null;
}

export function required(site: LeakSiteId): boolean {
  return (process.env.O1_LEAK_REQUIRE || '').split(',').map((s) => s.trim()).includes(site);
}

export function contract(): Promise<LeakContract> {
  return loadContract();
}

const cache = new Map<string, Promise<Fetched>>();

/** One anonymous GET of a path on a site, cached for the worker (the pages do not change during a run). */
export function get(site: LeakSiteId, p: string): Promise<Fetched> {
  const base = baseUrl(site);
  if (!base) throw new Error(`no server for ${site}`);
  const url = `${base}${p}`;
  let hit = cache.get(url);
  if (!hit) {
    hit = httpGet(url).then((r) => ({ path: p, url, ...r }));
    cache.set(url, hit);
  }
  return hit;
}

function manifestWired(dir: string, site: LeakSiteId): boolean | null {
  const f = path.join(dir, 'routes-manifest.json');
  if (!fs.existsSync(f)) return null;
  const m = JSON.parse(fs.readFileSync(f, 'utf8')) as { rewrites?: unknown };
  const r = m.rewrites;
  const list: { destination?: string }[] = Array.isArray(r)
    ? r
    : r && typeof r === 'object'
      ? Object.values(r as Record<string, unknown>).flatMap((x) => (Array.isArray(x) ? x : []))
      : [];
  return list.some((x) => typeof x.destination === 'string' && x.destination.startsWith(`/sites/${site}`));
}

const states = new Map<LeakSiteId, Promise<SiteState>>();

/**
 * Is there a server for the site, and does it serve that site? kpop: any server. anime and hub: the build's
 * routes-manifest has the /sites/<site> rewrites (when the build folder is given), else the home page says
 * data-site="<site>" on <html> (the theme selector of the frozen contract).
 */
export function siteState(site: LeakSiteId): Promise<SiteState> {
  let s = states.get(site);
  if (!s) {
    s = (async (): Promise<SiteState> => {
      const base = baseUrl(site);
      if (!base) return { state: 'absent', reason: `no ${site} server given (O1_LEAK_${ENV_KEY[site]}_URL)` };
      if (site === 'kpop') return { state: 'live', reason: '' };
      const dir = process.env[`O1_LEAK_${ENV_KEY[site]}_NEXT`];
      if (dir) {
        const w = manifestWired(dir, site);
        if (w === false) return { state: 'unwired', reason: `the ${site} build has no /sites/${site} rewrite (F0 wiring not in this build yet)` };
        if (w === true) return { state: 'live', reason: '' };
      }
      const home = await get(site, '/');
      const ds = analyzeHtml(home.body).htmlAttrs['data-site'];
      return ds === site
        ? { state: 'live', reason: '' }
        : { state: 'unwired', reason: `the ${site} server's home has data-site=${ds ?? 'none'}, not ${site} (F0 wiring not in this build yet)` };
    })();
    states.set(site, s);
  }
  return s;
}

/** The anonymous page set of a site: kpop = the parity list's HTML pages; anime, hub = the route map's static paths. */
export async function pagesFor(site: LeakSiteId): Promise<string[]> {
  const c = await contract();
  const base = baseUrl(site);
  if (!base) return [];
  const own = site === 'kpop' ? kpopHtmlPaths() : [...c.staticPaths[site]];
  const n = Number(site === 'kpop' ? process.env.O1_LEAK_KPOP_SITEMAP_N || 0 : process.env.O1_LEAK_SITEMAP_N ?? 20);
  const extra = n > 0 ? await sitemapPaths(base, n) : [];
  return [...new Set([...own, ...extra])];
}

/** Pages of the set that answered 200 with HTML. */
export async function htmlPages(site: LeakSiteId): Promise<Fetched[]> {
  const out: Fetched[] = [];
  for (const p of await pagesFor(site)) {
    const r = await get(site, p);
    if (r.status === 200 && /text\/html/i.test(r.contentType)) out.push(r);
  }
  return out;
}

export interface LeakCase {
  readonly lane: string;
  readonly site: LeakSiteId;
  readonly path: string;
  readonly forbidden: readonly string[];
  readonly note?: string;
}

/**
 * Cases other lanes add to the suite without editing it: apps/quiz/e2e/o1/<LANE>/leak-cases.json, shape
 * { "<kind>": [ { "site", "path", "forbidden": [strings], "note" } ] } (kind 'spoilerJsonLd' for O3). Read from the
 * harness checkout, plus O1_LEAK_CASES for the self-test. A lane can add cases, never remove the suite's own.
 */
export function leakCases(kind: string): LeakCase[] {
  const dirs = [path.join(APP_DIR, 'e2e/o1')];
  const files: string[] = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const lane of fs.readdirSync(d).sort()) {
      const f = path.join(d, lane, 'leak-cases.json');
      if (fs.existsSync(f)) files.push(f);
    }
  }
  const extra = process.env.O1_LEAK_CASES;
  if (extra && fs.existsSync(extra)) for (const f of fs.readdirSync(extra).sort()) if (/^leak-cases.*\.json$/.test(f)) files.push(path.join(extra, f));
  const out: LeakCase[] = [];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(f, 'utf8')) as Record<string, unknown>;
    const list = j[kind];
    if (!Array.isArray(list)) continue;
    for (const x of list as { site: LeakSiteId; path: string; forbidden: string[]; note?: string }[]) {
      out.push({ lane: path.basename(path.dirname(f)), site: x.site, path: x.path, forbidden: x.forbidden, ...(x.note ? { note: x.note } : {}) });
    }
  }
  return out;
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/** The link allowlist: F0's docs/o1/contracts/link-allowlist.json when the harness checkout has it, else the suite's. */
export function allowlistFile(): string {
  const f0 = path.resolve(APP_DIR, '../../docs/o1/contracts/link-allowlist.json');
  return fs.existsSync(f0) ? f0 : path.join(LEAK_DIR, 'link-allowlist.json');
}

export function pathList(file: string): string[] {
  return readPathList(fs.readFileSync(file, 'utf8'));
}

/** Violations as sorted lines, so a failure prints one readable diff. */
export function lines(v: readonly { code: string; detail: string }[], prefix: string): string[] {
  return v.map((x) => `${prefix} ${x.code} ${x.detail}`).sort();
}
