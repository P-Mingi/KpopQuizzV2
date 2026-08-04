// V-BUILDER-1 step 3 proof (throwaway): the composition validator rejects each
// hostile input with a plain human sentence, and accepts a valid composition.
//   pnpm -C apps/quiz exec tsx scripts/_vbuilder1-validator.mts
import { validateComposition } from '../src/lib/verse/composition/validate';
import { COMPOSITION_VERSION } from '../src/lib/verse/composition/types';

const comp = (blocks: unknown[]) => ({ version: COMPOSITION_VERSION, meta: {}, sections: [{ id: 'home', width: 'wide', blocks }] });

const cases: Array<[string, unknown, string | null]> = [
  ['unknown block type', comp([{ id: 'b1', type: 'not_a_block', zone: 'main' }]), 'Unknown block type'],
  ['block cap breach', comp(Array.from({ length: 30 }, (_, i) => ({ id: `b${i}`, type: 'quote', zone: 'main' }))), 'Too many blocks'],
  ['seoCritical hidden', comp([{ id: 'b1', type: 'members', zone: 'main', hidden: true }]), 'core content and cannot be hidden'],
  ['raw hex background', comp([{ id: 'b1', type: 'quote', zone: 'main', style: { background: '#ff0000' } }]), 'theme token'],
  ['un-clamped accent (not hex)', comp([{ id: 'b1', type: 'quote', zone: 'main', style: { accent: 'hotpink' } }]), 'hex value'],
  ['bad span', comp([{ id: 'b1', type: 'quote', zone: 'main', span: 99 }]), 'span must be'],
  ['duplicate block id', comp([{ id: 'x', type: 'quote', zone: 'main' }, { id: 'x', type: 'quote', zone: 'main' }]), 'Duplicate block id'],
  ['valid composition', comp([{ id: 'b1', type: 'quote', zone: 'main', props: { text: 'STAY forever' } }]), null],
];

let allPass = true;
for (const [name, input, expect] of cases) {
  const r = validateComposition(input);
  let pass: boolean; let detail: string;
  if (expect === null) { pass = r.ok; detail = r.ok ? 'accepted' : `WRONGLY REJECTED: ${r.errors.join('; ')}`; }
  else { const hit = r.errors.find((e) => e.includes(expect)); pass = !r.ok && !!hit; detail = r.ok ? 'WRONGLY ACCEPTED' : `"${hit ?? r.errors[0]}"`; }
  allPass = allPass && pass;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(22)} -> ${detail}`);
}
console.log(allPass ? '\nALL PASS: validator rejects hostile config with human sentences, accepts valid.' : '\nFAILURES above.');
process.exit(allPass ? 0 : 1);
