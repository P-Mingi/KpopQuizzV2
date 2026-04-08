'use client';

import { useEffect, useState } from 'react';

interface Props {
  playlistName: string;
  currentStars: number;
  playCount: number;
  /** Plays needed to reach the next star. */
  nextStarAt: number;
}

/**
 * Results-screen card showing the playlist mastery level for the round just played.
 * The bar animates from 0% to the computed progress on mount.
 */
export function MasteryProgress({ playlistName, currentStars, playCount, nextStarAt }: Props) {
  const target = nextStarAt > 0 ? Math.min(100, Math.round((playCount / nextStarAt) * 100)) : 100;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarWidth(target));
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div className="w-full p-3 bg-surface rounded-xl border border-default flex items-center gap-3">
      <div className="flex-shrink-0 text-center">
        <p className="text-xs text-combo tabular-nums">
          {'\u2605'.repeat(currentStars)}{'\u2606'.repeat(5 - currentStars)}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <p className="text-xs font-medium text-primary truncate">
            {playlistName} mastery
          </p>
          <p className="text-[10px] text-ghost tabular-nums">
            {playCount}/{nextStarAt} plays
          </p>
        </div>
        <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-combo"
            style={{ width: `${barWidth}%`, transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </div>
      </div>
    </div>
  );
}

export function getNextStarThreshold(currentStars: number): number {
  const thresholds = [3, 8, 15, 30, 50];
  if (currentStars >= 5) return 50;
  return thresholds[currentStars] ?? 50;
}
