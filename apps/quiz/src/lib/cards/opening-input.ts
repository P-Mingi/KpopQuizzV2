// KpopCards (agent C): what the opening shows, taken from the server's answer (POST /api/cards/open, lib/kpopcards/contract.ts). Pure.
// The server drew everything: this only flattens its packs into the cards the screen deals, in the server's order, and carries its words
// (the headline, the finished sets, the golden packs) to the screen as they are.
import { RARITIES } from '@/lib/cards/rules';

import type { OpenedPack, OpenResponse, FinishedSetV } from '@/lib/kpopcards/contract';
import type { Edition, Rarity } from '@/lib/cards/types';

export interface OpeningCardIn { n: number; isNew: boolean; completesPair: boolean; pity: boolean; edition: Edition }
export interface OpeningInput {
  cards: OpeningCardIn[];
  packs: 1 | 5;
  /** The pack was golden (one pack only: Open 5 counts them in goldenPacks). */
  golden: boolean;
  goldenPacks: number;
  source: OpenedPack['source'];
  /** 'all', 'girls', 'daily', 'focus' for the address and the face of the pack. */
  theme: OpenedPack['theme'];
  group: OpenedPack['group'];
  finished: FinishedSetV[];
  headline: string;
  copiesShards: number;
  levelUp: OpenResponse['summary']['levelUp'];
}

const RARITY_OF: Record<Edition, Rarity> = { std: 'C', stage: 'U', holo: 'R', era: 'SR', gold: 'UR', full: 'L' };
export const rarityOfEdition = (e: Edition): Rarity => RARITY_OF[e];
/** True when the edition is Gold or Full Art: the pack warns "Something shines". */
export const isBigEdition = (e: Edition): boolean => RARITIES.indexOf(RARITY_OF[e]) >= 4;

export function openingInput(res: OpenResponse): OpeningInput {
  const first = res.packs[0];
  if (!first) throw new Error('openingInput: an open answer with no pack');
  const cards = res.packs.flatMap((p) => p.cards.map((c) => ({ n: c.n, isNew: c.isNew, completesPair: c.completesPair, pity: c.guarantee, edition: c.edition })));
  const five = res.packs.length >= 5;
  return {
    cards, packs: five ? 5 : 1, golden: !five && first.golden, goldenPacks: res.summary.goldenPacks, source: first.source, theme: first.theme, group: first.group,
    finished: res.summary.finished, headline: res.summary.headline, copiesShards: res.summary.copiesShards, levelUp: res.summary.levelUp,
  };
}
