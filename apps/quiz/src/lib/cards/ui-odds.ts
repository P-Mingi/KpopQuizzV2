// Bunnyverse Cards, lane U: the odds the Drop rates box prints (amendment 1, point 4). An edition with no card can never come out, so
// the odds shown are those of the REAL catalog: the plan's weights (ODDS in rules.ts) of the rarities that have at least one card in
// packs, scaled to 100. The fifth card is drawn the same way and a Common there becomes an Uncommon. Nothing is typed here: every
// percentage and every sentence is computed from the rarities the catalog holds.
import { ODDS, RARITIES, RARITY_NAMES } from './rules';

import type { Rarity } from './types';

export interface OddsTable {
  /** Rarities with a card in packs, in the plan's order. */
  present: Rarity[];
  /** Rarities with no card yet. */
  absent: Rarity[];
  /** Percent, two decimals, of each present rarity: each card, and the fifth card. */
  each: Partial<Record<Rarity, number>>;
  fifth: Partial<Record<Rarity, number>>;
  /** The calculation in plain words. */
  eachWords: string;
  fifthWords: string;
}

const num = (v: number): string => String(Number(v.toFixed(4)));
const pct = (v: number): string => `${v.toFixed(2)}%`;
const list = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function catalogOdds(rarities: Iterable<Rarity>): OddsTable {
  const have = new Set(rarities);
  const present = RARITIES.filter((r) => have.has(r));
  const absent = RARITIES.filter((r) => !have.has(r));
  const total = present.reduce((s, r) => s + ODDS[r], 0);
  const each: OddsTable['each'] = {};
  for (const r of present) each[r] = (ODDS[r] / total) * 100;

  // The fifth card: a Common becomes the next rarity up that exists (the plan says Uncommon).
  const w5: Partial<Record<Rarity, number>> = {};
  for (const r of present) w5[r] = ODDS[r];
  const lift = have.has('C') ? present.find((r) => r !== 'C') : undefined;
  if (lift && w5.C !== undefined) { w5[lift] = (w5[lift] ?? 0) + w5.C; delete w5.C; }
  const fifth: OddsTable['fifth'] = {};
  for (const r of present) if (w5[r] !== undefined) fifth[r] = ((w5[r] as number) / total) * 100;

  const names = present.map((r) => RARITY_NAMES[r]);
  const eachWords = total === 0 ? 'No card is in packs yet.'
    : absent.length === 0
      ? `Every rarity has cards, so the plan's odds apply as they are: ${present.map((r) => `${RARITY_NAMES[r]} ${num(ODDS[r])}`).join(', ')} (a total of ${num(total)}).`
      : `Only ${list(names)} cards exist so far, so their odds from the plan (${list(present.map((r) => num(ODDS[r])))}) are scaled to 100: ${present.map((r) => `${num(ODDS[r])} / ${num(total)} = ${pct(each[r] as number)}`).join(', ')}.`;
  const parts = present.filter((r) => w5[r] !== undefined).map((r) => {
    const w = r === lift && have.has('C') ? `(${num(ODDS[r])} + ${num(ODDS.C)})` : num(ODDS[r]);
    return `${w} / ${num(total)} = ${pct(fifth[r] as number)}`;
  });
  const fifthWords = total === 0 ? '' : lift && have.has('C')
    ? `The fifth card is drawn the same way, and a Common there becomes ${lift === 'U' ? 'an Uncommon' : `a ${RARITY_NAMES[lift]}`}: ${parts.join(', ')}.`
    : 'The fifth card is drawn the same way.';
  return { present, absent, each, fifth, eachWords, fifthWords };
}
