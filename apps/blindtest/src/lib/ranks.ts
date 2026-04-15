export const RANKS = [
  { level: 1, title: 'trainee', label: 'Trainee', xp: 0, color: '#B4B2A9' },
  { level: 2, title: 'rookie', label: 'Rookie', xp: 500, color: '#97C459' },
  { level: 3, title: 'debut', label: 'Debut', xp: 1500, color: '#378ADD' },
  { level: 4, title: 'idol', label: 'Idol', xp: 3000, color: '#D4537E' },
  { level: 5, title: 'star', label: 'Star', xp: 6000, color: '#7F77DD' },
  { level: 6, title: 'superstar', label: 'Superstar', xp: 12000, color: '#EF9F27' },
  { level: 7, title: 'legend', label: 'Legend', xp: 25000, color: '#E24B4A' },
] as const;

export type RankTitle = (typeof RANKS)[number]['title'];

export function getRank(xp: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i]!.xp) return RANKS[i]!;
  }
  return RANKS[0]!;
}

export function getNextRank(xp: number) {
  const current = getRank(xp);
  const next = RANKS.find((r) => r.level === current.level + 1);
  return next ?? null;
}

export function getRankProgress(xp: number): number {
  const current = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return 1;
  return (xp - current.xp) / (next.xp - current.xp);
}
