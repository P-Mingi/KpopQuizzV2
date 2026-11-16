// KpopCards (lot 5): the idol page /kpopcards/idol/<name>. An idol page opens when the player owns a card of that idol ("unlocked by a card"); the address is the
// slug of the stage name. Pure helpers over the slim catalog: find the idol, list its editions.
import { RARITIES } from './rules';

import type { Rarity } from './types';
import type { SlimCard, SlimCatalog } from './ui-types';

export const slugOf = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export interface IdolInfo { entity: string; name: string; group: string | null; debutYear: number | null; cards: SlimCard[]; editions: Partial<Record<Rarity, SlimCard>> }

/** The idol whose stage name has this slug (the first, when two idols share a name), with its cards by edition. null: no such idol in the catalog. */
export function findIdol(cat: Pick<SlimCatalog, 'cards'>, slug: string): IdolInfo | null {
  const s = slugOf(slug);
  const first = cat.cards.find((c) => c.kind === 'idol' && slugOf(c.name) === s);
  if (!first) return null;
  const cards = cat.cards.filter((c) => c.entity === first.entity).sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity));
  const editions: Partial<Record<Rarity, SlimCard>> = {};
  for (const c of cards) editions[c.rarity] ??= c;
  return { entity: first.entity, name: first.name, group: first.group, debutYear: first.debutYear, cards, editions };
}

/** Unlocked once the player owns any card of the idol. */
export const idolUnlocked = (info: IdolInfo, has: (n: number) => boolean): boolean => info.cards.some((c) => has(c.n));
