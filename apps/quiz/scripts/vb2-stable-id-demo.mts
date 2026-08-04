// V-BUILDER-2 step-3 receipt reproducer: does data-block-id survive a reorder?
//
// Uses the REAL converter (the same functions the renderer + save path use) to
// walk a block through the full stored round-trip:
//   presentation (stored) -> composition (ids minted) -> REORDER -> composition
//   -> presentation (SAVED) -> composition (ids re-minted on re-read)
// and prints each block's id before and after. If a moved block's id changes, the
// id is positional (recomputed from render order), not a persisted stable id.
//
// Run: npx tsx scripts/vb2-stable-id-demo.mts
import { presentationToComposition, compositionToPresentation } from '../src/lib/verse/composition/convert';
import type { Presentation } from '../src/lib/verse/presentation/types';
import type { Composition } from '../src/lib/verse/composition/types';

const line = (s = '') => console.log(s);
const ids = (c: Composition) => c.sections.flatMap((s) => s.blocks).map((b) => `${b.id}<${(b.props as { tag?: string })?.tag ?? '?'}>`);

// --- SAME-TYPE case: two blocks of one type, each tagged so we can track them ---
line('=== SAME-TYPE reorder (two "discography" blocks, tagged ALPHA / BETA) ===');
const pres1: Presentation = {
  version: 1,
  modules: [
    { type: 'discography', zone: 'main', order: 0, props: { tag: 'ALPHA' } },
    { type: 'discography', zone: 'main', order: 1, props: { tag: 'BETA' } },
  ],
};
const comp1 = presentationToComposition(pres1);
line(`  1. read stored config -> composition: ${ids(comp1).join('  ')}`);

// reorder: swap the two blocks (what step-3 "move down ALPHA" would do)
const flat = comp1.sections[0]!.blocks;
const comp2: Composition = { ...comp1, sections: [{ ...comp1.sections[0]!, blocks: [flat[1]!, flat[0]!] }] };
line(`  2. reorder (swap) in memory:          ${ids(comp2).join('  ')}`);

// save: composition -> presentation (this is what the draft rail persists)
const pres2 = compositionToPresentation(comp2);
const savedHasIds = (pres2.modules ?? []).some((m) => 'id' in m);
line(`  3. save (composition -> presentation): modules carry an id field? ${savedHasIds}`);

// re-render / re-read: presentation -> composition (ids minted again)
const comp3 = presentationToComposition(pres2);
line(`  4. re-read stored config -> composition: ${ids(comp3).join('  ')}`);

const betaBefore = ids(comp1).find((s) => s.includes('BETA'))!.split('<')[0];
const betaAfter = ids(comp3).find((s) => s.includes('BETA'))!.split('<')[0];
line('');
line(`  BETA block id BEFORE reorder: ${betaBefore}`);
line(`  BETA block id AFTER  reorder: ${betaAfter}`);
line(`  => stable across reorder? ${betaBefore === betaAfter ? 'YES' : 'NO  (id followed POSITION, not the block)'}`);

line('');
line('=== DIFFERENT-TYPE reorder (intro + members) - for contrast ===');
const presD: Presentation = {
  version: 1,
  modules: [
    { type: 'intro', zone: 'main', order: 0, props: { tag: 'INTRO' } },
    { type: 'members', zone: 'main', order: 1, props: { tag: 'MEMBERS' } },
  ],
};
const cD1 = presentationToComposition(presD);
const fD = cD1.sections[0]!.blocks;
const cD2: Composition = { ...cD1, sections: [{ ...cD1.sections[0]!, blocks: [fD[1]!, fD[0]!] }] };
const cD3 = presentationToComposition(compositionToPresentation(cD2));
line(`  before: ${ids(cD1).join('  ')}`);
line(`  after : ${ids(cD3).join('  ')}`);
line('  => unique types keep their id ACROSS reorder only by coincidence (nth-of-type');
line('     is still 0 for each), which hides the positional mechanism until two blocks');
line('     share a type. The mechanism is identical - positional - in both cases.');
