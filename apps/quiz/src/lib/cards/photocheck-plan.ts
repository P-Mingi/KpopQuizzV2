// Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK: which photo each numbered edition of a subject gets after the photo check of 2026-11-17.
// The owner's rule (relayed by ORCH, 2026-11-17): the best looking photos are the rarest; a subject keeps fewer editions rather than a poor
// photo, and the editions it loses are its RAREST. Pure: gen-photocheck-sql.mts checks the plan against it, photocheck-sql.test.ts tests it.
//
// In this order:
//   1. keep as many editions as the good photos allow (a group edition of k cards needs a photo in k parts; Full Art needs a photo whose every
//      part is at least 640 px wide, the full_ok of cards_build_catalog in 118);
//   2. among those, keep the LOWEST editions (C, U, R, SR, UR, L): the ones that leave are the rarest;
//   3. Stage keeps its promise: an on-stage photo goes on U whenever one can (else U keeps an off-stage photo, a conflict the report lists);
//   4. then the best ranked photo goes on the rarest edition kept, the next one on the next rarest, and so on;
//   5. ties: the fewest photos changed.

export const LADDER = ['C', 'U', 'R', 'SR', 'UR', 'L'] as const;
export type Rarity = (typeof LADDER)[number];

export interface PlanEdition { rarity: Rarity; cards: number }
/** A good photo of the subject (verdict OK or RECROP), best looking first in the list given. parts: 1 for a person, 2 or 3 for a group. */
export interface PlanPhoto { id: number; parts: number; fullOk: boolean; stage: boolean }
export interface PlanResult {
  assign: Partial<Record<Rarity, number>>;
  dropped: Rarity[];
  /** Why each dropped edition is missing, as cards_build_catalog writes it: 'size' for a Full Art that has enough photos but none with a 2x. */
  lock: Partial<Record<Rarity, 'photo' | 'size'>>;
  conflicts: string[];
}

const idx = (r: Rarity): number => LADDER.indexOf(r);

function* permutations<T>(items: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return; }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest, k - 1)) yield [items[i]!, ...p];
  }
}

function* combinations<T>(items: T[], k: number, start = 0): Generator<T[]> {
  if (k === 0) { yield []; return; }
  for (let i = start; i <= items.length - k; i++) for (const c of combinations(items, k - 1, i + 1)) yield [items[i]!, ...c];
}

/** a < b, element by element (same length). */
function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! < b[i]!;
  return false;
}

const fits = (e: PlanEdition, p: PlanPhoto): boolean => p.parts === e.cards && (e.rarity !== 'L' || p.fullOk);

/**
 * The plan of one subject. `editions`: its numbered editions (each with its number of cards); `pool`: its good photos, best looking first;
 * `current`: the photo of each edition today (for the ties).
 */
export function planSubject(editions: PlanEdition[], pool: PlanPhoto[], current: Partial<Record<Rarity, number>> = {}): PlanResult {
  const eds = [...editions].sort((a, b) => idx(a.rarity) - idx(b.rarity));
  const rank = new Map(pool.map((p, i) => [p.id, i + 1]));
  const feasible = (kept: PlanEdition[]): boolean => {
    for (const perm of permutations(pool, kept.length)) if (kept.every((e, i) => fits(e, perm[i]!))) return true;
    return false;
  };
  let kept: PlanEdition[] = [];
  // combinations() yields the subsets of a size in lexicographic order of the ladder: the first feasible one keeps the lowest editions
  for (let size = Math.min(eds.length, pool.length); size > 0 && kept.length === 0; size--) {
    for (const c of combinations(eds, size)) if (feasible(c)) { kept = c; break; }
  }
  const desc = [...kept].sort((a, b) => idx(b.rarity) - idx(a.rarity));
  let best: { score: number[]; perm: PlanPhoto[] } | null = null;
  for (const perm of permutations(pool, desc.length)) {
    if (!desc.every((e, i) => fits(e, perm[i]!))) continue;
    const u = desc.findIndex((e) => e.rarity === 'U');
    const stageBad = u >= 0 && !perm[u]!.stage ? 1 : 0;
    const changes = desc.filter((e, i) => perm[i]!.id !== current[e.rarity]).length;
    const score = [stageBad, ...perm.map((p) => rank.get(p.id)!), changes];
    if (!best || lexLess(score, best.score)) best = { score, perm };
  }
  const assign: PlanResult['assign'] = {};
  if (best) desc.forEach((e, i) => { assign[e.rarity] = best!.perm[i]!.id; });
  const dropped = eds.filter((e) => assign[e.rarity] === undefined).map((e) => e.rarity);
  const lock: PlanResult['lock'] = {};
  for (const r of dropped) lock[r] = r === 'L' && pool.length >= eds.length ? 'size' : 'photo';
  const conflicts: string[] = [];
  const onU = assign.U === undefined ? undefined : pool.find((p) => p.id === assign.U);
  if (onU && !onU.stage) conflicts.push(`Stage keeps photo ${onU.id}, not on stage: no on-stage photo passes, or none can go there`);
  if (onU && onU.stage && rank.get(onU.id) === 1 && desc[0]!.rarity !== 'U') conflicts.push(`the best photo (${onU.id}) is on stage: it stays on Stage, not on the rarest edition`);
  if (lock.L === 'size') conflicts.push('enough good photos, but none with an honest 2x: Full Art leaves the packs');
  return { assign, dropped, lock, conflicts };
}
