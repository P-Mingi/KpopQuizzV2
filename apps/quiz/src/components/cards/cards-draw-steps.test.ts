// Bunnyverse Cards lot 2 (owner decision 2026-11-13): the drop rates say how a card is drawn. Before the plan's form every subject of the
// rarity has the same chance, whatever its type, and the type split printed is the share of the subjects; in the plan's form the kind
// weights come back and the page says "Then its type".
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { computeOdds, RARITIES } from '@/lib/cards/rules';
import { oddsView } from '@/lib/cards/ui-model';

import { DropRates } from './drop-rates';

import type { PoolCard } from '@/lib/cards/types';

const now: PoolCard[] = [
  { n: 1, kind: 'idol', rarity: 'C', entity: 'idol:a' }, { n: 2, kind: 'idol', rarity: 'C', entity: 'idol:b' },
  { n: 3, kind: 'group', rarity: 'C', entity: 'group:g' }, { n: 4, kind: 'group', rarity: 'C', entity: 'group:g' },
];

describe('the drop rates before the plan form', () => {
  const odds = computeOdds(now);
  it('say every subject has the same chance, and print the subject share as the type split', () => {
    const t = oddsView(odds);
    expect(t.drawSteps.join(' ')).toContain('a soloist, a member and a group have the same chance');
    expect(t.drawSteps.join(' ')).not.toContain('Then its type');
    const html = renderToStaticMarkup(createElement(DropRates, { odds }));
    expect(html).toContain('soloists and members 66.67%');
    expect(html).toContain('groups 33.33%');
  });
  it('give one card of a person twice the chance of one half of a group', () => {
    const t = oddsView(odds);
    const i = t.cardChance.find((x) => x.kind === 'idol')!;
    const g = t.cardChance.find((x) => x.kind === 'group')!;
    expect(i.pct).toBeCloseTo(odds.card.C / 3, 9);
    expect(g.pct).toBeCloseTo(odds.card.C / 3 / 2, 9);
  });
});

describe('the drop rates in the plan form', () => {
  const plan: PoolCard[] = [
    ...now, { n: 5, kind: 'event', rarity: 'C', entity: 'event:e' },
    ...RARITIES.filter((r) => r !== 'C').map((r, i) => ({ n: 10 + i, kind: 'idol' as const, rarity: r, entity: `idol:r${i}` })),
  ];
  it('say the type comes first, with the plan weights', () => {
    const t = oddsView(computeOdds(plan));
    expect(t.drawSteps.join(' ')).toContain('Then its type');
  });
});
