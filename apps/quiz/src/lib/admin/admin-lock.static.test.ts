// ADMIN-1 (owner, 2026-10-30): the static ratchet of the admin lock. It fails when
//   - a page under app/(site)/admin/** or app/sites/[site]/(anime)/admin/** does not call requireAdmin (the two MFA pages:
//     AdminMfaPage, whose module calls requireAdmin('mfa') and answers notFound()), or is not a plain re-export of such a page;
//   - a handler of a route under app/api/admin/** is not guarded by requireAdmin('api') (or a thin wrapper that calls it: the
//     adminGate of lib/entity-images/route-kit.ts or lib/editorial/admin-api.ts), or answers a 401 or a 403 of its own;
//   - one of the other admin call sites of ADMIN-0 (INVENTAIRE.md sections 4 and 5) stops going through the guard;
//   - an isAdmin call, an import of the old lib/admin module or a read of ADMIN_USER_IDS remains outside lib/admin/guard.ts;
//   - the MFA paths appear in robots, the sitemap or anywhere outside the admin lock's own files;
//   - the middleware sends /admin to /login again.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');

function walk(rel: string): string[] {
  const out: string[] = [];
  const dir = join(SRC, rel);
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(relative(SRC, full)));
    else out.push(relative(SRC, full));
  }
  return out;
}

const isTest = (f: string): boolean => /\.test\.tsx?$/.test(f) || /(^|\/)test-support\.ts$/.test(f) || f.endsWith('test-recorder.ts');
const code = (f: string): boolean => /\.(ts|tsx)$/.test(f) && !isTest(f);

/** The source without comments (line and block), so a word in a comment never counts as a call. */
function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

const KPOP_ADMIN = 'app/(site)/admin';
const ANIME_ADMIN = 'app/sites/[site]/(anime)/admin';
const MFA_SEGMENT = 'k7q2m';
const PAGE_GATE = /\bawait requireAdmin\(\)/;
const MFA_PAGE = 'components/admin/mfa/mfa-page.tsx';
const MFA_GATE = /\breturn AdminMfaPage\(\{ step: '(code|setup)' \}\);/;

const adminPages = [...walk(KPOP_ADMIN), ...walk(ANIME_ADMIN)].filter((f) => f.endsWith('/page.tsx'));
const isMfa = (f: string): boolean => f.includes(`/admin/${MFA_SEGMENT}/`);

/** The admin page a plain re-export points at (`import X from '@/app/...'` then `export default X;`), else null. */
function reexportTarget(text: string): string | null {
  const def = /^export default (\w+);$/m.exec(text);
  if (!def) return null;
  const imp = new RegExp(`^import ${def[1]} from '@/(app/[^']+)';$`, 'm').exec(text);
  return imp ? `${imp[1]}.tsx` : null;
}

function pageGuarded(f: string, seen: Set<string> = new Set()): boolean {
  if (seen.has(f) || !existsSync(join(SRC, f))) return false;
  seen.add(f);
  const text = strip(read(f));
  if (isMfa(f) ? MFA_GATE.test(text) : PAGE_GATE.test(text)) return true;
  const target = reexportTarget(text);
  return target !== null && (target.startsWith(`${KPOP_ADMIN}/`) || target.startsWith(`${ANIME_ADMIN}/`)) && pageGuarded(target, seen);
}

describe('every admin page calls requireAdmin', () => {
  it('finds the 22 kpop pages and the anime ones of ADMIN-0, plus the two MFA pages on each build', () => {
    const kpop = adminPages.filter((f) => f.startsWith(KPOP_ADMIN) && !isMfa(f));
    const anime = adminPages.filter((f) => f.startsWith(ANIME_ADMIN) && !isMfa(f));
    expect(kpop.length).toBe(22);
    expect(anime.length).toBe(4);
    expect(adminPages.filter(isMfa).sort()).toEqual([
      `${KPOP_ADMIN}/${MFA_SEGMENT}/code/page.tsx`, `${KPOP_ADMIN}/${MFA_SEGMENT}/setup/page.tsx`,
      `${ANIME_ADMIN}/${MFA_SEGMENT}/code/page.tsx`, `${ANIME_ADMIN}/${MFA_SEGMENT}/setup/page.tsx`,
    ].sort());
  });

  it.each(adminPages)('%s', (f) => {
    expect(pageGuarded(f), `${f}: no requireAdmin`).toBe(true);
    const text = strip(read(f));
    expect(text, `${f}: a gate of its own`).not.toMatch(/auth\.getUser\(|redirect\('\/'\)|redirect\('\/login/);
  });

  it('the MFA pages answer 404 to anyone requireAdmin(\'mfa\') refuses, and are, with their route, the only users of that mode', () => {
    for (const f of adminPages.filter((x) => isMfa(x) && x.startsWith(KPOP_ADMIN))) expect(strip(read(f)), f).toMatch(/from '@\/components\/admin\/mfa\/mfa-page'/);
    expect(strip(read(MFA_PAGE))).toMatch(/const admin = await requireAdmin\('mfa'\);\s*if \(!admin\) notFound\(\);/);
    const users = walk('').filter(code).filter((f) => /requireAdmin\('mfa'\)/.test(strip(read(f))));
    expect(users.sort()).toEqual([MFA_PAGE, `${KPOP_ADMIN}/layout.tsx`, `app/api/admin/${MFA_SEGMENT}/route.ts`].sort());
  });

  it('the kpop admin layout answers 404 before its nav and its title, so a refused visitor\'s 404 says nothing about the admin', () => {
    const layout = strip(read(`${KPOP_ADMIN}/layout.tsx`));
    expect(layout).toMatch(/const admin = await requireAdmin\('mfa'\);\s*if \(!admin\) notFound\(\);\s*if \(admin\.level !== 'pass'\) return/);
    expect(layout).not.toMatch(/export const metadata/);
    expect(layout).toMatch(/export async function generateMetadata[\s\S]*await requireAdmin\('check'\)/);
    // No not-found file inside an admin tree: it would render inside the admin's layout.
    expect([...walk(KPOP_ADMIN), ...walk(ANIME_ADMIN)].filter((f) => /not-found\.tsx$/.test(f))).toEqual([]);
  });
});

// Route handlers: each exported method runs a guard first, or is a 404 answer.
const WRAPPERS: Array<[RegExp, string]> = [
  [/\badminGate\(\)/, 'lib/entity-images/route-kit.ts'],
  [/\badminGate\(\)/, 'lib/editorial/admin-api.ts'],
];
const ROUTE_GATE = /const (\w+) = await requireAdmin\('api'\);\s*if \(!\1\.ok\) return \1\.res;/;
const WRAPPER_GATE = /const (\w+) = await adminGate\(\);\s*if \(!\1\.ok\) return \1\.res;/;
const CRON_GATE = /if \(!isCronAuthorized\(req\)\) \{\s*const (\w+) = await requireAdmin\('api'\);\s*if \(!\1\.ok\) return \1\.res;\s*\}/;
const MFA_ROUTE_GATE = /const (\w+) = await requireAdmin\('mfa'\);\s*if \(!\1\) return adminNotFound\(\);/;
const NOT_FOUND_EXPORTS = new Set(['notFoundHandler', 'adminNotFound']);

const adminRoutes = walk('app/api/admin').filter((f) => f.endsWith('/route.ts'));

/** The exported handlers of a route file: name, and the body (a function) or the value (`export const X = Y`). */
function handlers(text: string): Array<{ name: string; body: string | null; value: string | null }> {
  const out: Array<{ name: string; body: string | null; value: string | null }> = [];
  const starts = [...text.matchAll(/^export (?:async function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|const (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) = (\w+);)/gm)];
  starts.forEach((m, i) => {
    const end = i + 1 < starts.length ? starts[i + 1]!.index : text.length;
    if (m[1]) out.push({ name: m[1], body: text.slice(m.index, end), value: null });
    else out.push({ name: m[2]!, body: null, value: m[3]! });
  });
  return out;
}

/** The text of a guarded module a route re-exports a handler from (`import { X } from './x'` or '../x'). */
function importedBody(text: string, name: string, file: string): string | null {
  const m = new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from '(\\.{1,2}/[^']+)'`).exec(text);
  if (!m) return null;
  const target = join(file, '..', `${m[1]}.ts`);
  if (!existsSync(join(SRC, target))) return null;
  const src = strip(read(target));
  const fn = new RegExp(`export async function ${name}\\b[\\s\\S]*?\\n\\}`).exec(src);
  return fn ? fn[0] : null;
}

describe('every route under api/admin is guarded, method by method', () => {
  it('finds the 45 routes of ADMIN-0 and the MFA route', () => {
    expect(adminRoutes.length).toBe(46);
  });

  it.each(adminRoutes)('%s answers every method itself (never Next\'s 405 and its Allow header)', (f) => {
    expect(handlers(strip(read(f))).map((h) => h.name).sort()).toEqual(['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT']);
  });

  it.each(adminRoutes)('%s', (f) => {
    const text = strip(read(f));
    const hs = handlers(text);
    expect(hs.length, `${f}: no handler found`).toBeGreaterThan(0);
    for (const h of hs) {
      if (h.value !== null) {
        if (NOT_FOUND_EXPORTS.has(h.value)) continue;
        const body = importedBody(text, h.value, f);
        expect(body, `${f} ${h.name}: ${h.value} is not a guarded handler`).not.toBeNull();
        expect(WRAPPER_GATE.test(body!) || ROUTE_GATE.test(body!), `${f} ${h.name}: ${h.value} has no gate`).toBe(true);
        continue;
      }
      const body = h.body!;
      const gated = ROUTE_GATE.test(body) || WRAPPER_GATE.test(body) || CRON_GATE.test(body) || (f === `app/api/admin/${MFA_SEGMENT}/route.ts` && MFA_ROUTE_GATE.test(body));
      expect(gated, `${f} ${h.name}: not guarded by requireAdmin`).toBe(true);
      expect(body, `${f} ${h.name}: a 401 or 403 of its own`).not.toMatch(/status: 40[13]\b|'Unauthorized'|'Forbidden'/);
      expect(body, `${f} ${h.name}: a getUser gate of its own`).not.toMatch(/auth\.getUser\(/);
    }
  });

  it('the thin wrappers call requireAdmin(\'api\') and answer its 404', () => {
    for (const [, file] of WRAPPERS) {
      const fn = /export async function adminGate\(\)[\s\S]*?\n\}/.exec(strip(read(file)));
      expect(fn, file).not.toBeNull();
      expect(fn![0], file).toMatch(/const gate = await requireAdmin\('api'\);\s*if \(!gate\.ok\) return \{ ok: false, res: gate\.res \};/);
    }
  });

  it('the song writes go through the service role, after requireAdmin (the open SQL policies are closing)', () => {
    for (const f of ['app/api/admin/songs/route.ts', 'app/api/admin/songs/[id]/route.ts']) {
      const text = strip(read(f));
      expect(text, f).not.toMatch(/createServerClient|gate\.supabase|const \{ supabase \} = gate/);
      for (const h of handlers(text).filter((x) => x.body !== null)) expect(h.body!, `${f} ${h.name}`).toMatch(/if \(!gate\.ok\) return gate\.res;\s*const db = createServiceRoleClient\(\);/);
    }
  });
});

// ADMIN-0 section 4 (O01 to O24, O26, O27, O29, O30) and the Verse power of section 5 (through roles.ts and curate.ts).
const OTHER_SITES: Array<[string, RegExp]> = [
  ['app/api/auth/me/route.ts', /is_admin: await adminPowerFor\(user\.id\)/],
  ['app/api/game/create/route.ts', ROUTE_GATE],
  ['app/api/qotd/publish/route.ts', CRON_GATE],
  ['app/api/cron/mv-snapshot/route.ts', CRON_GATE],
  ['app/api/cron/pulse-generate/route.ts', CRON_GATE],
  ['app/api/cron/spotify-snapshot/route.ts', CRON_GATE],
  ['app/api/cron/verse-refresh/route.ts', CRON_GATE],
  ['app/api/cron/verse-role-decay/route.ts', CRON_GATE],
  ['app/api/cron/editorial-publish/route.ts', /if \(!isCronAuthorized\(req\)\) return adminNotFound\(\);[\s\S]*isAdmin: isListedAdminId/],
  ['app/api/verse/banned-terms/route.ts', ROUTE_GATE],
  ['app/api/verse/can-edit/route.ts', /await adminPowerFor\(user\.id\)/],
  ['app/api/verse/membership/route.ts', /await adminPowerFor\(user\.id\)/],
  ['app/api/verse/pages/create/route.ts', /await adminPowerFor\(user\.id\)/],
  ['app/api/verse/pages/publish/route.ts', /await adminPowerFor\(user\.id\)/],
  ['app/api/verse/pages/rename/route.ts', /await adminPowerFor\(user\.id\)/],
  ['app/api/verse/pages/save/route.ts', /await adminPowerFor\(user\.id\)/],
  ['app/api/verse/pages/submit/route.ts', /await adminPowerFor\(user\.id\)/],
  ['app/api/verse/space-config/route.ts', /if \(!\(await adminPowerFor\(user\.id\)\)\) return adminNotFound\(\);/],
  ['app/api/verse/space-image/route.ts', /await adminPowerFor\(uid\)/],
  ['app/(site)/quiz/[id]/edit/page.tsx', /await adminPowerFor\(user\.id\)/],
  ['app/(site)/verse/[slug]/curate/page.tsx', /\(await requireAdmin\('check'\)\) !== null/],
  ['app/(site)/verse/[slug]/patrol/page.tsx', /\(await requireAdmin\('check'\)\) !== null/],
  ['app/(site)/verse/[slug]/wiki/[pageSlug]/edit/page.tsx', /await adminPowerFor\(userId\)/],
  ['app/(site)/verse/[slug]/wiki/new/page.tsx', /await adminPowerFor\(userId\)/],
  ['lib/verse/roles.ts', /if \(await adminPowerFor\(userId\)\) return 'space_admin';[\s\S]*if \(await adminPowerFor\(user\.id\)\) return true;[\s\S]*return \(await requireAdmin\('check'\)\) !== null;/],
  ['lib/verse/curate.ts', /if \(await adminPowerFor\(userId\)\) return true;[\s\S]*if \(await adminPowerFor\(userId\)\) return true;/],
];

describe('the other admin call sites of ADMIN-0 go through the guard', () => {
  it.each(OTHER_SITES)('%s', (f, re) => {
    const text = strip(read(f));
    expect(text).toMatch(re);
    expect(text).toMatch(/from '@\/lib\/admin\/guard'/);
  });

  it('the crons and the manual publish keep the cron secret next to requireAdmin, and refuse with the admin 404', () => {
    for (const [f, re] of OTHER_SITES.filter(([, r]) => r === CRON_GATE)) {
      const text = strip(read(f));
      expect(text, f).toMatch(re);
      expect(text, f).not.toMatch(/status: 401|'Unauthorized'/);
    }
  });
});

describe('no admin list outside the guard', () => {
  const sources = walk('').filter(code);

  it('lib/admin.ts is gone and nothing imports @/lib/admin', () => {
    expect(existsSync(join(SRC, 'lib/admin.ts'))).toBe(false);
    expect(sources.filter((f) => /from '@\/lib\/admin'/.test(read(f)))).toEqual([]);
  });

  it('no isAdmin(...) call outside lib/admin/guard.ts (an injected predicate `x.isAdmin(...)` of the editorial rules excepted)', () => {
    const found = sources.filter((f) => f !== 'lib/admin/guard.ts' && /(?<![\w.])isAdmin\s*\(/.test(strip(read(f))));
    expect(found).toEqual([]);
  });

  it('ADMIN_USER_IDS is read by lib/admin/list.ts only', () => {
    expect(sources.filter((f) => /process\.env\.ADMIN_USER_IDS|process\.env\[['"]ADMIN_USER_IDS/.test(strip(read(f))))).toEqual(['lib/admin/list.ts']);
  });

  it('isListedAdminId grants nothing: outside the guard only the publisher (a stored id) and the middleware (a narrowing 404) use it', () => {
    const users = sources.filter((f) => !['lib/admin/guard.ts', 'lib/admin/list.ts'].includes(f) && /\bisListedAdminId\b/.test(strip(read(f))));
    expect(users.sort()).toEqual(['app/api/cron/editorial-publish/route.ts', 'lib/supabase/middleware.ts']);
  });
});

describe('the MFA paths and the redirect to /login', () => {
  it('the MFA segment is named only by the admin lock\'s own files (never robots, the sitemap, a link or a nav)', () => {
    const own = (f: string): boolean => f.startsWith('lib/admin/') || f.startsWith('components/admin/mfa/') || f.includes(`/admin/${MFA_SEGMENT}/`) || f.startsWith(`app/api/admin/${MFA_SEGMENT}/`);
    const named = walk('').filter(code).filter((f) => f.includes(MFA_SEGMENT) || read(f).includes(MFA_SEGMENT)).filter((f) => !own(f));
    expect(named).toEqual([]);
    // robots.ts keeps its own '/admin/' disallow of before (nothing added to it); it never names the MFA segment.
    for (const f of ['app/robots.ts', 'app/sitemap.ts']) expect(read(f), f).not.toContain(MFA_SEGMENT);
    const robotsTxt = join(SRC, '../public/robots.txt');
    if (existsSync(robotsTxt)) expect(readFileSync(robotsTxt, 'utf8')).not.toContain(MFA_SEGMENT);
  });

  it('the middleware no longer sends /admin to /login (it still refreshes its session)', () => {
    const mw = strip(read('lib/supabase/middleware.ts'));
    const list = /const PROTECTED_PATHS = \[([^\]]*)\]/.exec(mw);
    expect(list).not.toBeNull();
    expect(list![1]).not.toMatch(/admin/);
    expect(strip(read('middleware.ts'))).toMatch(/const PROTECTED_PATH_PREFIXES = \['\/onboarding', '\/settings', '\/admin'\];/);
  });
});
