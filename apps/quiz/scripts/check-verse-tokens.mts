/**
 * V-HARMONY-1 primitive 4 of 4 - the token grep-gate. Fails on a raw hex color
 * in a Verse surface, so every Verse color routes through a token (--verse-accent
 * etc.) and the ink-floor contrast clamp can reach it. This is the exact class
 * that caused the "AI website" washout (a hardcoded #7c5cfc the clamp cannot see).
 *
 * Run from apps/quiz:  npx tsx scripts/check-verse-tokens.mts
 *
 * Escape hatches (deliberate literals, NOT the accent-bleed class):
 *   - files in ALLOW_FILES (the brand wordmark renders outside verse-scope, where
 *     --verse-accent is undefined, so the brand violet must be literal).
 *   - any line carrying a `token-lint-ok` comment (e.g. a neutral avatar fallback).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/app/verse', 'src/components/verse'];
const ALLOW_FILES = new Set([
  'src/components/verse/brand/verse-wordmarks.tsx', // brand mark, renders outside verse-scope
]);
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const violations: string[] = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (ALLOW_FILES.has(file)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes('token-lint-ok')) return;
      if (HEX.test(line)) violations.push(`${file}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
}

if (violations.length) {
  console.error(`Verse token gate FAILED: ${violations.length} raw hex color(s) in a Verse surface (use a --verse-* token, or mark a deliberate literal with token-lint-ok):\n`);
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('Verse token gate passed: no raw hex colors in Verse surfaces.');
