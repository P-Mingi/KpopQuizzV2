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
].join('|'));

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
