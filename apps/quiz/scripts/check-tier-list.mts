/**
 * TIERLIST unit tests. The repo has no vitest/playwright harness (verified in
 * PART 0), so these run in the same tsx-assertion idiom as the check:* gates:
 * pure-logic tests, no DB, exit 1 on any failure.
 *
 *   npm run check:tier-list
 *
 * Covers: placements <-> tiers serialization invariants, slug generation +
 * uniqueness, and the fandom-agrees aggregate math. DB-backed paths (CRUD, bank
 * reads, the OG route) are NOT covered here - they are gated on the owner applying
 * migration 146 and are named in the REPORT.
 */
import { buildInitialPlacements, normalizePlacements, isValidPlacements, rankedCount } from '../src/lib/tier-list/serialization.ts';
import { slugify, makeUniqueSlug } from '../src/lib/tier-list/slug.ts';
import { fandomAgrees } from '../src/lib/tier-list/aggregate.ts';
import { defaultTiers, UNRANKED } from '../src/lib/tier-list/defaults.ts';
import type { TierListItem } from '../src/lib/tier-list/types.ts';

let failures = 0;
function ok(cond: boolean, name: string): void {
  if (cond) { console.log(`  ok   ${name}`); } else { failures += 1; console.error(`  FAIL ${name}`); }
}
function eq(a: unknown, b: unknown, name: string): void {
  ok(JSON.stringify(a) === JSON.stringify(b), `${name}${JSON.stringify(a) === JSON.stringify(b) ? '' : ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`}`);
}

const items: TierListItem[] = [
  { id: 'jm', kind: 'member', name: 'Jimin', image_url: null },
  { id: 'v', kind: 'member', name: 'V', image_url: null },
  { id: 'jk', kind: 'member', name: 'Jung Kook', image_url: null },
  { id: 'rm', kind: 'member', name: 'RM', image_url: null },
];
const tiers = defaultTiers();

console.log('serialization:');
{
  const init = buildInitialPlacements(items, tiers);
  eq(init[UNRANKED], ['jm', 'v', 'jk', 'rm'], 'buildInitialPlacements: all items unranked');
  eq(init['S'], [], 'buildInitialPlacements: tier S empty');
  ok(isValidPlacements(init, tiers, items), 'initial placements are valid');
}
{
  // dupe id, unknown id, and one item never placed -> exactly-once invariant.
  const raw = { S: ['jm', 'jm', 'ghost'], A: ['v'], [UNRANKED]: ['jk'] }; // rm missing, jm duped, ghost unknown
  const norm = normalizePlacements(raw, tiers, items);
  eq(norm['S'], ['jm'], 'normalize: dupe + unknown dropped from S');
  eq(norm['A'], ['v'], 'normalize: A kept');
  ok(norm[UNRANKED]!.includes('jk') && norm[UNRANKED]!.includes('rm'), 'normalize: unplaced rm joins jk in unranked');
  ok(isValidPlacements(norm, tiers, items), 'normalized placements are valid');
  eq(rankedCount(norm), 2, 'rankedCount: jm + v placed');
}
{
  // a removed tier folds back into unranked.
  const raw = { Z: ['jm'], S: ['v'], A: ['jk'], [UNRANKED]: ['rm'] };
  const norm = normalizePlacements(raw, tiers, items); // no tier 'Z'
  ok(norm[UNRANKED]!.includes('jm'), 'normalize: item from a removed tier returns to unranked');
  ok(isValidPlacements(norm, tiers, items), 'valid after tier removal');
}

console.log('slug:');
{
  eq(slugify('My BTS Ranking!'), 'my-bts-ranking', 'slugify basic');
  eq(slugify('  ---  '), 'tier-list', 'slugify empty -> fallback');
  eq(slugify('Café déjà vu'), 'cafe-deja-vu', 'slugify diacritics');
  const taken = new Set(['my-list', 'my-list-2']);
  eq(makeUniqueSlug('My List', taken), 'my-list-3', 'makeUniqueSlug increments past taken');
  eq(makeUniqueSlug('Fresh One', taken), 'fresh-one', 'makeUniqueSlug free base');
}

console.log('aggregate (fandom agrees):');
{
  const order = tiers.map((t) => t.label);
  // 3 lists. jm: S,S,A -> modal S, 2/3. v: A,A,A -> A, 3/3. jk sits unranked once (no vote there).
  const lists = [
    { S: ['jm'], A: ['v'], [UNRANKED]: ['jk', 'rm'] },
    { S: ['jm'], A: ['v'], [UNRANKED]: [] },
    { A: ['jm', 'v'], [UNRANKED]: ['jk'] },
  ];
  const agg = fandomAgrees(lists, order);
  const byId = Object.fromEntries(agg.map((c) => [c.itemId, c]));
  eq(byId['jm']!.tier, 'S', 'jm modal tier is S (2 of 3)');
  ok(Math.abs(byId['jm']!.agreement - 2 / 3) < 1e-9, 'jm agreement 2/3');
  eq(byId['v']!.tier, 'A', 'v modal tier A');
  ok(Math.abs(byId['v']!.agreement - 1) < 1e-9, 'v agreement 1.0');
  eq(byId['v']!.votes, 3, 'v got 3 votes');
  ok(byId['jk'] === undefined, 'jk never ranked -> not in aggregate');
  // output ordered by tier top-to-bottom: S (jm) before A (v).
  eq(agg[0]!.itemId, 'jm', 'aggregate ordered by tier: S first');
}
{
  // modal tie breaks to the higher tier (earlier in order).
  const order = ['S', 'A', 'B'];
  const lists = [{ S: ['x'] }, { A: ['x'] }]; // 1 vote S, 1 vote A -> tie -> S wins
  const agg = fandomAgrees(lists, order);
  eq(agg[0]!.tier, 'S', 'modal tie breaks to the higher tier');
}

if (failures > 0) {
  console.error(`\nTIERLIST tests FAILED: ${failures} assertion(s).`);
  process.exit(1);
}
console.log('\nTIERLIST tests passed.');
