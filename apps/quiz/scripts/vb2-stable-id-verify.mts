// V-BUILDER-2 step 3.0 acceptance: stable ids survive reorder, and legacy ids freeze
// on save. Exits non-zero on any failure. Run: npx tsx scripts/vb2-stable-id-verify.mts
import { presentationToComposition, compositionToPresentation } from '../src/lib/verse/composition/convert';
import { validatePresentation } from '../src/lib/verse/presentation/validate';
import type { Presentation } from '../src/lib/verse/presentation/types';
import type { Composition } from '../src/lib/verse/composition/types';

let failed = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
  if (!cond) failed++;
};
const swap = (c: Composition): Composition => {
  const b = c.sections[0]!.blocks;
  return { ...c, sections: [{ ...c.sections[0]!, blocks: [b[1]!, b[0]!, ...b.slice(2)] }] };
};
const flat = (c: Composition) => c.sections.flatMap((s) => s.blocks);
const tagOf = (b: { props?: Record<string, unknown> }) => (b.props as { tag?: string })?.tag;

console.log('=== TEST 1: converter round-trip keeps ids across a same-type reorder ===');
{
  const pres1: Presentation = { version: 1, modules: [
    { type: 'discography', zone: 'main', order: 0, props: { tag: 'ALPHA' } },
    { type: 'discography', zone: 'main', order: 1, props: { tag: 'BETA' } },
  ] };
  const comp1 = presentationToComposition(pres1);
  const idOf1 = Object.fromEntries(flat(comp1).map((b) => [tagOf(b), b.id]));
  // reorder -> save -> re-read (the full stored round-trip)
  const comp3 = presentationToComposition(compositionToPresentation(swap(comp1)));
  const idOf3 = Object.fromEntries(flat(comp3).map((b) => [tagOf(b), b.id]));
  check('save now persists an id on the module', 'id' in (compositionToPresentation(comp1).modules![0]!));
  check('ALPHA keeps its id across reorder', idOf1.ALPHA === idOf3.ALPHA, `${idOf1.ALPHA} -> ${idOf3.ALPHA}`);
  check('BETA  keeps its id across reorder', idOf1.BETA === idOf3.BETA, `${idOf1.BETA} -> ${idOf3.BETA}`);
  check('the two ids stayed distinct', idOf3.ALPHA !== idOf3.BETA, `${idOf3.ALPHA} / ${idOf3.BETA}`);
}

console.log('\n=== TEST 2: legacy freeze (unsaved config -> save -> ids persisted -> stable) ===');
{
  // a legacy config: modules carry NO id (predates 3.0)
  const legacy: Presentation = { version: 1, modules: [
    { type: 'discography', zone: 'main', order: 0 },
    { type: 'discography', zone: 'main', order: 1 },
  ] };
  const saved = validatePresentation(legacy);
  const discs = (saved.value?.modules ?? []).filter((m) => m.type === 'discography');
  check('validation succeeded', saved.ok, saved.errors.join('; '));
  check('every discography module now has a frozen id', discs.every((m) => typeof m.id === 'string' && m.id.length > 0), JSON.stringify(discs.map((m) => m.id)));
  const byOrder = [...discs].sort((a, b) => a.order - b.order);
  const id0 = byOrder[0]!.id, id1 = byOrder[1]!.id;

  // second reorder on the NOW-FROZEN config: swap the two discs' positions/order.
  const reordered: Presentation = { ...saved.value!, modules: (saved.value!.modules ?? []).map((m) => {
    if (m.id === id0) return { ...m, order: 1 };
    if (m.id === id1) return { ...m, order: 0 };
    return m;
  }) };
  const saved2 = validatePresentation(reordered);
  const discs2 = (saved2.value?.modules ?? []).filter((m) => m.type === 'discography');
  const atOrder0 = discs2.find((m) => m.order === 0);
  check('re-validation succeeded', saved2.ok, saved2.errors.join('; '));
  check('frozen ids are UNCHANGED after the reorder', new Set(discs2.map((m) => m.id!)).size === 2 && discs2.every((m) => m.id === id0 || m.id === id1));
  check('the id that moved to order 0 is the ORIGINAL order-1 id (travelled, not re-derived)', atOrder0?.id === id1, `order0 id = ${atOrder0?.id}, expected ${id1}`);
}

console.log('\n=== TEST 3: validator id gates ===');
{
  const dupIds = validatePresentation({ version: 1, modules: [
    { type: 'discography', zone: 'main', order: 0, id: 'dup1' },
    { type: 'timeline', zone: 'main', order: 1, id: 'dup1' },
  ] });
  check('duplicate explicit ids are rejected', !dupIds.ok && dupIds.errors.some((e) => /Duplicate block id/.test(e)), dupIds.errors.join('; '));
  const badId = validatePresentation({ version: 1, modules: [{ type: 'discography', zone: 'main', order: 0, id: 'has spaces & symbols!' }] });
  check('malformed id is rejected', !badId.ok && badId.errors.some((e) => /Invalid block id/.test(e)), badId.errors.join('; '));
  const goodId = validatePresentation({ version: 1, modules: [{ type: 'discography', zone: 'main', order: 0, id: 'a1b2c3d4-uuid_ok' }] });
  const kept = (goodId.value?.modules ?? []).find((m) => m.type === 'discography');
  check('a valid explicit id is preserved verbatim (not re-minted)', kept?.id === 'a1b2c3d4-uuid_ok', kept?.id);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}: stable-id persistence + freeze`);
process.exit(failed === 0 ? 0 : 1);
