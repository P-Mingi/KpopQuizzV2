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

const ROOTS = ['src/app/(site)/verse', 'src/components/verse'];
const ALLOW_FILES = new Set([
  'src/components/verse/brand/verse-wordmarks.tsx', // brand mark, renders outside verse-scope
  'src/components/verse/studio/studio-client.tsx',  // the space-customization tool: <input type=color> values + saved-config hexes are FUNCTIONAL, not style-bleed
  'src/app/(site)/verse/[slug]/create/page.tsx',            // space config defaults saved to the DB (functional hexes)
]);
const HEXG = /#[0-9a-fA-F]{3,8}\b/g;

/** A hex is the accent-bleed class the gate guards against only if it is
 * CHROMATIC (its RGB channels spread). Near-neutral hexes (white, black, grays,
 * faint tints) do not interact with the ink-floor clamp, so they are allowed. */
function isChromatic(hex: string): boolean {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) >= 24;
}

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
    // V-BUILDER-0 spike: throwaway Phase 2 reference code, never shipped to readers;
    // its prototype hexes are functional, not style-bleed. Exempt the whole dir.
    if (file.includes('/_spike/')) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes('token-lint-ok')) return;
      const chromatic = (line.match(HEXG) ?? []).filter(isChromatic);
      if (chromatic.length) violations.push(`${file}:${i + 1}  [${chromatic.join(', ')}]  ${line.trim().slice(0, 80)}`);
    });
  }
}

if (violations.length) {
  console.error(`Verse token gate FAILED: ${violations.length} raw hex color(s) in a Verse surface (use a --verse-* token, or mark a deliberate literal with token-lint-ok):\n`);
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('Verse token gate passed: no raw hex colors in Verse surfaces.');
