const ROTATION = ['bts', 'blackpink', 'aespa', 'stray-kids', 'newjeans'] as const;
const ROTATION_NAMES: Record<string, string> = {
  bts: 'BTS',
  blackpink: 'BLACKPINK',
  aespa: 'aespa',
  'stray-kids': 'Stray Kids',
  newjeans: 'NewJeans',
};
const LAUNCH_DATE = new Date('2026-05-05T00:00:00Z');
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function getActiveGroupPack() {
  const now = new Date();
  const weeksSinceLaunch = Math.floor(
    (now.getTime() - LAUNCH_DATE.getTime()) / MS_PER_WEEK,
  );
  const idx =
    ((weeksSinceLaunch % ROTATION.length) + ROTATION.length) % ROTATION.length;
  const weekStart = new Date(
    LAUNCH_DATE.getTime() + weeksSinceLaunch * MS_PER_WEEK,
  );
  const weekEnd = new Date(weekStart.getTime() + MS_PER_WEEK);
  const nextIdx = (idx + 1) % ROTATION.length;

  return {
    groupSlug: ROTATION[idx]!,
    groupName: ROTATION_NAMES[ROTATION[idx]!] ?? ROTATION[idx]!,
    nextGroupSlug: ROTATION[nextIdx]!,
    nextGroupName: ROTATION_NAMES[ROTATION[nextIdx]!] ?? ROTATION[nextIdx]!,
    endsAt: weekEnd,
    msRemaining: Math.max(0, weekEnd.getTime() - now.getTime()),
    weekNumber: weeksSinceLaunch + 1,
  };
}
