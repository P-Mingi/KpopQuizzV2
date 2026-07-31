// PERMANENT GATE (owner addendum, 2026-07-31): "Play byte-untouched" proof 2 of 3,
// the RENDERED-LAYOUT probe. The wide-canvas leak survived several sweeps because
// only head tags were proven; this class of miss does not get a second chance.
//
//   pnpm -C apps/quiz exec tsx scripts/test-play-untouched.mts
//   (needs the dev server on :3021; run it in every closing sweep)
//
// Proves, per Play page (home + a game page + the quizzes catalog):
//   1. the page root carries ZERO .verse-page markers (the ONLY selector that can
//      widen a main; widgets may carry .verse-scope, which must be inert)
//   2. the main element still declares the 720px column (max-w-[720px])
//   3. statically: the canvas rule in globals.css keys on .verse-page and NOT on
//      .verse-scope (the exact regression that caused the leak)
// Together these pin the computed width: 720 is declared, and nothing that can
// override it exists on the page. (Proof 3, the Play desktop screenshot, is
// visual and lives in every closing matrix.)

import { readFileSync } from 'node:fs';

const BASE = process.env.PROBE_BASE ?? 'http://localhost:3021';
const PLAY_PAGES = ['/', '/quizzes', '/games'];

let pass = 0;
let fail = 0;
function ok(cond: boolean, label: string, detail?: string): void {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.log(`FAIL  ${label}${detail ? ' :: ' + detail : ''}`); }
}

// 3. The static proof first (no server needed): the canvas rule's selector.
const css = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');
const canvasRules = css.match(/main:has\([^)]*\)\s*\{[^}]*max-width[^}]*\}/g) ?? [];
ok(canvasRules.length === 1, 'exactly one main:has() canvas rule exists', String(canvasRules.length));
ok(canvasRules.every((r) => r.includes('.verse-page')), 'the canvas rule keys on .verse-page');
ok(canvasRules.every((r) => !r.includes(':has(.verse-scope')), 'the canvas rule does NOT key on .verse-scope (the leak)');

// 1 + 2. The rendered probes.
for (const path of PLAY_PAGES) {
  let html = '';
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(120_000) });
    ok(res.ok, `${path} responds ${res.status}`);
    html = await res.text();
  } catch (e) {
    ok(false, `${path} fetch failed`, String(e));
    continue;
  }
  // Strip RSC flight payloads (escaped quotes) so we only assert the real DOM.
  const dom = html.split('\n').filter((l) => !l.includes('\\"')).join('\n');
  ok(!/class="[^"]*verse-page/.test(dom), `${path}: zero .verse-page markers in the rendered DOM`);
  ok(/max-w-\[720px\]/.test(dom), `${path}: the main still declares the 720px column`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log('PLAY LAYOUT LAW HOLDS: 720px, verse-page-free.');
