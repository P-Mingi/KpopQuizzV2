// KpopCards: the player's level, a pure function of the cards owned (v6 prototype: one level every 10 cards, titles from Rookie to Legend). Nothing here
// touches the XP, level or badges of kpopquiz.org: this is the level of the card game only.
export const CARDS_PER_LEVEL = 10;
const TITLES: readonly (readonly [number, string])[] = [[1, 'Rookie'], [5, 'Trainee'], [10, 'Idol'], [20, 'Ace'], [30, 'Legend']];

export function levelOf(owned: number): number {
  return 1 + Math.floor(Math.max(0, owned) / CARDS_PER_LEVEL);
}
export function titleOf(level: number): string {
  let t = TITLES[0]![1];
  for (const [l, name] of TITLES) if (level >= l) t = name;
  return t;
}
export interface LevelInfo { level: number; title: string; toNext: number; progress: number; label: string; nextLabel: string }
export function levelInfo(owned: number): LevelInfo {
  const n = Math.max(0, owned);
  const level = levelOf(n);
  const toNext = CARDS_PER_LEVEL - (n % CARDS_PER_LEVEL);
  return {
    level, title: titleOf(level), toNext, progress: (n % CARDS_PER_LEVEL) / CARDS_PER_LEVEL,
    label: `Level ${level} · ${titleOf(level)}`, nextLabel: `${toNext} more card${toNext === 1 ? '' : 's'} to level ${level + 1}`,
  };
}
