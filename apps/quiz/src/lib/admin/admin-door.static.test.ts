// ADMIN-2 (PLAN-ADMIN-2 sections 1 and 7): the static ratchet of the secret door. It fails when
//   - ADMIN_PATH is read anywhere but lib/admin/door.ts, or is named in a client bundle, a public file, a robots or sitemap source, vercel.json
//     or next.config.ts (the address is a secret: it reaches the admin's browser as a prop, nothing else);
//   - the door header is named outside the admin lock's own files and the middleware;
//   - the door rewrite of the middleware is not limited to the hub build, or a request is let through with a door header it did not set;
//   - the hub's route map or the redirects of the kpop build learn an /admin path (the internal tree is reachable through the door only);
//   - the revalidation route is not POST-only, reads a secret other than ADMIN_REVALIDATE_SECRET, or its closed list holds a tag no page reads.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { REVALIDATE_TAGS } from './revalidate';

// The checks read every source file once; on a loaded machine that takes longer than the default 5 s.
vi.setConfig({ testTimeout: 60_000 });

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const APP = join(SRC, '..');
const memo = new Map<string, string>();
const read = (rel: string): string => {
  let t = memo.get(rel);
  if (t === undefined) { t = readFileSync(join(SRC, rel), 'utf8'); memo.set(rel, t); }
  return t;
};
let all: string[] | null = null;
function walk(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full));
  }
  return out;
}
const sources = (): string[] => (all ??= walk(SRC, SRC));
const code = (f: string): boolean => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !/(^|\/)test-support\.ts$/.test(f);
const strip = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

describe('ADMIN_PATH stays secret', () => {
  it('is read by lib/admin/door.ts only', () => {
    const readers = sources().filter(code).filter((f) => /process\.env\.ADMIN_PATH\b|process\.env\[['"]ADMIN_PATH|\benv\.ADMIN_PATH\b/.test(strip(read(f))));
    expect(readers).toEqual(['lib/admin/door.ts']);
  });

  it('is named by no client component, public file, robots, sitemap, llms or config file', () => {
    const clients = sources().filter(code).filter((f) => /^['"]use client['"]/m.test(read(f)));
    expect(clients.length).toBeGreaterThan(10);
    for (const f of clients) expect(strip(read(f)), `${f}: a client bundle must not know the address`).not.toMatch(/ADMIN_PATH|adminDoorPrefix|adminPathName|adminDoorTarget/);
    for (const f of ['app/robots.ts', 'app/sitemap.ts']) expect(read(f), f).not.toMatch(/ADMIN_PATH|adminDoorPrefix/);
    for (const rel of ['public', 'vercel.json', 'next.config.ts', 'microfrontends.json', 'package.json']) {
      const full = join(APP, rel);
      if (!existsSync(full)) continue;
      const files = statSync(full).isDirectory() ? walk(full, full).filter((f) => /\.(txt|xml|json|webmanifest|svg|html)$/.test(f)).map((f) => join(full, f)) : [full];
      for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toContain('ADMIN_PATH');
    }
  });

  it('is no NEXT_PUBLIC variable, and next.config.ts forwards nothing of it to the client', () => {
    expect(sources().filter(code).filter((f) => /NEXT_PUBLIC_ADMIN/.test(read(f)))).toEqual([]);
    expect(readFileSync(join(APP, 'next.config.ts'), 'utf8')).not.toMatch(/ADMIN_PATH|ADMIN_DOOR/);
  });

  it('the pages that print the address get it from requireAdminDoor() as a prop, never from the environment', () => {
    const hubPages = sources().filter((f) => f.startsWith('app/sites/[site]/(hub)/admin/') && /page\.tsx$/.test(f));
    expect(hubPages.length).toBe(6);
    for (const f of hubPages) {
      expect(strip(read(f)), f).not.toMatch(/process\.env/);
      expect(strip(read(f)), f).toMatch(/await requireAdminDoor\(\)/);
    }
  });
});

describe('the door header', () => {
  it('is named only by the door modules, the guard modules and the middleware', () => {
    const own = new Set(['lib/admin/door.ts', 'lib/admin/door-guard.ts', 'lib/admin/door-middleware.ts', 'lib/admin/paths.ts']);
    const named = sources().filter(code).filter((f) => /ADMIN_DOOR_HEADER|ADMIN_DOOR_NEXT_HEADER|x-admin-door/.test(read(f))).filter((f) => !own.has(f));
    expect(named).toEqual([]);
  });

  it('the middleware opens the door on the hub build only, before every other step, and strips the header from every other request', () => {
    const mw = strip(read('middleware.ts'));
    expect(mw).toMatch(/const door = SITE_ID === 'hub' \? adminDoorTarget\(request\.nextUrl\.pathname\) : null;\s*if \(door !== null\) return adminDoorAnswer\(request, door\);\s*const res = await route\(request\);\s*return carriesDoorHeader\(request\) \? stripDoorHeaders\(request, res\) : res;/);
    expect(sources().filter(code).filter((f) => f !== 'middleware.ts' && /\badminDoorTarget\b/.test(strip(read(f))))).toEqual(['lib/admin/door.ts']);
  });

  it('the door answer sets the header with the derived value and the noindex, no-store pair', () => {
    const t = strip(read('lib/admin/door-middleware.ts'));
    expect(t).toMatch(/headers\.set\(ADMIN_DOOR_HEADER, value\)/);
    expect(t).toMatch(/res\.headers\.set\('X-Robots-Tag', 'noindex, nofollow'\)/);
    expect(t).toMatch(/res\.headers\.set\('Cache-Control', 'no-store'\)/);
    expect(t).toMatch(/updateSession\(request, \{ admin: true \}\)/);
  });
});

describe('the internal tree is reachable through the door only', () => {
  it('the hub route map has no /admin entry (so /admin of the hub is the 404 of an unknown URL) and no kpop redirect names the door', async () => {
    const { REGISTRY } = await import('@/lib/site/registry');
    const allow = REGISTRY.hub.routes.allow;
    expect(Array.isArray(allow) ? allow.filter((p) => /admin/.test(p)) : []).toEqual([]);
  });

  it('the hub layout guard of the (hub) group stays the SITE_ID guard: the tree exists on the hub build only', () => {
    expect(strip(read('app/sites/[site]/(hub)/layout.tsx'))).toMatch(/if \(SITE_ID !== 'hub'\) notFound\(\);/);
  });

  it('the TOTP pages of the hub tree take the prefix from the door, and the MFA route keeps the one fixed address (it is no secret, it answers 404 to all but the admin)', () => {
    expect(strip(read('components/admin/mfa/mfa-page.tsx'))).toMatch(/adminPathsFor\(door\?\.prefix \?\? null\)/);
    expect(strip(read('lib/admin/guard.ts'))).toMatch(/const door = await adminDoorOfRequest\(\);/);
  });
});

describe('the revalidation route of every build', () => {
  const route = strip(read('app/api/site-revalidate/route.ts'));

  it('answers POST and 404 to every other method, with the same plain 404 for every refusal', () => {
    expect(route).toMatch(/export async function POST\(/);
    for (const m of ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) expect(route).toMatch(new RegExp(`export const ${m} = notFound;`));
    expect(route).not.toMatch(/status: 40[13]\b|status: 405|'Unauthorized'|'Forbidden'/);
  });

  it('reads no cookie and no session, and takes the secret from ADMIN_REVALIDATE_SECRET only, through revalidateSecret()', () => {
    expect(route).not.toMatch(/cookies\(|requireAdmin|createServerClient|process\.env/);
    const readers = sources().filter(code).filter((f) => /process\.env\.ADMIN_REVALIDATE_SECRET|env\.ADMIN_REVALIDATE_SECRET/.test(strip(read(f))));
    expect(readers).toEqual(['lib/admin/revalidate-client.ts']);
  });

  it('expires only tags of the closed list, and each tag of the list is read by a cached page (no tag nobody reads)', () => {
    expect(route).toMatch(/parseRevalidateBody\(body\)/);
    const used = new Set<string>();
    for (const f of sources().filter(code)) for (const m of strip(read(f)).matchAll(/tags: \[([^\]]*)\]/g)) for (const t of m[1]!.matchAll(/'([a-z-]+)'/g)) used.add(t[1]!);
    for (const tag of REVALIDATE_TAGS) expect(used.has(tag), `tag ${tag} is read by no unstable_cache`).toBe(true);
  });

  it('is called with the registry address of a site, never an address taken from a request', () => {
    const client = strip(read('lib/admin/revalidate-client.ts'));
    expect(client).toMatch(/`\$\{REGISTRY\[site\]\.url\}\$\{REVALIDATE_PATH\}`/);
    expect(client).toMatch(/redirect: 'error'/);
    expect(client).not.toMatch(/request\.|searchParams|headers\(\)/);
  });
});
