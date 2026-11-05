// ADMIN-2 (PLAN-ADMIN-2 sections 2 and 4): the static ratchet of the explicit site and of the journal. It fails when a route of app/api/admin
//   - has a write handler (POST, PUT, PATCH, DELETE) that never calls logAdminAction, unless it is on the short list of read-only POSTs below;
//   - never resolves its site (adminSiteOf or resolveAdminSite), unless it is on the short list of routes that have no site data;
//   - reads or writes through forSite/withSite of lib/site/scope directly, which would filter by the BUILD's site (the hub's) instead of the
//     site the admin chose: a route binds them with siteScope(site);
//   - reads the build's SITE_ID to scope a query (only the four named files compare it with the chosen site, for the local cache).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000 });

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const API = 'app/api/admin';
const read = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');
function walk(rel: string): string[] {
  const dir = join(SRC, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(relative(SRC, join(dir, n))) : [relative(SRC, join(dir, n))]));
}
const strip = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
const isCode = (f: string): boolean => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f);

const files = walk(API).filter(isCode);
const routes = files.filter((f) => /(^|\/)route\.ts$/.test(f));
const WRITE_HANDLER = /^export async function (POST|PUT|PATCH|DELETE)\b/m;
const WRITE_ALIAS = /^export const (POST|PUT|PATCH|DELETE) = (\w+);/gm;
const NOT_FOUND_NAMES = new Set(['adminNotFound', 'notFoundHandler']);

/** The source files that hold the write handlers of a route: itself, or the module it re-exports a handler from. */
function writeSources(route: string): string[] {
  const text = strip(read(route));
  const out: string[] = [];
  if (WRITE_HANDLER.test(text)) out.push(route);
  for (const m of text.matchAll(WRITE_ALIAS)) {
    if (NOT_FOUND_NAMES.has(m[2]!)) continue;
    const imp = new RegExp(`import \\{[^}]*\\b${m[2]}\\b[^}]*\\} from '(\\.{1,2}/[^']+)'`).exec(text);
    if (imp) out.push(join(route, '..', `${imp[1]}.ts`).split('\\').join('/'));
  }
  return [...new Set(out)];
}

// Read-only POSTs: they write nothing, so nothing to journal. One line of reason each; a new entry is a decision.
const READ_ONLY_POST: Readonly<Record<string, string>> = {
  [`${API}/photos/fetch/route.ts`]: 'downloads a remote picture to preview it in the admin; stores nothing',
};
// Routes with no site data to scope: one line of reason each.
const NO_SITE: Readonly<Record<string, string>> = {
  [`${API}/[[...rest]]/route.ts`]: 'the 404 catch-all',
  [`${API}/k7q2m/route.ts`]: 'the TOTP step: an account event, journaled under the build\'s own site',
  [`${API}/youtube-info/route.ts`]: 'an external oEmbed lookup, no site data',
  [`${API}/photos/fetch/route.ts`]: 'a remote download for the Photos board; it reads and writes nothing of any site',
};
// The images and photos routes were on the NO_SITE list until ADMIN-2 gave them the same site as the rest. They resolve the site the admin chose
// (the images: anime only; the photos: the site of the kind, kpop or anime; the assets: hub), journal under it, and never hard-code one.
const PICTURE_ROUTES = routes.filter((r) => /^app\/api\/admin\/(images|photos)\//.test(r) || r === `${API}/images/route.ts`).filter((r) => !NO_SITE[r]);

/** The text of a route and of the module it re-exports a write handler from (images/route.ts keeps its handler in delete-handler.ts). */
const textOf = (route: string): string => [route, ...writeSources(route)].map((f) => strip(read(f))).join('\n');

describe('every write route of app/api/admin calls the journal', () => {
  it('finds the routes', () => {
    expect(routes.length).toBe(47);
  });

  const writers = routes.filter((r) => writeSources(r).length > 0);

  it('knows which routes write', () => {
    expect(writers.length).toBeGreaterThan(30);
    expect(Object.keys(READ_ONLY_POST).every((r) => writers.includes(r))).toBe(true);
  });

  it.each(writers)('%s', (route) => {
    if (READ_ONLY_POST[route]) return;
    for (const source of writeSources(route)) {
      const text = strip(read(source));
      expect(text, `${source}: a write handler that never calls logAdminAction`).toMatch(/\blogAdminAction\(/);
      expect(text, `${source}: the journal is written after the guard, never before`).toMatch(/(requireAdmin|adminGate)\([^)]*\)[\s\S]*\blogAdminAction\(/);
    }
  });

  it('the read-only list holds routes that really write nothing to a table or a bucket', () => {
    for (const route of Object.keys(READ_ONLY_POST)) expect(strip(read(route)), route).not.toMatch(/\.(insert|update|upsert|delete)\(|\.storage\b|saveImage|savePhoto|saveAsset/);
  });
});

describe('every route of app/api/admin resolves the site the admin chose', () => {
  const needSite = routes.filter((r) => !NO_SITE[r]);

  it('knows the routes that need a site', () => {
    expect(needSite.length).toBeGreaterThan(30);
    expect(Object.keys(NO_SITE).every((r) => routes.includes(r))).toBe(true);
  });

  it.each(needSite)('%s', (route) => {
    const text = textOf(route);
    expect(text, `${route}: no adminSiteOf / resolveAdminSite`).toMatch(/\b(adminSiteOf|resolveAdminSite)\(/);
    // The answer is used: a refusal is returned, never ignored.
    expect(text, `${route}: the site result is not checked`).toMatch(/if \(!siteResult\.ok\) return siteResult\.res;/);
  });

  it('the images and photos routes are on that list now: each resolves the site, and the journal line of each carries it (never a literal)', () => {
    expect(PICTURE_ROUTES.map((r) => r.replace(`${API}/`, '')).sort()).toEqual([
      'images/delete/route.ts', 'images/focal/route.ts', 'images/import/route.ts', 'images/list/route.ts', 'images/route.ts', 'images/upload/route.ts',
      'photos/assets/route.ts', 'photos/route.ts',
    ]);
    for (const route of PICTURE_ROUTES) {
      const text = textOf(route);
      expect(text, `${route}: a hard-coded site`).not.toMatch(/\bsite:\s*(IMAGE_SITE|KIND_SITE|'hub'|'anime'|'kpop'|kind\b)/);
      // Every journal line of a write names the site as `site` (the shorthand of siteResult.site); the list route writes nothing.
      for (const m of text.matchAll(/logAdminAction\(\{ user: \{ id: gate\.userId \} \}, \{ ([^,]*),/g)) expect(m[1], `${route}: the journal line`).toBe('site');
    }
  });

  it('no route of the tree imports forSite or withSite from lib/site/scope: the build\'s site is not the admin\'s choice', () => {
    const direct = files.filter((f) => /from '@\/lib\/site\/scope'/.test(strip(read(f))));
    expect(direct).toEqual([]);
  });

  it('the routes that scope queries bind forSite and withSite to the chosen site with siteScope(...)', () => {
    const scoped = files.filter((f) => /\b(forSite|withSite)\(/.test(strip(read(f))));
    expect(scoped.length).toBeGreaterThan(10);
    for (const f of scoped) expect(strip(read(f)), f).toMatch(/const \{[^}]*\} = siteScope\(/);
  });

  it('only four files name the build\'s SITE_ID, to compare it with the chosen site (the local cache and the editorial queue of the build)', () => {
    const named = files.filter((f) => /\bSITE_ID\b/.test(strip(read(f)))).sort();
    expect(named).toEqual([
      `${API}/editorial/[id]/route.ts`, `${API}/editorial/route.ts`, `${API}/k7q2m/route.ts`, `${API}/quiz/[id]/route.ts`,
    ].sort());
  });

  it('a site that is present is always validated; one that is absent means the build\'s site on kpop and anime, and is refused on the hub (lib/admin/site.ts)', () => {
    const t = strip(read('lib/admin/site.ts'));
    expect(t).toMatch(/parseSite\(raw\)/);
    expect(t).toMatch(/build === 'hub' && options\.buildDefault !== true/);
    expect(t).toMatch(/\.includes\(raw\)|\(SITE_IDS as readonly string\[\]\)\.includes\(raw\)/);
  });
});

describe('the journal helper', () => {
  const t = strip(read('lib/admin/journal.ts'));

  it('writes with the service-role client only, into admin_actions, and never throws', () => {
    expect(t).toMatch(/createServiceRoleClient\(\)\.from\('admin_actions'\)\.insert\(/);
    expect(t).not.toMatch(/createServerClient|\.update\(|\.delete\(|\.upsert\(/);
    expect(t).toMatch(/export async function logAdminAction[\s\S]*try \{[\s\S]*\} catch/);
  });

  it('logs no value: the error paths print an error code or a name, never the entry', () => {
    for (const m of t.matchAll(/console\.error\(([^)]*)\)/g)) expect(m[1], m[0]).not.toMatch(/input|detail|actor|body/);
  });
});
