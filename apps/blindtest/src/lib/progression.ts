// ── Player Level ──

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 500 },
  { level: 5, xp: 1000 },
  { level: 6, xp: 1750 },
  { level: 7, xp: 2750 },
  { level: 8, xp: 4000 },
  { level: 9, xp: 5500 },
  { level: 10, xp: 7500 },
  { level: 12, xp: 12000 },
  { level: 15, xp: 20000 },
  { level: 20, xp: 40000 },
  { level: 25, xp: 70000 },
  { level: 30, xp: 110000 },
  { level: 40, xp: 200000 },
  { level: 50, xp: 500000 },
];

export function getLevel(xp: number): number {
  let level = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xp) level = t.level;
    else break;
  }
  return level;
}

export function getXPForNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const currentLevel = getLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel)?.xp ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level > currentLevel)?.xp ?? currentThreshold;
  const progress = nextThreshold > currentThreshold
    ? (xp - currentThreshold) / (nextThreshold - currentThreshold)
    : 1;
  return { current: xp - currentThreshold, needed: nextThreshold - currentThreshold, progress: Math.min(progress, 1) };
}

// ── Group Mastery ──

export const MASTERY_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 50 },
  { level: 3, xp: 150 },
  { level: 4, xp: 350 },
  { level: 5, xp: 700 },
  { level: 6, xp: 1200 },
  { level: 7, xp: 2000 },
  { level: 8, xp: 3500 },
  { level: 9, xp: 6000 },
  { level: 10, xp: 10000 },
];

export function getMasteryLevel(xp: number): number {
  let level = 1;
  for (const t of MASTERY_THRESHOLDS) {
    if (xp >= t.xp) level = t.level;
    else break;
  }
  return level;
}

export function getMasteryProgress(xp: number): number {
  const level = getMasteryLevel(xp);
  const current = MASTERY_THRESHOLDS.find(t => t.level === level)?.xp ?? 0;
  const next = MASTERY_THRESHOLDS.find(t => t.level === level + 1)?.xp;
  if (!next) return 1;
  return (xp - current) / (next - current);
}

// ── Mastery XP calculation (client-side) ──

export interface GroupMasteryUpdate {
  group_id: number;
  group_name?: string;
  mastery_xp: number;
  mastery_level?: number;
  progress?: number;
}

export function calculateGroupMasteryUpdates(
  answers: { song_id: string; correct: boolean; time: number; skipped?: boolean }[],
  songs: { song_id: string; group_id: number | null }[],
): GroupMasteryUpdate[] {
  const map: Record<number, number> = {};

  for (const answer of answers) {
    if (!answer.correct || answer.skipped) continue;
    const song = songs.find(s => s.song_id === answer.song_id);
    if (!song?.group_id) continue;

    const xp = answer.time < 2 ? 15 : 10;
    map[song.group_id] = (map[song.group_id] ?? 0) + xp;
  }

  return Object.entries(map).map(([group_id, mastery_xp]) => ({
    group_id: Number(group_id),
    mastery_xp,
  }));
}

// ── Streak ──

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 1.5;
  if (streak >= 14) return 1.2;
  return 1.0;
}
