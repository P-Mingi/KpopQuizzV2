// Vitest setup file (see vitest.config.ts). Many static-scan tests walk the whole of src/ and read
// every source file, several times in one file (once per `it`). On a loaded machine each of those
// reads costs milliseconds, so a file with five scans spends tens of seconds in the file system
// and trips the 5 s test timeout, though the rule it checks is cheap.
//
// This memoises, for the lifetime of one test file, the read-only calls that look at a path
// inside src/: readFileSync with a text encoding, readdirSync and statSync without options.
// Results are the same as a fresh read as long as nothing changes the tree, so any call that can
// change a file (write, append, remove, rename, create, copy, truncate) empties the whole memo
// first. Errors are never memoised (a test that expects ENOENT and then creates the file still
// sees the file). The memo is filled lazily by the first scan in a file (nothing runs at setup, so
// a worker answers the pool at once). Each test file runs in its own module graph, so the memo never crosses files.
import fs, { type Stats } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('..', import.meta.url));

const texts = new Map<string, string>();
const dirs = new Map<string, string[]>();
const stats = new Map<string, Stats>();

function clear(): void {
  texts.clear();
  dirs.clear();
  stats.clear();
}

const inSrc = (p: unknown): p is string => typeof p === 'string' && p.startsWith(SRC);

const realRead = fs.readFileSync;
const realReaddir = fs.readdirSync;
const realStat = fs.statSync;

fs.readFileSync = ((p: unknown, opts?: unknown, ...rest: unknown[]) => {
  const enc = typeof opts === 'string' ? opts : null;
  if (inSrc(p) && enc === 'utf8' && rest.length === 0) {
    const hit = texts.get(p);
    if (hit !== undefined) return hit;
    const out = (realRead as (...a: unknown[]) => string)(p, opts);
    texts.set(p, out);
    return out;
  }
  return (realRead as (...a: unknown[]) => unknown)(p, opts, ...rest);
}) as typeof fs.readFileSync;

fs.readdirSync = ((p: unknown, opts?: unknown) => {
  if (inSrc(p) && opts === undefined) {
    const hit = dirs.get(p);
    if (hit) return hit.slice();
    const out = (realReaddir as (...a: unknown[]) => string[])(p);
    dirs.set(p, out);
    return out.slice();
  }
  return (realReaddir as (...a: unknown[]) => unknown)(p, opts);
}) as typeof fs.readdirSync;

fs.statSync = ((p: unknown, opts?: unknown) => {
  if (inSrc(p) && opts === undefined) {
    const hit = stats.get(p);
    if (hit) return hit;
    const out = (realStat as (...a: unknown[]) => Stats)(p);
    stats.set(p, out);
    return out;
  }
  return (realStat as (...a: unknown[]) => unknown)(p, opts);
}) as typeof fs.statSync;

// Anything that can change the tree empties the memo before it runs.
const WRITERS = [
  'writeFileSync', 'appendFileSync', 'rmSync', 'rmdirSync', 'unlinkSync', 'renameSync', 'mkdirSync',
  'copyFileSync', 'cpSync', 'truncateSync', 'symlinkSync', 'linkSync', 'mkdtempSync', 'writeSync',
  'writeFile', 'appendFile', 'rm', 'rmdir', 'unlink', 'rename', 'mkdir', 'copyFile', 'cp', 'truncate',
  'symlink', 'link', 'createWriteStream',
] as const;
const target = fs as unknown as Record<string, (...a: unknown[]) => unknown>;
for (const name of WRITERS) {
  const real = target[name];
  if (typeof real !== 'function') continue;
  target[name] = function (this: unknown, ...a: unknown[]) {
    clear();
    return real.apply(this, a);
  };
}
const promised = fs.promises as unknown as Record<string, (...a: unknown[]) => unknown>;
for (const name of ['writeFile', 'appendFile', 'rm', 'rmdir', 'unlink', 'rename', 'mkdir', 'copyFile', 'cp', 'truncate', 'symlink', 'link']) {
  const real = promised[name];
  if (typeof real !== 'function') continue;
  promised[name] = function (this: unknown, ...a: unknown[]) {
    clear();
    return real.apply(this, a);
  };
}

syncBuiltinESMExports();
