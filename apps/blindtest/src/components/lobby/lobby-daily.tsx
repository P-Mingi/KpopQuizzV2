'use client';

import { useDailyStatus } from '@/hooks/use-daily-status';
import { DailyChallengeCard } from './daily-challenge-card';

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LobbyDaily() {
  const daily = useDailyStatus();

  if (!daily) return null;

  return (
    <DailyChallengeCard
      timeLeft={formatTimeLeft(daily.msUntilReset)}
      played={daily.hasPlayed}
    />
  );
}
