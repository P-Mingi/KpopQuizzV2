/**
 * V-TEMPLATES step test - templates switch structure with ZERO content loss:
 *   1. Applying any template replaces ONLY tabs + modules.
 *   2. Every non-structural presentation choice survives every switch.
 *   3. Every template result passes validation with all seo_critical blocks.
 *   4. Switching A -> B -> A restores A's structure exactly (lossless cycle).
 *   (Written CONTENT lives in other tables entirely - verse_content, essays,
 *   discussions - and applyTemplate never touches the database at all.)
 *
 *   npx tsx scripts/test-vtemplates.mts
 */
import { TEMPLATE_IDS, TEMPLATE_DEFS, applyTemplate } from '../src/lib/verse/presentation/templates';
import { validatePresentation } from '../src/lib/verse/presentation/validate';
import { defaultSeoCriticalTypes } from '../src/lib/verse/presentation/registry';

import type { Presentation } from '../src/lib/verse/presentation/types';

let failures = 0;
const check = (label: string, ok: boolean): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures += 1;
};

// A richly configured space: every non-structural choice a curator can make.
const rich: Presentation = {
  version: 1,
  preset: 'neon',
  accent: '#c026d3',
  banner: { treatment: 'gradient' },
  welcome: 'Eight members, one fire.',
  frames: { default: 'sharp', divider: 'dots' },
  stickers: [{ id: 'house:sparkles:1', slot: 'banner-tr', scale: 1.4, rotate: 12 }],
  textFolds: { overview: 'folded' },
  tabs: ['home', 'members', 'discography', 'essays', 'community'],
  modules: [
    { type: 'quote', zone: 'main', order: 0, props: { text: 'STAY forever.' } },
    { type: 'members', zone: 'main', order: 1 },
    { type: 'discography', zone: 'main', order: 2 },
  ],
};

const NON_STRUCTURAL: (keyof Presentation)[] = ['preset', 'accent', 'banner', 'welcome', 'frames', 'stickers', 'textFolds'];

for (const id of TEMPLATE_IDS) {
  const next = applyTemplate(rich, id);
  const survived = NON_STRUCTURAL.every((k) => JSON.stringify(next[k]) === JSON.stringify(rich[k]));
  check(`${id}: every non-structural choice survives`, survived);
  check(`${id}: tabs replaced by the template's`, JSON.stringify(next.tabs) === JSON.stringify(TEMPLATE_DEFS[id].tabs));
  check(`${id}: modules replaced by the template's`, JSON.stringify(next.modules) === JSON.stringify(TEMPLATE_DEFS[id].modules));
  // V-PAGES: enabledKinds is STRUCTURE and follows the template (absent = the
  // registry default set; a template without kinds clears any previous set).
  check(`${id}: enabledKinds follows the template`, JSON.stringify(next.enabledKinds) === JSON.stringify(TEMPLATE_DEFS[id].enabledKinds));
  const v = validatePresentation(next);
  check(`${id}: validates clean`, v.ok);
  const types = new Set((v.value?.modules ?? []).map((mm) => mm.type));
  check(`${id}: all seo_critical blocks present after validation`, defaultSeoCriticalTypes().every((t) => types.has(t)));
}

// Lossless switch cycle: starter -> encyclopedia -> starter
const a = applyTemplate(rich, 'starter');
const b = applyTemplate(a, 'encyclopedia');
const a2 = applyTemplate(b, 'starter');
check('A -> B -> A restores A exactly', JSON.stringify(a) === JSON.stringify(a2));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nV-TEMPLATES: structure switches, nothing else moves.');
