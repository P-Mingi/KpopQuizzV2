// KpopCards: "Almost there" of the lobby (v6): the groups with 1 to 4 cards missing and the idols with exactly one edition missing (of at least three).
// Computed from the catalog and what the player owns, nothing invented. Sorted by how little is left, the groups first.
import type { Rarity } from './types';
import type { SlimCard, SlimCatalog } from './ui-types';

export interface AlmostItem {
  kind: 'sec' | 'idol';
  /** The section id (a group's slug) for a group, the entity id for an idol. */
  id: string;
  name: string;
  color: string;
  all: number;
  own: number;
  /** The missing cards (one for an idol); the first one is drawn on the tile. */
  miss: SlimCard[];
}

export function almostThere(cat: SlimCatalog, has: (n: number) => boolean, limit = 4): AlmostItem[] {
  const byN = new Map(cat.cards.map((c) => [c.n, c]));
  const out: AlmostItem[] = [];
  const colorOf = new Map(cat.sections.map((s) => [s.id, s.color]));
  for (const s of cat.sections) {
    const miss = s.ns.filter((n) => !has(n)).map((n) => byN.get(n)).filter((c): c is SlimCard => !!c);
    if (miss.length > 0 && miss.length <= 4) out.push({ kind: 'sec', id: s.id, name: s.name, color: s.color, all: s.ns.length, own: s.ns.length - miss.length, miss });
  }
  const secOfEntity = new Map<string, string>();
  for (const it of cat.items) if (!it.locked) secOfEntity.set(it.card.entity, it.sec);
  for (const [entity, eds] of Object.entries(cat.editions)) {
    if (!entity.startsWith('idol:')) continue;
    const ns = Object.values(eds).filter((n): n is number => typeof n === 'number');
    if (ns.length < 3) continue;
    const miss = ns.filter((n) => !has(n)).map((n) => byN.get(n)).filter((c): c is SlimCard => !!c);
    if (miss.length !== 1) continue;
    const m = miss[0]!;
    out.push({ kind: 'idol', id: entity, name: m.name, color: colorOf.get(secOfEntity.get(entity) ?? '') ?? '#E8457A', all: ns.length, own: ns.length - 1, miss });
  }
  out.sort((a, b) => (a.all - a.own) - (b.all - b.own) || (a.kind === 'sec' ? -1 : 1));
  return out.slice(0, limit);
}

/** The editions a Craft button may offer on an idol tile (a Full Art cannot be crafted). */
export const NO_CRAFT: readonly Rarity[] = ['L'];
