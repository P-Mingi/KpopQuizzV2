// V-BUILDER-1 step 2 proof (throwaway harness): prove every module the presentation
// validator accepts has a BlockSpec, and print the full registry table for the
// step-5 owner matrix.  pnpm -C apps/quiz exec tsx scripts/_vbuilder1-registry.mts
import { BLOCK_REGISTRY } from '../src/lib/verse/presentation/registry';
import { BLOCK_SPECS, blockSpec, allBlockSpecs } from '../src/lib/verse/composition/registry';

// (a) completeness: every validator-known module type has a spec.
const missing = Object.keys(BLOCK_REGISTRY).filter((t) => !blockSpec(t));
// (b) every spec is well-formed.
const badSpecs = allBlockSpecs().filter((s) => !s.type || !s.category || !s.name || !s.dataSource || !s.allowedZones?.length || !s.styleOptions?.length || !s.minGateRule);

console.log(`modules in validator: ${Object.keys(BLOCK_REGISTRY).length}  |  block specs: ${allBlockSpecs().length}  (adds doorway + prose)`);
console.log(missing.length === 0 ? 'COMPLETE: every module type has a BlockSpec.' : `MISSING SPECS: ${missing.join(', ')}`);
console.log(badSpecs.length === 0 ? 'ALL SPECS WELL-FORMED.' : `MALFORMED: ${badSpecs.map((s) => s.type).join(', ')}`);

console.log('\n--- registry table ---');
console.log('type'.padEnd(16), 'cat'.padEnd(8), 'seo'.padEnd(4), 'source'.padEnd(10), 'zones'.padEnd(12), 'style options');
for (const s of allBlockSpecs()) {
  console.log(
    s.type.padEnd(16), s.category.padEnd(8), (s.seoCritical ? 'YES' : '-').padEnd(4),
    s.dataSource.padEnd(10), s.allowedZones.join('+').padEnd(12), s.styleOptions.join(','),
  );
}
process.exit(missing.length === 0 && badSpecs.length === 0 ? 0 : 1);
