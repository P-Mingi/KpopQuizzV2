// FandomVerse (owner, 2026-10-28): the hub is FandomVerse on fandomverse.org and OtakuQuiz lives at fandomverse.org/anime. The old hub
// name and the two old domains must not come back in the code: this test reads every text file of the code tree and fails with the
// file and the line of each hit. Banned: the old hub name written in camel case (case-sensitive), the old hub domain and the old
// anime domain (any case). Scanned: apps/quiz/src, apps/quiz/public (text files), the config files at the root of apps/quiz,
// apps/quiz/e2e, apps/quiz/scripts, supabase/functions, scripts and docs/pending-migrations (its README files included). Not scanned:
// the history (docs/o1, docs/launch and the other reports), node_modules and build output. The design folder name of the hub
// (docs/o1/design/fanquiz-hub) holds none of the banned strings. The tokens below are built in pieces, so this file is no hit.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO = fileURLToPath(new URL('../../../../../', import.meta.url));
const APP = join(REPO, 'apps/quiz');

const OLD_NAME = ['Fan', 'Quiz'].join('');
const OLD_DOMAINS = [['fanquiz', 'org'].join('.'), ['otakuquiz', 'org'].join('.')];
const BANNED: readonly { readonly label: string; readonly re: RegExp }[] = [
  { label: OLD_NAME, re: new RegExp(OLD_NAME) },
  ...OLD_DOMAINS.map((d) => ({ label: d, re: new RegExp(d.replace('.', '\\.'), 'i') })),
];

/** Folders never read: dependencies, build output and test reports. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', '.vercel', 'coverage', 'test-results', 'playwright-report', 'dist', 'out', '.git']);
/** Binary files by extension (images, fonts, audio, archives); any other file holding a NUL byte is read as binary too. */
const BINARY = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp3', '.mp4', '.m4a', '.ogg', '.wav', '.webm', '.zip', '.gz', '.br', '.pdf', '.wasm',
]);

function walk(dir: string, out: string[]): void {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, out);
    } else if (st.isFile() && !BINARY.has(extname(name).toLowerCase())) {
      out.push(p);
    }
  }
}

/** Every file of the scanned scope, as absolute paths. */
function scope(): string[] {
  const files: string[] = [];
  for (const d of ['src', 'public', 'e2e', 'scripts']) walk(join(APP, d), files);
  for (const name of readdirSync(APP)) {
    if (/\.(ts|mts|mjs|cjs|js|json)$/.test(name) && statSync(join(APP, name)).isFile()) files.push(join(APP, name));
  }
  walk(join(REPO, 'supabase/functions'), files);
  walk(join(REPO, 'scripts'), files);
  const migrations: string[] = [];
  walk(join(REPO, 'docs/pending-migrations'), migrations);
  // The reports of that folder are history; its README files are what the owner reads before pasting SQL.
  files.push(...migrations.filter((f) => extname(f) !== '.md' || f.endsWith('/README.md')));
  return files;
}

/** `path:line: token` for each banned token on each line of `file`. */
function hits(file: string): string[] {
  const buf = readFileSync(file);
  if (buf.subarray(0, 8192).includes(0)) return [];
  const out: string[] = [];
  buf.toString('utf8').split('\n').forEach((line, i) => {
    for (const b of BANNED) if (b.re.test(line)) out.push(`${relative(REPO, file)}:${i + 1}: ${b.label}`);
  });
  return out;
}

describe('FandomVerse: no old hub name or old domain in the code', () => {
  it('scans a real tree (the registry, a copy file, the email brands, a pending migration and a script are in scope)', () => {
    const files = scope().map((f) => relative(REPO, f));
    for (const f of [
      'apps/quiz/src/lib/site/registry.ts',
      'apps/quiz/src/copy/hub/h1.ts',
      'apps/quiz/public/brand/hub/site.webmanifest',
      'apps/quiz/e2e/o1/L1/content-sql.mjs',
      'supabase/functions/send-email/brands.ts',
      'docs/pending-migrations/multisite/launch/L01-B2-sites.sql',
      'docs/pending-migrations/multisite/README.md',
      'scripts/o1-tools/signin-urls.mjs',
      'apps/quiz/next.config.ts',
    ]) expect(files, f).toContain(f);
    expect(files.some((f) => f.startsWith('docs/o1/') || f.startsWith('docs/launch/'))).toBe(false);
  }, 60_000);

  it('the patterns catch what they must and nothing else', () => {
    const match = (s: string): string[] => BANNED.filter((b) => b.re.test(s)).map((b) => b.label);
    expect(match(`${OLD_NAME} network`)).toEqual([OLD_NAME]);
    expect(match(OLD_NAME.toLowerCase())).toEqual([]);
    expect(match(`https://${OLD_DOMAINS[0]!.toUpperCase()}/privacy`)).toEqual([OLD_DOMAINS[0]]);
    expect(match(`x@team.${OLD_DOMAINS[1]}`)).toEqual([OLD_DOMAINS[1]]);
    expect(match('docs/o1/design/fanquiz-hub/Main.dc.html')).toEqual([]);
    expect(match('FandomVerse on fandomverse.org, OtakuQuiz on fandomverse.org/anime')).toEqual([]);
  });

  it('finds none (each hit is printed as file:line: token)', () => {
    const found = scope().flatMap(hits);
    expect(found).toEqual([]);
  }, 60_000);
});
