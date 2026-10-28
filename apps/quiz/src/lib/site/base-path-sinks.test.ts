// FandomVerse (lane 1, requirement 2 of the brief): on the anime build every page lives under /anime, but a browser sends a
// root-relative address ('/api/...', '/login') to the root of fandomverse.org, which is the hub. Next adds the base path only for
// next/link, router.push and redirect(); fetch, sendBeacon, window.open, window.location, history.pushState, a plain <a href>, an
// <img>/<Image> src and a form action need it written (`${BASE_PATH}/...`, lib/site/base-path.ts). This walks the modules a
// page of the anime and hub builds can reach (from app/sites/, the shared auth routes and the root layout) and refuses a sink
// with a bare root-relative address, but for the listed exceptions, each with its reason.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const ENTRIES = ['app/sites/', 'app/(site)/auth/', 'app/layout.tsx', 'app/error.tsx', 'app/global-error.tsx'];

/** A bare root-relative address at a browser sink (a comment line is not code). */
const SINK = new RegExp([
  String.raw`(?:^|[^.\w])(?:fetch|navigator\.sendBeacon|window\.open)\(\s*['"\x60]/[^/]`,
  String.raw`location\.(?:assign|replace)\(\s*['"\x60]/`,
  String.raw`(?:pushState|replaceState)\([^)]*,\s*['"\x60]/[^/]`,
  String.raw`<a\b[^>]*\bhref=\{?['"\x60]/`,
  String.raw`\baction=\{?['"\x60]/`,
  String.raw`<(?:img|Image)\b[^>]*\bsrc=\{?['"\x60]/`,
  // A state that holds the address of a picture or a link (review of 2026-10-28: share-card-modal set its preview <img> src to
  // the bare '/api/og/<slug>' with setPreviewSrc): the setter of a ...Src, ...Url, ...Image or ...Href state.
  String.raw`\bset[A-Z]\w*(?:Src|Url|URL|Image|Href)\(\s*['"\x60]/[^/]`,
].join('|'));

/**
 * A root-relative path CONSTANT (review of 2026-10-28, bt.ts sent its beacon to `BT_TRACK_ENDPOINT`, '/api/track/bt-run'): a
 * `const NAME = '/...'` (a string or a template literal that starts with one slash), anywhere in a module, local or exported.
 */
const PATH_CONST = /\bconst\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=;]+)?=\s*['"\x60]\/(?!\/)/g;
/** The names of `import { A, B as C } from` and `export { A as B } from` (the original name, then the local one). */
const SPECIFIERS = /\b(?:import|export)\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"]/g;

function specifiers(text: string): (readonly [string, string])[] {
  const out: (readonly [string, string])[] = [];
  for (const m of text.matchAll(SPECIFIERS)) {
    for (const raw of m[1]!.split(',')) {
      const [orig, alias] = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      if (orig) out.push([orig, alias ?? orig]);
    }
  }
  return out;
}

/** The sinks of SINK with a name bound to a root-relative path constant as the address (`NAME` or `${NAME}...`). */
function constSink(names: ReadonlySet<string>): RegExp | null {
  if (!names.size) return null;
  const id = [...names].map((n) => n.replace(/\$/g, '\\$')).join('|');
  const arg = String.raw`(?:\x60\$\{\s*(?:${id})\s*\}|(?:${id})(?![\w$.(\[]))`;
  return new RegExp([
    String.raw`(?:^|[^.\w])(?:fetch|navigator\.sendBeacon|window\.open)\(\s*${arg}`,
    String.raw`location\.(?:assign|replace)\(\s*${arg}`,
    String.raw`location\.href\s*=\s*${arg}`,
    String.raw`(?:pushState|replaceState)\([^)]*,\s*${arg}`,
    String.raw`<a\b[^>]*\bhref=\{\s*${arg}`,
    String.raw`\baction=\{\s*${arg}`,
    String.raw`<(?:img|Image)\b[^>]*\bsrc=\{\s*${arg}`,
    String.raw`\bset[A-Z]\w*(?:Src|Url|URL|Image|Href)\(\s*${arg}`,
  ].join('|'));
}

/** [file under src/, a piece of the line]: the sinks that keep a bare address, and why. */
const EXCEPTIONS: readonly (readonly [string, string, string])[] = [
  ['components/create/create-funnel.tsx', '', 'the flag-off funnel: a world build runs NEXT_PUBLIC_UX_V1=1 (flags-env.md 2) and renders the P5 funnel'],
  ['components/hub/home/', '', 'the hub home: rendered by the hub build only, which has no base path'],
  ['components/verse/brand/verse-wordmarks.tsx', '', 'the Verse: kpop only (features.verse is off on anime and the hub)'],
  ['components/personality/quiz.tsx', "fetch('/api/auth/update-profile'", 'the kpop branch of the bias (a world site saves the oshi above it)'],
  ['lib/passport/handoff.ts', '', 'the land page of the passport jump: lane 3 (o1/fv-l3) writes it with the base path of the build'],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
  if (base === null) return null;
  for (const x of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const p = base + x;
    if (existsSync(p) && statSync(p).isFile() && /\.(ts|tsx)$/.test(p)) return p;
  }
  return null;
}

/** Every module reachable from the entries by a static, dynamic or side-effect import. */
function reachable(): string[] {
  const all = walk(SRC);
  const seen = new Set<string>();
  const stack = all.filter((f) => ENTRIES.some((e) => relative(SRC, f).startsWith(e)));
  const IMPORT = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(IMPORT)) {
      const r = resolveImport(f, (m[1] ?? m[2] ?? m[3])!);
      if (r && !seen.has(r)) stack.push(r);
    }
  }
  return [...seen].map((f) => relative(SRC, f)).sort();
}

describe('the browser sinks of the anime and hub builds carry the base path', () => {
  const files = reachable();

  it('reaches the pages, the shared components and the libraries (a walk that found nothing would pass anything)', () => {
    expect(files.length).toBeGreaterThan(500);
    for (const f of ['components/quiz/ux-v1/quiz-run.tsx', 'lib/network/beacon-client.ts', 'components/layout/ux-v1/ux-nav-actions.tsx']) {
      expect(files, f).toContain(f);
    }
  });

  it('no bare root-relative address at a browser sink, but for the listed exceptions', () => {
    const found: string[] = [];
    for (const f of files) {
      readFileSync(join(SRC, f), 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line) || !SINK.test(line)) return;
        if (EXCEPTIONS.some(([file, piece]) => (file.endsWith('/') ? f.startsWith(file) : f === file) && line.includes(piece))) return;
        found.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
    }
    expect(found).toEqual([]);
  });

  it('the constant check sees a path constant at every sink and nothing else (a matcher that matched nothing would pass anything)', () => {
    const sink = constSink(new Set(['EP']))!;
    for (const hit of [
      "navigator.sendBeacon(EP, new Blob([body]))", 'void fetch(EP, { method: "POST" })', 'fetch(`${EP}?a=1`)', "window.open(EP, '_blank')",
      'window.location.assign(EP)', 'window.location.href = EP;', "history.replaceState(null, '', EP)", '<a href={EP}>x</a>',
      '<form action={EP}>', '<img src={EP} alt="" />', '<Image src={`${EP}?w=1`} alt="" />', 'setPreviewSrc(`${EP}?a=1`)',
    ]) expect(sink.test(hit), hit).toBe(true);
    for (const hit of ["setPreviewSrc(`/api/og/${slug}`)", "setImageUrl('/x.png')"]) expect(SINK.test(hit), hit).toBe(true);
    for (const miss of ['setPreviewSrc(`${BASE_PATH}/api/og/${slug}`)', "setOpen('/x')", "setPreviewSrc('//cdn/x.png')"]) expect(SINK.test(miss), miss).toBe(false);
    for (const miss of [
      'fetch(BASE_PATH ? BASE_PATH + EP : EP)', 'navigator.sendBeacon(ENDPOINT, b)', 'fetch(`${BASE_PATH}${EP}`)', 'fetch(EP_URL)',
      'fetch(EP.replace(a, b))', 'x.fetch(EP)', '<img src={src} />',
    ]) expect(sink.test(miss), miss).toBe(false);
    expect([...'const A = \'/api/x\';\nexport const B: string = `/b/${x}`;\nconst C = \'//cdn\';\nconst D = \'rel\';'.matchAll(PATH_CONST)].map((m) => m[1])).toEqual(['A', 'B']);
    expect(specifiers("import { A, type B, C as D } from './x';\nexport { E as F } from './y';")).toEqual([['A', 'A'], ['B', 'B'], ['C', 'D'], ['E', 'F']]);
  });

  it('no root-relative path CONSTANT at a browser sink either (declared in the module or imported), but for the listed exceptions', () => {
    const code = (text: string): string => text.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    const texts = new Map(files.map((f) => [f, readFileSync(join(SRC, f), 'utf8')] as const));
    const declared = new Map<string, Set<string>>();
    const names = new Set<string>();
    for (const [f, text] of texts) {
      const own = new Set([...code(text).matchAll(PATH_CONST)].map((m) => m[1]!));
      declared.set(f, own);
      for (const n of own) names.add(n);
    }
    // A constant keeps its meaning through `import { A as B }` and `export { A as B } from`: follow the renames to a fixpoint.
    for (let grew = true; grew;) {
      grew = false;
      for (const text of texts.values()) {
        for (const [orig, local] of specifiers(text)) if (names.has(orig) && !names.has(local)) { names.add(local); grew = true; }
      }
    }
    expect([...names], 'the walk finds the path constants of the reached modules').toContain('BT_TRACK_ENDPOINT');
    const found: string[] = [];
    for (const [f, text] of texts) {
      const bound = new Set(declared.get(f));
      for (const [orig, local] of specifiers(text)) if (names.has(orig)) bound.add(local);
      const sink = constSink(bound);
      if (!sink) continue;
      text.split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line) || !sink.test(line)) return;
        if (EXCEPTIONS.some(([file, piece]) => (file.endsWith('/') ? f.startsWith(file) : f === file) && line.includes(piece))) return;
        found.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
    }
    expect(found).toEqual([]);
  });

  it('the base path is read from the build constant Next inlines, never from a second list', () => {
    for (const f of files) {
      const text = readFileSync(join(SRC, f), 'utf8');
      const decl = text.match(/^(?:export )?const BASE_PATH\b.*$/m);
      if (decl) expect(decl[0].replace(/^export /, ''), f).toBe("const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';");
      // A module that does not declare it imports it from the one shared client module (lib/site/client-base-path.ts).
      for (const m of text.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gm)) {
        if (/\bBASE_PATH\b/.test(m[1]!)) expect(m[2], f).toBe('@/lib/site/client-base-path');
      }
    }
    expect(files).toContain('lib/site/client-base-path.ts');
  });
});
